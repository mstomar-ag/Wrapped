---
name: palette-rotation
description: Add or rotate Wrapped reel color palettes and curated theme schedules. Use when the user asks for new colors, a fresh palette, theme rotation, schedule variants, Spotify-Wrapped-style colorways, or fixing contrast on pills/badges across slides.
---

# palette-rotation

Wrapped’s reel colors are **not** hardcoded per scene anymore. A **palette** is a 4-token color set; a **schedule** assigns one palette name to each scene slot; **`pickSchedule(seed)`** chooses a schedule deterministically so the same person + week looks the same, but palettes shift week-over-week.

Read the live source before editing:

| File | Role |
|------|------|
| `src/theme.ts` | `PALETTES` — all named color tokens |
| `src/themeRotation.ts` | `SCHEDULES`, `pickSchedule`, `usePalette`, `SceneId` |
| `src/Wrapped.tsx` | `ThemeProvider` + seed: `handle\|weekLabel\|kind` |
| `src/scenes/*.tsx` | Each scene calls `usePalette("<sceneId>")` |
| `src/components/SceneBG.tsx` | Uses `bg`, `fg`, `accent` for background/blobs |

Pair with **`design-reel-scene`** for layout, typography, and motion — this skill is **colors and schedules only**.

## When to invoke

- “Add a new palette”, “mint green theme”, “darker vibe”, “more contrast”
- “New rotation”, “fifth schedule”, “channel wraps look too pink”
- Pills/badges unreadable after a palette change (missing `onAccent`)
- Migrating a scene off `PALETTES.foo` to `usePalette("…")`

## The four tokens (required)

Every palette in `PALETTES` must define **all four** keys:

```ts
myName: {
  bg: "#……",       // scene background (solid or gradient base)
  fg: "#……",       // primary text — must pass squint test on bg
  accent: "#……",   // headings, blobs, grid lines, gradient second stop
  onAccent: "#……", // text/icons on accent-filled surfaces (pills, chips)
},
```

**Rules:**

- Hex only (`#RRGGBB`). No `rgba()` on palette tokens.
- `fg` readable on `bg`; `accent` readable on `bg` (used at ~15–30% opacity in blobs too).
- `onAccent` readable on **solid `accent`** — if you skip this, CommitScene pills and accent chips go invisible when accent is dark (e.g. cobalt).
- Prefer **high saturation** and **warm/cool alternation** — this is Spotify Wrapped, not corporate SaaS gray.

### Existing palette names (extend, don’t rename)

`pink`, `purple`, `lime`, `tangerine`, `cobalt`, `cream`, `black`, `ocean`, `hotpink`

New names: lowercase, one word, no spaces (e.g. `sage`, `ember`, `midnight`).

## How rotation works

```
seed = `${handle}|${weekLabel}|${kind}`  →  pickSchedule(seed)  →  ThemeSchedule
each scene: usePalette("intro")  →  PALETTES[schedule.intro]
```

- **Same seed → same schedule** (stable re-renders, cache-friendly).
- **Different week label → different schedule index** (`h % SCHEDULES.length`).
- Adding a schedule at the **end** of `SCHEDULES` changes rotation for some seeds; editing schedule **#0** changes the most wraps (it’s the fallback context default).

## Scene slots (`SceneId`)

| `SceneId` | Scene component | Notes |
|-----------|-----------------|--------|
| `intro` | IntroScene | Title card |
| `numbers` | NumbersScene | Big stats |
| `peakHour` | PeakHourScene | Often `grid` variant |
| `emoji` | EmojiScene | Skipped if no emoji data |
| `thread` | ThreadScene | Quote styling |
| `commit` | CommitScene | **Always dark `bg`** (`black` strongly preferred) |
| `vibe` | VibeScene | Word cascade |
| `wrap` | WrapScene | Outro |
| `weekend` | WeekendScene | In schedules for completeness; may be unused in `buildScenes` |

Scenes must use rotation, not literals:

```tsx
import { usePalette } from "../themeRotation";

export const NumbersScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const p = usePalette("numbers");
  // use p.bg, p.fg, p.accent, p.onAccent — never PALETTES.purple
```

If you touch a scene that still has `PALETTES.xxx`, migrate it in the same PR.

