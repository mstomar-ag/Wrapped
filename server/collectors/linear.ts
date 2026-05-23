import { Member } from "../members/types";
import { DateWindow } from "./types";

export type LinearSignals = {
  issuesCompleted: number;
  issuesCreated: number;
  topProject: { name: string; count: number } | null;
  topIssue: { title: string; url: string; team: string } | null;
};

const LINEAR_API = "https://api.linear.app/graphql";

export const collectLinear = async (
  member: Member,
  win: DateWindow,
): Promise<LinearSignals | null> => {
  const apiKey = process.env.LINEAR_API_KEY;
  const linearEmail = member.socials.linear?.email ?? member.socials.email;
  if (!apiKey || !linearEmail) return null;

  // 1. Look up user by email
  const userQuery = `
    query($email: String!) {
      users(filter: { email: { eq: $email } }) { nodes { id name email } }
    }`;
  const userRes = await gql(apiKey, userQuery, { email: linearEmail });
  const userId = userRes?.data?.users?.nodes?.[0]?.id;
  if (!userId) return null;

  // 2. Issues completed in window (assigned to user, completedAt in range)
  const completedQuery = `
    query($userId: ID!, $from: DateTimeOrDuration!, $to: DateTimeOrDuration!) {
      issues(
        filter: {
          assignee: { id: { eq: $userId } }
          completedAt: { gte: $from, lte: $to }
        }
        first: 100
      ) {
        nodes {
          title
          url
          project { name }
          team { name }
          estimate
        }
      }
    }`;
  const completed = await gql(apiKey, completedQuery, {
    userId,
    from: win.start.toISOString(),
    to: win.end.toISOString(),
  });
  const completedIssues = completed?.data?.issues?.nodes ?? [];

  // 3. Issues created in window
  const createdQuery = `
    query($userId: ID!, $from: DateTimeOrDuration!, $to: DateTimeOrDuration!) {
      issues(
        filter: {
          creator: { id: { eq: $userId } }
          createdAt: { gte: $from, lte: $to }
        }
        first: 100
      ) { nodes { id } }
    }`;
  const created = await gql(apiKey, createdQuery, {
    userId,
    from: win.start.toISOString(),
    to: win.end.toISOString(),
  });
  const createdCount = created?.data?.issues?.nodes?.length ?? 0;

  const projectCounts = new Map<string, number>();
  for (const issue of completedIssues) {
    const pname = issue.project?.name ?? "(no project)";
    projectCounts.set(pname, (projectCounts.get(pname) ?? 0) + 1);
  }
  const topProjectEntry = [...projectCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const topIssue = [...completedIssues].sort((a, b) => (b.estimate ?? 0) - (a.estimate ?? 0))[0];

  return {
    issuesCompleted: completedIssues.length,
    issuesCreated: createdCount,
    topProject: topProjectEntry ? { name: topProjectEntry[0], count: topProjectEntry[1] } : null,
    topIssue: topIssue
      ? { title: topIssue.title, url: topIssue.url, team: topIssue.team?.name ?? "" }
      : null,
  };
};

type GqlResponse = {
  data?: {
    users?: { nodes?: Array<{ id: string; name: string; email: string }> };
    issues?: {
      nodes?: Array<{
        id?: string;
        title: string;
        url: string;
        estimate?: number;
        project?: { name?: string };
        team?: { name?: string };
      }>;
    };
  };
};

const gql = async (
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<GqlResponse | null> => {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<GqlResponse>;
};
