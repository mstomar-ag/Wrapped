/** Safe filesystem label from a display name (member name or #channel). */
export const slugifyDisplayName = (name: string): string => {
  const base = name
    .replace(/^#/, "channel_")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base.slice(0, 80) || "wrapped";
};

/** `mayank_singh_tomar_20260523_105826` (UTC, filesystem-safe). */
export const formatRenderTimestamp = (at = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${at.getUTCFullYear()}${p(at.getUTCMonth() + 1)}${p(at.getUTCDate())}_${p(at.getUTCHours())}${p(at.getUTCMinutes())}${p(at.getUTCSeconds())}`;
};

/** e.g. `mayank_singh_tomar_20260523_105826.mp4` */
export const buildRenderFileName = (displayName: string, at = new Date()): string =>
  `${slugifyDisplayName(displayName)}_${formatRenderTimestamp(at)}.mp4`;
