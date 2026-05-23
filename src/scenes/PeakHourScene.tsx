import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SceneBG } from "../components/SceneBG";
import { springIn } from "../components/anim";
import { usePalette } from "../themeRotation";
import { WrappedData } from "../data";

/** Parse "12 PM" / "9 AM" / "—" → 24-hour number, or null if no data. */
const parseHour = (raw: string): number | null => {
  const m = raw.match(/^\s*(\d{1,2})\s*(AM|PM)\s*$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const isPM = m[2].toUpperCase() === "PM";
  if (h === 12) h = isPM ? 12 : 0;
  else if (isPM) h += 12;
  return h;
};

const flavorFor = (
  hour: number | null,
  isChannel: boolean,
): { emoji: string; lead: string; tag: string } => {
  if (hour === null) {
    return {
      emoji: "📭",
      lead: "no clear peak this window.",
      tag: isChannel ? "Channel was quiet across the board." : "You spread the work out evenly.",
    };
  }
  // 0–5: dead of night
  if (hour < 6) return { emoji: "🌙", lead: "deep in the night.", tag: isChannel ? "Night owls only." : "While the rest of the team slept." };
  // 6–10: early
  if (hour < 11) return { emoji: "☕", lead: "early-morning grind.", tag: isChannel ? "Morning standups own this channel." : "First in, hands on the keyboard." };
  // 11–13: midday peak
  if (hour < 14) return { emoji: "🌞", lead: "right at midday.", tag: isChannel ? "Peak chatter at lunchtime." : "Right between coffee and lunch." };
  // 14–17: afternoon
  if (hour < 18) return { emoji: "⚡", lead: "deep in the afternoon.", tag: isChannel ? "Afternoon energy ran high." : "Afternoon flow state." };
  // 18–21: evening
  if (hour < 22) return { emoji: "🌆", lead: "into the evening.", tag: isChannel ? "After-hours regulars kept the lights on." : "Long after meetings cleared." };
  // 22–23: late night
  return { emoji: "🌙", lead: "after the team logged off.", tag: isChannel ? "Night owls only." : "While the rest of the team slept." };
};

export const PeakHourScene: React.FC<{ data: WrappedData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = usePalette("peakHour");

  const s = springIn(frame, fps, 0);
  const moonRot = interpolate(frame, [0, 75], [0, 25]);

  const rawHour = data.peakHour.hour ?? "";
  const hour24 = parseHour(rawHour);
  const isChannel = data.kind === "channel";
  const flavor = flavorFor(hour24, isChannel);

  // Display: number on the left, AM/PM on the right.
  // Use the original formatted string when sensible; otherwise show "—".
  const match = rawHour.match(/^\s*(\d{1,2})\s*(AM|PM)\s*$/i);
  const displayNum = match ? match[1] : "—";
  const displaySuffix = match ? match[2].toUpperCase() : "";
  const msgs = data.peakHour.messages;

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
              letterSpacing: displayNum.length > 1 ? -22 : -10,
              lineHeight: 0.85,
              color: p.fg,
            }}
          >
            {displayNum}
          </div>
          {displaySuffix && (
            <div
              style={{
                fontSize: 180,
                fontWeight: 900,
                color: p.accent,
                marginLeft: 24,
                letterSpacing: -6,
              }}
            >
              {displaySuffix}
            </div>
          )}
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
          {msgs > 0 ? `${msgs} messages ${flavor.lead}` : flavor.lead}
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            marginTop: 16,
            opacity: 0.65,
          }}
        >
          {flavor.tag}
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
          {flavor.emoji}
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
