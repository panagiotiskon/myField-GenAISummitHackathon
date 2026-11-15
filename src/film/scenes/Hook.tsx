import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { assets, colors, copy } from "../../config";
import { fontFamily } from "../font";
import { SceneFade } from "../components/SceneFade";

export function Hook() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1.05, 1.14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, durationInFrames], [2, -2.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const credit = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneFade>
      <AbsoluteFill style={{ background: colors.ink, overflow: "hidden" }}>
        <Img
          src={staticFile(assets.wildfire)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `translateY(${y}%) scale(${scale})`,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "flex-end" }}>
        <div
          style={{
            opacity: credit,
            margin: "36px 40px",
            background: colors.paper,
            color: colors.ink2,
            fontFamily,
            fontSize: 16,
            fontWeight: 500,
            padding: "8px 12px",
          }}
        >
          {copy.generatedPlate}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}
