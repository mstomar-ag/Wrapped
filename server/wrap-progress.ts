import { updateEntry } from "./archive/store";
import { WrapPhase } from "./archive/types";

export const setWrapProgress = (
  entryId: string,
  phase: WrapPhase,
  progress: number,
  progressMessage: string,
) => {
  updateEntry(entryId, {
    status: "rendering",
    phase,
    progress: Math.min(100, Math.max(0, Math.round(progress))),
    progressMessage,
  });
};

/** Fake render progress — Remotion has no native % callback. */
export const trackRenderProgress = (entryId: string, estimateMs = 120_000): (() => void) => {
  const start = Date.now();
  const tick = () => {
    const elapsed = Date.now() - start;
    const t = Math.min(1, elapsed / estimateMs);
    const progress = 42 + t * 53;
    setWrapProgress(entryId, "rendering", progress, renderMessage(t));
  };
  tick();
  const id = setInterval(tick, 1500);
  return () => clearInterval(id);
};

const renderMessage = (t: number): string => {
  if (t < 0.15) return "Warming up Chromium…";
  if (t < 0.4) return "Rendering scenes…";
  if (t < 0.7) return "Stitching frames…";
  if (t < 0.9) return "Encoding MP4…";
  return "Almost there…";
};
