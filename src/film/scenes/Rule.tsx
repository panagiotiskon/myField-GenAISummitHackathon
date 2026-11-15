import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { assets, colors, copy, evidence } from "../../config";
import { fontFamily } from "../font";
import { SceneFade } from "../components/SceneFade";

const TRACK = 1680;
const TRACK_Y = 48;

function appear(frame: number, fps: number, delay: number) {
  if (frame < delay) return 0;
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 110, mass: 1 },
  });
}

function xOf(value: number) {
  return (value / evidence.scaleMax) * TRACK;
}

export function Rule() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = Math.round(
    interpolate(frame, [8, 42], [0, evidence.uncertainDuty], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const photos = appear(frame, fps, 28);
  const scaleIn = interpolate(frame, [78, 128], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const aprilDot = appear(frame, fps, 112);
  const juneDot = appear(frame, fps, 126);
  const gates = appear(frame, fps, 146);

  const chips = [
    { src: assets.plotOrtho, title: copy.orthoCaption, meta: copy.orthoMeta },
    { src: assets.plotApril, title: evidence.aprilLabel, meta: copy.aprilMeta },
    { src: assets.plotJune, title: evidence.juneLabel, meta: copy.juneMeta },
  ];

  return (
    <SceneFade fade={10}>
      <AbsoluteFill
        style={{
          background: colors.ground,
          fontFamily,
          padding: "48px 80px 40px",
          color: colors.ink,
        }}
      >
        <div style={{ color: colors.muted, fontSize: 16, fontWeight: 700, letterSpacing: 1.2 }}>
          {copy.ruleEyebrow}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 8 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 0.9, fontVariantNumeric: "tabular-nums" }}>
            {count}
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.25, maxWidth: 980 }}>
            {copy.ruleCountLead}
            <br />
            {copy.ruleCountRest}
          </div>
        </div>

        <div
          style={{
            opacity: photos,
            transform: `translateY(${interpolate(photos, [0, 1], [18, 0])}px)`,
            marginTop: 22,
          }}
        >
          <div style={{ color: colors.ink2, fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
            {copy.ruleSample}
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {chips.map((chip) => (
              <figure key={chip.src} style={{ margin: 0, flex: 1 }}>
                <div style={{ height: 220, overflow: "hidden", background: colors.well, border: `1px solid ${colors.line}` }}>
                  <Img src={staticFile(chip.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <figcaption style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{chip.title}</div>
                  <div style={{ marginTop: 2, fontSize: 16, color: colors.muted }}>{chip.meta}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18, opacity: scaleIn }}>
          <svg width={TRACK} height={108} viewBox={`0 0 ${TRACK} 108`} aria-hidden>
            <defs>
              <clipPath id="ndvi-draw">
                <rect x={0} y={0} width={TRACK * scaleIn} height={108} />
              </clipPath>
            </defs>
            <g clipPath="url(#ndvi-draw)">
              <rect x={0} y={TRACK_Y} width={TRACK} height={10} fill={colors.well} />
              <rect x={0} y={TRACK_Y} width={xOf(evidence.ndviLow)} height={10} fill={colors.lowBand} />
              <rect
                x={xOf(evidence.ndviGreen)}
                y={TRACK_Y}
                width={TRACK - xOf(evidence.ndviGreen)}
                height={10}
                fill={colors.greenBand}
              />
              <line
                x1={xOf(Math.min(evidence.ndviBefore, evidence.ndviAfter))}
                x2={xOf(Math.max(evidence.ndviBefore, evidence.ndviAfter))}
                y1={TRACK_Y + 5}
                y2={TRACK_Y + 5}
                stroke={colors.ink}
                strokeWidth={2}
              />
              <Tick x={xOf(evidence.ndviLow)} label="0.20" />
              <Tick x={xOf(evidence.ndviGreen)} label="0.30" />
            </g>
            <Dot
              x={xOf(evidence.ndviBefore)}
              label={evidence.beforeLabel}
              opacity={aprilDot}
              filled={false}
            />
            <Dot x={xOf(evidence.ndviAfter)} label={evidence.afterLabel} opacity={juneDot} filled />
          </svg>
          <div style={{ color: colors.muted, fontSize: 15, lineHeight: 1.45 }}>
            <div>{copy.scaleFoot}</div>
            <div>Open dot is 29 April. Filled dot is 20 June. {copy.formula}</div>
          </div>
        </div>

        <div
          style={{
            opacity: gates,
            transform: `translateY(${interpolate(gates, [0, 1], [12, 0])}px)`,
            display: "flex",
            gap: 16,
            marginTop: 16,
          }}
        >
          <Gate tone={colors.uncleaned} title={copy.gateUncleaned} body={copy.gateUncleanedBody} />
          <Gate tone={colors.cleaned} title={copy.gateCleaned} body={copy.gateCleanedBody} />
          <Gate tone={colors.uncertain} title={copy.gateUncertain} body={copy.gateUncertainBody} />
        </div>
        <div style={{ marginTop: 10, color: colors.muted, fontSize: 16 }}>{copy.outsideNote}</div>
      </AbsoluteFill>
    </SceneFade>
  );
}

function Tick({ x, label }: { x: number; label: string }) {
  return (
    <g>
      <line x1={x} x2={x} y1={TRACK_Y - 6} y2={TRACK_Y + 16} stroke={colors.muted} strokeWidth={1} />
      <text x={x} y={TRACK_Y + 34} textAnchor="middle" fill={colors.muted} fontSize={14} fontFamily={fontFamily}>
        {label}
      </text>
    </g>
  );
}

function Dot({ x, label, opacity, filled }: { x: number; label: string; opacity: number; filled: boolean }) {
  return (
    <g opacity={opacity}>
      <text x={x} y={TRACK_Y - 16} textAnchor="middle" fill={colors.ink} fontSize={18} fontFamily={fontFamily} fontWeight={700}>
        {label}
      </text>
      <circle
        cx={x}
        cy={TRACK_Y + 5}
        r={8}
        fill={filled ? colors.ink : colors.paper}
        stroke={colors.ink}
        strokeWidth={2}
      />
    </g>
  );
}

function Gate({ tone, title, body }: { tone: string; title: string; body: string }) {
  return (
    <div style={{ flex: 1, background: colors.paper, borderTop: `4px solid ${tone}`, padding: "12px 14px 14px" }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 4, color: colors.ink2, fontSize: 16, lineHeight: 1.35 }}>{body}</div>
    </div>
  );
}
