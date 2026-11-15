import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { captions, colors } from "../../config";
import { fontFamily } from "../font";

export function LowerThird() {
  const frame = useCurrentFrame();
  const line = captions.find((row) => row.place === "lower-third" && frame >= row.from && frame < row.to);
  if (!line) return null;
  const local = frame - line.from;
  const life = line.to - line.from;
  const opacity = interpolate(local, [0, 10, life - 12, life], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(local, [0, 12], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", pointerEvents: "none" }}>
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          alignSelf: "flex-start",
          margin: "0 80px 68px",
          maxWidth: 1040,
          background: colors.paper,
          color: colors.ink,
          borderLeft: `4px solid ${colors.accent}`,
          padding: "16px 22px 18px",
          fontFamily,
          fontSize: 32,
          fontWeight: 500,
          lineHeight: 1.35,
          letterSpacing: -0.2,
        }}
      >
        {line.text}
      </div>
    </AbsoluteFill>
  );
}
