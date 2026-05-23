import { Octokit } from "@octokit/rest";
import { Member } from "../members/types";
import { DateWindow, GitHubSignals } from "./types";

let octokit: Octokit | null = null;
const getOctokit = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  if (!octokit) octokit = new Octokit({ auth: token });
  return octokit;
};

export const collectGitHub = async (
  member: Member,
  win: DateWindow,
): Promise<GitHubSignals | null> => {
  const gh = getOctokit();
  const username = member.socials.github?.username;
  if (!gh || !username) return null;

  const since = win.start.toISOString();
  const until = win.end.toISOString();

  const sinceDate = since.slice(0, 10);
  const untilDate = until.slice(0, 10);
  const search = await gh.search.commits({
    q: `author:${username} author-date:${sinceDate}..${untilDate}`,
    per_page: 100,
    sort: "author-date",
    order: "desc",
  });

  let additions = 0;
  let deletions = 0;
  let topCommit: GitHubSignals["topCommit"] = null;
  let topScore = -1;

  for (const item of search.data.items ?? []) {
    const [owner, repo] = item.repository.full_name.split("/");
    try {
      const detail = await gh.repos.getCommit({ owner, repo, ref: item.sha });
      const stats = detail.data.stats;
      const add = stats?.additions ?? 0;
      const del = stats?.deletions ?? 0;
      additions += add;
      deletions += del;
      const score = add + del;
      if (score > topScore) {
        topScore = score;
        topCommit = {
          repo: item.repository.full_name,
          sha: item.sha.slice(0, 7),
          message: item.commit.message.split("\n")[0],
          additions: add,
          deletions: del,
        };
      }
    } catch {
      // skip private or inaccessible repos
    }
  }

  return {
    commitCount: search.data.total_count ?? search.data.items?.length ?? 0,
    additions,
    deletions,
    topCommit,
  };
};
