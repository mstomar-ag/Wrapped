import { spring, interpolate } from "remotion";

export const springIn = (
  frame: number,
  fps: number,
  delay = 0,
  config: { damping?: number; mass?: number; stiffness?: number } = {},
) =>
  spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 110, ...config },
  });

export const fadeIn = (frame: number, start: number, dur = 10) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const countTo = (frame: number, start: number, dur: number, to: number) =>
  Math.round(
    interpolate(frame, [start, start + dur], [0, to], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
