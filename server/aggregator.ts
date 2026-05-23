import { Member } from "./members/types";
import { DateWindow, AllSignals } from "./collectors/types";
import { collectSlack } from "./collectors/slack";
import { collectGitHub } from "./collectors/github";
import { collectX } from "./collectors/x";
import { collectLinkedIn } from "./collectors/linkedin";
import { collectEmail } from "./collectors/email";
import { WrappedData } from "../src/data";
import { DUMMY } from "../src/data";
import { CopyOverrides } from "./copy";
import { formatShortDate } from "./timezone";

export const collectAll = async (member: Member, win: DateWindow): Promise<AllSignals> => {
  const [slack, github, x, linkedin, email] = await Promise.allSettled([
    collectSlack(member, win),
    collectGitHub(member, win),
    collectX(member, win),
    collectLinkedIn(member, win),
    collectEmail(member, win),
  ]);
  const pick = <T>(r: PromiseSettledResult<T | null>): T | null =>
    r.status === "fulfilled" ? (r.value ?? null) : null;
  return {
    slack: pick(slack),
    github: pick(github),
    x: pick(x),
    linkedin: pick(linkedin),
    email: pick(email),
  };
};

const fmtHour = (h: number) => {
  const am = h < 12;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${am ? "AM" : "PM"}`;
};

const fmtWeekLabel = (win: DateWindow) =>
  `${formatShortDate(win.start)} – ${formatShortDate(win.end)}`;

export const buildWrappedData = (
  member: Member,
  win: DateWindow,
  signals: AllSignals,
  overrides: CopyOverrides = {},
): WrappedData => {
  const slack = signals.slack;
  const gh = signals.github;

  const messages = slack?.messageCount ?? DUMMY.numbers.messages;
  const commits = gh?.commitCount ?? DUMMY.numbers.commits;
  const linesChanged = (gh?.additions ?? 0) + (gh?.deletions ?? 0) || DUMMY.numbers.linesChanged;

  return {
    name: member.name,
    handle: `@${member.socials.slack?.handle ?? member.id}`,
    weekLabel: fmtWeekLabel(win),
    weekTitle: overrides.weekTitle ?? pickWeekTitle(signals),
    vibe: overrides.vibe ?? pickVibe(signals),
    numbers: { messages, commits, linesChanged },
    peakHour: {
      hour: slack ? fmtHour(slack.peakHour.hour) : DUMMY.peakHour.hour,
      messages: slack?.peakHour.messageCount ?? DUMMY.peakHour.messages,
    },
    topEmoji: slack?.topEmoji
      ? {
          emoji: slackEmojiToUnicode(slack.topEmoji.emoji),
          count: slack.topEmoji.count,
          label: slack.topEmoji.emoji.replace(/:/g, ""),
        }
      : slack
        ? { emoji: "💬", count: 0, label: "quiet week" }
        : DUMMY.topEmoji,
    thread: slack?.longestThread
      ? {
          channel: slack.longestThread.channel,
          replies: slack.longestThread.replies,
          title: slack.longestThread.title,
        }
      : DUMMY.thread,
    commit: gh?.topCommit
      ? {
          repo: gh.topCommit.repo,
          sha: gh.topCommit.sha,
          summary: overrides.commitSummary ?? gh.topCommit.message,
          additions: gh.topCommit.additions,
          deletions: gh.topCommit.deletions,
        }
      : DUMMY.commit,
    ghostMode: slack
      ? { streaks: slack.ghostStreaks.count, longestHours: slack.ghostStreaks.longestHours }
      : DUMMY.ghostMode,
  };
};

const pickWeekTitle = (s: AllSignals): string => {
  const commits = s.github?.commitCount ?? 0;
  const msgs = s.slack?.messageCount ?? 0;
  if (commits > 30 && msgs < 100) return "The Quiet Shipper";
  if (msgs > 300 && commits < 5) return "The Conductor";
  if (commits > 20 && msgs > 200) return "Engine Room";
  if ((s.slack?.ghostStreaks.longestHours ?? 0) > 8) return "Deep Work";
  return "The Steady Hand";
};

const pickVibe = (s: AllSignals): string => {
  if ((s.github?.commitCount ?? 0) > (s.slack?.messageCount ?? 0) / 10)
    return "You said less and shipped more. The repo noticed.";
  if ((s.slack?.peakHour.hour ?? 12) >= 22)
    return "Most of your work happened after the team logged off.";
  return "Steady, consistent, present. The team felt it.";
};

// Minimal slack-shortcode -> unicode. Extend as needed.
const EMOJI_MAP: Record<string, string> = {
  ":rocket:": "🚀",
  ":fire:": "🔥",
  ":tada:": "🎉",
  ":eyes:": "👀",
  ":thinking_face:": "🤔",
  ":+1:": "👍",
  ":heart:": "❤️",
  ":pray:": "🙏",
  ":sparkles:": "✨",
  ":100:": "💯",
};
const slackEmojiToUnicode = (s: string): string => EMOJI_MAP[s.toLowerCase()] ?? "💬";
