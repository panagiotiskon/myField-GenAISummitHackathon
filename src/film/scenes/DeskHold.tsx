import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, copy, deskShots } from "../../config";
import { fontFamily } from "../font";
import { SceneFade } from "../components/SceneFade";

export function DeskHold() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const slot = durationInFrames / deskShots.length;
  const index = Math.min(deskShots.length - 1, Math.floor(frame / slot));
  const header = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneFade fade={10}>
      <AbsoluteFill style={{ background: colors.ground, fontFamily, padding: "72px 120px" }}>
        <div style={{ opacity: header, color: colors.accent, fontSize: 16, fontWeight: 700, letterSpacing: 1.4 }}>
          {copy.deskKicker.toUpperCase()}
        </div>
        <div style={{ marginTop: 10, color: colors.ink, fontSize: 54, fontWeight: 700, letterSpacing: -1.4, lineHeight: 1.05 }}>
          {copy.deskTitle}
        </div>
        <div style={{ marginTop: 12, color: colors.muted, fontSize: 24 }}>{copy.deskBody}</div>
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 10 }}>
          {deskShots.map((shot, shotIndex) => {
            const active = shotIndex === index;
            const local = frame - shotIndex * slot;
            const rise = active
              ? interpolate(local, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
              : 1;
            return (
              <div
                key={shot.id}
                style={{
                  opacity: active ? rise : 0.45,
                  display: "grid",
                  gridTemplateColumns: "52px 180px 1fr",
                  gap: 16,
                  alignItems: "baseline",
                  background: active ? colors.paper : "transparent",
                  borderLeft: `4px solid ${active ? colors.accent : "transparent"}`,
                  padding: active ? "14px 18px" : "6px 18px",
                }}
              >
                <div style={{ color: colors.muted, fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 700 }}>
                  {String(shotIndex + 1).padStart(2, "0")}
                </div>
                <div style={{ color: colors.ink, fontSize: active ? 26 : 20, fontWeight: 700 }}>{shot.title}</div>
                <div style={{ color: active ? colors.ink2 : colors.muted, fontSize: active ? 22 : 18, lineHeight: 1.35 }}>
                  {shot.detail}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}
