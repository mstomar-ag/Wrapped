import { WebClient } from "@slack/web-api";
import { Member } from "./types";
import { findMember, upsertMember } from "./store";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "user";

const slackClient = () => {
  const token = process.env.SLACK_BOT_TOKEN;
  return token ? new WebClient(token) : null;
};

// Parse a /wrapped target like "<@U123|alice>" (Slack-encoded) or "@alice" or "alice"
export const parseSlackMention = (raw: string): { userId?: string; handle?: string } => {
  const m = raw.match(/^<@([A-Z0-9]+)(\|([^>]+))?>$/);
  if (m) return { userId: m[1], handle: m[3] };
  return { handle: raw.replace(/^@/, "") };
};

// Look up a member; if unknown, try to auto-create from Slack's users.info.
// This is the magic that makes /wrapped @anyone work without admin pre-registration.
export const resolveOrDiscover = async (raw: string): Promise<Member | undefined> => {
  const { userId, handle } = parseSlackMention(raw);

  const existing = findMember(userId ?? handle ?? "");
  if (existing) return existing;

  const slack = slackClient();
  if (!slack || !userId) return undefined;

  try {
    const info = await slack.users.info({ user: userId });
    const u = info.user;
    if (!u) return undefined;

    const name = u.profile?.real_name || u.real_name || u.name || handle || userId;
    const slackHandle = u.name ?? handle ?? userId;
    const email = u.profile?.email;

    // Best-effort guesses for GitHub: many devs reuse their slack handle.
    // Admin can correct this later via `/wrapped link <user> github <username>`.
    const member: Member = {
      id: slugify(slackHandle),
      name,
      socials: {
        slack: { userId, handle: slackHandle },
        github: { username: slackHandle },
        email,
      },
    };
    return upsertMember(member);
  } catch {
    return undefined;
  }
};
