import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// This file only affects CLI commands (`remotion render`). The Hono server
// uses `renderMedia()` programmatically — see concurrency in server/render.ts.
Config.setConcurrency(null); // Remotion picks (≈ cores - 2)
