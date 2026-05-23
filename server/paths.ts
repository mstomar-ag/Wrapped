import fs from "node:fs";
import path from "node:path";

export const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

/** MP4 + hash index dir. On Railway (one volume), set WRAPPED_CACHE_DIR=/app/data/cache. */
export const renderCacheDir = (): string => {
  const custom = process.env.WRAPPED_CACHE_DIR?.trim();
  if (custom) return path.resolve(custom);
  return path.join(PROJECT_ROOT, "out", "cache");
};

/** Store paths relative to repo root so archive works across Docker ↔ local. */
export const toRelativePath = (absolute: string): string => {
  const rel = path.relative(PROJECT_ROOT, absolute);
  if (!rel.startsWith("..")) return rel.replace(/\\/g, "/");
  return absolute.replace(/\\/g, "/");
};

export const resolveProjectPath = (stored: string): string => {
  if (path.isAbsolute(stored)) return stored;
  return path.join(PROJECT_ROOT, stored);
};

export const videoFileReady = (stored?: string): boolean => {
  if (!stored) return false;
  try {
    return fs.statSync(resolveProjectPath(stored)).isFile();
  } catch {
    return false;
  }
};
