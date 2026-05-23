import { WebClient } from "@slack/web-api";
import { Member } from "../members/types";
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

export const collectSlack = async (
  member: Member,
  win: DateWindow,
): Promise<SlackSignals | null> => {
  const slack = getClient();
  const userId = member.socials.slack?.userId;
  if (!slack || !userId) return null;

  const oldest = (win.start.getTime() / 1000).toString();
  const latest = (win.end.getTime() / 1000).toString();

  const viaSearch = await collectViaSearch(slack, userId, win);
  const messages =
    viaSearch ??
    (await collectViaChannelHistory(slack, userId, oldest, latest));

  const sortedMsgs = messages.sort((a, b) => a.ts - b.ts);
  const nameCache = new Map<string, string>();
  const resolve = (text: string) => resolveSlackText(slack, text, nameCache);

  const emojiCounts = new Map<string, number>();
  const hourBuckets = new Array(24).fill(0);
  let reactionsGiven = 0;

  for (const m of sortedMsgs) {
    const hour = new Date(m.ts * 1000).getHours();
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
  const longestThread =
    [...threadCounts.values()].sort((a, b) => b.replies - a.replies)[0] ?? null;

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

/** One API call when `search:read` is on the bot — much faster than scanning every channel. */
const collectViaSearch = async (
  slack: WebClient,
  userId: string,
  win: DateWindow,
): Promise<RawMsg[] | null> => {
  try {
    const after = Math.floor(win.start.getTime() / 1000);
    const before = Math.floor(win.end.getTime() / 1000);
    const query = `from:<@${userId}> after:${after} before:${before}`;
    const out: RawMsg[] = [];
    let page = 1;
    while (page <= 5) {
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
  } catch {
    return null;
  }
};

const collectViaChannelHistory = async (
  slack: WebClient,
  userId: string,
  oldest: string,
  latest: string,
): Promise<RawMsg[]> => {
  const channelsRes = await slack.conversations.list({
    exclude_archived: true,
    types: "public_channel",
    limit: 200,
  });
  const channels = channelsRes.channels ?? [];
  const messages: RawMsg[] = [];
  const concurrency = 8;

  for (let i = 0; i < channels.length; i += concurrency) {
    const batch = channels.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (ch) => {
        if (!ch.id) return;
        try {
          const history = await slack.conversations.history({
            channel: ch.id,
            oldest,
            latest,
            limit: 200,
          });
          for (const m of history.messages ?? []) {
            if (m.user !== userId) continue;
            messages.push({
              text: m.text ?? "",
              ts: parseFloat(m.ts ?? "0"),
              channelName: ch.name ?? ch.id,
              thread_ts: m.thread_ts,
              reactions: m.reactions?.map((r) => ({
                name: r.name ?? "",
                users: r.users,
              })),
            });
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
        const label =
          u?.profile?.display_name ||
          u?.real_name ||
          u?.name ||
          id;
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
