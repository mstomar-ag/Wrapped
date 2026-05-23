import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn, countTo } from "../components/anim";
import { usePalette } from "../themeRotation";
import { WrappedData } from "../data";

export const EmojiScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = usePalette("emoji");

  const s = springIn(frame, fps, 0);
  const big = springIn(frame, fps, 6, { damping: 9, stiffness: 90 });
  const count = countTo(frame, 18, 30, data.topEmoji.count);
  const bob = Math.sin(frame / 6) * 24;
  const tilt = interpolate(frame, [0, 75], [-8, 8]);

  return (
    <SceneBG palette={p} variant="blobs">
      <AbsoluteFill
        style={{
          padding: "200px 90px",
          color: p.fg,
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: p.accent,
            letterSpacing: -1,
            opacity: s,
          }}
        >
          MOST-USED EMOJI
        </div>

        <div
          style={{
            fontSize: 460,
            lineHeight: 1,
            marginTop: 60,
            transform: `scale(${big}) translateY(${bob}px) rotate(${tilt}deg)`,
            filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.25))",
          }}
        >
          {data.topEmoji.emoji}
        </div>

        <div
          style={{
            fontSize: 220,
            fontWeight: 900,
            letterSpacing: -10,
            color: p.fg,
            lineHeight: 0.9,
            marginTop: 30,
          }}
        >
          ×{count}
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            marginTop: 8,
            opacity: 0.7,
          }}
        >
          "{data.topEmoji.label}"
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
