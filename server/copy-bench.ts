import "dotenv/config";
import { findMember } from "./members/store";
import { parseWindow } from "./window";
import { collectAll } from "./aggregator";
import {
  buildPrompt,
  callGemini,
  callGroq,
  callOpenRouter,
  callAnthropic,
  parseOverrides,
} from "./copy";

const [memberArg, windowArg] = process.argv.slice(2);
if (!memberArg) {
  console.error("usage: npx tsx server/copy-bench.ts <member> [window]");
  process.exit(1);
}
const member = findMember(memberArg);
if (!member) {
  console.error(`unknown member: ${memberArg}`);
  process.exit(1);
}

const win = parseWindow(windowArg);
console.log(`collecting signals for ${member.name}…`);
const signals = await collectAll(member, win);
const prompt = buildPrompt(member.name, signals);

console.log("=".repeat(72));
console.log("Comparing providers (each gets the same prompt)\n");

const providers = [
  { name: "Gemini    ", fn: callGemini },
  { name: "Groq      ", fn: callGroq },
  { name: "OpenRouter", fn: callOpenRouter },
  { name: "Anthropic ", fn: callAnthropic },
];

const extract = (text: string): unknown => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const braceMatch = candidate.match(/\{[\s\S]*\}/);
  return JSON.parse(braceMatch ? braceMatch[0] : candidate);
};

for (const { name, fn } of providers) {
  const t0 = Date.now();
  try {
    const raw = await fn(prompt);
    const ms = Date.now() - t0;
    if (!raw) {
      console.log(`[${name}] skipped (no key)`);
      continue;
    }
    const parsed = parseOverrides(extract(raw));
    console.log(`[${name}] ${ms}ms`);
    console.log(`  weekTitle:     ${parsed.weekTitle ?? "(missing)"}`);
    console.log(`  vibe:          ${parsed.vibe ?? "(missing)"}`);
    console.log(`  commitSummary: ${parsed.commitSummary ?? "(missing)"}`);
    console.log();
  } catch (e) {
    console.log(`[${name}] error: ${(e as Error).message}\n`);
  }
}
