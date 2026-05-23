import crypto from "node:crypto";

// Implements https://api.slack.com/authentication/verifying-requests-from-slack
export const verifySlackSignature = (
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
): boolean => {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return false;
  if (!timestamp || !signature) return false;

  // Reject if older than 5 min (replay protection)
  const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (Number.isNaN(skew) || skew > 60 * 5) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const mine = "v0=" + crypto.createHmac("sha256", secret).update(base).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(mine), Buffer.from(signature));
  } catch {
    return false;
  }
};
