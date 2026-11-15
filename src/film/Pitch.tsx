import { AbsoluteFill, Sequence } from "remotion";
import { beats, colors } from "../config";
import { LowerThird } from "./components/LowerThird";
import { Close } from "./scenes/Close";
import { Desk } from "./scenes/Desk";
import { Duty } from "./scenes/Duty";
import { Hook } from "./scenes/Hook";
import { Reveal } from "./scenes/Reveal";
import { Rule } from "./scenes/Rule";

const scenes = {
  hook: Hook,
  duty: Duty,
  reveal: Reveal,
  rule: Rule,
  desk: Desk,
  close: Close,
} as const;

export function Pitch() {
  return (
    <AbsoluteFill style={{ background: colors.ground }}>
      {beats.map((row) => {
        const Scene = scenes[row.id];
        return (
          <Sequence key={row.id} from={row.from} durationInFrames={row.duration} name={row.id}>
            <Scene />
          </Sequence>
        );
      })}
      <LowerThird />
    </AbsoluteFill>
  );
}
