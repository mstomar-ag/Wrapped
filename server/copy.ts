import Anthropic from "@anthropic-ai/sdk";
import { AllSignals } from "./collectors/types";

// Generated copy that overrides the heuristic defaults when an LLM is configured.
export type CopyOverrides = {
  weekTitle?: string;
  vibe?: string;
  commitSummary?: string;
};

let client: Anthropic | null = null;
const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
};

const SYSTEM = `You write short, punchy copy for a "Spotify Wrapped"-style end-of-week reel about a person's work.
Tone: confident, warm, slightly playful. Never sycophantic. Never generic.
Constraints: every field must be brief — week title under 4 words, vibe one sentence under 14 words, commit summary one sentence under 18 words.
Avoid emoji, hashtags, and marketing language. No exclamation points.`;

export const generateCopy = async (name: string, signals: AllSignals): Promise<CopyOverrides> => {
  const llm = getClient();
  if (!llm) return {};

  const summary = {
    name,
    slack: signals.slack && {
      messages: signals.slack.messageCount,
      peakHour: signals.slack.peakHour.hour,
      topEmoji: signals.slack.topEmoji?.emoji,
      ghostHours: signals.slack.ghostStreaks.longestHours,
      threadTitle: signals.slack.longestThread?.title,
    },
    github: signals.github && {
      commits: signals.github.commitCount,
      adds: signals.github.additions,
      dels: signals.github.deletions,
      commitMessage: signals.github.topCommit?.message,
    },
  };

  const resp = await llm.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Given this weekly activity, produce JSON with keys weekTitle, vibe, commitSummary.
Data:
${JSON.stringify(summary, null, 2)}

Return ONLY a JSON object. No prose, no code fences.`,
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  try {
    const parsed = JSON.parse(text);
    return {
      weekTitle: typeof parsed.weekTitle === "string" ? parsed.weekTitle : undefined,
      vibe: typeof parsed.vibe === "string" ? parsed.vibe : undefined,
      commitSummary: typeof parsed.commitSummary === "string" ? parsed.commitSummary : undefined,
    };
  } catch {
    return {};
  }
};
