# Wrapped.

> Wrapped for your week at work. Triggered in Slack. Shared as a 25-second reel.

Type `/wrapped @teammate` in Slack. Thirty seconds later, a polished 1080×1920 video reel posts back showing that teammate's week — most-used emoji, peak productivity hour, longest thread, biggest commit, ghost-mode score, the works.

End users provide nothing. The bot uses workspace-level credentials you set up once.

---

## What's in the box

- **Renderer** — Remotion (React-based video gen) with 9 designed scenes, music rotation, theme system
- **Data layer** — Slack, GitHub, X, Linear, Notion collectors with graceful fallback to dummy data
- **API** — Hono server: wraps, archive, channels, OAuth, scheduler, Slack slash command
- **Frontend** — Vite + React UI: generate with custom date ranges, browse archive, manage members, configure schedule
- **Members store** — file-backed registry with auto-discovery from Slack profiles
- **OAuth self-link** — encrypted token storage for opt-in LinkedIn / Gmail enrichment
- **Group wraps** — `/wrapped #channel` or via UI: top posters, busiest hours, biggest thread
- **Scheduler** — cron-driven Friday job that DMs everyone their weekly wrap
- **Optional LLM copy** — Anthropic Claude generates week title, vibe, and commit summary when an API key is set

---

## Quickstart

Full walkthrough (clone → credentials → members → local run): **[docs/SETUP.md](./docs/SETUP.md)**.

```bash
git clone <this repo>
cd wrpd
make install
cp .env.example .env          # fill Slack + GitHub — see SETUP.md
mkdir -p data out/cache
npm run member -- sync-slack    # after SLACK_BOT_TOKEN is set
make dev                        # API on http://localhost:3000
make web-build                  # UI at http://localhost:3000
```

Optional UI hot-reload: `make web-dev` → http://localhost:5173 (proxies `/api` to :3000).

Test a render (dummy data if tokens missing):

```bash
npm run wrap -- mayank last-week --render
open out/cache/*.mp4
```

Production: **[docs/DEPLOY.md](./docs/DEPLOY.md)** (Railway).

---

## Repo layout

```
src/                      Remotion video composition (the reel)
  Wrapped.tsx             Top-level composition; sequences all scenes
  scenes/                 One file per slide type (Intro, Numbers, etc.)
  components/             Shared scene scaffolding (SceneBG, anim helpers)
  data.ts                 WrappedData type + DUMMY fallback
  music.ts                Track rotation
  theme.ts                Color palettes

server/                   Backend API + data collection
  index.ts                Hono app: all routes, serves frontend in prod
  cli.ts                  `npm run wrap` — local rendering CLI
  render.ts               Programmatic Remotion render with content-hash cache
  aggregator.ts           Combines collector outputs into WrappedData
  copy.ts                 Optional LLM copy generation (Anthropic)
  window.ts               Window parsing: presets + custom ranges + since-joined
  collectors/             One file per data source (slack, github, x, linear, notion, …)
  channels/               Group-wrap collector + builder
  members/                Store, types, CLI, Slack auto-discovery
  archive/                Persistent record of every rendered wrap
  oauth/                  Generic OAuth flow + AES-GCM encrypted token store
  scheduler/              node-cron weekly job + config
  slack/                  Signature verification + posting

web/                      Frontend (Vite + React + React Router)
  src/
    Layout.tsx            Sidebar shell
    pages/                Home, Generate, Archive, Watch, Members, MemberDetail,
                          Channels, Settings
    components/           DateRangePicker, StatusBadge
    api.ts                Type-safe client for the Hono backend
  vite.config.ts          Dev server proxies /api to :3000
  dist/                   Built static files served by Hono in production

public/music/             CC0 background tracks (rotated per render)
data/                     File-backed persistence (members, archive, tokens, schedule)
out/cache/                Render cache, keyed by content hash
.claude/skills/           Reusable Claude skills (music sourcing, scene design)
```

---

## Scripts

```
npm run dev               Remotion Studio (visual editor) at localhost:3000
npm run server            Hono API + UI with hot reload
npm run build             Render Wrapped to out/wrapped.mp4 (uses DUMMY data)
npm run start             Build frontend then start server (prod-like)

npm run web:dev           Vite dev server on :5173 with /api proxy to :3000
npm run web:build         Build frontend to web/dist
npm run web:install       Install frontend deps

npm run wrap -- <member> [window] [--render]    Local wrap; --render produces MP4
npm run member -- list|add|link|remove          Member registry CRUD

npm run typecheck         tsc --noEmit
npm run lint              ESLint
npm run format            Prettier write
npm run test              Vitest one-shot
npm run check             typecheck + lint + test (run this before pushing)
```

---

## How a `/wrapped` call flows

