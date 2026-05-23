# Railway deployment (Girijesh-agrim workspace)

Wrapped ships as a **Docker** service on [Railway](https://railway.com).

**End-to-end checklist (deploy → env vars → seed data → Slack):** [DEPLOY.md](./DEPLOY.md).

This page is the CLI reference; use DEPLOY.md when bringing production up for the first time.

## Prerequisites

- Railway account with access to the **Girijesh-agrim** workspace
- GitHub repo connected (for later deploys via Railway UI or `railway up`)
- Local `.env` filled for reference (secrets are copied to Railway separately)

## 1. Install the CLI

```bash
make railway-install    # Homebrew on macOS
# or: brew install railway
railway --version
```

## 2. Log in

```bash
make railway-login
```

Opens a browser OAuth flow. Verify:

```bash
make railway-whoami
```

## 3. Confirm workspace

```bash
railway workspace list
```

Use the exact workspace name or ID for **Girijesh-agrim**. Override locally if needed:

```bash
make railway-init RAILWAY_WORKSPACE="Girijesh-agrim"
```

## 4. Create / link the project (no deploy)

**New project** in that workspace (creates `wrpd` and links this directory):

```bash
make railway-init
```

**Existing project** already in the dashboard:

```bash
make railway-link
# follow prompts, or:
# railway link --workspace "Girijesh-agrim" --project <project-id>
```

Link state is stored in `.railway/` (gitignored). Check:

```bash
make railway-status
```

## 5. Persistent volume (required)

`data/members.json`, archive, and schedule must survive restarts. After the service exists:

```bash
make railway-volume
```

This runs `railway volume add` twice on the linked service:

- **`/app/data`** — registry, archive index, schedule config (required; losing this loses the centralized archive).
- **`/app/out`** — rendered MP4 files (strongly recommended; without it, every redeploy wipes all videos and old archive entries point to missing files).

In the dashboard: **Service → Settings → Volumes** → add both mount paths.

> Wrapped uses **no traditional database** — both volumes hold flat JSON + filesystem data by design. See README → "Storage — there is no database" and ARCHITECTURE.md → "No database".

## 6. Environment variables

Set in **Railway → Service → Variables** (or CLI). Minimum for Slack wraps:

| Variable | Required |
|----------|----------|
| `SLACK_BOT_TOKEN` | Yes |
| `SLACK_SIGNING_SECRET` | Yes |
| `GITHUB_TOKEN` | Yes (org repos; authorize SSO on the PAT) |
| `PORT` | Railway sets automatically; app defaults to `3000` |
| `PUBLIC_BASE_URL` | Yes once public URL exists (OAuth callbacks) |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENROUTER_API_KEY` | Optional (copy) |
| `X_BEARER_TOKEN`, `LINEAR_API_KEY`, `NOTION_TOKEN` | Optional |
| `ENCRYPTION_KEY` | If using OAuth self-link |
| `GITHUB_ORG` | Optional (`Agrim-Intelligence`) |

```bash
# Example (run one at a time; never commit values)
railway variables set SLACK_BOT_TOKEN=xoxb-...
railway variables set PUBLIC_BASE_URL=https://your-service.up.railway.app
```

See `.env.example` for the full list.

## 7. Slack slash command URL

After the first deploy (when you are ready):

```
https://<your-railway-domain>/api/slack/command
```

Set under Slack app → **Slash Commands** → `/wrapped` → Request URL.

## 8. Deploy (when ready — not part of initial setup)

```bash
make railway-deploy    # runs `railway up` — only when you intend to ship
```

Or connect the GitHub repo in Railway for deploy-on-push.

## Makefile reference

| Target | Action |
|--------|--------|
| `make railway-install` | Install CLI via Homebrew |
| `make railway-login` | Browser login |
| `make railway-whoami` | Show logged-in user |
| `make railway-init` | Create + link project in workspace |
| `make railway-link` | Link directory to existing project |
| `make railway-status` | Linked project / service |
| `make railway-volume` | Add `/app/data` + `/app/out` volumes |
| `make railway-vars` | Print variable setup reminder |
| `make railway-deploy` | **Deploy** (`railway up`) — use deliberately |

Defaults (override on the command line):

```bash
RAILWAY_WORKSPACE=Girijesh-agrim
RAILWAY_PROJECT=wrpd
```

## Health check

Railway uses `GET /api/health` (see `railway.toml`). Local Docker equivalent: `make up` then `curl http://localhost:3000/api/health`.

## Troubleshooting

- **Unauthorized** — run `make railway-login` again.
- **Wrong workspace** — `railway workspace list`, then re-run `make railway-link` with `--workspace`.
- **GitHub 0 commits in prod** — PAT needs `repo` scope and SSO authorization for **Agrim-Intelligence**.
- **Empty members after first deploy** — seed `data/members.json` on the volume or run `npm run member -- sync-slack` inside the container / locally against production tokens.
