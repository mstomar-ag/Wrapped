# Wrapped — Setup Guide

Follow this guide after cloning the repo. It covers **local development** end-to-end and **where to get each API credential**. Production deploy is separate: [DEPLOY.md](./DEPLOY.md) (Railway).

**Time:** ~30–45 minutes the first time (mostly waiting on Slack/GitHub admin clicks).

---

## What you are building

1. A **Hono API** on port **3000** (Slack slash command, wrap generation, members, archive).
2. A **Remotion** pipeline that renders a ~25s MP4 per wrap.
3. An optional **web UI** (`web/`) for generating wraps and browsing the archive.

Teammates only type `/wrapped @someone` in Slack. They never create tokens — you configure workspace-level secrets once in `.env` (local) or Railway Variables (prod).

---

## Prerequisites

| Tool                   | Version / notes                                                    |
| ---------------------- | ------------------------------------------------------------------ |
| **Node.js**            | **22+** (matches `Dockerfile`)                                     |
| **npm**                | Comes with Node                                                    |
| **Git**                | To clone the repo                                                  |
| **Docker**             | Optional — `make up` runs prod-like container locally              |
| **ngrok** (or similar) | Required only if you want **Slack** `/wrapped` hitting your laptop |
| **Railway CLI**        | Optional until deploy — see [DEPLOY.md](./DEPLOY.md)               |

macOS: `brew install node@22` if needed.

---

## 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd wrpd
```

Install root + web dependencies (**use `--legacy-peer-deps`** — required for Remotion + SDK peer ranges):

```bash
make install
```

Equivalent without Make:

```bash
npm install --legacy-peer-deps
npm --prefix web install --legacy-peer-deps
```

Sanity check:

```bash
npm run check
```

(`typecheck` + `lint` + `test` — should pass on a clean clone.)

---

## 2. Environment file

```bash
cp .env.example .env
```

Edit `.env` at the repo root. You can add keys **incrementally** — collectors return `null` when a credential is missing and the aggregator fills gaps with demo data from `src/data.ts`.

### Minimum to get real Slack + GitHub data locally

| Variable               | Section below                                           |
| ---------------------- | ------------------------------------------------------- |
| `SLACK_BOT_TOKEN`      | [Slack](#3-slack-slack_bot_token--slack_signing_secret) |
| `SLACK_SIGNING_SECRET` | [Slack](#3-slack-slack_bot_token--slack_signing_secret) |
| `GITHUB_TOKEN`         | [GitHub](#4-github-github_token)                        |

### Recommended soon after

| Variable                                                        | Purpose                                              |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| `PUBLIC_BASE_URL`                                               | `http://localhost:3000` locally; Railway URL in prod |
| `GEMINI_API_KEY` or `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY` | Better week title / vibe copy (tries in that order)  |

### Optional integrations

| Variable                                     | Purpose                                                    |
| -------------------------------------------- | ---------------------------------------------------------- |
| `X_BEARER_TOKEN`                             | X/Twitter signals                                          |
| `LINEAR_API_KEY`                             | Linear ticket signals                                      |
| `NOTION_TOKEN`                               | Notion edit signals                                        |
| `LINKEDIN_*` / `GOOGLE_*` + `ENCRYPTION_KEY` | Per-user OAuth self-link                                   |
| `GITHUB_ORG`                                 | Limit GitHub search to one org (e.g. `Agrim-Intelligence`) |

Full template: `.env.example`.

---

## 3. Data directory (members, archive, schedule)

Wrapped stores **no database** — only files under `data/` and `out/`.

```bash
mkdir -p data out/cache
```

| File                 | Purpose                                                | In git?                                            |
| -------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| `data/members.json`  | Who can be wrapped (Slack id, GitHub handle, email, …) | Often committed as a starter; prod lives on volume |
| `data/archive.json`  | Index of every wrap                                    | Gitignored — starts as `[]` when missing           |
| `data/schedule.json` | Weekly cron config                                     | Gitignored                                         |
| `data/tokens.json`   | Encrypted OAuth tokens                                 | Gitignored                                         |
| `out/cache/*.mp4`    | Render output + cache                                  | Gitignored                                         |

The app **auto-creates** empty `archive.json` / `members.json` when a store first writes. For a fresh clone, seed members:

```bash
# After SLACK_BOT_TOKEN is in .env — pulls workspace users into data/members.json
npm run member -- sync-slack

# Fix GitHub usernames (Slack handle ≠ GitHub login)
npm run member -- list
npm run member -- link mayank --github mstomar-ag
```

Manual add:

```bash
npm run member -- add --name "Alice" --slack alice --github alice-dev --email alice@company.com
```

