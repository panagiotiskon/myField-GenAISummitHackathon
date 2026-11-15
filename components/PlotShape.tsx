"use client";

import type { Polygon } from "geojson";
import { useMemo } from "react";
import type { Verdict } from "@/lib/assess";
import { plotShape } from "@/lib/shape";

/** The plot's own outline, filled with its verdict colour. Used in lists. */
export function PlotGlyph({ geometry, verdict, size = 36 }: { geometry: Polygon; verdict: Verdict; size?: number }) {
  const shape = useMemo(() => plotShape(geometry, size, 3), [geometry, size]);
  return (
    <svg className={`glyph v-${verdict}`} viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <path d={shape.outline} />
    </svg>
  );
}

/**
 * Survey sketch: the outline with each side in metres and the 10 m inward line
 * the rule uses. When that line has nothing inside, the satellite cannot read the plot.
 */
export function PlotSurvey({
  geometry,
  verdict,
  insetLabel,
  noInsetLabel,
  lang,
  caption = true,
}: {
  lang: "el" | "en";
  /** The written key under the sketch. Without it the label stays on the drawing for screen readers. */
  caption?: boolean;
  geometry: Polygon;
  verdict: Verdict;
  insetLabel: string;
  noInsetLabel: string;
}) {
  const box = 220;
  const shape = useMemo(() => plotShape(geometry, box, 34, true), [geometry]);
  const cell = 10 * shape.scale;
  return (
    <figure className={`survey v-${verdict}`}>
      <svg viewBox={`0 0 ${box} ${box}`} role="img" aria-label={shape.inset ? insetLabel : noInsetLabel}>
        <defs>
          {/* one cell = 10 m = one Sentinel-2 pixel, at the sketch's own scale */}
          <pattern id="px10" width={cell} height={cell} patternUnits="userSpaceOnUse" x={box / 2} y={box / 2}>
            <path d={`M${cell} 0H0V${cell}`} className="survey-grid" />
          </pattern>
        </defs>
        <rect width={box} height={box} fill="url(#px10)" />
        <path d={shape.outline} className="survey-fill" />
        {shape.inset ? <path d={shape.inset} className="survey-inset" /> : null}
        <path d={shape.outline} className="survey-line" pathLength={1} />
        {shape.edges.map((edge, index) => (
          <text
            key={index}
            x={edge.x + edge.nx * 15}
            y={edge.y + edge.ny * 15}
            className="survey-dim"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {edge.lengthM.toLocaleString(lang === "el" ? "el-GR" : "en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </text>
        ))}
        <g className="survey-north" transform={`translate(${box - 12} 14)`}>
          <path d="M0 -8 L4 6 L0 3 L-4 6 Z" />
        </g>
      </svg>
      {caption ? (
        <figcaption className={shape.inset ? "survey-key" : "survey-key none"}>
          <i aria-hidden="true" />
          {shape.inset ? insetLabel : noInsetLabel}
        </figcaption>
      ) : null}
    </figure>
  );
}
