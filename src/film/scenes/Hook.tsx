import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { assets, colors, copy, opening } from "../../config";
import { fontFamily } from "../font";

function FirePlate({ src, credit }: { src: string; credit?: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1.03, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 10, Math.max(11, durationInFrames - 12), durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const creditOpacity = interpolate(frame, [12, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: colors.ink, opacity, overflow: "hidden" }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        volume={0}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
      {credit ? (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "flex-end" }}>
          <div
            style={{
              opacity: creditOpacity,
              margin: "36px 40px",
              background: colors.paper,
              color: colors.ink2,
              fontFamily,
              fontSize: 16,
              fontWeight: 500,
              padding: "8px 12px",
            }}
          >
            {credit}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
}

/** Night pine fire, then the aerial front. Both were generated from the Pexels clips. */
export function Hook() {
  return (
    <AbsoluteFill style={{ background: colors.ink }}>
      <Sequence durationInFrames={opening.nightFrames} name="night-fire">
        <FirePlate src={assets.wildfireNight} credit={copy.pexelsCredit} />
      </Sequence>
      <Sequence from={opening.aerialFrom} durationInFrames={opening.aerialFrames} name="aerial-fire">
        <FirePlate src={assets.wildfireAerial} credit={copy.pexelsCredit} />
      </Sequence>
    </AbsoluteFill>
  );
}