---

## 4. Run locally

Pick **one** path.

### A — Node (fastest for day-to-day dev)

Terminal 1 — API with hot reload:

```bash
make dev
# or: npm run server
```

Build the web UI once (served from `web/dist` at `http://localhost:3000`):

```bash
make web-build
# or: npm --prefix web run build
```

Open **http://localhost:3000** (API + built UI).

**UI hot reload** (optional second terminal):

```bash
make web-dev
# Vite on http://localhost:5173 — proxies /api to :3000
```

Remotion visual editor (slide design only):

```bash
npm run dev
```

### B — Docker (prod-like, Chromium in container)

Requires `.env` filled and Docker running:

```bash
make up
```

Health: **http://localhost:3000/api/health** → `{"ok":true}`

Logs: `make logs` · Stop: `make down`

---

## 5. Verify the install

### Health

```bash
curl http://localhost:3000/api/health
```

### Dry run (data only, no video)

```bash
npm run wrap -- mayank last-week
```

Use a member `id` from `npm run member -- list`. With tokens set, output shows real signals; without, dummy fallbacks.

### Full render (~30s, writes MP4)

```bash
npm run wrap -- mayank last-week --render
open out/cache/*.mp4   # macOS; or ls out/cache/
```

### GitHub probe (all members with GitHub handles)

```bash
npm run github:history -- last-week
```

### Before you push

```bash
npm run check
```

---

## 6. Slack — `SLACK_BOT_TOKEN` + `SLACK_SIGNING_SECRET`

Without Slack, the server still runs; `/wrapped` in Slack will not work.

### 6a. Create the Slack app

1. **https://api.slack.com/apps** → **Create New App** → **From scratch**.
2. Name it `Wrapped`, select your workspace.

### 6b. Bot token scopes

**OAuth & Permissions** → **Bot Token Scopes** → add each:

| Scope              | Why                                                 |
| ------------------ | --------------------------------------------------- |
| `channels:history` | Read public channel messages                        |
| `channels:read`    | List channels                                       |
| `users:read`       | Profiles for auto-discovery                         |
| `users:read.email` | Work email on profiles                              |
| `reactions:read`   | Top emoji slide (includes reactions you give)       |
| `search:read`      | Fast message search (avoids scanning every channel) |
| `chat:write`       | Post status messages                                |
| `files:write`      | Upload MP4                                          |
| `commands`         | `/wrapped` slash command                            |

Do **not** add `groups:history` / `im:history` unless you intentionally want private channels/DMs.

### 6c. Slash command

**Slash Commands** → **Create**:

