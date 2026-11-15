"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, type ReactNode } from "react";
import type { Verdict } from "@/lib/assess";
import { copy, t } from "@/lib/i18n";
import { useOfficer } from "@/lib/store";
import type { Lang } from "@/lib/types";

// MapLibre needs literal colours; globals.css repeats them as --v-* tokens.
export const VERDICT_COLOR: Record<Verdict, string> = {
  likely_cleaned: "#2f7a4a",
  potentially_uncleaned: "#c23a1e",
  uncertain: "#b07d17",
  not_applicable: "#8e958f",
};

// A traced plot: four corners, boundary markers at each, the way a survey plan pins them.
/**
 * The Parcel mark: a plot drawn flat on a 48-unit square, cut into fields by curved tracks,
 * then turned 45° and foreshortened to 70% so it reads as land seen from above.
 * One field is picked out: the one under review. Below 24 px it keeps three tracks, drawn wider.
 */
export function Mark({ size = 34 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  const small = size < 24;
  return (
    <svg className="mark" viewBox="1 12 70 50" width={size} height={(size * 5) / 7} aria-hidden="true">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="-10" y="-10" width="68" height="68">
          <rect width="48" height="48" rx="7" fill="#fff" />
          <path
            d={small ? "M31 -2Q20 20 18 50M-2 23Q22 21 50 34M24.72 13.39Q38 13 50 19" : "M31 -2Q20 20 18 50M-2 23Q22 21 50 34M24.72 13.39Q38 13 50 19M-2 38Q9 36 19.16 38.32"}
            stroke="#000"
            strokeWidth={small ? 6.5 : 4}
            fill="none"
          />
        </mask>
      </defs>
      <g transform="translate(36 37) scale(1 0.7) rotate(45) translate(-24 -24)">
        <g mask={`url(#${id})`}>
          <rect width="48" height="48" className="mark-land" />
          <path d="M24.72 13.39Q38 13 50 19L60 19L60 40L50 34Q35.27 27.16 21.65 24.47Q22.98 18.74 24.72 13.39Z" className="mark-field" />
        </g>
      </g>
    </svg>
  );
}

/** "my" light, "Field" set: the field is the subject. */
export function Wordmark() {
  return (
    <strong className="wordmark">
      <span>my</span>Field
    </strong>
  );
}

function Pin() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M8 14.5s4.5-4.2 4.5-7.7A4.5 4.5 0 0 0 3.5 6.8c0 3.5 4.5 7.7 4.5 7.7z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="6.8" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function TopBar(props: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  section: string;
  left?: ReactNode;
  hideBanner?: boolean;
}) {
  const { lang, setLang, hideBanner } = props;
  const router = useRouter();
  const { officer, signOut } = useOfficer();
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <Link href="/dashboard" className="brand-link">
            <Mark />
            <Wordmark />
          </Link>
          <span className="brand-section">{props.section}</span>
        </div>
        <div className="meta-line">
          {props.left}
          <span className="place">
            <Pin />
            {t(lang, copy.region)}
          </span>
          <LangSwitch lang={lang} setLang={setLang} />
          {officer ? (
            <span className="officer">
              <span className="officer-name">{officer.name || t(lang, copy.demoOfficer)}</span>
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  signOut();
                  router.push("/");
                }}
              >
                {t(lang, copy.signOut)}
              </button>
            </span>
          ) : null}
        </div>
      </header>
      {!hideBanner ? <Banner lang={lang} /> : null}
    </>
  );
}

export function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  return (
    <div className="seg" role="group" aria-label="Language">
      <button type="button" aria-pressed={lang === "el"} onClick={() => setLang("el")}>
        ΕΛ
      </button>
      <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
        EN
      </button>
    </div>
  );
}

export function Banner({ lang }: { lang: Lang }) {
  return (
    <div className="banner">
      <span className="demo-tag">{t(lang, copy.demoTag)}</span>
      <p>{t(lang, copy.banner)}</p>
    </div>
  );
}

export function VerdictDot({ verdict }: { verdict: Verdict }) {
  return <span className={`swatch v-${verdict}`} />;
}

export function VerdictPill({ verdict, lang, prefix }: { verdict: Verdict; lang: Lang; prefix?: string }) {
  return (
    <span className={`pill v-${verdict}`}>
      <VerdictDot verdict={verdict} />
      {prefix ? <span className="pill-prefix">{prefix}</span> : null}
      {t(lang, copy.verdict[verdict])}
    </span>
  );
}

export function LayerSwitch({
  lang,
  orthophoto,
  setOrthophoto,
}: {
  lang: Lang;
  orthophoto: boolean;
  setOrthophoto: (value: boolean) => void;
}) {
  return (
    <div className="seg map-toggle" role="group" aria-label={t(lang, copy.mapLayer)}>
      <button type="button" aria-pressed={!orthophoto} onClick={() => setOrthophoto(false)}>
        {t(lang, copy.streets)}
      </button>
      <button type="button" aria-pressed={orthophoto} onClick={() => setOrthophoto(true)}>
        {t(lang, copy.orthophoto)}
      </button>
    </div>
  );
}

export function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BackLink({ label }: { label: string }) {
  return (
    <Link href="/dashboard" className="back">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M10 3.5L5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}
