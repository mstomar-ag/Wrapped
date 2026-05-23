export type DateWindow = {
  start: Date;
  end: Date;
};

export type SlackSignals = {
  messageCount: number;
  reactionsGiven: number;
  topEmoji: { emoji: string; count: number } | null;
  peakHour: { hour: number; messageCount: number };
  longestThread: {
    channel: string;
    title: string;
    replies: number;
  } | null;
  ghostStreaks: { count: number; longestHours: number };
  sampleMessages: string[];
};

export type GitHubSignals = {
  commitCount: number;
  additions: number;
  deletions: number;
  topCommit: {
    repo: string;
    sha: string;
    message: string;
    additions: number;
    deletions: number;
  } | null;
};

export type XSignals = {
  tweets: number;
  topTweet: string | null;
};

export type LinkedInSignals = {
  posts: number;
  topPost: string | null;
};

export type EmailSignals = {
  sent: number;
  received: number;
};

export type AllSignals = {
  slack: SlackSignals | null;
  github: GitHubSignals | null;
  x: XSignals | null;
  linkedin: LinkedInSignals | null;
  email: EmailSignals | null;
};
