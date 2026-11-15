"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PlotCode, TopBar, VerdictDot } from "@/components/Chrome";
import { PlotPhoto } from "@/components/PlotPhoto";
import { priorityList, screen } from "@/lib/assess";
import { copy, fill, t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { scenario } from "@/lib/scenario";

// Shown when a /property/<code> URL names no plot in the demo set.
// Says what was asked for, why it can fail, and offers the real plots.
export function KaekNotFound({
  code,
  lang,
  setLang,
}: {
  code: string;
  lang: Lang;
  setLang: (lang: Lang) => void;
}) {
  const plots = useMemo(() => priorityList(screen(scenario), 3), []);
  const shown = code.length > 40 ? `${code.slice(0, 40)}…` : code;

  return (
    <div className="app-shell prop film-world">
      <TopBar lang={lang} setLang={setLang} section={t(lang, copy.property)} hideBanner />
      <main className="nf" aria-labelledby="nf-title">
        <div className="nf-card">
          <svg className="nf-mark" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
            <path d="M8 14l14-6 18 8v24l-18-8-14 6z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeDasharray="3 3" />
            <path d="M30 22l8 8M38 22l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <p className="nf-eyebrow">{t(lang, copy.notFound.eyebrow)}</p>
          <h1 id="nf-title" className="nf-title">{t(lang, copy.notFound.title)}</h1>
          <p className="nf-code">
            <code>{shown || "—"}</code>
          </p>
          <p className="nf-body">{t(lang, copy.notFound.body)}</p>
          <div className="nf-actions">
            <Link href="/dashboard" className="btn btn-primary">
              {t(lang, copy.notFound.search)}
            </Link>
          </div>
        </div>

        {plots.length ? (
          <section className="nf-try" aria-labelledby="nf-try-title">
            <h2 id="nf-try-title">{fill(t(lang, copy.notFound.tryTitle), { n: plots.length })}</h2>
            <ul className="plot-list">
              {plots.map((row) => {
                const id = row.parcel.properties.id;
                return (
                  <li key={id}>
                    <Link href={`/property/${id}`} className="plot-row">
                      <PlotPhoto id={id} geometry={row.parcel.geometry} className="plot-thumb" />
                      <span className="plot-text">
                        <PlotCode id={id} className="plot-id" />
                        <span className="plot-street">{t(lang, row.parcel.properties.street)}</span>
                        <span className="plot-verdict">
                          <VerdictDot verdict={row.rule.verdict} />
                          {t(lang, copy.verdict[row.rule.verdict])}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
