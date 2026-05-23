import { Member } from "./members/types";
import { DateWindow } from "./collectors/types";
import { collectAll, buildWrappedData } from "./aggregator";
import { generateCopy } from "./copy";
import { renderWrapped } from "./render";
import { collectChannel } from "./channels/collector";
import { buildChannelWrap } from "./channels/build";
import { resolveChannel } from "./channels/lookup";
import { labelWindow } from "./window";
import { createEntry, setStatus } from "./archive/store";
import { ArchiveEntry, ArchiveSource } from "./archive/types";
import { postVideoToChannel } from "./slack/post";

// ─── Member wrap ─────────────────────────────────────────────────────────────
export const runWrapForMember = async (opts: {
  member: Member;
  win: DateWindow;
  source: ArchiveSource;
  triggeredBy?: string;
  /** If set, the rendered MP4 is uploaded to this Slack channel. */
  post?: { channelId: string; comment?: string } | null;
  /** Skip LLM copy generation (for cost-sensitive flows like the scheduler) */
  skipLLM?: boolean;
}): Promise<ArchiveEntry> => {
  const { member, win, source, triggeredBy, post, skipLLM } = opts;

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
  });

  try {
    setStatus(entry.id, "rendering");
    console.log(`[wrap] collecting member=${member.id} window=${labelWindow(win)}`);
    const t0 = Date.now();
    const signals = await collectAll(member, win);
    const tCollect = Date.now();
    const copy = skipLLM ? {} : await generateCopy(member.name, signals).catch(() => ({}));
    const tCopy = Date.now();
    const data = buildWrappedData(member, win, signals, copy);
    const file = await renderWrapped(data, { displayName: member.name });
    const tEnd = Date.now();
    console.log(
      `[wrap] ${entry.id} collect=${tCollect - t0}ms copy=${tCopy - tCollect}ms render=${tEnd - tCopy}ms total=${tEnd - t0}ms → ${file}`,
    );

    let postedToSlack = false;
    if (post?.channelId && file) {
      await postVideoToChannel(post.channelId, file, post.comment ?? `Wrapped for *${member.name}*`);
      postedToSlack = true;
    }

    const ready = setStatus(entry.id, "ready", { filePath: file, data, postedToSlack });
    return ready ?? entry;
  } catch (e) {
    const error = (e as Error).message;
    console.error(`[wrap] member=${member.id} failed: ${error}`);
    const failed = setStatus(entry.id, "failed", { error });
    return failed ?? entry;
  }
};

// ─── Channel wrap ────────────────────────────────────────────────────────────
export const runWrapForChannel = async (opts: {
  channel: string; // name, ID, or <#…> mention
  win: DateWindow;
  source: ArchiveSource;
  triggeredBy?: string;
  post?: { channelId: string; comment?: string } | null;
}): Promise<ArchiveEntry> => {
  const { channel, win, source, triggeredBy, post } = opts;

  const resolved = await resolveChannel(channel);
  if (!resolved) {
    // We still create a failed entry so the failure is visible in the archive
    const e = createEntry({
      kind: "channel",
      subject: channel,
      subjectName: `#${channel}`,
      windowFrom: win.start.toISOString(),
      windowTo: win.end.toISOString(),
      windowLabel: labelWindow(win),
      source,
      triggeredBy,
      postedToSlack: false,
    });
    setStatus(e.id, "failed", { error: `Channel "${channel}" not found or bot lacks access` });
    return e;
  }

  const entry = createEntry({
    kind: "channel",
    subject: resolved.id,
    subjectName: `#${resolved.name}`,
    windowFrom: win.start.toISOString(),
    windowTo: win.end.toISOString(),
    windowLabel: labelWindow(win),
    source,
    triggeredBy,
    postedToSlack: false,
    slackChannelId: post?.channelId,
  });

  try {
    setStatus(entry.id, "rendering");
    console.log(`[wrap] collecting channel=#${resolved.name} window=${labelWindow(win)}`);
    const t0 = Date.now();
    const signals = await collectChannel(resolved.id, win);
    if (!signals) throw new Error("Slack collector returned null (missing SLACK_BOT_TOKEN?)");
    const data = buildChannelWrap(signals, win);
    const file = await renderWrapped(data, { displayName: entry.subjectName });
    console.log(`[wrap] rendered ${entry.id} in ${Date.now() - t0}ms → ${file}`);

    let postedToSlack = false;
    if (post?.channelId && file) {
      await postVideoToChannel(post.channelId, file, post.comment ?? `Wrapped: *#${resolved.name}*`);
      postedToSlack = true;
    }

    const ready = setStatus(entry.id, "ready", { filePath: file, data, postedToSlack });
    return ready ?? entry;
  } catch (e) {
    const error = (e as Error).message;
    console.error(`[wrap] channel=${resolved.name} failed: ${error}`);
    const failed = setStatus(entry.id, "failed", { error });
    return failed ?? entry;
  }
};
