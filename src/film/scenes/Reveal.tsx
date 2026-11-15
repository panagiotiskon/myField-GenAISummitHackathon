import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, copy } from "../../config";
import { fontFamily } from "../font";
import { Mark } from "../components/Mark";
import { SceneFade } from "../components/SceneFade";

function enter(frame: number, fps: number, delay: number) {
  if (frame < delay) return 0;
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 120, mass: 1 },
  });
}

export function Reveal() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = enter(frame, fps, 4);
  const title = enter(frame, fps, 10);
  const body = enter(frame, fps, 18);
  const aside = enter(frame, fps, 28);

  return (
    <SceneFade fade={10}>
      <AbsoluteFill
        style={{
          background: colors.ground,
          alignItems: "center",
          justifyContent: "center",
          fontFamily,
        }}
      >
        <div style={{ opacity: mark, transform: `translateY(${interpolate(mark, [0, 1], [12, 0])}px)` }}>
          <Mark size={132} />
        </div>
        <div
          style={{
            opacity: title,
            marginTop: 18,
            color: colors.ink,
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: -2.4,
            lineHeight: 1,
          }}
        >
          {copy.revealTitle}
        </div>
        <div
          style={{
            opacity: body,
            marginTop: 22,
            maxWidth: 760,
            textAlign: "center",
            color: colors.ink2,
            fontSize: 30,
            fontWeight: 500,
            lineHeight: 1.35,
          }}
        >
          {copy.revealBody}
        </div>
        <div
          style={{
            opacity: aside,
            marginTop: 18,
            color: colors.accent,
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          {copy.revealAside}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}
