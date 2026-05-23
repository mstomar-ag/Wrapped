import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { WrappedData } from "./data";
import { pickTrack } from "./music";
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

const SCENES = [
  { Comp: IntroScene, dur: 60 },
  { Comp: NumbersScene, dur: 105 },
  { Comp: PeakHourScene, dur: 75 },
  { Comp: EmojiScene, dur: 75 },
  { Comp: ThreadScene, dur: 90 },
  { Comp: CommitScene, dur: 105 },
  { Comp: VibeScene, dur: 90 },
  { Comp: WrapScene, dur: 75 },
];

export const WRAPPED_DURATION = SCENES.reduce((s, x) => s + x.dur, 0);

const Soundtrack: React.FC<{ track: string }> = ({ track }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [WRAPPED_DURATION - 30, WRAPPED_DURATION], [1, 0], {
    extrapolateLeft: "clamp",
  });
  return <Audio src={staticFile(track)} volume={Math.min(fadeIn, fadeOut) * 0.85} startFrom={0} />;
};

export const Wrapped: React.FC<{ data: WrappedData }> = ({ data }) => {
  const track = pickTrack(data.handle || data.name);
  let from = 0;
  return (
    <AbsoluteFill style={{ fontFamily: FONT_STACK, background: "#000" }}>
      <Soundtrack track={track} />
      {SCENES.map(({ Comp, dur }, i) => {
        const start = from;
        from += dur;
        return (
          <Sequence key={i} from={start} durationInFrames={dur}>
            <Comp data={data} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
