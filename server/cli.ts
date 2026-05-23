import "dotenv/config";
import { findMember, listMembers } from "./members/store";
import { parseWindow } from "./window";
import { collectAll, buildWrappedData } from "./aggregator";
import { generateCopy } from "./copy";
import { renderWrapped } from "./render";

// Usage: npm run wrap -- <member> [window] [--render]
const [memberArg, windowArg, ...rest] = process.argv.slice(2);
const shouldRender = rest.includes("--render");

if (!memberArg) {
  console.error("usage: npm run wrap -- <member> [window] [--render]");
  console.error(
    "members:",
    listMembers()
      .map((m) => m.id)
      .join(", "),
  );
  process.exit(1);
}

const member = findMember(memberArg);
if (!member) {
  console.error(`unknown member: ${memberArg}`);
  process.exit(1);
}

const win = parseWindow(windowArg);
console.log(
  `collecting for ${member.name} from ${win.start.toISOString()} to ${win.end.toISOString()}`,
);

const signals = await collectAll(member, win);
console.log("signals:", JSON.stringify(signals, null, 2));

const copy = await generateCopy(member.name, signals).catch(() => ({}));
if (Object.keys(copy).length) console.log("llm copy:", copy);

const data = buildWrappedData(member, win, signals, copy);
console.log("wrappedData:", JSON.stringify(data, null, 2));

if (shouldRender) {
  console.log("rendering…");
  const file = await renderWrapped(data, { displayName: member.name });
  console.log(`done: ${file}`);
}
