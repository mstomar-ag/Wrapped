# Architecture

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Video rendering | **Remotion 4** | React-based, programmable, deterministic, great for data-driven reels |
| API server | **Hono** on Node | Tiny, type-safe, edge-friendly if we ever leave Node |
| Validation | **Zod** | Inferred types from runtime schemas |
| Slack SDK | **@slack/web-api** | Official, supports `files.uploadV2` |
| GitHub SDK | **@octokit/rest** | Official |
| LLM | **Anthropic Claude (Haiku 4.5)** | Fast, cheap, perfect for short copy generation |
| Runtime | **tsx** | TypeScript ESM without a build step |
| Tests | **Vitest** | Fast, ESM-native, vite-shared config |
| Lint/Format | **ESLint flat + Prettier** | Modern, low-config |
| Music | **CC0 from freepd.com** via SoundSafari archive | Royalty-free, commercial-safe |
| Fonts | **Inter** via `@remotion/google-fonts` | Bundled at render time, no FOUT |

---

## Module boundaries

```
                ┌────────────────────────────────────┐
                │              Slack                 │
                │   /wrapped @user [window]          │
                └────────────────┬───────────────────┘
                                 │ HTTPS POST
                                 ▼
                ┌────────────────────────────────────┐
                │           Hono server              │
                │   server/index.ts                  │
                │                                    │
                │   ┌──── slack/verify ◀── replay   │
                │   │                       protect │
                │   │                                │
                │   ▼                                │
                │   members/discover                 │
                │   (auto-create from users.info)    │
                │                                    │
                │   ▼                                │
                │   members/store ◀── data/members.json
                │                                    │
                │   ▼                                │
                │   collectors/  (parallel via      │
                │     ├─ slack       Promise.allSettled)
                │     ├─ github                      │
                │     ├─ x                           │
                │     ├─ linkedin (stub, v2)         │
                │     └─ email (stub, v2)            │
                │                                    │
                │   ▼                                │
                │   copy (optional Anthropic call)   │
                │                                    │
                │   ▼                                │
                │   aggregator → WrappedData         │
                │                                    │
                │   ▼                                │
                │   render (Remotion + cache)        │
                │                                    │
                │   ▼                                │
                │   slack/post → files.uploadV2      │
                └────────────────────────────────────┘
```

Each module has a narrow contract:

| Module | Input | Output |
|---|---|---|
| `collectors/*` | `Member, DateWindow` | `*Signals \| null` |
| `aggregator.buildWrappedData` | `Member, DateWindow, AllSignals, CopyOverrides` | `WrappedData` |
| `copy.generateCopy` | `name, AllSignals` | `CopyOverrides` |
| `render.renderWrapped` | `WrappedData` | absolute path to MP4 |
| `slack/post.postVideoToChannel` | `channelId, filePath, comment` | `void` |

That separation is what makes adding a new data source or a new slide trivial.

---

## Key design decisions

### Workspace-level credentials, not per-user
End users never grant tokens. The bot uses one set of workspace tokens (admin-managed) to look up any teammate's *public* activity. LinkedIn and personal email are the only sources that require per-user OAuth — they're treated as opt-in enrichment, never blocking.

### Auto-discovery on first call
The first time someone runs `/wrapped @alice`, the bot calls Slack's `users.info` with the bot token, pulls Alice's name and handle, best-guesses her GitHub username (= slack handle), and persists the entry to `data/members.json`. Admin can fix bad guesses via the `/wrapped link` slash subcommand.

### Graceful degradation
Every collector returns `null` when its credential is missing. The aggregator merges what it has and fills the rest with `DUMMY` values from `src/data.ts`. A misconfigured deploy still produces a video; it just looks like the demo data.

### Content-hash render cache
`render.ts` hashes the `WrappedData` JSON and writes outputs to `out/cache/<hash>.mp4`. Identical inputs return instantly — useful for retry storms, idempotency, and demos.

### Async ack pattern for Slack
Slack times out slash commands at 3 seconds. The handler validates, acks immediately with an ephemeral "Cooking…" message, and runs collection + render + upload in a fire-and-forget worker. Errors are surfaced via `response_url` if the user is still around.

### Determinism inside the reel
Music choice (`pickTrack`) is a deterministic hash of the member's handle — Alice's reel always uses the same backing track, which makes wraps feel like personal artifacts. Themes work the same way (palettes seeded per scene index, not random).

