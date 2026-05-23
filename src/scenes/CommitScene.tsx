import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn, countTo, fadeIn } from "../components/anim";
import { PALETTES } from "../theme";
import { WrappedData } from "../data";

export const CommitScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = PALETTES.black;

  const s = springIn(frame, fps, 0);
  const sCard = springIn(frame, fps, 10);
  const adds = countTo(frame, 35, 30, data.commit.additions);
  const dels = countTo(frame, 35, 30, data.commit.deletions);
  const summary = fadeIn(frame, 70, 18);

  return (
    <SceneBG palette={p} variant="grid">
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
          THE COMMIT
        </div>

        <div
          style={{
            marginTop: 26,
            padding: "40px 48px",
            borderRadius: 36,
            background: "#161616",
            border: `2px solid ${p.accent}55`,
            opacity: sCard,
            transform: `translateY(${(1 - sCard) * 60}px)`,
            boxShadow: `0 30px 80px ${p.accent}22`,
          }}
        >
          <div
            style={{
              fontFamily: "Menlo, monospace",
              fontSize: 32,
              color: p.accent,
              opacity: 0.9,
            }}
          >
            {data.commit.repo} · {data.commit.sha}
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 50,
              fontWeight: 800,
              letterSpacing: -1.2,
              lineHeight: 1.15,
              opacity: summary,
            }}
          >
            "{data.commit.summary}"
          </div>

          <div style={{ marginTop: 40 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
              <div
                style={{
                  fontSize: 160,
                  fontWeight: 900,
                  color: "#A8FF53",
                  letterSpacing: -6,
                  lineHeight: 0.95,
                  minWidth: 320,
                }}
              >
                +{adds}
              </div>
              <div style={{ fontSize: 34, fontWeight: 700, opacity: 0.7 }}>additions</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 12 }}>
              <div
                style={{
                  fontSize: 160,
                  fontWeight: 900,
                  color: "#FF3D8A",
                  letterSpacing: -6,
                  lineHeight: 0.95,
                  minWidth: 320,
                }}
              >
                −{dels}
              </div>
              <div style={{ fontSize: 34, fontWeight: 700, opacity: 0.7 }}>deletions</div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
