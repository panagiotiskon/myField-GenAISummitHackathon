import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { assets, colors, copy } from "../../config";
import { fontFamily } from "../font";
import { SceneFade } from "../components/SceneFade";

export function Duty() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1.12, 1.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [0, durationInFrames], [-1.4, 1.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const credit = interpolate(frame, [10, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneFade>
      <AbsoluteFill style={{ background: colors.ink, overflow: "hidden" }}>
        <Img
          src={staticFile(assets.orthoWide)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `translateX(${x}%) scale(${scale})`,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill>
        <div
          style={{
            opacity: credit,
            alignSelf: "flex-start",
            margin: "36px 40px",
            maxWidth: 520,
            background: colors.paper,
            color: colors.ink2,
            fontFamily,
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.4,
            padding: "8px 12px",
          }}
        >
          {copy.orthoCredit}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}
