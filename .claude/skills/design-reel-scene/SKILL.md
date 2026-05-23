---
name: design-reel-scene
description: Design and add a new slide to the Wrapped reel with the right Spotify-Wrapped aesthetic. Use when the user asks to "add a new slide", "design a scene for X", or "the reel needs a slide about Y". Covers palette selection, typography rules, motion conventions, and verification via stills.
---

# design-reel-scene

The Wrapped reel lives or dies on aesthetics. This skill captures the design system already in use across the 9 existing scenes (`src/scenes/`) so new slides feel like part of the family, not bolted on.

## When to invoke

- User says: "add a slide about Linear tickets", "design a scene for X", "the reel needs a slide showing Y", "make the commit scene look better"
- A new data source has been added and needs a visual representation

## The design system in one screen

Wrapped's visual signature comes from four things, applied consistently:

1. **Bold typography** — display weight (800–900), tight tracking (`letterSpacing: -6` to `-22` at large sizes)
2. **Vibrant, solid backgrounds** — one palette per slide, contrast palettes between adjacent slides
3. **Numbers as art** — large stats fill ~40% of the canvas, animated with `springIn`
4. **Quick, springy motion** — `spring()` for entrances, `interpolate()` for continuous, never linear

## Step-by-step

### 1. Pick a palette

Look at `src/theme.ts`. The existing palettes:

```
pink       hotpink + cream + yellow
purple     deep purple + cream + lime
lime       lime + dark green + purple
tangerine  orange + cream + cobalt
cobalt     blue + ice + yellow
cream      cream + brown + pink
black      black + light + lime
ocean      teal + ice + yellow
hotpink    hot pink + dark + cobalt
```

**Rule:** the new scene's palette must contrast with the scene before and after it. If your new slide goes between Numbers (purple) and PeakHour (cobalt), pick something warm — lime or tangerine.

