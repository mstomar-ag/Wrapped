import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { WrappedData, DUMMY, QUALITY_DIMENSIONS, hasCodeActivity, hasThreadActivity } from "./data";
import { pickTrack } from "./music";
import { ThemeProvider, pickSchedule } from "./themeRotation";
import { IntroScene } from "./scenes/IntroScene";
import { NumbersScene } from "./scenes/NumbersScene";
import { PeakHourScene } from "./scenes/PeakHourScene";
import { EmojiScene } from "./scenes/EmojiScene";
import { ThreadScene } from "./scenes/ThreadScene";
import { CommitScene } from "./scenes/CommitScene";
import { VibeScene } from "./scenes/VibeScene";
import { WrapScene } from "./scenes/WrapScene";
import { FONT_STACK } from "./theme";

loadFont("normal", { weights: ["400", "700", "800", "900"] });

export const WRAPPED_FPS = 30;

type SceneDef = { Comp: React.FC<{ data: WrappedData }>; dur: number };

// Scene selection depends on data:
//   - channel wraps never include CommitScene (no GitHub data)
//   - member wraps skip CommitScene when there was no real code activity
//   - EmojiScene / ThreadScene drop when there is nothing to feature
export const buildScenes = (data: WrappedData): SceneDef[] => {
  const isChannel = data.kind === "channel";
  const hasEmoji = !!data.topEmoji && data.topEmoji.count > 0;
  const showCommit = !isChannel && hasCodeActivity(data);
  const showThread = hasThreadActivity(data);

  const scenes: SceneDef[] = [
    { Comp: IntroScene, dur: 60 },
    { Comp: NumbersScene, dur: 105 },
    { Comp: PeakHourScene, dur: 75 },
  ];
  if (hasEmoji) scenes.push({ Comp: EmojiScene, dur: 75 });
  if (showThread) scenes.push({ Comp: ThreadScene, dur: 90 });
  if (showCommit) scenes.push({ Comp: CommitScene, dur: 105 });
  scenes.push({ Comp: VibeScene, dur: 90 });
  scenes.push({ Comp: WrapScene, dur: 75 });
  return scenes;
};

export const totalDuration = (data: WrappedData): number =>
  buildScenes(data).reduce((s, x) => s + x.dur, 0);

/** Static fallback duration for Remotion CLI commands that use defaultProps. */
export const WRAPPED_DURATION = totalDuration(DUMMY);

const Soundtrack: React.FC<{ track: string; duration: number }> = ({ track, duration }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [duration - 30, duration], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return <Audio src={staticFile(track)} volume={Math.min(fadeIn, fadeOut) * 0.85} startFrom={0} />;
};

/** All scenes are authored against a 1080×1920 layout. At lower output
 * resolutions (e.g. 720×1280 standard quality) we keep the design canvas
 * fixed and CSS-scale it down. The browser rasterises at the smaller output
 * size, so we still get the speed win — but every fontSize/padding stays
 * in proportion to the frame. */
const DesignCanvas: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  const design = QUALITY_DIMENSIONS.high; // 1080×1920 reference
  const scale = width / design.width;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: design.width,
        height: design.height,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {children}
    </div>
  );
};

export const Wrapped: React.FC<{ data: WrappedData }> = ({ data }) => {
  const scenes = buildScenes(data);
  const duration = scenes.reduce((s, x) => s + x.dur, 0);
  const track = pickTrack(data.handle || data.name);
  // Seed by handle + weekLabel + kind so the same person's reel for the same
  // week always looks identical, but week-over-week the palette rotates.
  const schedule = pickSchedule(`${data.handle || data.name}|${data.weekLabel}|${data.kind ?? "member"}`);

  let from = 0;
  return (
    <ThemeProvider value={schedule}>
      <AbsoluteFill style={{ fontFamily: FONT_STACK, background: "#000" }}>
        <Soundtrack track={track} duration={duration} />
        <DesignCanvas>
          {scenes.map(({ Comp, dur }, i) => {
            const start = from;
            from += dur;
            return (
              <Sequence key={i} from={start} durationInFrames={dur}>
                <Comp data={data} />
              </Sequence>
            );
          })}
        </DesignCanvas>
      </AbsoluteFill>
    </ThemeProvider>
  );
};
