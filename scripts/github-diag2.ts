import "dotenv/config";
import { Octokit } from "@octokit/rest";
import { findMember } from "../server/members/store.js";
import { parseWindow } from "../server/window.js";

const member = findMember("mayank")!;
const win = parseWindow("last-week");
const username = member.socials.github!.username;
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });

// GraphQL: contributionsCollection — exact source for the contribution graph
const gql = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        restrictedContributionsCount
        commitContributionsByRepository(maxRepositories: 50) {
          repository { nameWithOwner isPrivate }
          contributions { totalCount }
        }
      }
    }
  }`;
const res = await gh.graphql<{
  user: {
    contributionsCollection: {
      totalCommitContributions: number;
      restrictedContributionsCount: number;
      commitContributionsByRepository: Array<{
        repository: { nameWithOwner: string; isPrivate: boolean };
        contributions: { totalCount: number };
      }>;
    };
  };
}>(gql, { login: username, from: win.start.toISOString(), to: win.end.toISOString() });

const c = res.user.contributionsCollection;
console.log(`Total commit contributions:        ${c.totalCommitContributions}`);
console.log(`Restricted (private+hidden):       ${c.restrictedContributionsCount}`);
console.log("Per-repository breakdown:");
for (const r of c.commitContributionsByRepository) {
  console.log(`  ${r.repository.nameWithOwner.padEnd(45)} ${r.repository.isPrivate ? "(private)" : "(public)"}  ${r.contributions.totalCount} commits`);
}

console.log("\n" + "=".repeat(72));
console.log("Now fetching real commit details from each repo…\n");

const since = win.start.toISOString();
const until = win.end.toISOString();
let grandTotal = 0;
for (const r of c.commitContributionsByRepository) {
  const [owner, repo] = r.repository.nameWithOwner.split("/");
  try {
    const commits = await gh.repos.listCommits({
      owner,
      repo,
      author: username,
      since,
      until,
      per_page: 100,
    });
    grandTotal += commits.data.length;
    console.log(`${r.repository.nameWithOwner} — listCommits returned ${commits.data.length}:`);
    for (const c of commits.data) {
      console.log(`  ${c.sha.slice(0, 7)}  ${c.commit.message.split("\n")[0].slice(0, 80)}`);
    }
    console.log();
  } catch (e) {
    console.log(`${r.repository.nameWithOwner} — error: ${(e as Error).message}`);
  }
}
console.log(`GRAND TOTAL via listCommits: ${grandTotal}`);
