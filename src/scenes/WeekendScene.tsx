import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn, countTo } from "../components/anim";
import { PALETTES } from "../theme";
import { WrappedData } from "../data";

export const WeekendScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = PALETTES.tangerine;
  const w = data.weekend;
  if (!w) return null;

  const total = w.saturday + w.sunday;
  const s = springIn(frame, fps, 0);
  const sBig = springIn(frame, fps, 8, { damping: 9 });
  const count = countTo(frame, 16, 28, total);
  const sLabel = springIn(frame, fps, 30);
  const sun = interpolate(frame, [0, 90], [-15, 15]);

  return (
    <SceneBG palette={p} variant="blobs">
      <AbsoluteFill
        style={{
          padding: 90,
          color: p.fg,
          justifyContent: "center",
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
          THE WEEKEND
        </div>

        <div
          style={{
            position: "absolute",
            top: 130,
            right: 80,
            fontSize: 200,
            transform: `rotate(${sun}deg)`,
            opacity: s * 0.9,
          }}
        >
          🏖️
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 22,
            marginTop: 30,
            opacity: sBig,
            transform: `scale(${0.7 + sBig * 0.3})`,
            transformOrigin: "left center",
          }}
        >
          <div
            style={{
              fontSize: 420,
              fontWeight: 900,
              letterSpacing: -20,
              lineHeight: 0.85,
              color: p.fg,
            }}
          >
            {count}
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              letterSpacing: -2,
              color: p.accent,
            }}
          >
            msgs
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            display: "inline-block",
            padding: "16px 36px",
            borderRadius: 999,
            background: p.fg,
            color: "#3a1f00",
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: -1.5,
            opacity: sLabel,
            transform: `translateY(${(1 - sLabel) * 30}px)`,
            alignSelf: "flex-start",
          }}
        >
          "{w.label}"
        </div>

        <div
          style={{
            display: "flex",
            gap: 30,
            marginTop: 30,
            opacity: sLabel,
          }}
        >
          {w.saturday > 0 && (
            <div>
              <div style={{ fontSize: 80, fontWeight: 900, color: p.accent, letterSpacing: -3 }}>
                {w.saturday}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.75 }}>Saturday</div>
            </div>
          )}
          {w.sunday > 0 && (
            <div>
              <div style={{ fontSize: 80, fontWeight: 900, color: p.accent, letterSpacing: -3 }}>
                {w.sunday}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, opacity: 0.75 }}>Sunday</div>
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 110,
            left: 90,
            right: 90,
            fontSize: 32,
            fontWeight: 600,
            opacity: 0.6,
            fontStyle: "italic",
          }}
        >
          {w.sunday > 0
            ? "We see you. The team hopes you slept at some point."
            : "Saturday hustle. Respect."}
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
