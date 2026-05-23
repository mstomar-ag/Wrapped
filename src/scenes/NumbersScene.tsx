import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn, countTo } from "../components/anim";
import { usePalette } from "../themeRotation";
import { WrappedData } from "../data";

type RowSpec = {
  label: string;
  target: number;
  color: string;
  highlight?: boolean;
};

export const NumbersScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = usePalette("numbers");

  const s = springIn(frame, fps, 0);
  const isChannel = data.kind === "channel";

  // Channel wraps repurpose the numeric slots (see channels/build.ts):
  //   numbers.commits      → uniquePosters
  //   numbers.linesChanged → longestThread.replies
  // Labels need to reflect that so viewers don't read "5 commits" on a
  // channel reel and think the channel pushed code.
  const allRows: RowSpec[] = isChannel
    ? [
        { label: "messages", target: data.numbers.messages, color: p.fg },
        {
          label: "unique posters",
          target: data.numbers.commits,
          color: p.accent,
          highlight: true,
        },
        {
          label: "longest thread (replies)",
          target: data.numbers.linesChanged,
          color: p.fg,
        },
      ]
    : [
        { label: "messages sent", target: data.numbers.messages, color: p.fg },
        {
          label: "commits pushed",
          target: data.numbers.commits,
          color: p.accent,
          highlight: true,
        },
        { label: "lines changed", target: data.numbers.linesChanged, color: p.fg },
      ];

  // Drop zero rows so a channel without threaded replies doesn't show "0 longest thread".
  const rows = allRows.filter((r) => r.target > 0);
  const delays = [6, 18, 32];

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

        {rows.map((r, i) => (
          <Row
            key={r.label}
            label={r.label}
            target={r.target}
            color={r.color}
            delay={delays[i] ?? delays[delays.length - 1]}
            fps={fps}
            frame={frame}
            small={i === rows.length - 1 && !r.highlight}
          />
        ))}
      </AbsoluteFill>
    </SceneBG>
  );
};

const Row: React.FC<{
  label: string;
  target: number;
  color: string;
  delay: number;
  fps: number;
  frame: number;
  small?: boolean;
}> = ({ label, target, color, delay, fps, frame, small }) => {
  const s = springIn(frame, fps, delay);
  const v = countTo(frame, delay + 2, 35, target);
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
        {v.toLocaleString()}
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
