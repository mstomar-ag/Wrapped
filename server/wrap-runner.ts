import { Member } from "./members/types";
import { DateWindow } from "./collectors/types";
import { collectAll, buildWrappedData } from "./aggregator";
import { generateCopy } from "./copy";
import { renderWrapped } from "./render";
import { collectChannel } from "./channels/collector";
import { buildChannelWrap } from "./channels/build";
import { resolveChannel } from "./channels/lookup";
import { labelWindow } from "./window";
import { toRelativePath } from "./paths";
import { createEntry, getEntry, setStatus } from "./archive/store";
import { ArchiveEntry, ArchiveSource } from "./archive/types";
import { postVideoToChannel } from "./slack/post";
import { setWrapProgress, trackRenderProgress } from "./wrap-progress";

import type { WrappedQuality } from "../src/data";

type MemberWrapOpts = {
  member: Member;
  win: DateWindow;
  source: ArchiveSource;
  triggeredBy?: string;
  post?: { channelId: string; comment?: string } | null;
  skipLLM?: boolean;
  /** "standard" (720×1280, default) or "high" (1080×1920, ~2× render time) */
  quality?: WrappedQuality;
  /** When true, skip the render cache and force a fresh render. */
  forceFresh?: boolean;
};

const runMemberWrapJob = async (entryId: string, opts: MemberWrapOpts): Promise<void> => {
  const { member, win, post, skipLLM, quality, forceFresh } = opts;

  try {
    setWrapProgress(entryId, "collecting", 8, "Collecting Slack, GitHub, and more…");
    const t0 = Date.now();
    const signals = await collectAll(member, win);
    const tCollect = Date.now();

    setWrapProgress(entryId, "copy", 28, "Writing your week title and vibe…");
    const copy = skipLLM ? {} : await generateCopy(member.name, signals).catch(() => ({}));
    const tCopy = Date.now();

    setWrapProgress(entryId, "aggregating", 38, "Building your stats…");
    const data = buildWrappedData(member, win, signals, copy, quality);

    setWrapProgress(entryId, "rendering", 42, "Rendering your reel (this takes ~1–2 min)…");
    const stopRenderTick = trackRenderProgress(entryId);
    const file = await renderWrapped(data, { displayName: member.name, forceFresh });
    stopRenderTick();
    const tEnd = Date.now();
    console.log(
      `[wrap] ${entryId} collect=${tCollect - t0}ms copy=${tCopy - tCollect}ms render=${tEnd - tCopy}ms total=${tEnd - t0}ms → ${file}`,
    );

    setWrapProgress(entryId, "finishing", 98, "Saving to archive…");

    let postedToSlack = false;
    if (post?.channelId && file) {
      await postVideoToChannel(
        post.channelId,
        file,
        post.comment ?? `Wrapped for *${member.name}*`,
      );
      postedToSlack = true;
    }

    setStatus(entryId, "ready", {
      filePath: toRelativePath(file),
      data,
      postedToSlack,
      progress: 100,
      phase: "finishing",
      progressMessage: "Done!",
    });
  } catch (e) {
    const error = (e as Error).message;
    console.error(`[wrap] member=${member.id} failed: ${error}`);
    setStatus(entryId, "failed", { error, progress: 0, progressMessage: error });
  }
};

/** Create archive row and return immediately; work continues in the background. */
export const startWrapForMember = (opts: MemberWrapOpts): ArchiveEntry => {
  const { member, win, source, triggeredBy, post } = opts;
  const entry = createEntry({
    kind: "member",
    subject: member.id,
    subjectName: member.name,
    windowFrom: win.start.toISOString(),
    windowTo: win.end.toISOString(),
    windowLabel: labelWindow(win),
    source,
    triggeredBy,
    postedToSlack: false,
    slackChannelId: post?.channelId,
    progress: 0,
    phase: "queued",
    progressMessage: "Queued…",
  });
  void runMemberWrapJob(entry.id, opts);
  return entry;
};

