import "dotenv/config";
import { listMembers, upsertMember, updateSocials, deleteMember, findMember } from "./store";
import { syncMembersFromSlack } from "./sync-slack";
import { Member } from "./types";

const [cmd, ...rest] = process.argv.slice(2);

const argMap = (args: string[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
      out[key] = val;
    }
  }
  return out;
};

const usage = () => {
  console.log(`Usage:
  npm run member -- list
  npm run member -- sync-slack
  npm run member -- add --name "Alice" --slack alice [--slack-id U123] [--github alice-dev] [--x alice] [--email a@x.com]
  npm run member -- link <id> [--github name] [--x handle] [--email e] [--linkedin h]
  npm run member -- remove <id>`);
};

const run = async () => {
switch (cmd) {
  case "list": {
    const all = listMembers();
    if (!all.length) console.log("(empty)");
    for (const m of all) {
      const s = m.socials;
      console.log(
        `${m.id.padEnd(16)} ${m.name.padEnd(20)} slack=${s.slack?.handle ?? "-"} github=${s.github?.username ?? "-"} x=${s.x?.handle ?? "-"} email=${s.email ?? "-"}`,
      );
    }
    break;
  }
  case "add": {
    const a = argMap(rest);
    if (!a.name || !a.slack) {
      usage();
      process.exit(1);
    }
    const id = a.slack.toLowerCase();
    const m: Member = {
      id,
      name: a.name,
      role: a.role,
      socials: {
        slack: { handle: a.slack, userId: a["slack-id"] },
        github: a.github ? { username: a.github } : undefined,
        x: a.x ? { handle: a.x } : undefined,
        linkedin: a.linkedin ? { handle: a.linkedin } : undefined,
        email: a.email,
      },
    };
    upsertMember(m);
    console.log(`added ${id}`);
    break;
  }
  case "link": {
    const [id, ...flags] = rest;
    if (!id) {
      usage();
      process.exit(1);
    }
    const a = argMap(flags);
    const existing = findMember(id);
    if (!existing) {
      console.error(`no member: ${id}`);
      process.exit(1);
    }
    updateSocials(existing.id, {
      github: a.github ? { username: a.github } : undefined,
      x: a.x ? { handle: a.x } : undefined,
      linkedin: a.linkedin ? { handle: a.linkedin } : undefined,
      email: a.email,
    });
    console.log(`updated ${existing.id}`);
    break;
  }
  case "remove": {
    const [id] = rest;
    if (!id) {
      usage();
      process.exit(1);
    }
    const ok = deleteMember(id);
    console.log(ok ? `removed ${id}` : `no member: ${id}`);
    break;
  }
  case "sync-slack": {
    const r = await syncMembersFromSlack();
    console.log(
      `Synced ${r.total} members from Slack (${r.added} new, ${r.updated} updated, ${r.skipped} skipped bots/deleted)`,
    );
    break;
  }
  default:
    usage();
    process.exit(1);
}
};

run().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
