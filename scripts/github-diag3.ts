import "dotenv/config";
import { Octokit } from "@octokit/rest";
import { findMember } from "../server/members/store.js";
import { parseWindow } from "../server/window.js";

const member = findMember("mayank")!;
const win = parseWindow("last-week");
const username = member.socials.github!.username;
const since = win.start.toISOString();
const until = win.end.toISOString();
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });

console.log(`Scanning all repos accessible to ${username} for commits in window…\n`);

const all = await gh.paginate(gh.repos.listForAuthenticatedUser, {
  per_page: 100,
  sort: "pushed",
  affiliation: "owner,collaborator,organization_member",
});

const pushedInWindow = all.filter((r) => {
  if (!r.pushed_at) return false;
  const t = new Date(r.pushed_at).getTime();
  return t >= win.start.getTime() - 7 * 86400000;
});
console.log(`Accessible repos: ${all.length} total, ${pushedInWindow.length} pushed-to within ~14 days.\n`);

let grandTotal = 0;
const allCommits: Array<{ repo: string; sha: string; msg: string; date: string }> = [];

for (const r of pushedInWindow) {
  try {
    const commits = await gh.paginate(gh.repos.listCommits, {
      owner: r.owner.login,
      repo: r.name,
      author: username,
      since,
      until,
      per_page: 100,
    });
    if (commits.length === 0) continue;
    grandTotal += commits.length;
    for (const c of commits) {
      allCommits.push({
        repo: r.full_name,
        sha: c.sha.slice(0, 7),
        msg: c.commit.message.split("\n")[0].slice(0, 80),
        date: c.commit.author?.date ?? "",
      });
    }
    console.log(`${r.full_name}  →  ${commits.length} commit(s)`);
  } catch (e) {
    // skip repos we can't read or that fail
  }
}

console.log(`\n${"=".repeat(72)}`);
console.log(`GRAND TOTAL: ${grandTotal} commits across ${pushedInWindow.length} candidate repos\n`);
console.log("Full list:");
for (const c of allCommits.sort((a, b) => b.date.localeCompare(a.date))) {
  console.log(`  ${c.date}  ${c.repo.padEnd(45)} ${c.sha}  ${c.msg}`);
}
