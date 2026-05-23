/**
 * Fetch commit + PR activity for every member with a GitHub username.
 *
 *   npm run github:history
 *   npm run github:history -- last-week
 *   npm run github:history -- this-month mayank
 */
import "dotenv/config";
import { Octokit } from "@octokit/rest";
import { listMembers } from "../server/members/store.js";
import { parseWindow } from "../server/window.js";
import { collectGitHub } from "../server/collectors/github.js";
import type { Member } from "../server/members/types.js";
import type { DateWindow } from "../server/collectors/types.js";

const [, , windowArg, memberFilter] = process.argv;
const win = parseWindow(windowArg ?? "last-week");
const sinceDate = win.start.toISOString().slice(0, 10);
const untilDate = win.end.toISOString().slice(0, 10);

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("GITHUB_TOKEN is not set in .env");
  process.exit(1);
}

const gh = new Octokit({ auth: token });

type PullRequestRow = {
  repo: string;
  number: number;
  title: string;
  state: string;
  created: string;
  merged: boolean;
  url: string;
};

const fetchPullRequests = async (
  username: string,
  win: DateWindow,
): Promise<{ total: number; items: PullRequestRow[] }> => {
  const org = process.env.GITHUB_ORG?.trim();
  const orgClause = org ? ` org:${org}` : "";
  const q = `author:${username} type:pr created:${sinceDate}..${untilDate}${orgClause}`;

  const res = await gh.search.issues({
    q,
    per_page: 100,
    sort: "created",
    order: "desc",
  });

  const items: PullRequestRow[] = [];
  for (const item of res.data.items ?? []) {
    if (!item.pull_request) continue;
    const parts = item.repository_url.split("/");
    const repo = `${parts.at(-2)}/${parts.at(-1)}`;
    items.push({
      repo,
      number: item.number,
      title: item.title,
      state: item.state,
      created: item.created_at,
      merged: item.pull_request.merged_at != null,
      url: item.html_url,
    });
  }

  return { total: res.data.total_count ?? items.length, items };
};

const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);

const runMember = async (member: Member) => {
  const username = member.socials.github?.username;
  if (!username) {
    console.log(`\n${member.name} — no GitHub username, skipped`);
    return;
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log(`${member.name} (@${username})`);
  console.log(`Window: ${sinceDate} → ${untilDate}`);
  console.log("-".repeat(72));

  const signals = await collectGitHub(member, win);
  if (!signals) {
    console.log("  Commits: (collector returned nothing — check token / username)");
  } else {
    console.log(`  Commits (search):     ${signals.commitCount}`);
    console.log(`  Lines +/-:            +${signals.additions} / -${signals.deletions}`);
    if (signals.topCommit) {
      const t = signals.topCommit;
      console.log(`  Top commit:           ${t.repo} ${t.sha} — ${t.message.slice(0, 60)}`);
    }
  }

  try {
    const prs = await fetchPullRequests(username, win);
    console.log(`  Pull requests:        ${prs.total}`);
    for (const pr of prs.items.slice(0, 15)) {
      const tag = pr.merged ? "merged" : pr.state;
      console.log(
        `    ${pad(pr.repo, 36)} #${String(pr.number).padStart(4)}  ${tag.padEnd(7)}  ${pr.title.slice(0, 40)}`,
      );
    }
    if (prs.items.length > 15) {
      console.log(`    … and ${prs.items.length - 15} more`);
    }
  } catch (e) {
    console.log(`  Pull requests:        error — ${(e as Error).message}`);
  }
};

const main = async () => {
  const me = await gh.request("GET /user");
  console.log(`Token user: ${me.data.login}`);
  console.log(`Scopes:     ${me.headers["x-oauth-scopes"] ?? "(fine-grained)"}`);
  if (process.env.GITHUB_ORG) {
    console.log(`Org filter: ${process.env.GITHUB_ORG} (PR search only)`);
  }

  let members = listMembers().filter((m) => m.socials.github?.username);
  if (memberFilter) {
    const k = memberFilter.toLowerCase();
    members = members.filter(
      (m) =>
        m.id === k ||
        m.socials.github?.username.toLowerCase() === k ||
        m.name.toLowerCase().includes(k),
    );
    if (!members.length) {
      console.error(`No member matching "${memberFilter}" with a GitHub username`);
      process.exit(1);
    }
  }

  console.log(`Members with GitHub: ${members.length}`);

  for (const member of members) {
    await runMember(member);
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log("Done.");
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
