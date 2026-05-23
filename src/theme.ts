export const PALETTES = {
  pink: { bg: "#FF1B6B", fg: "#FFE9F2", accent: "#FFD93D" },
  purple: { bg: "#5E17EB", fg: "#F2E8FF", accent: "#A8FF53" },
  lime: { bg: "#A8FF53", fg: "#0A2E1A", accent: "#5E17EB" },
  tangerine: { bg: "#FF6B35", fg: "#FFF2E5", accent: "#1E3FE5" },
  cobalt: { bg: "#1E3FE5", fg: "#E5ECFF", accent: "#FFD93D" },
  cream: { bg: "#FFE5B4", fg: "#3A1F0A", accent: "#FF1B6B" },
  black: { bg: "#0A0A0A", fg: "#F2F2F2", accent: "#A8FF53" },
  ocean: { bg: "#0EA5A4", fg: "#E6FFFD", accent: "#FFD93D" },
  hotpink: { bg: "#FF3D8A", fg: "#1A0010", accent: "#1E3FE5" },
};

export type Palette = (typeof PALETTES)[keyof typeof PALETTES];

export const FONT_STACK = '"Inter", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif';
