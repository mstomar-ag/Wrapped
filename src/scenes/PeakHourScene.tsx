import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn } from "../components/anim";
import { PALETTES } from "../theme";
import { WrappedData } from "../data";

export const PeakHourScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = PALETTES.cobalt;

  const s = springIn(frame, fps, 0);
  const moonRot = interpolate(frame, [0, 75], [0, 25]);

  return (
    <SceneBG palette={p} variant="grid">
      <AbsoluteFill style={{ padding: 90, color: p.fg, justifyContent: "center" }}>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: p.accent,
            letterSpacing: -1,
            opacity: s,
          }}
        >
          PEAK HOUR
        </div>

        <div
          style={{
            marginTop: 30,
            display: "flex",
            alignItems: "baseline",
            opacity: s,
            transform: `translateY(${(1 - s) * 40}px)`,
          }}
        >
          <div
            style={{
              fontSize: 480,
              fontWeight: 900,
              letterSpacing: -22,
              lineHeight: 0.85,
              color: p.fg,
            }}
          >
            11
          </div>
          <div
            style={{
              fontSize: 180,
              fontWeight: 900,
              color: p.accent,
              marginLeft: 24,
              letterSpacing: -6,
            }}
          >
            PM
          </div>
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            marginTop: 30,
            opacity: 0.9,
            letterSpacing: -0.5,
          }}
        >
          {data.peakHour.messages} messages after dark.
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            marginTop: 16,
            opacity: 0.65,
          }}
        >
          The team was asleep. You were shipping.
        </div>

        <div
          style={{
            position: "absolute",
            top: 140,
            right: 80,
            fontSize: 200,
            transform: `rotate(${moonRot}deg)`,
            opacity: s * 0.95,
          }}
        >
          🌙
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
