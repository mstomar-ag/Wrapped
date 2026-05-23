import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn, countTo } from "../components/anim";
import { PALETTES } from "../theme";
import { WrappedData } from "../data";

export const GhostScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = PALETTES.cream;

  const s = springIn(frame, fps, 0);
  const ghostS = springIn(frame, fps, 8, { damping: 8 });
  const streaks = countTo(frame, 22, 28, data.ghostMode.streaks);
  const bob = Math.sin(frame / 7) * 30;
  const swayDeg = interpolate(frame, [0, 75], [-6, 6]);

  return (
    <SceneBG palette={p} variant="blobs">
      <AbsoluteFill
        style={{ padding: 90, color: p.fg, justifyContent: "center", alignItems: "center" }}
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
          GHOST MODE
        </div>

        <div
          style={{
            fontSize: 480,
            lineHeight: 1,
            marginTop: -10,
            transform: `scale(${ghostS}) translateY(${bob}px) rotate(${swayDeg}deg)`,
            filter: "drop-shadow(0 30px 30px rgba(0,0,0,0.2))",
          }}
        >
          👻
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 10 }}>
          <div
            style={{
              fontSize: 340,
              fontWeight: 900,
              letterSpacing: -16,
              color: p.fg,
              lineHeight: 0.85,
            }}
          >
            {streaks}×
          </div>
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            marginTop: 4,
            opacity: 0.85,
            textAlign: "center",
            maxWidth: 760,
          }}
        >
          you vanished for {data.ghostMode.longestHours}+ hours.
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            marginTop: 10,
            opacity: 0.55,
          }}
        >
          We assume you were in the zone.
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