```
Slack /wrapped @alice last-week
         │
         ▼
POST /api/slack/command
  ├── verifySlackSignature()                  reject spoofs (5-min replay window)
  ├── resolveOrDiscover("@alice")             load from data/members.json, else
  │                                           fetch profile via users.info
  │                                           and persist a new entry
  ├── ACK to Slack (must be <3s)
  └── fire-and-forget worker:
         ├── collectAll(member, win)          parallel: slack, github, x, …
         ├── generateCopy(name, signals)      optional Anthropic call
         ├── buildWrappedData(...)            heuristics + overrides
         ├── renderWrapped(data)              cache hit → instant; else ~30s render
         └── postVideoToChannel(...)          uploads MP4 back to channel
```

---

## Documentation

- **[docs/overview.md](./docs/overview.md)** — project overview and repo map
- **[docs/SETUP.md](./docs/SETUP.md)** — clone, install, credentials, local run (start here)
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — system design, trade-offs, extension points
- **[docs/DEPLOY.md](./docs/DEPLOY.md)** — Railway deploy, volumes, env vars, seeding data
- **[docs/railway.md](./docs/railway.md)** — Railway CLI reference (Makefile targets)
- **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** — code style, adding new scenes/collectors
- **[CLAUDE.md](./CLAUDE.md)** — guidance for AI assistants working on this repo (repo root)

---

## Trust model in one paragraph

The Wrapped bot has **workspace-level** read access (a Slack bot token, a GitHub PAT, an X bearer). With these it can look up *any* teammate's public activity. End users never see, provide, or grant tokens. LinkedIn and personal email genuinely need per-user OAuth (no app-only access exists) so they're treated as optional enrichments, not requirements.

---

## Design intent: centralized, org-wide archive

**This is a feature, not a bug.** The archive (`data/archive.json` + the videos in `out/cache/`) is intentionally shared across the whole organization:

- Anyone signed in (with an `@agrim.ai` Google account) can view **every** wrap ever generated, by any member, from any source (UI, Slack slash command, scheduler).
- There is no per-user visibility filter on the API. `GET /api/archive` returns everything.
- This matches the original Spotify-Wrapped-style spirit: the reels are meant to be shared, quoted, roasted in #random — not hidden in private profiles.

**What we deliberately *do not* do:**
- Generating a reel from the UI does **not** post to Slack. UI-generated wraps are private to the people browsing the archive in the UI.
- The Slack slash command **does** post the resulting MP4 back to the channel where it was run — that's the user-visible Slack experience.

| Trigger | Saved in archive | Posted to Slack |
|---|---|---|
| `POST /api/wrapped/generate` (UI) | ✅ | ❌ |
| `POST /api/channels/wrap` (UI) | ✅ | ❌ |
| `/wrapped @user` (Slack) | ✅ | ✅ to the channel where command ran |
| `/wrapped #channel` (Slack) | ✅ | ✅ to the channel where command ran |
| Weekly scheduler | ✅ | ✅ to configured DM or channel |

If you ever want to make wraps private (per-user visibility, hidden from the org), it's a single-place change: add a filter to `listEntries` in `server/archive/store.ts` requiring `triggeredBy === session.email`. The architecture is ready for it; we just don't apply the filter today by design.

---

## Storage — there is no database

All persistence is **flat JSON on disk** plus rendered MP4 files. This is a deliberate choice for a 20-person team — scale is small, data is tiny (< 10 MB after a year of weekly wraps), and portability matters.

| Data | Path | Format |
|---|---|---|
| Members | `data/members.json` | JSON array, hand-editable |
| Archive (every wrap ever) | `data/archive.json` | JSON array, newest first |
| Schedule config | `data/schedule.json` | one object |
| OAuth tokens (v2 self-link) | `data/tokens.json` | AES-GCM encrypted |
| Rendered videos | `out/cache/<sha256>.mp4` | named by content hash for free dedupe |
| Auth session | HS256-signed `wrapped_session` cookie | **stateless** — no server store |

**For deployments, two paths must be mounted as persistent volumes:** `data/` (registry + archive metadata) and `out/` (the videos themselves). Losing `out/` loses the videos; losing `data/` loses the archive index and member registry. If budget is tight, you can let `out/cache/` be ephemeral and re-render on demand — the cache is content-addressed so it'll repopulate.

**Migration path when this scales past ~hundreds of wraps/day:** SQLite first, then Postgres. The store contract (`createEntry`, `setStatus`, `listEntries`, `getEntry`, `deleteEntry`) is intentionally narrow so swapping the backend is one file.

---

## Status

- v1 (this repo) — ships everything in `docs/wrapped.md` v1 plus LLM copy, themes, music rotation, render cache, full test suite, deployment-ready Docker
- v2 ideas — self-link flow for personal accounts, group wraps (`#channel last-week`), web archive page, custom slide selection, scheduled "Friday wraps" digest
