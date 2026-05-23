import crypto from "node:crypto";
import { getProvider } from "./providers";
import { saveTokens } from "./tokens";

// In-memory state map. For production multi-instance, swap for Redis.
const stateStore = new Map<string, { memberId: string; provider: string; createdAt: number }>();
const STATE_TTL_MS = 10 * 60 * 1000;

const pruneStates = () => {
  const now = Date.now();
  for (const [k, v] of stateStore) {
    if (now - v.createdAt > STATE_TTL_MS) stateStore.delete(k);
  }
};

export const buildAuthUrl = (
  providerName: string,
  memberId: string,
  redirectUri: string,
): string | null => {
  pruneStates();
  const provider = getProvider(providerName);
  if (!provider) return null;
  const clientId = process.env[provider.clientIdEnv];
  if (!clientId) return null;

  const state = crypto.randomBytes(16).toString("hex");
  stateStore.set(state, { memberId, provider: providerName, createdAt: Date.now() });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: provider.scopes.join(" "),
    state,
    access_type: "offline", // google
    prompt: "consent",
  });
  return `${provider.authUrl}?${params}`;
};

export const handleCallback = async (
  providerName: string,
  code: string,
  state: string,
  redirectUri: string,
): Promise<{ ok: true; memberId: string } | { ok: false; error: string }> => {
  pruneStates();
  const stateInfo = stateStore.get(state);
  if (!stateInfo) return { ok: false, error: "invalid or expired state" };
  if (stateInfo.provider !== providerName) return { ok: false, error: "state/provider mismatch" };
  stateStore.delete(state);

  const provider = getProvider(providerName);
  if (!provider) return { ok: false, error: "unknown provider" };
  const clientId = process.env[provider.clientIdEnv];
  const clientSecret = process.env[provider.clientSecretEnv];
  if (!clientId || !clientSecret) return { ok: false, error: "provider not configured" };

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `token exchange failed: ${errText.slice(0, 200)}` };
  }

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!json.access_token) return { ok: false, error: "no access_token returned" };

  saveTokens(stateInfo.memberId, providerName, {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
    scope: json.scope,
  });

  return { ok: true, memberId: stateInfo.memberId };
};