### Centralized, org-wide archive (deliberate, not a bug)
Every wrap ever generated — UI, Slack slash command, or scheduled — lands in `data/archive.json` with full provenance (`source`, `triggeredBy`, `postedToSlack`). The `GET /api/archive` endpoint applies **no visibility filter**: any signed-in `@agrim.ai` user sees every wrap. This matches the Spotify-Wrapped social-object framing — reels are meant to be shared, quoted, roasted in `#random`, not hidden behind a per-user privacy gate.

The split between "saved" and "posted" is intentional and enforced by which path calls `postVideoToChannel`:

| Path | Calls `postVideoToChannel`? | In archive? |
|---|---|---|
| `POST /api/wrapped/generate` (UI) | No | Yes |
| `POST /api/channels/wrap` (UI) | No | Yes |
| `/api/slack/command` (Slack) | Yes (channel where command ran) | Yes |
| Scheduler | Yes (DM each member, or one channel) | Yes |

If org policy ever flips to "private wraps," it's a one-place change: a `triggeredBy === session.email` filter in `listEntries` (`server/archive/store.ts`). Today, we leave it open by design.

### No database
`data/*.json` (file-backed JSON) is the entire persistence layer. Sessions are stateless JWTs in cookies — no server-side session store. OAuth state during sign-in lives in an in-memory `Map` with a 10-minute TTL. This is appropriate for the ~20-person scale; at hundreds of wraps/day, SQLite is the right next step (the store contract is narrow enough to swap in one file).

---

## Extension points

Adding **a new data source**:
1. Create `server/collectors/foo.ts` exporting `collectFoo(member, win)` that returns `FooSignals | null` (null when creds absent).
2. Add `FooSignals` to `server/collectors/types.ts` and append to `AllSignals`.
3. In `server/aggregator.ts`, add the call to `collectAll` and wire its signals into `buildWrappedData`.
4. (Optional) Add a new field to `WrappedData` in `src/data.ts` and a scene in `src/scenes/`.

Adding **a new slide type**:
1. Create `src/scenes/MyScene.tsx`. Use `SceneBG` for the background and `springIn`/`countTo`/`fadeIn` from `components/anim`.
2. Pick a palette from `src/theme.ts` (or add a new one).
3. Register it in `src/Wrapped.tsx` `SCENES` array with a duration in frames.
4. Total composition duration auto-updates from the array.

See `.claude/skills/design-reel-scene/SKILL.md` for the full scene-building playbook.

Adding **a new window** (e.g. `q1`):
- Add a case in `server/window.ts` `parseWindow`.
- Add a Vitest case in `server/window.test.ts`.

Adding **a new theme**:
- Extend `PALETTES` in `src/theme.ts`. Each palette is `{ bg, fg, accent }` — keep `fg` legible on `bg` and `accent` legible on `bg`.
- Scenes pick palettes by name; to rotate themes, replace `PALETTES.x` references with a seeded selector.

---

## Performance notes

- **Render time**: ~25s for a 25s reel on Apple Silicon. Remotion is single-threaded per render but the bundle is shared across calls via `getBundle()` (cached promise).
- **Memory**: peaks ~600 MB during stitching. Fits comfortably in a 1 GB container.
- **Cold start**: first render builds the bundle (~5s) and loads Chromium (~3s). Subsequent renders in the same process skip both.
- **Concurrency**: the Hono server can accept many `/wrapped` calls in parallel, but render itself serializes. For a 20-person company this is fine. At larger scale, queue renders in BullMQ + Redis (see DEPLOY.md).

---

## Security

- **Slack signature verification** — HMAC-SHA256 with timing-safe comparison and a 5-minute replay window (`server/slack/verify.ts`). All slash-command payloads must verify before any work runs.
- **Token storage** — tokens live in `.env`, never in source. `.env` is gitignored.
- **Data storage** — `data/members.json` stores only public handles (slack id, github username, work email). No tokens, no message content.
- **Render output** — videos sit in `out/cache/` until you trim them. Add a `find out/cache -mtime +30 -delete` cron in prod.

---

## Known limitations

- **Private Slack channels and DMs**: not read by default. Adding `groups:history` and `im:history` scopes would change that, but feels invasive — keep off unless explicitly requested.
- **GitHub commit search**: limited to 1000 results, returns 90 days max. Fine for weekly wraps; would need pagination for monthly.
- **X free tier**: 100 reads/month. Track usage if you enable it.
- **LinkedIn**: no app-only access exists. v2 needs per-user OAuth.
- **Slack emoji map**: only ~10 common shortcodes are translated to unicode in `aggregator.ts`. Extend `EMOJI_MAP` as needed, or pull from Slack's `emoji.list` API.
