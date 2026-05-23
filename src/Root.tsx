import { Composition } from "remotion";
import { Wrapped, WRAPPED_FPS, WRAPPED_DURATION, totalDuration } from "./Wrapped";
import { DUMMY } from "./data";

export const Root: React.FC = () => {
  return (
    <Composition
      id="Wrapped"
      component={Wrapped}
      durationInFrames={WRAPPED_DURATION}
      fps={WRAPPED_FPS}
      width={1080}
      height={1920}
      defaultProps={{ data: DUMMY }}
      calculateMetadata={({ props }) => ({
        durationInFrames: totalDuration(props.data),
      })}
    />
  );
};
