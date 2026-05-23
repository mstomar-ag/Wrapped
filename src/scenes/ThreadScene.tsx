import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn, countTo } from "../components/anim";
import { PALETTES } from "../theme";
import { WrappedData } from "../data";

export const ThreadScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = PALETTES.tangerine;

  const s = springIn(frame, fps, 0);
  const replies = countTo(frame, 10, 30, data.thread.replies);

  const bubbles = Array.from({ length: 8 }).map((_, i) => {
    const sp = springIn(frame, fps, 18 + i * 2);
    return sp;
  });

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
          THE THREAD
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 50,
            fontWeight: 800,
            letterSpacing: -1,
            opacity: s,
            transform: `translateY(${(1 - s) * 30}px)`,
          }}
        >
          {data.thread.channel}
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 44,
            fontWeight: 600,
            fontStyle: "italic",
            opacity: 0.85 * s,
            maxWidth: 880,
          }}
        >
          "{data.thread.title}"
        </div>

        <div
          style={{
            marginTop: 50,
            display: "flex",
            alignItems: "baseline",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 380,
              fontWeight: 900,
              letterSpacing: -18,
              lineHeight: 0.85,
              color: p.accent,
            }}
          >
            {replies}
          </div>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -1 }}>replies</div>
        </div>

        <div style={{ marginTop: 30, display: "flex", flexWrap: "wrap", gap: 18, maxWidth: 880 }}>
          {bubbles.map((sp, i) => (
            <div
              key={i}
              style={{
                width: 22 + (i % 3) * 12,
                height: 22 + (i % 3) * 12,
                borderRadius: "50%",
                background: i % 2 ? p.fg : p.accent,
                opacity: sp,
                transform: `scale(${sp})`,
              }}
            />
          ))}
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
