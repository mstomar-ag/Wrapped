import "dotenv/config";
import { Octokit } from "@octokit/rest";
import { findMember } from "../server/members/store.js";
import { parseWindow } from "../server/window.js";

const member = findMember("mayank")!;
const win = parseWindow("last-week");
const username = member.socials.github!.username;
const since = win.start.toISOString();
const until = win.end.toISOString();
const sinceDate = since.slice(0, 10);
const untilDate = until.slice(0, 10);

console.log(`User:  ${username}`);
console.log(`Range: ${since} → ${until}`);
console.log("=".repeat(72));

const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });

// 1) Original query (committer-date)
const q1 = `author:${username} committer-date:${sinceDate}..${untilDate}`;
const r1 = await gh.search.commits({ q: q1, per_page: 100 });
console.log(`\n[Query 1] author + committer-date  →  ${r1.data.total_count} commits`);
console.log(`  q: ${q1}`);
listRepos(r1.data.items);

// 2) Author-date (what user usually thinks of as "when I wrote it")
const q2 = `author:${username} author-date:${sinceDate}..${untilDate}`;
const r2 = await gh.search.commits({ q: q2, per_page: 100 });
console.log(`\n[Query 2] author + author-date     →  ${r2.data.total_count} commits`);
console.log(`  q: ${q2}`);
listRepos(r2.data.items);

// 3) Committer (when *you* are the one merging/squashing)
const q3 = `committer:${username} committer-date:${sinceDate}..${untilDate}`;
const r3 = await gh.search.commits({ q: q3, per_page: 100 });
console.log(`\n[Query 3] committer + committer-date → ${r3.data.total_count} commits`);
console.log(`  q: ${q3}`);
listRepos(r3.data.items);

// 4) Events API — your contribution graph reads this
const events = await gh.activity.listPublicEventsForUser({ username, per_page: 100 });
const pushEvents = events.data.filter((e) => e.type === "PushEvent");
const inWindow = pushEvents.filter((e) => {
  const t = new Date(e.created_at!).getTime();
  return t >= win.start.getTime() && t <= win.end.getTime();
});
const commitShas = new Set<string>();
for (const e of inWindow) {
  const payload = e.payload as { commits?: Array<{ sha: string; message: string; author: { name: string; email: string } }> };
  for (const c of payload.commits ?? []) {
    if (c.author?.email && c.author.email.toLowerCase().includes(username.toLowerCase())) {
      commitShas.add(c.sha);
    } else {
      commitShas.add(c.sha); // include all push events
    }
  }
}
console.log(`\n[Query 4] PushEvents in window     →  ${commitShas.size} commits (public events only)`);

// 5) Token scope check
const meta = await gh.request("GET /user");
console.log(`\n[Token info]`);
console.log(`  authenticated as: ${meta.data.login}`);
const scopes = meta.headers["x-oauth-scopes"];
console.log(`  scopes: ${scopes ?? "(fine-grained or none)"}`);

// 6) Email assoc
const emails = await gh
  .request("GET /user/emails")
  .catch(() => null);
if (emails) {
  console.log(`  emails on token's account: ${emails.data.map((e: { email: string }) => e.email).join(", ")}`);
}

function listRepos(items: { repository: { full_name: string }; sha: string; commit: { message: string } }[]) {
  const byRepo = new Map<string, number>();
  for (const it of items) byRepo.set(it.repository.full_name, (byRepo.get(it.repository.full_name) ?? 0) + 1);
  for (const [repo, n] of byRepo) console.log(`    ${repo.padEnd(50)} ${n} commits`);
}