## Curating a new schedule

Add one object to `SCHEDULES` in `src/themeRotation.ts` — a full `Record<SceneId, PaletteName>`.

### Hard constraints (never break)

1. **Adjacent scenes in playback order must use different palette names** — for both member and channel paths (see below).
2. **`commit` → dark background** — use `black` unless you redesign CommitScene’s card (white panel on `p.bg`).
3. **Mix warm and cool** — don’t assign cobalt/ocean/purple to every slot.
4. **`weekend` → softer** — `cream`, `pink`, or `purple` at low energy; avoid `lime`/`hotpink` unless intentional joke.

### Playback order (for adjacency checks)

`buildScenes` in `src/Wrapped.tsx`:

**Member:** `intro` → `numbers` → `peakHour` → [`emoji` if count > 0] → `thread` → [`commit` if not channel] → `vibe` → `wrap`

**Channel:** same but **no `commit`**

Validate **every consecutive pair** in both paths. Example channel path with emoji:  
`intro–numbers–peakHour–emoji–thread–vibe–wrap` (6 adjacencies).

### Schedule mood labels (for commit messages)

When adding schedule #N, name it in a comment like existing entries:

- Classic, Warm sunset, Cool deep, Electric, Twilight, …

Give the user a one-line vibe: *“Electric — lime intro, hotpink numbers, cobalt peak.”*

## Step-by-step: new palette only

1. Add four tokens to `PALETTES` in `src/theme.ts`.
2. Squint-check contrast (fg on bg, accent on bg, onAccent on accent).
3. Swap one slot in an existing schedule to the new name **or** wait until a full new schedule is requested.
4. Render stills for any scene using that name:

```bash
npm run dev   # Remotion Studio
# or
npx remotion still Wrapped out/palette-check.png --frame=30
```

5. `npm run check`

## Step-by-step: new full schedule

1. Copy the schedule object closest to the desired mood.
2. Reassign all nine `SceneId` keys.
3. Run adjacency validation (member + channel, with and without emoji).
4. Append to `SCHEDULES` (do not delete old schedules without explicit user ask).
5. Preview two seeds in Studio or CLI:

```bash
npm run wrap -- mayank last-week --render
# change weekLabel in data or use a different window to flip schedule index
```

6. `npm run check`

## Step-by-step: new scene + rotation

1. Add a new `SceneId` to `themeRotation.ts` (`SceneId` union + every entry in **every** schedule).
2. Pick palette per constraints; register scene in `buildScenes`.
3. Scene file: `usePalette("yourId")`.
4. Follow **`design-reel-scene`** for duration, motion, and still verification.

## Color direction cheat sheet

| Mood | Good bg choices | Pair with |
|------|-----------------|-----------|
| Pop / hype | `hotpink`, `lime`, `pink` | `cobalt`, `purple` accents |
| Calm / reflective | `ocean`, `cream`, `cobalt` | `tangerine`, `pink` accents |
| Night / code | `black`, `cobalt`, `purple` | `lime`, `cream` accents |
| Warm editorial | `tangerine`, `cream` | `cobalt`, `ocean` accents |

Avoid: two light bgs back-to-back (`cream` → `lime`), two near-identical magentas (`pink` → `hotpink`).

## Anti-patterns

- Hardcoding `PALETTES.foo` in scenes (breaks rotation).
- Three-token palettes (missing `onAccent`).
- Light `commit` background without redesigning the commit card.
- Reusing the same palette on `thread` and `vibe` (adjacent on most paths).
- Opacity on `fg` as a crutch for contrast — pick better hex values.
- Random per-render palette (`Math.random`) — breaks cache and user trust.

## Verification checklist

- [ ] All four tokens set for every new palette name
- [ ] New/changed schedule satisfies adjacency on member **and** channel paths
- [ ] `commit` slot is dark-bg
- [ ] Touched scenes use `usePalette`, not `PALETTES.*`
- [ ] Stills: intro, numbers, commit (member), wrap — pills readable
- [ ] `npm run check` passes
- [ ] Optional: two different `weekLabel` values produce visibly different schedules

## Done when

User can generate a wrap and see the new colors on the intended slides, with no illegible accent pills and no adjacent duplicate palette names on the timeline.
