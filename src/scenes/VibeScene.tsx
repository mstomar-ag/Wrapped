import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn, fadeIn } from "../components/anim";
import { usePalette } from "../themeRotation";
import { WrappedData } from "../data";

export const VibeScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = usePalette("vibe");

  const s = springIn(frame, fps, 0);
  const sQuote = springIn(frame, fps, 14);
  const wordsFade = fadeIn(frame, 30, 25);
  const pulse = 1 + Math.sin(frame / 9) * 0.02;

  const words = data.vibe.split(" ");

  return (
    <SceneBG palette={p} variant="blobs">
      <AbsoluteFill style={{ padding: 90, color: p.fg, justifyContent: "center" }}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: p.accent,
            letterSpacing: -1,
            opacity: s,
          }}
        >
          THE VIBE
        </div>

        <div
          style={{
            marginTop: 30,
            fontSize: 220,
            fontWeight: 900,
            color: p.accent,
            lineHeight: 0.85,
            letterSpacing: -10,
            opacity: sQuote,
            transform: `scale(${pulse})`,
            transformOrigin: "left center",
          }}
        >
          "
        </div>

        <div
          style={{
            marginTop: -30,
            fontSize: 78,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.1,
            maxWidth: 900,
            opacity: wordsFade,
          }}
        >
          {words.map((w, i) => {
            const wf = fadeIn(frame, 22 + i * 3, 8);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: 18,
                  opacity: wf,
                  transform: `translateY(${(1 - wf) * 30}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
