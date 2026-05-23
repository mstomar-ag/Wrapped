// Each palette has four colors:
//   bg       — scene background
//   fg       — primary text (must be legible on bg)
//   accent   — secondary highlight color (must be legible on bg)
//   onAccent — color of text/icons placed on top of `accent` (e.g. pills, badges)
//
// `onAccent` is the bit you tend to forget — without it, pills with hardcoded
// dark text become invisible when accent rotates to a dark color like cobalt.
export const PALETTES = {
  pink: { bg: "#FF1B6B", fg: "#FFE9F2", accent: "#FFD93D", onAccent: "#3a1f00" },
  purple: { bg: "#5E17EB", fg: "#F2E8FF", accent: "#A8FF53", onAccent: "#0a2e1a" },
  lime: { bg: "#A8FF53", fg: "#0A2E1A", accent: "#5E17EB", onAccent: "#F2E8FF" },
  tangerine: { bg: "#FF6B35", fg: "#FFF2E5", accent: "#1E3FE5", onAccent: "#E5ECFF" },
  cobalt: { bg: "#1E3FE5", fg: "#E5ECFF", accent: "#FFD93D", onAccent: "#0a1a3a" },
  cream: { bg: "#FFE5B4", fg: "#3A1F0A", accent: "#FF1B6B", onAccent: "#FFE9F2" },
  black: { bg: "#0A0A0A", fg: "#F2F2F2", accent: "#A8FF53", onAccent: "#0a2e1a" },
  ocean: { bg: "#0EA5A4", fg: "#E6FFFD", accent: "#FFD93D", onAccent: "#0a1a3a" },
  hotpink: { bg: "#FF3D8A", fg: "#1A0010", accent: "#1E3FE5", onAccent: "#E5ECFF" },
};

export type Palette = (typeof PALETTES)[keyof typeof PALETTES];
export type PaletteName = keyof typeof PALETTES;

export const FONT_STACK = '"Inter", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif';
