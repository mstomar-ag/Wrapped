# CLAUDE.md — guidance for Claude Code sessions in this repo

This file is loaded automatically. It tells future Claude sessions how this codebase is organized, what conventions to follow, and where the landmines are.

## Project in 30 seconds

Wrapped is a Slack bot that posts a 25-second Spotify-Wrapped-style reel for any teammate when triggered via `/wrapped @user`. The reel is rendered by Remotion (React-based video), backed by a Hono API that collects signals from Slack + GitHub (+ optionally X, LinkedIn, email, Anthropic for copy).

End users provide nothing. The bot uses one set of workspace-level tokens managed by an admin.

## Repo map

```
src/                   Remotion composition (the video itself)
  Wrapped.tsx          Top-level — sequences all scenes, attaches music
  scenes/              One file per slide (Intro, Numbers, …, Wrap)
  components/          SceneBG (animated backdrop) + anim helpers
  data.ts              WrappedData type + DUMMY fallback values
  music.ts             Track rotation (deterministic per handle)
  theme.ts             Color palettes

server/                Backend API + data collection
  index.ts             Hono routes: /api/wrapped, /api/slack/command, /api/members
  cli.ts               `npm run wrap` — local renderer
  render.ts            Programmatic Remotion render with content-hash cache
  aggregator.ts        Signals → WrappedData (with optional LLM overrides)
  copy.ts              Optional Anthropic copy generation
  window.ts            Parses last-week|yesterday|this-month
  collectors/          One file per data source; each returns null if creds missing
  members/             Store (file-backed), discover (auto-create from Slack), CLI
  slack/               Signature verification + posting

public/music/          CC0 background tracks
data/members.json      Persistent member registry (gitignored in deploys)
out/cache/             Render cache, keyed by content hash
.claude/skills/        Reusable skills (find-cc0-music, design-reel-scene)
```

## Conventions and standards

- **TypeScript strict mode**, ESM-only (`"type": "module"`).
- **No `any`.** Lint rule warns; reject in review.
- **Comments only when the _why_ is non-obvious.** Don't restate code.
- **Files stay short** (≈150 lines). Long files → missing module boundary.
- **Every collector returns `null` when its credential is absent.** This is the contract — the pipeline must degrade gracefully.
- **Workspace tokens, never per-user.** LinkedIn and email are the only exceptions and they're optional.
- **No commented-out code.** Delete it; git remembers.

## Commands worth knowing

```
npm run dev               Remotion Studio (visual editor)
npm run server            API server with hot reload
npm run wrap -- mayank last-week [--render]
npm run member -- list|add|link|remove
npm run check             typecheck + lint + tests (run before pushing)
npm run test:watch        TDD loop
```

## Gotchas and landmines

### `"type": "module"` is required

Top-level `await` in `server/cli.ts` and ESM imports throughout demand this. Don't switch to CommonJS without rewriting the CLIs.

### `--legacy-peer-deps` for installs

Some deps (Anthropic SDK in particular) pin Zod versions that conflict with Remotion's. We resolve this with `--legacy-peer-deps`. Keep using it; don't fight peer ranges.

### Slack must ack within 3 seconds

The `/api/slack/command` handler validates synchronously, then runs collect + render + upload in a fire-and-forget worker. **Don't move the heavy work above the `c.json(...)` ack.** Slack will time out the user-visible response.

### The Remotion bundle is cached per process

`server/render.ts` calls `bundle()` once and reuses the result via a module-level promise. Don't add `import` calls inside the bundled tree that mutate global state — they only run once.

### Composition duration is computed from `SCENES` array

In `src/Wrapped.tsx`, `WRAPPED_DURATION` is `SCENES.reduce(...)`. Changing scene durations there automatically updates the registered composition. Don't hardcode the duration anywhere else.

### Music is keyed by member handle, not random

`pickTrack(member.handle)` is deterministic. Alice's reel always uses the same track. That's intentional — wraps feel like personal artifacts. Don't replace with `Math.random()`.

### `data/members.json` is real persistence

The Slack auto-discovery flow writes to it. Don't delete it in tests or as cleanup — gate any file writes in tests behind `import.meta.dirname` checks or mock the store.

### Render cache hashes the WrappedData JSON

Identical inputs → instant return of a cached MP4. If you're hacking on a scene and re-rendering produces no visible change, the cache is hitting; delete `out/cache/*.mp4` or vary the input.

### Slack scopes matter

Adding a new collector that reads Slack data may need new scopes. Update `docs/SETUP.md`'s scope table and tell the admin to reinstall the app.

## When extending, do this

- **New data source** → `server/collectors/<name>.ts`, extend `AllSignals`, wire into `aggregator.ts`. Pattern in [ARCHITECTURE.md](./docs/ARCHITECTURE.md).
- **New slide** → `src/scenes/<Name>Scene.tsx`, register in `src/Wrapped.tsx`. See `.claude/skills/design-reel-scene/SKILL.md`.
- **New music** → see `.claude/skills/find-cc0-music/SKILL.md`. Always verify license before adding.
- **New window** → `server/window.ts` + a test in `server/window.test.ts`.

## What NOT to do

- **Don't add per-user OAuth for sources we can access app-only** (Slack, GitHub, X). It breaks the zero-friction UX.
- **Don't write data to `data/members.json` from anywhere except `server/members/store.ts`.** That module is the single writer.
- **Don't add comments that just describe what the next line does.** They rot fastest.
- **Don't commit `.env`, `out/`, `.remotion-bundle/`, or `data/members.json`.** They're gitignored for reasons.
- **Don't bypass `verifySlackSignature`.** It's the only thing between us and arbitrary internet POSTs running renders.
- **Don't "fix" the centralized archive by adding per-user visibility filters.** That's the deliberate design — any `@agrim.ai` signed-in user sees every wrap. See README "Design intent" and ARCHITECTURE.md. If a future ask is "make archive private," it goes in `listEntries` in `server/archive/store.ts` and nowhere else.
- **Don't replace the file-backed JSON store with a real database "to be safe."** It's an explicit choice for scale and portability. Migration plan (SQLite first) is documented; don't pre-emptively pull it in.

## Storage shape (no database)

- Members, archive, schedule, OAuth tokens → `data/*.json` (file-backed, atomic writes)
- Rendered videos → `out/cache/<display_name>_<timestamp>.mp4` (hash index in `out/cache/.by-hash/` for dedupe)
- Auth sessions → stateless HS256 JWT in an `httpOnly` cookie (no server store)
- OAuth flow state → in-memory `Map`, 10-min TTL (acceptable; only used during the redirect roundtrip)
- For deploys: **both `data/` and `out/` need persistent volumes.** `out/` can be ephemeral with the understanding that videos will need re-rendering.

## Useful skills

Two skills live in `.claude/skills/`:

- **`find-cc0-music`** — fetch verified CC0 audio for the music library. Includes legal-safe sources and a download recipe.
- **`design-reel-scene`** — playbook for adding a new slide with the right aesthetic (typography, motion, palette).

Trigger them when the task obviously matches (e.g., "add another track" → find-cc0-music).
