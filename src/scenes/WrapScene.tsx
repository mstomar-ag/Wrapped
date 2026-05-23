import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn } from "../components/anim";
import { usePalette } from "../themeRotation";
import { WrappedData } from "../data";

export const WrapScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = usePalette("wrap");

  const s1 = springIn(frame, fps, 0);
  const s2 = springIn(frame, fps, 10, { damping: 10 });
  const s3 = springIn(frame, fps, 26);
  const shimmer = interpolate(frame, [0, 75], [-200, 1200]);

  return (
    <SceneBG palette={p} variant="blobs">
      <AbsoluteFill
        style={{ padding: 90, color: p.fg, justifyContent: "center", alignItems: "center" }}
      >
        <div
          style={{
            fontSize: 50,
            fontWeight: 800,
            color: p.accent,
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: s1,
          }}
        >
          your week was
        </div>

        <div
          style={{
            position: "relative",
            marginTop: 30,
            textAlign: "center",
            opacity: s2,
            transform: `scale(${0.7 + s2 * 0.3})`,
          }}
        >
          <div
            style={{
              fontSize: 180,
              fontWeight: 900,
              letterSpacing: -8,
              color: p.fg,
              lineHeight: 0.95,
              backgroundImage: `linear-gradient(90deg, ${p.fg} 0%, ${p.accent} 50%, ${p.fg} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% 100%",
              backgroundPosition: `${shimmer}px 0`,
            }}
          >
            {data.weekTitle}
          </div>
        </div>

        <div
          style={{
            marginTop: 80,
            padding: "20px 40px",
            borderRadius: 999,
            background: p.accent,
            color: p.onAccent,
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: -0.5,
            opacity: s3,
            transform: `translateY(${(1 - s3) * 30}px)`,
          }}
        >
          /wrapped {data.handle}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 100,
            fontSize: 28,
            fontWeight: 700,
            opacity: 0.55 * s3,
            letterSpacing: 4,
          }}
        >
          SEE YOU NEXT WEEK
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
