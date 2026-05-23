import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { z } from "zod";

import {
  listMembers,
  findMember,
  updateSocials,
  upsertMember,
  deleteMember,
} from "./members/store";
import { resolveOrDiscover } from "./members/discover";
import { parseAny, parseRange, labelWindow } from "./window";
import { collectAll, buildWrappedData } from "./aggregator";
import { generateCopy } from "./copy";
import { verifySlackSignature } from "./slack/verify";
import { respondToSlashCommand } from "./slack/post";
import {
  startWrapForMember,
  startWrapForChannel,
  runWrapForMember,
  runWrapForChannel,
} from "./wrap-runner";
import { resolveChannel } from "./channels/lookup";
import { listEntries, getEntry, deleteEntry } from "./archive/store";
import { toPublicArchiveEntry } from "./archive/public";
import { resolveProjectPath, videoFileReady } from "./paths";
import { streamMp4File } from "./media";
import { SLACK_WRAP_ETA } from "./timezone";
import { readSchedule, writeSchedule } from "./scheduler/config";
import { startScheduler, restartScheduler, runWeekly } from "./scheduler/weekly";
import {
  clearSessionCookie,
  getSession,
  handleAuthCallback,
  requireSignIn,
  setSessionCookie,
  startAuthFlow,
} from "./auth/google";
import { DateWindow } from "./collectors/types";
import { bootstrapDataIfNeeded } from "./bootstrap-data";

const app = new Hono();

app.use(
  "*",
  logger((line) => console.log(`[${new Date().toISOString()}] ${line}`)),
);
app.use("*", requireSignIn);

// ─── Public ──────────────────────────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ ok: true }));
app.get("/health", (c) => c.json({ ok: true })); // legacy

// ─── Auth ────────────────────────────────────────────────────────────────────
app.get("/api/auth/google/start", (c) => {
  const next = c.req.query("next") || "/";
  const result = startAuthFlow(next);
  if (!result) return c.json({ error: "GOOGLE_CLIENT_ID not configured" }, 500);
  return c.redirect(result.url);
});

app.get("/api/auth/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  if (!code || !state) return c.text("missing code or state", 400);
  const result = await handleAuthCallback(code, state);
  if (!result.ok) {
    return c.html(loginRedirectHtml(result.error), result.status as 400 | 403 | 500);
  }
  setSessionCookie(c, result.profile);
  return c.redirect(result.next);
});

app.get("/api/auth/me", (c) => {
  const session = getSession(c);
  if (!session) return c.json({ authenticated: false });
  return c.json({
    authenticated: true,
    email: session.email,
    name: session.name,
    picture: session.picture,
  });
});

app.post("/api/auth/logout", (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});

// ─── Members ─────────────────────────────────────────────────────────────────
app.get("/api/members", (c) => c.json({ members: listMembers() }));

app.get("/api/members/:id", (c) => {
  const m = findMember(c.req.param("id"));
  return m ? c.json(m) : c.json({ error: "not found" }, 404);
});

app.post("/api/members", async (c) => {
  const body = await c.req.json();
  if (!body.id || !body.name) return c.json({ error: "id and name are required" }, 400);
  const m = upsertMember(body);
  return c.json(m);
});

app.patch("/api/members/:id", async (c) => {
  const body = await c.req.json();
  const id = c.req.param("id");
  // Allow patching socials AND top-level fields like name/role/joinDate
  if (body.socials) updateSocials(id, body.socials);
  const existing = findMember(id);
  if (!existing) return c.json({ error: "not found" }, 404);
  const merged = { ...existing, ...body, id: existing.id, socials: existing.socials };
  upsertMember(merged);
  return c.json(merged);
});

app.delete("/api/members/:id", (c) => c.json({ ok: deleteMember(c.req.param("id")) }));

// ─── Window resolution helpers ───────────────────────────────────────────────
const resolveWindowFromQuery = (
  c: { req: { query: (k: string) => string | undefined } },
  joinDate?: string,
): DateWindow => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const since = c.req.query("since");
  if (from) return parseRange(from, to);
  if (since) return parseAny(since, joinDate ? new Date(joinDate) : undefined);
  return parseAny(c.req.query("window"), joinDate ? new Date(joinDate) : undefined);
};

