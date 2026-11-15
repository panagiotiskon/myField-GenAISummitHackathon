"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Verdict } from "@/lib/assess";
import { copy, t } from "@/lib/i18n";
import { scenario } from "@/lib/scenario";
import type { Lang } from "@/lib/types";

// MapLibre needs literal colours; globals.css repeats them as --v-* tokens.
export const VERDICT_COLOR: Record<Verdict, string> = {
  likely_cleaned: "#1f6b3a",
  potentially_uncleaned: "#c2331f",
  uncertain: "#b97a09",
  not_applicable: "#8c8c8c",
};

export function TopBar(props: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  section: string;
  left?: ReactNode;
}) {
  const { lang, setLang } = props;
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <Link href="/" className="brand-link">
            <strong>PlotCheck</strong>
          </Link>
          <span>{props.section}</span>
        </div>
        <div className="meta-line">
          {props.left}
          <span>{t(lang, scenario.meta.municipality)}</span>
          <span>· {t(lang, scenario.meta.settlement)}</span>
          <div className="lang-toggle">
            <button type="button" aria-pressed={lang === "el"} onClick={() => setLang("el")}>
              ΕΛ
            </button>
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              EN
            </button>
          </div>
        </div>
      </header>
      <div className="banner">{t(lang, copy.banner)}</div>
    </>
  );
}

export function VerdictDot({ verdict }: { verdict: Verdict }) {
  return <span className={`swatch v-${verdict}`} />;
}
