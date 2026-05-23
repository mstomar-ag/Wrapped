import "dotenv/config";
import { findMember } from "../server/members/store";
import { parseWindow } from "../server/window";
import { countSlackMessages } from "../server/collectors/slack";

const [memberArg, windowArg] = process.argv.slice(2);
if (!memberArg) {
  console.error("usage: npm run slack:diag -- <member> [window]");
  process.exit(1);
}

const member = findMember(memberArg);
if (!member) {
  console.error(`unknown member: ${memberArg}`);
  process.exit(1);
}

const win = parseWindow(windowArg);
console.log(`member=${member.name} slack=${member.socials.slack?.userId ?? "—"}`);
console.log(`window=${win.start.toISOString()} → ${win.end.toISOString()}`);

const counts = await countSlackMessages(member, win);
if (!counts) {
  console.error("Slack not configured (SLACK_BOT_TOKEN or member slack userId missing)");
  process.exit(1);
}

console.log(JSON.stringify(counts, null, 2));
console.log(
  "\nIf merged is low vs what you expect: add search:read scope, invite the bot to private channels, reinstall the app.",
);
