import { WebClient } from "@slack/web-api";
import { Member } from "../members/types";
import { calendarYmd, hourInAppTz, addCalendarDays } from "../timezone";
import { DateWindow, SlackSignals } from "./types";

let client: WebClient | null = null;
const getClient = () => {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  if (!client) client = new WebClient(token);
  return client;
};

type RawMsg = {
  text: string;
  ts: number;
  channelName: string;
  thread_ts?: string;
  reactions?: { name: string; users?: string[] }[];
};

const tsInWindow = (ts: number, win: DateWindow): boolean => {
  const ms = ts * 1000;
  return ms >= win.start.getTime() && ms <= win.end.getTime();
};

const dedupeMessages = (msgs: RawMsg[]): RawMsg[] => {
  const map = new Map<string, RawMsg>();
  for (const m of msgs) {
    map.set(`${m.channelName}:${m.ts}`, m);
  }
  return [...map.values()];
};

/** Slack search modifiers expect YYYY-MM-DD in the workspace calendar (IST). */
const searchDate = (d: Date) => calendarYmd(d);
const dayAfter = (d: Date) => addCalendarDays(calendarYmd(d), 1);

export const collectSlack = async (
  member: Member,
  win: DateWindow,
): Promise<SlackSignals | null> => {
  const slack = getClient();
  const userId = member.socials.slack?.userId;
  if (!slack || !userId) return null;

  const oldest = (win.start.getTime() / 1000).toString();
  const latest = (win.end.getTime() / 1000).toString();

  const [viaSearch, viaChannels] = await Promise.all([
    collectViaSearch(slack, userId, win),
    collectViaChannelHistory(slack, userId, oldest, latest, win),
  ]);
  const messages = dedupeMessages([...(viaSearch ?? []), ...viaChannels]).filter((m) =>
    tsInWindow(m.ts, win),
  );

  console.log(
    `[slack] ${member.id} search=${viaSearch?.length ?? "err"} channels=${viaChannels.length} merged=${messages.length}`,
  );

  const sortedMsgs = messages.sort((a, b) => a.ts - b.ts);
  const nameCache = new Map<string, string>();
  const resolve = (text: string) => resolveSlackText(slack, text, nameCache);

  const emojiCounts = new Map<string, number>();
  const hourBuckets = new Array(24).fill(0);
  let reactionsGiven = 0;

  for (const m of sortedMsgs) {
    const hour = hourInAppTz(new Date(m.ts * 1000));
    hourBuckets[hour]++;
    const emojis = m.text.match(/:[a-z0-9_+-]+:/gi) ?? [];
    for (const e of emojis) emojiCounts.set(e, (emojiCounts.get(e) ?? 0) + 1);
    for (const r of m.reactions ?? []) {
      const key = `:${r.name}:`;
      if ((r.users ?? []).includes(userId)) {
        reactionsGiven++;
        emojiCounts.set(key, (emojiCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const ghostStreaks = computeGhostStreaks(sortedMsgs.map((m) => m.ts));
  const peakHourIdx = hourBuckets.reduce((best, v, i) => (v > hourBuckets[best] ? i : best), 0);
  const topEmojiEntry = [...emojiCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const threadCounts = new Map<string, { channel: string; replies: number; title: string }>();
  for (const m of sortedMsgs) {
    const key = `${m.channelName}:${m.thread_ts ?? m.ts}`;
    const prior = threadCounts.get(key);
    const title = (await resolve(m.text)).slice(0, 80);
    if (prior) prior.replies++;
    else threadCounts.set(key, { channel: m.channelName, replies: 1, title });
  }
  const longestThread = [...threadCounts.values()].sort((a, b) => b.replies - a.replies)[0] ?? null;

  return {
    messageCount: sortedMsgs.length,
    reactionsGiven,
    topEmoji: topEmojiEntry ? { emoji: topEmojiEntry[0], count: topEmojiEntry[1] } : null,
    peakHour: { hour: peakHourIdx, messageCount: hourBuckets[peakHourIdx] },
    longestThread: longestThread
      ? {
          channel: `#${longestThread.channel}`,
          title: longestThread.title,
          replies: longestThread.replies,
        }
      : null,
    ghostStreaks,
    sampleMessages: sortedMsgs.slice(-25).map((m) => m.text),
  };
};

/** search:read — indexes thread replies; use YYYY-MM-DD in the query. */
const collectViaSearch = async (
  slack: WebClient,
  userId: string,
  win: DateWindow,
): Promise<RawMsg[] | null> => {
  try {
    const query = `from:<@${userId}> after:${searchDate(win.start)} before:${dayAfter(win.end)}`;
    const out: RawMsg[] = [];
    let page = 1;
    while (page <= 10) {
      const res = await slack.search.messages({ query, count: 100, page, sort: "timestamp" });
      const batch = res.messages?.matches ?? [];
      if (!batch.length) break;
      for (const m of batch) {
        const ts = parseFloat(m.ts ?? "0");
        const row = m as {
          thread_ts?: string;
          reactions?: { name?: string; users?: string[] }[];
        };
        out.push({
          text: m.text ?? "",
          ts,
          channelName: m.channel?.name ?? "unknown",
          thread_ts: row.thread_ts,
          reactions: row.reactions?.map((r) => ({
            name: r.name ?? "",
            users: r.users,
          })),
        });
      }
      if (!res.messages?.paging?.pages || page >= res.messages.paging.pages) break;
      page++;
    }
    return out;
  } catch (e) {
    console.warn(`[slack] search unavailable: ${(e as Error).message}`);
    return null;
  }
};

const toRawMsg = (
  m: {
    text?: string;
    ts?: string;
    user?: string;
    thread_ts?: string;
    reactions?: { name?: string; users?: string[] }[];
  },
  channelName: string,
): RawMsg => ({
  text: m.text ?? "",
  ts: parseFloat(m.ts ?? "0"),
  channelName,
  thread_ts: m.thread_ts,
  reactions: m.reactions?.map((r) => ({ name: r.name ?? "", users: r.users })),
});

const fetchThreadUserMessages = async (
  slack: WebClient,
  channelId: string,
  channelName: string,
  threadTs: string,
  userId: string,
  win: DateWindow,
): Promise<RawMsg[]> => {
  const out: RawMsg[] = [];
  let cursor: string | undefined;
  do {
    const res = await slack.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit: 200,
      cursor,
    });
    for (const m of res.messages ?? []) {
      if (m.user !== userId) continue;
      const raw = toRawMsg(m, channelName);
      if (tsInWindow(raw.ts, win)) out.push(raw);
    }
    cursor = res.response_metadata?.next_cursor;
  } while (cursor);
  return out;
};

const collectViaChannelHistory = async (
  slack: WebClient,
  userId: string,
  oldest: string,
  latest: string,
  win: DateWindow,
): Promise<RawMsg[]> => {
  const channelsRes = await slack.conversations.list({
    exclude_archived: true,
    types: "public_channel,private_channel",
    limit: 200,
  });
  const channels = channelsRes.channels ?? [];
  const messages: RawMsg[] = [];
  const concurrency = 6;

  for (let i = 0; i < channels.length; i += concurrency) {
    const batch = channels.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (ch) => {
        if (!ch.id) return;
        try {
          let cursor: string | undefined;
          const threadsToScan = new Set<string>();
          do {
            const history = await slack.conversations.history({
              channel: ch.id,
              oldest,
              latest,
              limit: 200,
              cursor,
            });
            for (const m of history.messages ?? []) {
              if (m.user === userId) {
                messages.push(toRawMsg(m, ch.name ?? ch.id));
              }
              const replyCount = m.reply_count ?? 0;
              if (replyCount > 0 && m.ts) {
                threadsToScan.add(m.thread_ts ?? m.ts);
              }
              if (m.thread_ts && m.user === userId) {
                threadsToScan.add(m.thread_ts);
              }
            }
            cursor = history.response_metadata?.next_cursor;
          } while (cursor);

          for (const threadTs of threadsToScan) {
            const replies = await fetchThreadUserMessages(
              slack,
              ch.id,
              ch.name ?? ch.id,
              threadTs,
              userId,
              win,
            );
            messages.push(...replies);
          }
        } catch {
          // channel not visible to bot
        }
      }),
    );
  }
  return messages;
};

const resolveSlackText = async (
  slack: WebClient,
  text: string,
  cache: Map<string, string>,
): Promise<string> => {
  let out = text;
  const mentions = [...out.matchAll(/<@([A-Z0-9]+)>/g)];
  for (const [, id] of mentions) {
    if (!cache.has(id)) {
      try {
        const info = await slack.users.info({ user: id });
        const u = info.user;
        const label = u?.profile?.display_name || u?.real_name || u?.name || id;
        cache.set(id, label);
      } catch {
        cache.set(id, id);
      }
    }
    out = out.replaceAll(`<@${id}>`, `@${cache.get(id)!}`);
  }
  out = out.replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1");
  out = out.replace(/<#([A-Z0-9]+)>/g, "#channel");
  return out;
};

const computeGhostStreaks = (timestamps: number[]) => {
  if (timestamps.length < 2) return { count: 0, longestHours: 0 };
  let count = 0;
  let longest = 0;
  for (let i = 1; i < timestamps.length; i++) {
    const gapHours = (timestamps[i] - timestamps[i - 1]) / 3600;
    if (gapHours >= 4) count++;
    if (gapHours > longest) longest = gapHours;
  }
  return { count, longestHours: Math.round(longest) };
};

/** Exported for diagnostics (`npm run slack:diag`). */
export const countSlackMessages = async (
  member: Member,
  win: DateWindow,
): Promise<{ search: number | null; channels: number; merged: number } | null> => {
  const slack = getClient();
  const userId = member.socials.slack?.userId;
  if (!slack || !userId) return null;
  const oldest = (win.start.getTime() / 1000).toString();
  const latest = (win.end.getTime() / 1000).toString();
  const [viaSearch, viaChannels] = await Promise.all([
    collectViaSearch(slack, userId, win),
    collectViaChannelHistory(slack, userId, oldest, latest, win),
  ]);
  const merged = dedupeMessages([...(viaSearch ?? []), ...viaChannels]).filter((m) =>
    tsInWindow(m.ts, win),
  );
  return {
    search: viaSearch?.length ?? null,
    channels: viaChannels.length,
    merged: merged.length,
  };
};
