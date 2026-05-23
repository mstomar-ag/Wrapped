import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn } from "../components/anim";
import { usePalette } from "../themeRotation";
import { WrappedData } from "../data";

export const IntroScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = usePalette("intro");

  const s1 = springIn(frame, fps, 0);
  const s2 = springIn(frame, fps, 8);
  const s3 = springIn(frame, fps, 18);
  const rotate = interpolate(frame, [0, 60], [-12, 0]);

  return (
    <SceneBG palette={p} variant="blobs">
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          color: p.fg,
          padding: 80,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: -1.5,
            opacity: s1,
            transform: `translateY(${(1 - s1) * 40}px)`,
            color: p.accent,
          }}
        >
          Your Week,
        </div>
        <div
          style={{
            fontSize: 220,
            fontWeight: 900,
            letterSpacing: -6,
            lineHeight: 0.9,
            marginTop: 10,
            opacity: s2,
            transform: `scale(${0.6 + s2 * 0.4}) rotate(${rotate * (1 - s2)}deg)`,
            color: p.fg,
          }}
        >
          WRAPPED
        </div>
        <div
          style={{
            marginTop: 60,
            padding: "20px 40px",
            borderRadius: 999,
            background: p.accent,
            color: p.onAccent,
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: -0.5,
            opacity: s3,
            transform: `translateY(${(1 - s3) * 40}px)`,
          }}
        >
          {data.name} · {data.weekLabel}
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
