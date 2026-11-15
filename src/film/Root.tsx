import { Composition } from "remotion";
import { COMPOSITION_ID, DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH } from "../config";
import { Pitch } from "./Pitch";

export function RemotionRoot() {
  return (
    <Composition
      id={COMPOSITION_ID}
      component={Pitch}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
