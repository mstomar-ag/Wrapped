# Deployment (Railway)

Production runs on [Railway](https://railway.com) in the **Girijesh-agrim** workspace (project **`wrpd`**). Wrapped uses **no database** — persistence is two filesystem volumes:

| Mount | Contents |
|-------|----------|
| **`/app/data`** | `members.json`, archive index, schedule, OAuth tokens |
| **`/app/out`** | Rendered MP4s (`out/cache/`, archive video files) |

Neither your local **`.env`** nor **`data/members.json`** is baked into the Docker image (see `.dockerignore`). You configure secrets in Railway and seed data on the volume after deploy.

**CLI reference:** [railway.md](./railway.md) (Makefile targets, extra troubleshooting).

**Local dev (no Railway):** `make up` — Docker on your machine with `.env` and local `data/` / `out/` mounts (see repo `Makefile`).

---

## What `make railway-deploy` includes

`make railway-deploy` runs `railway up` and ships **code + Docker image only**. It does **not** upload your laptop’s `.env`, `members.json`, or MP4s.

| Item | In `railway up`? | Where it lives in prod |
|------|------------------|-------------------------|
| App code, Chromium, `web/dist` | Yes (Docker build) | Container image |
| `.env` / secrets | **No** | Railway **Variables** |
| `data/members.json` | **No** | Volume **`/app/data`** (you seed) |
| Archive / schedule JSON | **No** | Volume **`/app/data`** (app creates if missing) |
| Rendered videos | **No** | Volume **`/app/out`** |
| Volumes themselves | **No** | `make railway-volume` or dashboard |

Do **not** set Railway’s start command to `npm run server`. The image runs `npx tsx server/index.ts` (see `Dockerfile` + `railway.toml`).

---

## Step 1 — Install CLI and log in

```bash
make railway-install
make railway-login
make railway-whoami
```

Confirm access to the **Girijesh-agrim** workspace:

```bash
railway workspace list
```

---

## Step 2 — Create or link the project

**New project** (creates `wrpd` and links this repo directory):

```bash
make railway-init
# or: make railway-init RAILWAY_WORKSPACE="Girijesh-agrim" RAILWAY_PROJECT=wrpd
```

**Existing project** in the dashboard:

```bash
make railway-link
```

Verify:

```bash
make railway-status
```

---

## Step 3 — First deploy (creates the service)

```bash
make railway-deploy
```

Wait for the build to finish. Open the service in the dashboard and note the public URL (e.g. `https://wrpd-production.up.railway.app`). The app may not work fully yet until env vars and data are in place.

**Recommended resources** (dashboard → **Settings** → **Resources**): **1 GB RAM**, **1 vCPU** (Remotion peaks ~600 MB during render).

---

## Step 4 — Attach persistent volumes

Run **after** the service exists:

```bash
make railway-volume
```

| Mount path | Purpose |
|------------|---------|
| **`/app/data`** | **Required** — member registry, archive metadata, schedule |
| **`/app/out`** | **Strongly recommended** — MP4 files; without it, redeploys wipe videos |

Confirm in the dashboard: **Service → Settings → Volumes** — both paths listed. Redeploy or restart after adding volumes.

---

## Step 5 — Copy environment variables to Railway

Your local `.env` is **not** deployed.

**Dashboard:** Service → **Variables** → add each key from `.env.example`.

**CLI** (one at a time; never commit values):

```bash
railway variables set SLACK_BOT_TOKEN=xoxb-...
railway variables set SLACK_SIGNING_SECRET=...
railway variables set GITHUB_TOKEN=ghp-...
railway variables set PUBLIC_BASE_URL=https://your-service.up.railway.app
```

**Minimum for Slack wraps:**

| Variable | Required |
|----------|----------|
| `SLACK_BOT_TOKEN` | Yes |
| `SLACK_SIGNING_SECRET` | Yes |
| `GITHUB_TOKEN` | Yes (authorize SSO for your org on the PAT) |
| `PUBLIC_BASE_URL` | Yes — your Railway HTTPS URL from step 3 |
| `GEMINI_API_KEY` / `OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY` | Optional (better copy) |
| `ENCRYPTION_KEY` | Yes if using OAuth self-link |
| `GITHUB_ORG` | Optional (`Agrim-Intelligence`) |

`PORT` is set by Railway automatically. Full list: `.env.example`.

Redeploy after changing variables (`make railway-deploy` or dashboard **Deploy**).

---

## Step 6 — Seed `data/` on the volume

Empty volumes have **no** `members.json`. Without seeding, `/wrapped` cannot resolve teammates (or uses dummy reel data).

**A — Upload local `members.json`** (fastest if already curated):

```bash
railway volume files upload ./data/members.json /members.json
```

File appears as `/app/data/members.json`. Optionally:

```bash
railway volume files upload ./data/schedule.json /schedule.json
```

`archive.json` can start as `[]`; the app creates entries on first wrap.

**B — Sync from Slack** (registry matches workspace):

```bash
railway run npm run member -- sync-slack
railway run npm run member -- link mayank --github mstomar-ag
```

**C — Dashboard** — Service → Volume file browser.

Verify:

```bash
curl -s https://your-service.up.railway.app/api/members | head
```

---

## Step 7 — Wire Slack

[api.slack.com](https://api.slack.com/apps) → Wrapped app → **Slash Commands** → `/wrapped`:

```
https://<your-railway-domain>/api/slack/command
```

Invite the bot to channels it should read ([SETUP.md](./SETUP.md)).

---

## Step 8 — Smoke test

```bash
curl https://your-service.up.railway.app/api/health
# → {"ok":true}
```

In Slack: `/wrapped @teammate last-week` — ephemeral “Cooking…”, then video (~30s). Check **Railway → Deployments → Logs** on failure.

Optional:

```bash
railway run npm run wrap -- mayank last-week
```

---

## Step 9 — Later deploys

```bash
make railway-deploy
```

Volume data persists across redeploys. Code deploys do **not** update Railway variables — change those separately.

GitHub deploy-on-push: connect the repo in Railway; complete steps 4–7 once per new environment.

---

## Checklist

```
[ ] make railway-login
[ ] make railway-init  (or railway-link)
[ ] make railway-deploy
[ ] make railway-volume  (/app/data + /app/out)
[ ] Railway variables from .env (+ PUBLIC_BASE_URL)
[ ] Seed members.json on volume
[ ] Slack slash command URL → /api/slack/command
[ ] curl /api/health + test /wrapped in Slack
```

---

## Production notes

### Chromium / Docker

Remotion uses headless Chromium. The repo `Dockerfile` installs system Chromium and fonts; `REMOTION_CHROME_EXECUTABLE_PATH` is set in the image.

### Persistence

- **`/app/data`** — must stay mounted across deploys.
- **`/app/out`** — without it, MP4s disappear on redeploy and archive links break.

### Memory and concurrency

- **1 GB RAM / 1 vCPU** is enough for ~20 people.
- Remotion rendering is single-threaded (~600 MB peak); the API idles at ~80 MB most of the time.
- Many HTTP requests are fine; renders queue in one process. At higher scale, add a job queue (e.g. BullMQ + Redis).

### Cache cleanup

Prune old MP4s on the volume (cron or manual):

```bash
find /app/out/cache -name '*.mp4' -mtime +30 -delete
```

### Slack URL and token rotation

- Hostname change → update slash command Request URL only (no Slack reinstall).
- Rotate tokens in Railway **Variables**, then redeploy/restart.
- Slack `xoxb-…` → reinstall app; signing secret → regenerate in app settings.

---

## Health and observability

- `GET /api/health` → `{"ok":true}` — use for uptime checks.
- Logs: **Railway → Deployments → Logs** (`console.error` on failures).
- Failed wraps may reply via Slack `response_url` with an error message.

---

## Costs (rough)

| Item | ~10 wraps/day, always on |
|------|---------------------------|
| Railway Hobby | **$5–15/mo** (plan + light usage; $5 credit on Hobby) |
| Railway Pro (team workspace) | **$20–35/mo** typical |
| Volumes (few GB) | **&lt; $1/mo** |
| Slack / GitHub | **$0** |
| LLM copy (optional) | **~$0.30–3/mo** at this volume |

Set a usage alert in the Railway dashboard after the first week.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| CLI `Unauthorized` | `make railway-login` |
| Unknown member / dummy reel | Seed `members.json` (step 6) |
| Videos gone after redeploy | Mount **`/app/out`** |
| GitHub 0 commits | PAT `repo` + org SSO authorization |
| Remotion OOM / crash | Raise RAM to 1 GB |
| Slack timeout | Check `SLACK_SIGNING_SECRET` and Request URL |

More: [railway.md](./railway.md).
