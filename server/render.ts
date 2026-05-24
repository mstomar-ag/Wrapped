import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { WrappedData } from "../src/data";
import { buildRenderFileName } from "./render-path";
import { renderCacheDir } from "./paths";

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

// Cache invalidations:
//   v2 → v3: PeakHourScene fix (hardcoded "11 PM")
//   v3 → v4: theme rotation (palette per scene now varies per render seed)
//   v4 → v5: emoji rendering (fonts-noto-color-emoji added to Docker image)
//   v5 → v6: DesignCanvas scales 1080-authored scenes for non-1080 outputs
const RENDER_CACHE_VERSION = "v6";

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
  /** Bypass the content-hash cache read (still writes the cache for future hits). */
  forceFresh?: boolean;
};

const hashIndexPath = (hash: string) =>
  path.join(renderCacheDir(), ".by-hash", `${hash}.json`);

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
  const cacheDir = renderCacheDir();
  const hash = hashData(data);

  if (!opts.outFile && !opts.forceFresh) {
    const cached = await readHashIndex(hash);
    if (cached) {
      console.log(`[render] cache hit (hash=${hash}) → ${cached}`);
      return cached;
    }
  }
  if (opts.forceFresh) {
    console.log(`[render] forceFresh — bypassing cache lookup`);
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
  // Render frames in parallel. Concurrency is the single biggest knob.
  //
  //   - On bare metal / your Mac → many cores, set RENDER_CONCURRENCY=8
  //   - On Railway / small VM    → leave default OR set RENDER_CONCURRENCY=2
  //
  // `availableParallelism()` (Node ≥19) honors container cgroup limits, so a
  // 2-vCPU Railway service reports 2 even when the underlying host has 32.
  // `os.cpus().length` does NOT respect cgroups; never use it for this.
  // Each worker holds ~150 MB; we cap at 6 to keep peak memory under ~1 GB.
  const detected = typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus().length;
  const concurrency = process.env.RENDER_CONCURRENCY
    ? Math.max(1, Number(process.env.RENDER_CONCURRENCY))
    : Math.max(2, Math.min(6, detected - 1));

  // libx264 reads /proc/cpuinfo which shows the *host* CPU count, not the
  // container's cgroup quota. On Railway's 2 vCPU service that meant x264
  // spawned 48 threads, OOM-killed ffmpeg, render died with EPIPE around
  // frame 108. We cap it to the same value we use for browser concurrency.
  // RENDER_FFMPEG_THREADS lets ops override independently if needed.
  const encoderThreads = Number(process.env.RENDER_FFMPEG_THREADS) || concurrency;

  console.log(
    `[render] concurrency=${concurrency} (cores=${detected}) ffmpegThreads=${encoderThreads} → ${outPath}`,
  );

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps: { data },
    browserExecutable,
    concurrency,
    ffmpegOverride: ({ args }) => {
      // Drop any stray `-threads N` Remotion may have set, then inject our own.
      const stripped: string[] = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "-threads") {
          i++; // skip value
          continue;
        }
        stripped.push(args[i]);
      }
      // Inject before the output (which is the last positional arg).
      return [...stripped.slice(0, -1), "-threads", String(encoderThreads), stripped[stripped.length - 1]];
    },
  });

  if (!opts.outFile) await writeHashIndex(hash, outPath);
  return outPath;
};
