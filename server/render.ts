import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { WrappedData } from "../src/data";
import { buildRenderFileName } from "./render-path";

const ROOT = path.resolve(import.meta.dirname, "..");

let bundlePromise: Promise<string> | null = null;
const getBundle = () => {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.join(ROOT, "src/index.ts"),
      outDir: path.join(ROOT, ".remotion-bundle"),
      publicDir: path.join(ROOT, "public"),
    });
  }
  return bundlePromise;
};

const RENDER_CACHE_VERSION = "v2";

const hashData = (data: WrappedData): string =>
  crypto
    .createHash("sha256")
    .update(RENDER_CACHE_VERSION + JSON.stringify(data))
    .digest("hex")
    .slice(0, 12);

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
};

export type RenderOptions = {
  /** Used in the filename: `slugify(displayName)_<timestamp>.mp4` */
  displayName?: string;
  /** Skip cache and write exactly here. */
  outFile?: string;
};

const hashIndexPath = (hash: string) => path.join(ROOT, "out", "cache", ".by-hash", `${hash}.json`);

const readHashIndex = async (hash: string): Promise<string | null> => {
  try {
    const raw = await fs.readFile(hashIndexPath(hash), "utf8");
    const { filePath } = JSON.parse(raw) as { filePath: string };
    if (await fileExists(filePath)) return filePath;
  } catch {
    // miss
  }
  return null;
};

const writeHashIndex = async (hash: string, filePath: string) => {
  const indexFile = hashIndexPath(hash);
  await fs.mkdir(path.dirname(indexFile), { recursive: true });
  await fs.writeFile(indexFile, JSON.stringify({ filePath, hash }, null, 2), "utf8");
};

export const renderWrapped = async (
  data: WrappedData,
  opts: RenderOptions = {},
): Promise<string> => {
  const cacheDir = path.join(ROOT, "out", "cache");
  const hash = hashData(data);

  if (!opts.outFile) {
    const cached = await readHashIndex(hash);
    if (cached) return cached;
  }

  const browserExecutable = process.env.REMOTION_CHROME_EXECUTABLE_PATH || undefined;
  const serveUrl = await getBundle();
  const composition = await selectComposition({
    serveUrl,
    id: "Wrapped",
    inputProps: { data },
    browserExecutable,
  });

  const displayName = opts.displayName ?? data.name;
  const fileName = buildRenderFileName(displayName);
  const outPath = opts.outFile ? path.resolve(opts.outFile) : path.join(cacheDir, fileName);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps: { data },
    browserExecutable,
  });

  if (!opts.outFile) await writeHashIndex(hash, outPath);
  return outPath;
};
