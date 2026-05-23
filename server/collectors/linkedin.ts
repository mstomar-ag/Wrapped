import { Member } from "../members/types";
import { DateWindow, LinkedInSignals } from "./types";

// LinkedIn's API requires OAuth on a per-user basis. There is no clean
// "fetch a teammate's posts" endpoint without their consent.
// We expose this collector so the wiring is in place; once OAuth tokens
// are stored per member (e.g. via a self-link flow described in v2 of
// wrapped.md), this will go live.
export const collectLinkedIn = async (
  _member: Member,
  _win: DateWindow,
): Promise<LinkedInSignals | null> => {
  const userToken = process.env.LINKEDIN_USER_TOKEN; // set per-member in v2
  if (!userToken) return null;
  // Placeholder: real implementation hits
  // GET https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:person:{id})
  // and filters by createdTime within `win`.
  return { posts: 0, topPost: null };
};