// ─── Wrapped — preview only (no render) ──────────────────────────────────────
const WrappedQuery = z.object({ member: z.string() });

app.get("/api/wrapped", async (c) => {
  const parsed = WrappedQuery.safeParse({ member: c.req.query("member") });
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const member = findMember(parsed.data.member);
  if (!member) return c.json({ error: "unknown member" }, 404);

  let win: DateWindow;
  try {
    win = resolveWindowFromQuery(c, member.joinDate);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
  const signals = await collectAll(member, win);
  const copy = await generateCopy(member.name, signals).catch(() => ({}));
  const data = buildWrappedData(member, win, signals, copy);
  return c.json({ data, signals });
});

// ─── Window preview (UI date picker) ─────────────────────────────────────────
app.post("/api/window/preview", async (c) => {
  const body = (await c.req.json()) as {
    window?: string;
    from?: string;
    to?: string;
    since?: string;
    joinDate?: string;
  };
  try {
    let win: DateWindow;
    if (body.from) win = parseRange(body.from, body.to);
    else if (body.since)
      win = parseAny(body.since, body.joinDate ? new Date(body.joinDate) : undefined);
    else win = parseAny(body.window, body.joinDate ? new Date(body.joinDate) : undefined);
    return c.json({
      label: labelWindow(win),
      from: win.start.toISOString(),
      to: win.end.toISOString(),
      preset: body.window ?? null,
    });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

// ─── Wrapped — async render, stored in archive ───────────────────────────────
app.post("/api/wrapped/generate", async (c) => {
  const body = (await c.req.json()) as {
    member: string;
    window?: string;
    from?: string;
    to?: string;
    since?: string;
  };
  const member = findMember(body.member);
  if (!member) return c.json({ error: "unknown member" }, 404);

  let win: DateWindow;
  try {
    if (body.from) win = parseRange(body.from, body.to);
    else if (body.since)
      win = parseAny(body.since, member.joinDate ? new Date(member.joinDate) : undefined);
    else
      win = parseAny(
        body.window ?? "last-week",
        member.joinDate ? new Date(member.joinDate) : undefined,
      );
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }

  const session = getSession(c);
  const entry = startWrapForMember({
    member,
    win,
    source: "ui",
    triggeredBy: session?.email,
    post: null,
  });
  return c.json({ id: entry.id, windowLabel: entry.windowLabel });
});

// ─── Channels — by name ──────────────────────────────────────────────────────
app.post("/api/channels/wrap", async (c) => {
  const body = (await c.req.json()) as {
    channel: string;
    window?: string;
    from?: string;
    to?: string;
    since?: string;
  };
  if (!body.channel) return c.json({ error: "channel (name or ID) is required" }, 400);

  let win: DateWindow;
  try {
    if (body.from) win = parseRange(body.from, body.to);
    else if (body.since) win = parseAny(body.since);
    else win = parseAny(body.window);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }

  const session = getSession(c);
  const entry = startWrapForChannel({
    channel: body.channel,
    win,
    source: "ui",
    triggeredBy: session?.email,
    post: null, // UI never auto-posts to Slack
  });
  return c.json({ id: entry.id, windowLabel: entry.windowLabel });
});

app.get("/api/channels/resolve/:name", async (c) => {
  const res = await resolveChannel(c.req.param("name"));
  return res ? c.json(res) : c.json({ error: "not found or no access" }, 404);
});

// ─── Archive ─────────────────────────────────────────────────────────────────
app.get("/api/archive", (c) => {
  const rawKind = c.req.query("kind");
  const kind = rawKind === "member" || rawKind === "channel" ? rawKind : undefined;
  const entries = listEntries({
    subject: c.req.query("subject"),
    kind,
    status: c.req.query("status") as never,
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : 100,
  });
  return c.json({ entries: entries.map(toPublicArchiveEntry) });
});

app.get("/api/archive/:id", (c) => {
  const e = getEntry(c.req.param("id"));
  return e ? c.json(toPublicArchiveEntry(e)) : c.json({ error: "not found" }, 404);
});

app.get("/api/archive/:id/video", (c) => {
  const e = getEntry(c.req.param("id"));
  if (!e?.filePath) return c.json({ error: "no video" }, 404);
  const filePath = resolveProjectPath(e.filePath);
  if (!videoFileReady(e.filePath)) return c.json({ error: "video file missing on server" }, 404);
  return streamMp4File(c, filePath);
});

app.delete("/api/archive/:id", (c) => c.json({ ok: deleteEntry(c.req.param("id")) }));

// ─── Schedule ────────────────────────────────────────────────────────────────
app.get("/api/schedule", (c) => c.json(readSchedule()));
app.post("/api/schedule", async (c) => {
  const body = await c.req.json();
  const cfg = writeSchedule(body);
  restartScheduler();
  return c.json(cfg);
});
app.post("/api/schedule/run-now", () => {
  runWeekly().catch((e) => console.error("[scheduler] run-now failed", e));
  return Response.json({ ok: true, message: "weekly run started" });
});

// ─── Slack slash command ─────────────────────────────────────────────────────
const publicBaseUrl = (): string => {
  const raw = process.env.PUBLIC_BASE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/$/, "");
};

const slackHelpText = (): string => {
  const base = publicBaseUrl();
  return [
    "*Wrapped — slash command help*",
    "",
    "Usage:",
    "• `/wrapped @user` — last week (default)",
    "• `/wrapped @user yesterday` | `today` | `last-week` | `last-month` | `last-quarter` | `all-time`",
    "• `/wrapped @user since-2024-01-15` — everything since that date",
    "• `/wrapped @user since-joined` — since their join date (must be set)",
    "• `/wrapped @user 2024-01-15..2024-06-01` — explicit range",
    "• `/wrapped #channel-name [window]` — wrap a whole channel",
    "• `/wrapped link @user github <handle>` — admin: fix an auto-discovered handle",
    "• `/wrapped dashboard` — link to the web dashboard",
    "• `/wrapped help` — show this message",
    "",
    `*Dashboard:* <${base}|${base}>`,
    "",
    "Estimated time:",
    `• ${SLACK_WRAP_ETA}`,
    "",
    "Every reel is also saved to the centralized archive (visible in the dashboard).",
  ].join("\n");
};

app.post("/api/slack/command", async (c) => {
  const raw = await c.req.text();
  const ok = verifySlackSignature(
    raw,
    c.req.header("x-slack-request-timestamp") ?? null,
    c.req.header("x-slack-signature") ?? null,
  );
  if (!ok && process.env.SLACK_SIGNING_SECRET) return c.text("invalid signature", 401);

  const params = new URLSearchParams(raw);
  const text = params.get("text") ?? "";
  const channelId = params.get("channel_id") ?? "";
  const slackUserId = params.get("user_id") ?? "";
  const responseUrl = params.get("response_url") ?? "";

  const tokens = text.trim().split(/\s+/).filter(Boolean);

  // /wrapped help
  if (tokens[0] === "help" || tokens.length === 0) {
    return c.json({ response_type: "ephemeral", text: slackHelpText() });
  }

  // /wrapped dashboard
  if (tokens[0] === "dashboard") {
    const base = publicBaseUrl();
    return c.json({
      response_type: "ephemeral",
      text: `*Wrapped dashboard*\n<${base}|Open dashboard> — generate wraps, browse the archive, manage members.`,
    });
  }

  // /wrapped link @user github <handle>
  if (tokens[0] === "link") {
    const [, target, source, value] = tokens;
    const member = await resolveOrDiscover(target ?? "");
    if (!member) return c.json({ response_type: "ephemeral", text: `Unknown user: ${target}` });
    const patch =
      source === "email"
        ? { email: value }
        : source === "github"
          ? { github: { username: value } }
          : source === "x"
            ? { x: { handle: value } }
            : source === "linkedin"
              ? { linkedin: { handle: value } }
              : null;
    if (!patch)
      return c.json({
        response_type: "ephemeral",
        text: "Usage: /wrapped link @user [github|x|linkedin|email] <value>",
      });
    updateSocials(member.id, patch);
    return c.json({
      response_type: "ephemeral",
      text: `Linked ${source}=${value} to ${member.name}.`,
    });
  }

  // /wrapped #channel-name [window]
  const channelArg = tokens[0];
  const isChannelArg = channelArg.startsWith("#") || channelArg.startsWith("<#");
  if (isChannelArg) {
    const winToken = tokens.slice(1).join(" ") || undefined;
    let win: DateWindow;
    try {
      win = parseAny(winToken);
    } catch (e) {
      return c.json({ response_type: "ephemeral", text: `Bad window: ${(e as Error).message}` });
    }
    (async () => {
      try {
        const entry = await runWrapForChannel({
          channel: channelArg,
          win,
          source: "slack",
          triggeredBy: slackUserId,
          post: { channelId },
        });
        if (entry.status === "failed")
          await respondToSlashCommand(responseUrl, `Group wrap failed: ${entry.error}`);
      } catch (e) {
        await respondToSlashCommand(responseUrl, `Group wrap failed: ${(e as Error).message}`);
      }
    })();
    return c.json({
      response_type: "ephemeral",
      text: `Wrapping that channel… (${SLACK_WRAP_ETA})`,
    });
  }

  // /wrapped @user [window/range]
  const target = tokens[0];
  const winToken = tokens.slice(1).join(" ") || undefined;
  const member = await resolveOrDiscover(target);
  if (!member) {
    return c.json({
      response_type: "ephemeral",
      text: `Couldn't find or auto-discover \`${target}\`. Try \`/wrapped help\`.`,
    });
  }

  let win: DateWindow;
  try {
    win = parseAny(winToken, member.joinDate ? new Date(member.joinDate) : undefined);
  } catch (e) {
    return c.json({
      response_type: "ephemeral",
      text: `Bad window: ${(e as Error).message}. Try \`/wrapped help\`.`,
    });
  }

  (async () => {
    try {
      const entry = await runWrapForMember({
        member,
        win,
        source: "slack",
        triggeredBy: slackUserId,
        post: { channelId },
      });
      if (entry.status === "failed")
        await respondToSlashCommand(responseUrl, `Wrapped failed: ${entry.error}`);
    } catch (e) {
      await respondToSlashCommand(responseUrl, `Wrapped failed: ${(e as Error).message}`);
    }
  })();

  return c.json({
    response_type: "ephemeral",
    text: `Cooking ${member.name}'s Wrapped reel… (${SLACK_WRAP_ETA})`,
  });
});

// ─── Frontend ────────────────────────────────────────────────────────────────
const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const FRONTEND_DIST = path.join(ROOT, "web", "dist");

const PUBLIC_ASSET_TYPES: Record<string, string> = {
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

app.use("*", async (c, next) => {
  const p = c.req.path;
  const rel =
    p === "/favicon.ico" || p === "/wrapped_logo.ico"
      ? "wrapped_logo.ico"
      : p === "/wrapped_logo.png"
        ? "wrapped_logo.png"
        : p === "/site.webmanifest"
          ? "site.webmanifest"
          : p.startsWith("/favicon/")
            ? p.slice(1)
            : null;
  if (!rel) return next();
  const file = path.join(PUBLIC_DIR, rel);
  if (!fs.existsSync(file)) return next();
  const ext = path.extname(file);
  return c.body(fs.readFileSync(file), 200, {
    "Content-Type": PUBLIC_ASSET_TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": "public, max-age=86400",
  });
});

if (fs.existsSync(FRONTEND_DIST)) {
  app.use("/assets/*", serveStatic({ root: "./web/dist" }));
  app.get("*", (c) => {
    const html = fs.readFileSync(path.join(FRONTEND_DIST, "index.html"), "utf8");
    return c.html(html);
  });
  console.log(`[boot] serving frontend from ${FRONTEND_DIST}`);
} else {
  console.log(`[boot] no frontend build at ${FRONTEND_DIST} — API-only mode`);
}

const loginRedirectHtml = (message: string) =>
  `<html><body style="font-family:system-ui;padding:40px;text-align:center;background:#0a0a0a;color:#f2f2f2">
    <h2>Sign-in failed</h2>
    <p>${message}</p>
    <p><a style="color:#ff1b6b" href="/login">Try again</a></p>
  </body></html>`;

await bootstrapDataIfNeeded();

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
startScheduler();
console.log(`[boot] wrapped api listening on http://0.0.0.0:${port}`);
