import { WebClient } from "@slack/web-api";
import { hourInAppTz } from "../timezone";
import { DateWindow } from "../collectors/types";

export type ChannelSignals = {
  channelId: string;
  channelName: string;
  messageCount: number;
  uniquePosters: number;
  topPoster: { userId: string; name: string; count: number } | null;
  topEmoji: { emoji: string; count: number } | null;
  peakHour: { hour: number; count: number };
  longestThread: { title: string; replies: number } | null;
  ghostHours: number;
};

const getClient = () => {
  const token = process.env.SLACK_BOT_TOKEN;
  return token ? new WebClient(token) : null;
};

export const collectChannel = async (
  channelId: string,
  win: DateWindow,
): Promise<ChannelSignals | null> => {
  const slack = getClient();
  if (!slack) return null;

  const info = await slack.conversations.info({ channel: channelId }).catch(() => null);
  if (!info?.channel?.id) return null;

  const oldest = (win.start.getTime() / 1000).toString();
  const latest = (win.end.getTime() / 1000).toString();

  const history = await slack.conversations
    .history({ channel: channelId, oldest, latest, limit: 1000 })
    .catch(() => null);
  if (!history?.messages) return null;

  const msgs = history.messages;
  const posterCounts = new Map<string, number>();
  const emojiCounts = new Map<string, number>();
  const hourBuckets = new Array(24).fill(0);
  const tsList: number[] = [];

  for (const m of msgs) {
    if (!m.user) continue;
    if (m.subtype) continue;
    posterCounts.set(m.user, (posterCounts.get(m.user) ?? 0) + 1);
    const ts = parseFloat(m.ts ?? "0");
    tsList.push(ts);
    const hour = hourInAppTz(new Date(ts * 1000));
    hourBuckets[hour]++;
    const emojis = (m.text ?? "").match(/:[a-z0-9_+-]+:/gi) ?? [];
    for (const e of emojis) emojiCounts.set(e, (emojiCounts.get(e) ?? 0) + 1);
    for (const r of m.reactions ?? []) {
      const key = `:${r.name}:`;
      emojiCounts.set(key, (emojiCounts.get(key) ?? 0) + (r.count ?? 0));
    }
  }

  const topPosterEntry = [...posterCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  let topPoster: ChannelSignals["topPoster"] = null;
  if (topPosterEntry) {
    const userInfo = await slack.users.info({ user: topPosterEntry[0] }).catch(() => null);
    topPoster = {
      userId: topPosterEntry[0],
      name: userInfo?.user?.profile?.real_name ?? userInfo?.user?.name ?? topPosterEntry[0],
      count: topPosterEntry[1],
    };
  }

  const peakHour = hourBuckets.reduce(
    (best, v, i) => (v > best.count ? { hour: i, count: v } : best),
    { hour: 0, count: 0 },
  );
  const topEmojiEntry = [...emojiCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const threadMsg = [...msgs]
    .filter((m) => (m.reply_count ?? 0) > 0)
    .sort((a, b) => (b.reply_count ?? 0) - (a.reply_count ?? 0))[0];

  tsList.sort((a, b) => a - b);
  let longest = 0;
  for (let i = 1; i < tsList.length; i++) {
    const gap = (tsList[i] - tsList[i - 1]) / 3600;
    if (gap > longest) longest = gap;
  }

  return {
    channelId,
    channelName: info.channel.name ?? channelId,
    messageCount: msgs.length,
    uniquePosters: posterCounts.size,
    topPoster,
    topEmoji: topEmojiEntry ? { emoji: topEmojiEntry[0], count: topEmojiEntry[1] } : null,
    peakHour,
    longestThread: threadMsg
      ? {
          title: (threadMsg.text ?? "").slice(0, 90),
          replies: threadMsg.reply_count ?? 0,
        }
      : null,
    ghostHours: Math.round(longest),
  };
};
