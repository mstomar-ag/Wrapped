import { Member } from "../members/types";
import { DateWindow, EmailSignals } from "./types";

// Email collection assumes Gmail API access via OAuth per member.
// In v2 the self-link flow stores a refresh token alongside the member entry.
export const collectEmail = async (
  member: Member,
  _win: DateWindow,
): Promise<EmailSignals | null> => {
  const refresh = process.env.GMAIL_REFRESH_TOKEN; // per-member in v2
  if (!refresh || !member.socials.email) return null;
  // Placeholder. Real impl:
  // 1) exchange refresh -> access token at oauth2.googleapis.com/token
  // 2) GET gmail/v1/users/me/messages?q=after:{ts} before:{ts}
  // 3) count threads where from == member.email vs where to includes it
  return { sent: 0, received: 0 };
};