/** Blocking wrap (Slack slash, CLI, scheduler). */
export const runWrapForMember = async (opts: MemberWrapOpts): Promise<ArchiveEntry> => {
  const entry = startWrapForMember(opts);
  return waitForArchiveEntry(entry.id);
};

const waitForArchiveEntry = async (id: string): Promise<ArchiveEntry> => {
  for (let i = 0; i < 600; i++) {
    const e = getEntry(id);
    if (e && (e.status === "ready" || e.status === "failed")) return e;
    await new Promise((r) => setTimeout(r, 500));
  }
  const e = getEntry(id);
  if (!e) throw new Error("wrap timed out waiting for archive entry");
  return e;
};

// ─── Channel wrap ────────────────────────────────────────────────────────────
type ChannelWrapOpts = {
  channel: string;
  win: DateWindow;
  source: ArchiveSource;
  triggeredBy?: string;
  post?: { channelId: string; comment?: string } | null;
  quality?: WrappedQuality;
  forceFresh?: boolean;
};

/** Non-blocking: returns a queued archive entry; work runs in the background. */
export const startWrapForChannel = (opts: ChannelWrapOpts): ArchiveEntry => {
  const { channel, win, source, triggeredBy, post } = opts;
  const entry = createEntry({
    kind: "channel",
    subject: channel,
    subjectName: channel.startsWith("#") ? channel : `#${channel}`,
    windowFrom: win.start.toISOString(),
    windowTo: win.end.toISOString(),
    windowLabel: labelWindow(win),
    source,
    triggeredBy,
    postedToSlack: false,
    slackChannelId: post?.channelId,
    progress: 0,
    phase: "queued",
    progressMessage: "Queued…",
  });
  void runChannelWrapJob(entry.id, opts);
  return entry;
};

export const runWrapForChannel = async (opts: ChannelWrapOpts): Promise<ArchiveEntry> => {
  const entry = startWrapForChannel(opts);
  return waitForArchiveEntry(entry.id);
};

const runChannelWrapJob = async (entryId: string, opts: ChannelWrapOpts): Promise<void> => {
  const { channel, win, post, quality, forceFresh } = opts;
  try {
    setWrapProgress(entryId, "collecting", 5, `Resolving channel…`);
    const resolved = await resolveChannel(channel);
    if (!resolved) {
      setStatus(entryId, "failed", {
        error: `Channel "${channel}" not found or bot lacks access`,
      });
      return;
    }
    // Update display name once we know the real one
    setStatus(entryId, "rendering", {
      subject: resolved.id,
      subjectName: `#${resolved.name}`,
    });

    setWrapProgress(entryId, "collecting", 15, `Scanning #${resolved.name}…`);
    const t0 = Date.now();
    const signals = await collectChannel(resolved.id, win);
    if (!signals) throw new Error("Slack collector returned null (missing SLACK_BOT_TOKEN?)");
    setWrapProgress(entryId, "aggregating", 35, "Summarizing the channel…");
    const data = buildChannelWrap(signals, win, quality);
    setWrapProgress(entryId, "rendering", 45, "Rendering channel reel…");
    const stopTick = trackRenderProgress(entryId);
    const file = await renderWrapped(data, { displayName: `#${resolved.name}`, forceFresh });
    stopTick();
    console.log(`[wrap] rendered ${entryId} in ${Date.now() - t0}ms → ${file}`);

    let postedToSlack = false;
    if (post?.channelId && file) {
      await postVideoToChannel(
        post.channelId,
        file,
        post.comment ?? `Wrapped: *#${resolved.name}*`,
      );
      postedToSlack = true;
    }

    setStatus(entryId, "ready", {
      filePath: toRelativePath(file),
      data,
      postedToSlack,
      progress: 100,
    });
  } catch (e) {
    const error = (e as Error).message;
    console.error(`[wrap] channel job ${entryId} failed: ${error}`);
    setStatus(entryId, "failed", { error });
  }
};