| Field             | Value                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| Command           | `/wrapped`                                                                                                          |
| Request URL       | `https://<public-host>/api/slack/command` (see [§10 Slack + ngrok](#10-slack-slash-command-from-your-laptop-ngrok)) |
| Short description | Generate a teammate's Wrapped reel                                                                                  |
| Usage hint        | `@teammate [last-week\|yesterday\|this-month]`                                                                      |

### 6d. Install app → `SLACK_BOT_TOKEN`

**Install App** → **Install to Workspace** → copy **Bot User OAuth Token** (`xoxb-…`) into `.env`.

### 6e. Signing secret → `SLACK_SIGNING_SECRET`

**Basic Information** → **App Credentials** → **Signing Secret** → copy into `.env`.

### 6f. Invite the bot

In each channel the bot should read:

```
/invite @Wrapped
```

---

## 7. GitHub — `GITHUB_TOKEN`

Powers commit counts, lines changed, and the hero commit slide.

### Classic PAT (recommended)

1. **https://github.com/settings/tokens** → **Generate new token (classic)**.
2. Note: `Wrapped bot` · expiration: your choice.
3. Scopes:
   - **`repo`** — private org repos (typical for a company org), **or**
   - **`public_repo`** — public repos only.
4. Generate → copy `ghp_…` → `GITHUB_TOKEN` in `.env`.

### Org with SAML SSO

After creating the token, open **https://github.com/settings/tokens** → **Configure SSO** next to the token → **Authorize** for your org (e.g. **Agrim-Intelligence**). Without this, GitHub returns **0 commits** for org repos.

### Fine-grained PAT

If your org requires it: **https://github.com/settings/personal-access-tokens/new** → org owner → repository access → **Contents: Read-only**. Org admin may need to approve the token.

### Verify

```bash
npm run github:history -- last-week mayank
```

---

## 8. X (optional) — `X_BEARER_TOKEN`

Skip if the team does not use X.

1. **https://developer.x.com/en/portal/dashboard** → create a project/app.
2. **Keys and tokens** → generate **Bearer Token** → `X_BEARER_TOKEN`.

Free tier is ~**100 reads/month** — fine for experiments, not heavy production.

---

## 9. Linear (optional) — `LINEAR_API_KEY`

1. **https://linear.app/settings/api** → **Create key** → `LINEAR_API_KEY`.
2. Match members by email: set on each member in the UI or `npm run member -- link <id> --email …`.

---

## 10. Notion (optional) — `NOTION_TOKEN`

1. **https://www.notion.so/profile/integrations** → new internal integration → copy token.
2. **Connect** the integration on each page/database (⋯ → Add connections).
3. Set each member’s Notion user id in the Members UI (or API).

---

## 11. LLM copy (optional)

The server tries providers **in order** and uses the first that works:

1. `GEMINI_API_KEY` — https://aistudio.google.com/apikey
2. `OPENROUTER_API_KEY` — https://openrouter.ai/keys
3. `ANTHROPIC_API_KEY` — https://console.anthropic.com

If none are set, copy falls back to simple heuristics. Cost with Haiku-scale models is negligible at team volume.

---

## 12. OAuth self-link (optional)

For per-user LinkedIn / Gmail (not required for v1 Slack wraps).

1. Create LinkedIn + Google OAuth apps (redirect URLs below).
2. In `.env`:

```bash
PUBLIC_BASE_URL=http://localhost:3000    # or Railway URL in prod
ENCRYPTION_KEY=<any-random-32+-char-string>
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Redirect URLs to register:

```
{PUBLIC_BASE_URL}/api/oauth/linkedin/callback
{PUBLIC_BASE_URL}/api/oauth/google/callback
```

---

## 13. Slack slash command from your laptop (ngrok)

Slack requires a **public HTTPS** URL. For local dev:

```bash
# Terminal A
make dev

# Terminal B
brew install ngrok    # if needed
ngrok http 3000
```

Copy the `https://….ngrok-free.app` URL → Slack app → **Slash Commands** → `/wrapped` → Request URL:

```
https://<ngrok-host>/api/slack/command
```

Test in Slack: `/wrapped @teammate last-week`

---

## 14. Production (Railway)

Local `.env` and `data/` are **not** uploaded on deploy. On Railway you must:

1. Set **Variables** (same keys as `.env`).
2. Mount volumes **`/app/data`** and **`/app/out`**.
3. **Seed** `members.json` on the volume.

Full checklist: **[DEPLOY.md](./DEPLOY.md)**.

---

## What the bot can and can't see

| Source                    | What's read                      | Auth                     |
| ------------------------- | -------------------------------- | ------------------------ |
| Slack public channels     | Messages, reactions, threads     | Workspace bot token      |
| Slack private / DMs       | Nothing by default               | Extra scopes not enabled |
| GitHub                    | Commits for linked usernames     | PAT (+ org SSO)          |
| X                         | Public tweets for linked handles | Bearer token             |
| Linear / Notion           | Optional, if keys set            | Workspace tokens         |
| LinkedIn / personal Gmail | Nothing without per-user OAuth   | Self-link flow           |

End users never paste tokens. Admins configure workspace credentials once.

---

## Troubleshooting

| Problem                               | Fix                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `npm install` peer dependency errors  | Use `npm install --legacy-peer-deps`                                             |
| `invalid signature` on Slack webhook  | Wrong `SLACK_SIGNING_SECRET` or system clock skew                                |
| Couldn't find / auto-discover user    | `users:read` scope; run `npm run member -- sync-slack`; invite bot to channels   |
| GitHub **0 commits**                  | `repo` scope; **authorize PAT for org SSO**; correct `github` username on member |
| Render fails / Chromium crash locally | Use `make up` (Docker has Chromium + shm); or install Chromium deps              |
| Render fails on Railway               | Service RAM ≥ **1 GB** — see [DEPLOY.md](./DEPLOY.md)                            |
| Video never posts to Slack            | `files:write`; bot invited to channel                                            |
| Empty members in prod                 | Seed volume — [DEPLOY.md § Step 6](./DEPLOY.md#step-6--seed-data-on-the-volume)  |
| UI 404 on `/`                         | Run `make web-build` before `make dev`                                           |

---

## Quick reference

```bash
make install              # deps
cp .env.example .env      # then fill secrets
npm run member -- sync-slack
make dev                  # API :3000
make web-build            # UI
npm run wrap -- <id> last-week --render
npm run check             # before push
```

**Next:** [DEPLOY.md](./DEPLOY.md) · [overview.md](./overview.md) · [CONTRIBUTING.md](./CONTRIBUTING.md)
