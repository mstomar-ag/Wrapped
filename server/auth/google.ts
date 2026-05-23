import crypto from "node:crypto";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";

// ─── Session JWT (HS256, signed with ENCRYPTION_KEY) ─────────────────────────
export type Session = {
  email: string;
  name: string;
  picture?: string;
  iat: number;
  exp: number;
};

const COOKIE = "wrapped_session";
const SESSION_DAYS = 7;

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const b64urlDecode = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const secret = (): Buffer => {
  const raw = process.env.ENCRYPTION_KEY ?? process.env.SESSION_SECRET;
  if (!raw) throw new Error("ENCRYPTION_KEY (or SESSION_SECRET) must be set for sign-in to work");
  return crypto.createHash("sha256").update(raw).digest();
};

const signSession = (payload: Omit<Session, "iat" | "exp">): string => {
  const now = Math.floor(Date.now() / 1000);
  const body: Session = { ...payload, iat: now, exp: now + SESSION_DAYS * 86400 };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadEnc = b64url(JSON.stringify(body));
  const sig = b64url(
    crypto.createHmac("sha256", secret()).update(`${header}.${payloadEnc}`).digest(),
  );
  return `${header}.${payloadEnc}.${sig}`;
};

const verifySession = (token: string): Session | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = b64url(
    crypto.createHmac("sha256", secret()).update(`${header}.${payload}`).digest(),
  );
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const body = JSON.parse(b64urlDecode(payload).toString()) as Session;
    if (Math.floor(Date.now() / 1000) > body.exp) return null;
    return body;
  } catch {
    return null;
  }
};

export const setSessionCookie = (c: Context, payload: Omit<Session, "iat" | "exp">) => {
  setCookie(c, COOKIE, signSession(payload), {
    httpOnly: true,
    sameSite: "Lax",
    secure: (process.env.PUBLIC_BASE_URL ?? "").startsWith("https"),
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
};

export const clearSessionCookie = (c: Context) => deleteCookie(c, COOKIE, { path: "/" });

export const getSession = (c: Context): Session | null => {
  const raw = getCookie(c, COOKIE);
  return raw ? verifySession(raw) : null;
};

// ─── Org-restricted OAuth flow ───────────────────────────────────────────────
const ORG_DOMAIN = "agrim.ai";
const SCOPES = ["openid", "email", "profile"].join(" ");
const stateStore = new Map<string, { createdAt: number; next: string }>();
const STATE_TTL_MS = 10 * 60 * 1000;

const prune = () => {
  const now = Date.now();
  for (const [k, v] of stateStore) if (now - v.createdAt > STATE_TTL_MS) stateStore.delete(k);
};

const callbackUrl = (): string => {
  const base = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  return `${base}/api/auth/google/callback`;
};

export const startAuthFlow = (nextPath = "/"): { url: string } | null => {
  prune();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  const state = crypto.randomBytes(16).toString("hex");
  stateStore.set(state, { createdAt: Date.now(), next: nextPath });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl(),
    scope: SCOPES,
    state,
    access_type: "online",
    prompt: "select_account",
    hd: ORG_DOMAIN, // hosted-domain hint (UI only — must still be enforced server-side)
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
};

type TokenResp = { access_token?: string; id_token?: string };

type GoogleProfile = { email?: string; email_verified?: boolean; name?: string; picture?: string; hd?: string };

const decodeJwtPayload = (jwt: string): GoogleProfile | null => {
  try {
    return JSON.parse(b64urlDecode(jwt.split(".")[1]).toString()) as GoogleProfile;
  } catch {
    return null;
  }
};

export const handleAuthCallback = async (
  code: string,
  state: string,
): Promise<
  | { ok: true; profile: { email: string; name: string; picture?: string }; next: string }
  | { ok: false; error: string; status: number }
> => {
  prune();
  const stateInfo = stateStore.get(state);
  if (!stateInfo) return { ok: false, error: "invalid or expired state", status: 400 };
  stateStore.delete(state);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { ok: false, error: "google sign-in not configured", status: 500 };

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(),
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    return { ok: false, error: `token exchange failed: ${body.slice(0, 200)}`, status: 502 };
  }
  const tok = (await tokenRes.json()) as TokenResp;
  const profile = tok.id_token ? decodeJwtPayload(tok.id_token) : null;
  if (!profile?.email) return { ok: false, error: "no email from Google", status: 400 };
  if (profile.email_verified === false) return { ok: false, error: "email not verified", status: 403 };

  // Enforce domain server-side (UI hint via hd= is not authoritative)
  const email = profile.email.toLowerCase();
  if (!email.endsWith(`@${ORG_DOMAIN}`)) {
    return { ok: false, error: `Only @${ORG_DOMAIN} accounts can sign in.`, status: 403 };
  }

  return {
    ok: true,
    profile: { email, name: profile.name ?? email, picture: profile.picture },
    next: stateInfo.next,
  };
};

// ─── Middleware to gate /api/* (except a whitelist) ──────────────────────────
const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/auth",
  "/api/slack/command",
];

export const requireSignIn: MiddlewareHandler = async (c, next) => {
  const url = new URL(c.req.url);
  const path = url.pathname;

  // Bypass for non-API paths (frontend itself handles its own auth gate)
  if (!path.startsWith("/api/")) return next();
  if (PUBLIC_API_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return next();

  // Sign-in not configured → leave open in dev (no GOOGLE_CLIENT_ID)
  if (!process.env.GOOGLE_CLIENT_ID) return next();

  const session = getSession(c);
  if (!session) return c.json({ error: "not authenticated" }, 401);
  c.set("session", session);
  return next();
};
