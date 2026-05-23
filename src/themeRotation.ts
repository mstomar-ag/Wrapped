import { createContext, useContext } from "react";
import { PALETTES, type Palette, type PaletteName } from "./theme";

export type SceneId =
  | "intro"
  | "numbers"
  | "peakHour"
  | "emoji"
  | "thread"
  | "commit"
  | "vibe"
  | "wrap"
  | "weekend";

export type ThemeSchedule = Record<SceneId, PaletteName>;

/**
 * Curated theme schedules. Each is a full 9-slot palette assignment.
 * Constraints applied while curating:
 *  • Adjacent scenes never reuse the same palette
 *  • `commit` is always a dark-bg palette (the CommitScene's card aesthetic depends on it)
 *  • Each schedule has a mix of warm and cool — no schedule is monochrome
 *  • `weekend` is always a softer palette since the slide is the "you worked Saturday" tease
 */
export const SCHEDULES: ThemeSchedule[] = [
  // Classic — the original mix, kept as schedule #0 for stability.
  {
    intro: "hotpink",
    numbers: "purple",
    peakHour: "cobalt",
    emoji: "lime",
    thread: "tangerine",
    commit: "black",
    vibe: "ocean",
    wrap: "pink",
    weekend: "cream",
  },
  // Warm sunset — earthy, summery feel.
  {
    intro: "tangerine",
    numbers: "cream",
    peakHour: "ocean",
    emoji: "hotpink",
    thread: "cobalt",
    commit: "black",
    vibe: "pink",
    wrap: "lime",
    weekend: "purple",
  },
  // Cool deep — blues and greens dominate.
  {
    intro: "cobalt",
    numbers: "pink",
    peakHour: "ocean",
    emoji: "lime",
    thread: "hotpink",
    commit: "black",
    vibe: "tangerine",
    wrap: "purple",
    weekend: "cream",
  },
  // Electric — high-saturation pop.
  {
    intro: "lime",
    numbers: "hotpink",
    peakHour: "cobalt",
    emoji: "tangerine",
    thread: "purple",
    commit: "black",
    vibe: "ocean",
    wrap: "pink",
    weekend: "cream",
  },
  // Twilight — purples, magentas, with a cream finish.
  {
    intro: "purple",
    numbers: "tangerine",
    peakHour: "cobalt",
    emoji: "lime",
    thread: "ocean",
    commit: "black",
    vibe: "hotpink",
    wrap: "cream",
    weekend: "pink",
  },
];

/** Deterministic pick. Same seed → same schedule; different seeds spread evenly.
 * FNV-1a 32-bit — chosen over `h*31 + c` because it spreads small differences
 * (e.g. "@mayank|…" vs "@swapnil|…") across all buckets, not into one. */
export const pickSchedule = (seed: string): ThemeSchedule => {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return SCHEDULES[(h >>> 0) % SCHEDULES.length];
};

// ─── React context ──────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeSchedule>(SCHEDULES[0]);
export const ThemeProvider = ThemeContext.Provider;

export const usePalette = (sceneId: SceneId): Palette => {
  const schedule = useContext(ThemeContext);
  return PALETTES[schedule[sceneId]];
};
