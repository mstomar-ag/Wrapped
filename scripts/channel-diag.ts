import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { WebClient } from "@slack/web-api";
import { resolveChannel } from "../server/channels/lookup";
import { collectChannel } from "../server/channels/collector";
import { buildChannelWrap } from "../server/channels/build";
import { parseRange, labelWindow } from "../server/window";
import { hourInAppTz, formatDateTime, calendarYmd } from "../server/timezone";
import { PROJECT_ROOT } from "../server/paths";

type RawMessage = {
  ts: string;
  tsIso: string;
  userId: string | null;
  userName: string | null;
  text: string;
  subtype: string | null;
  threadTs: string | null;
  replyCount: number;
  reactionCount: number;
  inThread: boolean;
};

const [channelArg, fromArg, toArg] = process.argv.slice(2);
if (!channelArg) {
  console.error("usage: npm run channel:diag -- <channel-name> [from-YYYY-MM-DD] [to-YYYY-MM-DD]");
  process.exit(1);
}

const from = fromArg ?? "2026-05-15";
const to = toArg ?? calendarYmd(new Date());
const win = parseRange(from, to);

const token = process.env.SLACK_BOT_TOKEN;
if (!token) {
  console.error("SLACK_BOT_TOKEN missing");
  process.exit(1);
}

const slack = new WebClient(token);
const resolved = await resolveChannel(channelArg);
if (!resolved) {
  console.error(`channel not found: ${channelArg}`);
  process.exit(1);
}

const nameCache = new Map<string, string>();
const resolveUser = async (userId: string): Promise<string> => {
  if (nameCache.has(userId)) return nameCache.get(userId)!;
  try {
    const info = await slack.users.info({ user: userId });
    const label =
      info.user?.profile?.display_name ||
      info.user?.real_name ||
      info.user?.name ||
      userId;
    nameCache.set(userId, label);
    return label;
  } catch {
    nameCache.set(userId, userId);
    return userId;
  }
};

const oldest = (win.start.getTime() / 1000).toString();
const latest = (win.end.getTime() / 1000).toString();

const topLevel: RawMessage[] = [];
const threadReplies: RawMessage[] = [];
const threadsScanned = new Set<string>();

let cursor: string | undefined;
do {
  const history = await slack.conversations.history({
    channel: resolved.id,
    oldest,
    latest,
    limit: 200,
    cursor,
  });
  for (const m of history.messages ?? []) {
    const ts = m.ts ?? "0";
    const row: RawMessage = {
      ts,
      tsIso: new Date(parseFloat(ts) * 1000).toISOString(),
      userId: m.user ?? null,
      userName: m.user ? await resolveUser(m.user) : null,
      text: (m.text ?? "").slice(0, 500),
      subtype: m.subtype ?? null,
      threadTs: m.thread_ts ?? null,
      replyCount: m.reply_count ?? 0,
      reactionCount: (m.reactions ?? []).reduce((n, r) => n + (r.count ?? 0), 0),
      inThread: Boolean(m.thread_ts && m.thread_ts !== m.ts),
    };
    if (m.thread_ts && m.thread_ts !== m.ts) threadReplies.push(row);
    else topLevel.push(row);

    if ((m.reply_count ?? 0) > 0 && m.ts && !threadsScanned.has(m.ts)) {
      threadsScanned.add(m.ts);
      let replyCursor: string | undefined;
      do {
        const replies = await slack.conversations.replies({
          channel: resolved.id,
          ts: m.ts,
          limit: 200,
          cursor: replyCursor,
        });
        for (const r of replies.messages ?? []) {
          if (r.ts === m.ts) continue;
          const rts = r.ts ?? "0";
          const rTs = parseFloat(rts);
          if (rTs * 1000 < win.start.getTime() || rTs * 1000 > win.end.getTime()) continue;
          threadReplies.push({
            ts: rts,
            tsIso: new Date(rTs * 1000).toISOString(),
            userId: r.user ?? null,
            userName: r.user ? await resolveUser(r.user) : null,
            text: (r.text ?? "").slice(0, 500),
            subtype: r.subtype ?? null,
            threadTs: m.ts,
            replyCount: 0,
            reactionCount: (r.reactions ?? []).reduce((n, rx) => n + (rx.count ?? 0), 0),
            inThread: true,
          });
        }
        replyCursor = replies.response_metadata?.next_cursor;
      } while (replyCursor);
    }
  }
  cursor = history.response_metadata?.next_cursor;
} while (cursor);

