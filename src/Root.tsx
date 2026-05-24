import { Composition } from "remotion";
import { Wrapped, WRAPPED_FPS, WRAPPED_DURATION, totalDuration } from "./Wrapped";
import { DUMMY, QUALITY_DIMENSIONS } from "./data";

export const Root: React.FC = () => {
  const def = QUALITY_DIMENSIONS.high;
  return (
    <Composition
      id="Wrapped"
      component={Wrapped}
      durationInFrames={WRAPPED_DURATION}
      fps={WRAPPED_FPS}
      width={def.width}
      height={def.height}
      defaultProps={{ data: DUMMY }}
      calculateMetadata={({ props }) => {
        const q = props.data.quality ?? "standard";
        const dim = QUALITY_DIMENSIONS[q];
        return {
          durationInFrames: totalDuration(props.data),
          width: dim.width,
          height: dim.height,
        };
      }}
    />
  );
};
