import { videoFileReady } from "../paths";
import { ArchiveEntry } from "./types";

/** Strip server paths; expose whether the MP4 exists on disk. */
export const toPublicArchiveEntry = (e: ArchiveEntry) => ({
  ...e,
  hasVideo: e.status === "ready" && videoFileReady(e.filePath),
  filePath: undefined,
});