If none of the existing palettes fit, add one. Every palette is `{ bg, fg, accent }`. Constraints:
- `fg` must be legible on `bg` (high contrast)
- `accent` must be legible on `bg` too (it's used for the small heading)
- Hex codes only, no opacity modifiers

### 2. Copy a similar scene as a template

Pick the closest existing scene structurally:

| If your scene is mainly… | Copy from |
|---|---|
| A single big number with a label | `NumbersScene.tsx` |
| One huge emoji + count | `EmojiScene.tsx` |
| A quote with words fading in | `VibeScene.tsx` |
| A card with metadata + stats | `CommitScene.tsx` |
| A title card with shimmer text | `WrapScene.tsx` |
| A time / hour display | `PeakHourScene.tsx` |

### 3. Structure the JSX

Every scene follows the same shape:

```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn, fadeIn, countTo } from "../components/anim";
import { PALETTES } from "../theme";
import { WrappedData } from "../data";

export const MyScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = PALETTES.lime;                          // 1. palette

  const sTitle = springIn(frame, fps, 0);           // 2. animated values
  const sValue = springIn(frame, fps, 8);
  const value = countTo(frame, 14, 30, data.something);

  return (
    <SceneBG palette={p} variant="blobs">           {/* 3. background */}
      <AbsoluteFill style={{
        padding: 90,
        color: p.fg,
        justifyContent: "center"
      }}>
        <div style={{                                 {/* 4. small heading */}
          fontSize: 56,
          fontWeight: 800,
          color: p.accent,
          letterSpacing: -1,
          opacity: sTitle,
        }}>
          MY SECTION TITLE
        </div>

        <div style={{                                 {/* 5. hero number/visual */}
          fontSize: 300,
          fontWeight: 900,
          letterSpacing: -10,
          lineHeight: 0.9,
          marginTop: 40,
          opacity: sValue,
          transform: `translateY(${(1 - sValue) * 60}px)`,
        }}>
          {value}
        </div>

        <div style={{                                 {/* 6. label */}
          fontSize: 42,
          fontWeight: 700,
          opacity: 0.85,
        }}>
          context for the number
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
```

### 4. Apply the type scale

| Element | Font size | Weight | Letter-spacing |
|---|---|---|---|
| Hero number | 200–400 | 900 | -6 to -22 |
| Hero text (1–2 words) | 88–180 | 900 | -2 to -8 |
| Section title (top) | 50–60 | 800 | -1 |
| Supporting line | 40–50 | 700 | -0.5 |
| Caption / sub-label | 28–36 | 600–700 | normal |

Never use `<400` font sizes — at 1080×1920 they vanish in social previews.

### 5. Apply the motion grammar

| Movement | Use |
|---|---|
| `springIn(frame, fps, delay)` | Entry of any large element. Stagger by 6–14 frames between elements |
| `countTo(frame, start, dur, target)` | Number reveals — always 25–35 frames |
| `fadeIn(frame, start, dur)` | Subtle entries, supporting text |
| `interpolate(frame, [a, b], [v0, v1])` | Continuous motion (drift, rotate, shimmer) |
| `Math.sin(frame / N) * amplitude` | Idle bob/sway on emoji or shapes |

Never animate everything at the same time. Stagger creates rhythm.

### 6. Register the scene

In `src/Wrapped.tsx`:

```tsx
import { MyScene } from "./scenes/MyScene";

const SCENES = [
  // ...
  { Comp: MyScene, dur: 90 },         // 90 frames at 30fps = 3 seconds
  // ...
];
```

**Duration rules of thumb:**
- Title cards / intros / wraps: 60–75 frames (2–2.5s)
- Single-stat slides: 75 frames (2.5s)
- Two-stat or comparison slides: 90 frames (3s)
- Quote / vibe slides: 90 frames (3s)
- Complex layouts (commit card, multiple sections): 105 frames (3.5s)

Aim for **total composition under 30 seconds**. Currently it's 25s — that's the sweet spot for social.

### 7. Verify visually

Render stills at the scene's start, middle, and end:

```bash
# Compute start frame from the SCENES array, then:
npx remotion still Wrapped out/preview-start.png --frame=315
npx remotion still Wrapped out/preview-mid.png --frame=360
npx remotion still Wrapped out/preview-end.png --frame=400
```

**Checks:**
- [ ] No text overflows the 1080-wide canvas (use Read on the still to inspect)
- [ ] Hero element doesn't overlap section title or label
- [ ] Contrast is legible — squint at the still, can you still read everything?
- [ ] Motion has rhythm — does it feel staggered, not "everything pops at once"?

### 8. Render the full reel

```bash
npm run wrap -- mayank last-week --render
open out/cache/*.mp4
```

Watch end-to-end. Your new scene should feel inevitable, like it's always been there.

## Anti-patterns to avoid

- **Gradient backgrounds.** Solid colors only (unless using the `gradient` variant of `SceneBG`, which is sparingly tuned).
- **Small body text.** If it's text, make it big.
- **Soft drop shadows on text.** Cheap-looking. Use them only on emoji or other graphic elements.
- **Generic stock icons.** The reel uses native emoji for visual punch — never SVG icon packs.
- **Italics.** Once, for the thread title (a quote). Otherwise no.
- **More than two colors per scene.** `bg` + `fg` + `accent`. That's it.

## Testing

Pure scenes (no network) get tested implicitly through the still-render verification. No unit test is required for visual scenes. If you add logic outside JSX (e.g., a helper that picks an emoji), test that in a `.test.ts` adjacent file.

## Done when

- [ ] Scene file at `src/scenes/<Name>Scene.tsx`
- [ ] Registered in `SCENES` in `src/Wrapped.tsx`
- [ ] Total composition duration still ≤ 30s
- [ ] Stills at start/mid/end inspected; no overflow, good contrast
- [ ] Full reel renders end-to-end (`out/cache/*.mp4`)
- [ ] No new lint warnings (`npm run lint`)
