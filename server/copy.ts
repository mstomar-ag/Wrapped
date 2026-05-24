import Anthropic from "@anthropic-ai/sdk";
import { AllSignals } from "./collectors/types";

export type CopyOverrides = {
  weekTitle?: string;
  vibe?: string;
  commitSummary?: string;
};

export const SYSTEM = `You write copy for "Wrapped" — a Spotify-Wrapped-style 25-second video that summarizes someone's week of work at a company. Your output goes onto three slides:

1. weekTitle — a 1–3 word personality label, like a Spotify Wrapped genre.
2. vibe — one sentence the reel ends on, capturing the person's energy this week.
3. commitSummary — one sentence that rewrites the raw commit message into something a teammate would actually want to read.

Tone rules:
- Observational, slightly playful, warm. Never marketing-speak. Never sycophantic.
- Specific over generic. Reference what's actually in the data when possible.
- It's a tease among friends, not a LinkedIn post.

Hard constraints:
- weekTitle: max 3 words, title case, no period.
- vibe: 1 sentence, max 14 words, no exclamation points, no emoji.
- commitSummary: 1 sentence, max 18 words. Strip ticket IDs (TA-123, JIRA-4567 etc.). Make it human.
- Never use the words: "leveraged", "synergy", "crushed it", "amazing", "incredible".
- Never reuse exact phrases from the input data verbatim.

Output: ONLY a JSON object with keys weekTitle, vibe, commitSummary. No prose. No code fences.`;

export const buildPrompt = (name: string, signals: AllSignals): string => {
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
  return `Given this weekly activity, produce JSON with keys weekTitle, vibe, commitSummary.

Data:
${JSON.stringify(summary, null, 2)}`;
};

const extractJson = (text: string): unknown => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const braceMatch = candidate.match(/\{[\s\S]*\}/);
  return JSON.parse(braceMatch ? braceMatch[0] : candidate);
};

export const parseOverrides = (raw: unknown): CopyOverrides => {
  if (typeof raw !== "object" || !raw) return {};
  const r = raw as Record<string, unknown>;
  return {
    weekTitle: typeof r.weekTitle === "string" ? r.weekTitle : undefined,
    vibe: typeof r.vibe === "string" ? r.vibe : undefined,
    commitSummary: typeof r.commitSummary === "string" ? r.commitSummary : undefined,
  };
};

// ─── Gemini ─────────────────────────────────────────────────────────────────
export const callGemini = async (prompt: string): Promise<string | null> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? null;
};

// ─── Groq (free tier, fast) ─────────────────────────────────────────────────
export const callGroq = async (prompt: string): Promise<string | null> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt + "\n\nRespond with valid JSON only." },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`groq ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? null;
};

// ─── OpenRouter ─────────────────────────────────────────────────────────────
export const callOpenRouter = async (prompt: string): Promise<string | null> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENROUTER_MODEL ?? "qwen/qwen3-next-80b-a3b-instruct:free";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
      "X-Title": "Wrapped",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt + "\n\nRespond with valid JSON only." },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? null;
};

// ─── Anthropic Claude (paid fallback) ───────────────────────────────────────
let anthropicClient: Anthropic | null = null;
export const callAnthropic = async (prompt: string): Promise<string | null> => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey });
  const resp = await anthropicClient.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
};

// ─── Public API ─────────────────────────────────────────────────────────────
// Provider order via COPY_PROVIDERS (comma-separated). Default tries free
// options first, paid last; if all fail, returns empty and aggregator uses
// heuristics.
export const generateCopy = async (
  name: string,
  signals: AllSignals,
): Promise<CopyOverrides> => {
  const order = (process.env.COPY_PROVIDERS ?? "groq,gemini,openrouter,anthropic")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const prompt = buildPrompt(name, signals);
  const providers: Record<string, () => Promise<string | null>> = {
    gemini: () => callGemini(prompt),
    groq: () => callGroq(prompt),
    openrouter: () => callOpenRouter(prompt),
    anthropic: () => callAnthropic(prompt),
  };

  for (const providerName of order) {
    const fn = providers[providerName];
    if (!fn) continue;
    try {
      const text = await fn();
      if (!text) continue;
      const parsed = parseOverrides(extractJson(text));
      if (parsed.weekTitle || parsed.vibe || parsed.commitSummary) {
        console.log(`[copy] used ${providerName}`);
        return parsed;
      }
    } catch (e) {
      console.error(`[copy] ${providerName} failed:`, (e as Error).message);
    }
  }
  return {};
};
