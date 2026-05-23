import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn, countTo } from "../components/anim";
import { PALETTES } from "../theme";
import { WrappedData } from "../data";

export const NumbersScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = PALETTES.purple;

  const s = springIn(frame, fps, 0);
  const messages = countTo(frame, 8, 35, data.numbers.messages);
  const commits = countTo(frame, 22, 35, data.numbers.commits);
  const lines = countTo(frame, 36, 40, data.numbers.linesChanged);

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
            transform: `translateX(${(1 - s) * -50}px)`,
          }}
        >
          BY THE NUMBERS
        </div>

        <Row label="messages sent" value={messages.toLocaleString()} color={p.fg} delay={6} fps={fps} frame={frame} />
        <Row label="commits pushed" value={commits.toLocaleString()} color={p.accent} delay={18} fps={fps} frame={frame} />
        <Row label="lines changed" value={lines.toLocaleString()} color={p.fg} delay={32} fps={fps} frame={frame} small />
      </AbsoluteFill>
    </SceneBG>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  color: string;
  delay: number;
  fps: number;
  frame: number;
  small?: boolean;
}> = ({ label, value, color, delay, fps, frame, small }) => {
  const s = springIn(frame, fps, delay);
  return (
    <div
      style={{
        marginTop: 60,
        opacity: s,
        transform: `translateY(${(1 - s) * 60}px)`,
      }}
    >
      <div
        style={{
          fontSize: small ? 220 : 300,
          fontWeight: 900,
          color,
          letterSpacing: -10,
          lineHeight: 0.9,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 42,
          fontWeight: 700,
          opacity: 0.85,
          marginTop: -8,
          letterSpacing: -0.5,
        }}
      >
        {label}
      </div>
    </div>
  );
};
