import { WrappedData, DUMMY } from "../../src/data";
import { DateWindow } from "../collectors/types";
import { ChannelSignals } from "./collector";
import { labelWindow } from "../window";

const EMOJI_MAP: Record<string, string> = {
  ":rocket:": "🚀",
  ":fire:": "🔥",
  ":tada:": "🎉",
  ":eyes:": "👀",
  ":thumbsup:": "👍",
  ":+1:": "👍",
  ":heart:": "❤️",
  ":sparkles:": "✨",
};
const toUnicode = (s: string): string => EMOJI_MAP[s.toLowerCase()] ?? "💬";

const fmtHour = (h: number) => {
  const am = h < 12;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${am ? "AM" : "PM"}`;
};

export const buildChannelWrap = (
  signals: ChannelSignals,
  win: DateWindow,
  quality: import("../../src/data").WrappedQuality = "standard",
): WrappedData => {
  const hasPeak = signals.peakHour.count > 0;
  return {
    kind: "channel",
    quality,
    name: `#${signals.channelName}`,
    handle: `#${signals.channelName}`,
    weekLabel: labelWindow(win),
    weekTitle: pickTitle(signals),
    vibe: pickVibe(signals),
    numbers: {
      messages: signals.messageCount,
      // For channels: "commits" slot becomes unique posters, "lines changed" is
      // the longest thread's reply count. The CommitScene is skipped entirely
      // for channels, so these only feed the Numbers slide where they're labeled
      // generically.
      commits: signals.uniquePosters,
      linesChanged: signals.longestThread?.replies ?? 0,
    },
    peakHour: {
      hour: hasPeak ? fmtHour(signals.peakHour.hour) : "—",
      messages: hasPeak ? signals.peakHour.count : 0,
    },
    topEmoji: signals.topEmoji
      ? {
          emoji: toUnicode(signals.topEmoji.emoji),
          count: signals.topEmoji.count,
          label: signals.topEmoji.emoji.replace(/:/g, ""),
        }
      : { emoji: "💬", count: 0, label: "quiet channel" },
    thread: signals.longestThread
      ? {
          channel: `#${signals.channelName}`,
          replies: signals.longestThread.replies,
          title: signals.longestThread.title,
        }
      : DUMMY.thread,
    // Channels never have commits — but WrappedData requires `commit`, so we
    // park the top-poster data here. The renderer skips CommitScene for channels.
    commit: signals.topPoster
      ? {
          repo: `#${signals.channelName}`,
          sha: signals.topPoster.userId.slice(0, 7),
          summary: `${signals.topPoster.name} posted ${signals.topPoster.count} times — the loudest voice.`,
          additions: signals.topPoster.count,
          deletions: 0,
        }
      : DUMMY.commit,
    ghostMode: { streaks: 0, longestHours: signals.ghostHours },
  };
};

const pickTitle = (s: ChannelSignals): string => {
  if (s.messageCount > 1000) return "Always On";
  if (s.uniquePosters > 15) return "The Town Square";
  if (s.longestThread && s.longestThread.replies > 30) return "Great Debate";
  if (s.ghostHours > 48) return "Sleepy Cousin";
  return "Steady Channel";
};

const pickVibe = (s: ChannelSignals): string => {
  if (s.peakHour.hour >= 22) return "Most of this channel happened after dark.";
  if (s.uniquePosters < 4) return "A small, devoted crew kept this place alive.";
  if (s.longestThread && s.longestThread.replies > 20) return "Threads ran deep this window.";
  return "Steady, lively, productive.";
};