const humanMessages = [...topLevel, ...threadReplies].filter(
  (m) => m.userId && !m.subtype,
);
const deduped = new Map<string, RawMessage>();
for (const m of humanMessages) deduped.set(`${m.ts}:${m.threadTs ?? ""}`, m);
const allHuman = [...deduped.values()].sort(
  (a, b) => parseFloat(a.ts) - parseFloat(b.ts),
);

const byUser = new Map<string, { name: string; count: number }>();
const byDay = new Map<string, number>();
const hourBuckets = new Array(24).fill(0) as number[];

for (const m of allHuman) {
  const uid = m.userId!;
  const prior = byUser.get(uid);
  if (prior) prior.count++;
  else byUser.set(uid, { name: m.userName ?? uid, count: 1 });
  const day = calendarYmd(new Date(parseFloat(m.ts) * 1000));
  byDay.set(day, (byDay.get(day) ?? 0) + 1);
  hourBuckets[hourInAppTz(new Date(parseFloat(m.ts) * 1000))]++;
}

const channelInfo = await slack.conversations.info({ channel: resolved.id });
const signals = await collectChannel(resolved.id, win);
const wrappedPreview = signals ? buildChannelWrap(signals, win) : null;

const report = {
  generatedAt: new Date().toISOString(),
  channel: {
    input: channelArg,
    id: resolved.id,
    name: resolved.name,
    created: channelInfo.channel?.created
      ? new Date((channelInfo.channel.created as number) * 1000).toISOString()
      : null,
    numMembers: channelInfo.channel?.num_members ?? null,
    isPrivate: channelInfo.channel?.is_private ?? null,
  },
  window: {
    from,
    to,
    label: labelWindow(win),
    startIso: win.start.toISOString(),
    endIso: win.end.toISOString(),
    timezone: "Asia/Kolkata",
  },
  summary: {
    topLevelFetched: topLevel.length,
    threadRepliesFetched: threadReplies.length,
    humanMessagesInWindow: allHuman.length,
    uniquePosters: byUser.size,
    threadsScanned: threadsScanned.size,
    firstMessage: allHuman[0]
      ? { at: allHuman[0].tsIso, by: allHuman[0].userName, preview: allHuman[0].text.slice(0, 120) }
      : null,
    lastMessage: allHuman.at(-1)
      ? {
          at: allHuman.at(-1)!.tsIso,
          by: allHuman.at(-1)!.userName,
          preview: allHuman.at(-1)!.text.slice(0, 120),
        }
      : null,
  },
  byUser: [...byUser.entries()]
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.count - a.count),
  byDay: [...byDay.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day)),
  peakHourIst: hourBuckets
    .map((count, hour) => ({ hour, count }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count),
  /** What the production collector returns today (limit 1000, no thread pagination). */
  productionCollector: signals,
  /** What would be shown on the reel if we rendered now. */
  wrappedPreview: wrappedPreview
    ? {
        weekLabel: wrappedPreview.weekLabel,
        weekTitle: wrappedPreview.weekTitle,
        vibe: wrappedPreview.vibe,
        numbers: wrappedPreview.numbers,
        peakHour: wrappedPreview.peakHour,
        topEmoji: wrappedPreview.topEmoji,
        thread: wrappedPreview.thread,
        commit: wrappedPreview.commit,
        ghostMode: wrappedPreview.ghostMode,
      }
    : null,
  messages: allHuman.map((m) => ({
    ...m,
    atIst: formatDateTime(new Date(parseFloat(m.ts) * 1000)),
  })),
};

const outDir = path.join(PROJECT_ROOT, "data");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `channel-${resolved.name}-validation.json`);
fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

console.log(`Wrote ${outFile}`);
console.log(JSON.stringify(report.summary, null, 2));
if (signals && signals.messageCount !== report.summary.humanMessagesInWindow) {
  console.warn(
    `\n⚠ Mismatch: production collector messageCount=${signals.messageCount} vs full scan=${report.summary.humanMessagesInWindow}`,
  );
}
