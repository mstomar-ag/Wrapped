import { WebClient } from "@slack/web-api";
import { Member } from "./types";
import { findMember, listMembers, upsertMember } from "./store";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "user";

export type SlackSyncResult = {
  added: number;
  updated: number;
  skipped: number;
  total: number;
};

export const syncMembersFromSlack = async (): Promise<SlackSyncResult> => {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");

  const slack = new WebClient(token);
  let cursor: string | undefined;
  let added = 0;
  let updated = 0;
  let skipped = 0;

  do {
    const res = await slack.users.list({ limit: 200, cursor });
    for (const u of res.members ?? []) {
      if (u.deleted || u.is_bot || !u.id || u.id === "USLACKBOT") {
        skipped++;
        continue;
      }
      const slackHandle = u.name;
      if (!slackHandle) {
        skipped++;
        continue;
      }

      const userId = u.id;
      const id = slugify(slackHandle);
      const name = u.profile?.real_name || u.real_name || slackHandle;
      const email = u.profile?.email;

      const existing = findMember(userId) ?? findMember(id) ?? findMember(slackHandle);

      const socials: Member["socials"] = {
        ...existing?.socials,
        slack: { userId, handle: slackHandle },
      };
      if (email) socials.email = email;
      if (!existing?.socials.github) {
        socials.github = { username: slackHandle };
      }

      const member: Member = {
        id: existing?.id ?? id,
        name,
        role: existing?.role,
        socials,
      };

      if (existing) updated++;
      else added++;
      upsertMember(member);
    }
    cursor = res.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return { added, updated, skipped, total: listMembers().length };
};
