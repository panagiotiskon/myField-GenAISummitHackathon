"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Mark, VerdictDot } from "@/components/Chrome";
import type { Analysis, ScreeningRow, Verdict } from "@/lib/assess";
import { copy, t } from "@/lib/i18n";
import { scenario } from "@/lib/scenario";
import { sitePlan } from "@/lib/shape";
import type { Lang } from "@/lib/types";

const W = 640;
const H = 460;
const KEY: Verdict[] = ["potentially_uncleaned", "uncertain", "likely_cleaned", "not_applicable"];

// largest round length whose bar stays under 120 px
function scaleBar(pxPerM: number) {
  const m = [10, 20, 25, 50, 100, 200, 250, 500].filter((len) => len * pxPerM <= 120).pop() ?? 10;
  return { m, px: m * pxPerM };
}

/** The survey sheet: every demo plot at its true outline, coloured by screening result. */
export function SitePlan({
  lang,
  rows,
  analyses,
}: {
  lang: Lang;
  rows: ScreeningRow[];
  analyses: Record<string, Analysis>;
}) {
  const plan = useMemo(
    () => sitePlan(rows.map((row) => row.parcel.geometry), scenario.settlementBoundary, W, H, 28),
    [rows],
  );
  const bar = scaleBar(plan.scale);
  const grid = 50 * plan.scale; // 50 m survey grid
  const sentinel = scenario.meta.imagery;

  return (
    <figure className="sheet">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t(lang, copy.landing.planLabel)}>
        <defs>
          <pattern id="plan-grid" width={grid} height={grid} patternUnits="userSpaceOnUse">
            <path d={`M${grid} 0H0V${grid}`} className="plan-grid" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#plan-grid)" />
        {plan.boundary ? <path d={plan.boundary} className="plan-boundary" pathLength={1} /> : null}
        {rows.map((row, index) => {
          const id = row.parcel.properties.id;
          const verdict = analyses[id]?.verdict ?? row.rule.verdict;
          return (
            <Link key={id} href={`/property/${id}`} aria-label={`${id}: ${t(lang, copy.verdict[verdict])}`}>
              <path d={plan.paths[index]} className={`plan-plot v-${verdict}`} pathLength={1} />
            </Link>
          );
        })}
        <g className="plan-north" transform={`translate(${W - 22} 26)`}>
          <path d="M0 -10 L5 8 L0 4 L-5 8 Z" />
        </g>
      </svg>
      {/* the sheet's title block and legend: without it the colours cannot be read */}
      <figcaption className="titleblock">
        <div className="tb-cell tb-place">
          <Mark />
          <span>
            <strong>{t(lang, scenario.meta.settlement)}</strong>
            {t(lang, scenario.meta.municipality)}
          </span>
        </div>
        <div className="tb-cell">
          <span className="tb-label">{t(lang, copy.landing.plots)}</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="tb-cell">
          <span className="tb-label">{t(lang, copy.landing.declarations)}</span>
          <strong>{scenario.declarations.length}</strong>
        </div>
        <div className="tb-cell">
          <span className="tb-label">{t(lang, copy.landing.scenes)}</span>
          <strong className="tb-dates">
            <time dateTime={sentinel.springDate}>{sentinel.springDate}</time>
            <time dateTime={sentinel.juneDate}>{sentinel.juneDate}</time>
          </strong>
        </div>
        <div className="tb-cell">
          <span className="tb-label">{t(lang, copy.landing.scale)}</span>
          <span className="tb-scale">
            <i style={{ width: bar.px }} aria-hidden="true" />
            {bar.m} m
          </span>
        </div>
        <ul className="tb-key">
          {KEY.map((v) => (
            <li key={v}>
              <VerdictDot verdict={v} />
              {t(lang, copy.verdict[v])}
            </li>
          ))}
          <li>
            <span className="key-edge" aria-hidden="true" />
            {t(lang, copy.landing.settlementEdge)}
          </li>
        </ul>
      </figcaption>
    </figure>
  );
}
