import "dotenv/config";
import { listMembers } from "../server/members/store";
import { parseWindow, labelWindow } from "../server/window";
import { collectAll, buildWrappedData } from "../server/aggregator";
import { generateCopy } from "../server/copy";
import { renderWrapped } from "../server/render";

/**
 * Pre-render all members so Remotion bundle + content-hash cache are warm.
 * Re-runs with the same collected stats return instantly from out/cache/.by-hash/.
 *
 * usage: npm run warm-cache -- [window] [--copy]
 *   window defaults to all-time (12 months)
 */
const args = process.argv.slice(2);
const withCopy = args.includes("--copy");
const windowArg = args.find((a) => !a.startsWith("--")) ?? "all-time";
const win = parseWindow(windowArg);

console.log(`[warm-cache] window=${labelWindow(win)} copy=${withCopy}`);

const members = listMembers();
let ok = 0;
let fail = 0;

for (const member of members) {
  const t0 = Date.now();
  try {
    console.log(`\n[warm-cache] ${member.id} (${member.name})…`);
    const signals = await collectAll(member, win);
    const copy = withCopy ? await generateCopy(member.name, signals).catch(() => ({})) : {};
    const data = buildWrappedData(member, win, signals, copy);
    const file = await renderWrapped(data, { displayName: member.name });
    console.log(`[warm-cache] ${member.id} done ${Date.now() - t0}ms → ${file}`);
    ok++;
  } catch (e) {
    console.error(`[warm-cache] ${member.id} failed: ${(e as Error).message}`);
    fail++;
  }
}

console.log(`\n[warm-cache] finished ok=${ok} fail=${fail}`);
process.exit(fail > 0 ? 1 : 0);
