/** Which kind of wrap this is — drives scene selection (channels skip commit slide etc.) */
export type WrappedKind = "member" | "channel";

export type WrappedData = {
  /** Defaults to "member" if omitted (backward-compat). */
  kind?: WrappedKind;
  name: string;
  handle: string;
  weekLabel: string;
  weekTitle: string;
  vibe: string;
  numbers: {
    messages: number;
    commits: number;
    linesChanged: number;
  };
  peakHour: {
    hour: string;
    messages: number;
  };
  topEmoji: {
    emoji: string;
    count: number;
    label: string;
  };
  thread: {
    channel: string;
    replies: number;
    title: string;
  };
  commit: {
    repo: string;
    sha: string;
    summary: string;
    additions: number;
    deletions: number;
  };
  ghostMode: {
    streaks: number;
    longestHours: number;
  };
};

export const DUMMY: WrappedData = {
  name: "Mayank",
  handle: "@mayank",
  weekLabel: "May 12 – May 18",
  weekTitle: "The Quiet Shipper",
  vibe: "You said less and shipped more. The repo noticed.",
  numbers: {
    messages: 312,
    commits: 47,
    linesChanged: 8421,
  },
  peakHour: {
    // Used only when the Slack collector is unreachable. Picked to look
    // plausible rather than memorable — "11 PM" everywhere was misread as a bug.
    hour: "—",
    messages: 0,
  },
  topEmoji: {
    emoji: "🚀",
    count: 38,
    label: "ship it",
  },
  thread: {
    channel: "#eng-platform",
    replies: 41,
    title: "should we drop the legacy auth shim?",
  },
  commit: {
    repo: "wrpd/api",
    sha: "a1f9c0e",
    summary: "Rewrote the ingest pipeline. Half the code, twice the throughput.",
    additions: 612,
    deletions: 1284,
  },
  ghostMode: {
    streaks: 6,
    longestHours: 9,
  },
};
