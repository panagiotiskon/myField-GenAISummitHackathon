import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, copy } from "../../config";
import { fontFamily } from "../font";
import { Mark } from "../components/Mark";
import { SceneFade } from "../components/SceneFade";

export function Close() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const mark = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 80, mass: 1 },
  });
  const line = spring({
    frame: Math.max(0, frame - 16),
    fps,
    config: { damping: 200, stiffness: 100, mass: 1 },
  });
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.035], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneFade fade={14}>
      <AbsoluteFill
        style={{
          background: colors.ground,
          alignItems: "center",
          justifyContent: "center",
          fontFamily,
        }}
      >
        <div style={{ opacity: mark, transform: `scale(${interpolate(mark, [0, 1], [0.94, 1]) * drift})` }}>
          <Mark size={156} />
        </div>
        <div
          style={{
            opacity: mark,
            marginTop: 16,
            color: colors.ink,
            fontSize: 78,
            fontWeight: 700,
            letterSpacing: -2.2,
            lineHeight: 1,
          }}
        >
          {copy.closeTitle}
        </div>
        <div
          style={{
            opacity: line,
            marginTop: 18,
            color: colors.ink,
            fontSize: 36,
            fontWeight: 500,
          }}
        >
          {copy.closeLine}
        </div>
        <div style={{ opacity: line, marginTop: 14, color: colors.muted, fontSize: 18, fontWeight: 500 }}>
          {copy.closeTag}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}
