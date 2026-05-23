import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Palette } from "../theme";

export const SceneBG: React.FC<{
  palette: Palette;
  children: React.ReactNode;
  variant?: "solid" | "gradient" | "blobs" | "grid";
}> = ({ palette, children, variant = "solid" }) => {
  const frame = useCurrentFrame();
  const wobble = Math.sin(frame / 20) * 8;

  let background: string = palette.bg;
  if (variant === "gradient") {
    background = `linear-gradient(${135 + wobble}deg, ${palette.bg} 0%, ${palette.accent} 100%)`;
  }

  return (
    <AbsoluteFill style={{ background, overflow: "hidden" }}>
      {variant === "blobs" && <Blobs palette={palette} />}
      {variant === "grid" && <GridPattern palette={palette} />}
      {children}
    </AbsoluteFill>
  );
};

const Blobs: React.FC<{ palette: Palette }> = ({ palette }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  return (
    <>
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: palette.accent,
          opacity: 0.55,
          filter: "blur(80px)",
          top: 100 + Math.sin(t) * 60,
          left: -300 + Math.cos(t * 0.8) * 80,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: palette.fg,
          opacity: 0.18,
          filter: "blur(120px)",
          bottom: 100 + Math.cos(t * 1.2) * 60,
          right: -200 + Math.sin(t) * 80,
        }}
      />
    </>
  );
};

const GridPattern: React.FC<{ palette: Palette }> = ({ palette }) => {
  const frame = useCurrentFrame();
  const offset = (frame * 1.5) % 80;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `linear-gradient(${palette.fg}22 1px, transparent 1px), linear-gradient(90deg, ${palette.fg}22 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
        backgroundPosition: `${offset}px ${offset}px`,
        opacity: 0.7,
      }}
    />
  );
};

export const useSceneIntro = (durationFrames: number) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    frame,
    [durationFrames - 12, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  return { enter, exit, both: Math.min(enter, exit) };
};
