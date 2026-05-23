import { Member } from "../members/types";
import { DateWindow, XSignals } from "./types";

export const collectX = async (member: Member, win: DateWindow): Promise<XSignals | null> => {
  const token = process.env.X_BEARER_TOKEN;
  const handle = member.socials.x?.handle;
  if (!token || !handle) return null;

  const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${handle}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return null;
  const userJson = (await userRes.json()) as { data?: { id: string } };
  const userId = userJson.data?.id;
  if (!userId) return null;

  const params = new URLSearchParams({
    max_results: "100",
    start_time: win.start.toISOString(),
    end_time: win.end.toISOString(),
    "tweet.fields": "public_metrics,created_at",
  });
  const tweetsRes = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!tweetsRes.ok) return null;
  const tweetsJson = (await tweetsRes.json()) as {
    data?: Array<{
      text: string;
      public_metrics?: { like_count?: number; retweet_count?: number };
    }>;
  };

  const tweets = tweetsJson.data ?? [];
  const sorted = [...tweets].sort((a, b) => {
    const la = (a.public_metrics?.like_count ?? 0) + (a.public_metrics?.retweet_count ?? 0);
    const lb = (b.public_metrics?.like_count ?? 0) + (b.public_metrics?.retweet_count ?? 0);
    return lb - la;
  });

  return {
    tweets: tweets.length,
    topTweet: sorted[0]?.text ?? null,
  };
};
