"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { LayerSwitch, TopBar, VERDICT_COLOR, VerdictDot } from "@/components/Chrome";
import { MapView } from "@/components/MapView";
import { PlotPhoto } from "@/components/PlotPhoto";
import { priorityList, resolveParcelCode, screen, type Verdict } from "@/lib/assess";
import { copy, t } from "@/lib/i18n";
import { scenario } from "@/lib/scenario";
import { useAnalyses, useFlags, useLang } from "@/lib/store";

// The demo opens on this plot: the Mesogeia field by Agias Kyriakis, near Velanidia.
const DEMO_FOCUS = "KAEK-05119-001";

const LEGEND: Verdict[] = ["potentially_uncleaned", "uncertain", "likely_cleaned"];

export function Dashboard() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const { flags } = useFlags();
  const { analyses } = useAnalyses();
  const [query, setQuery] = useState("");
  const [miss, setMiss] = useState(false);
  const [orthophoto, setOrthophoto] = useState(true);

  const rows = useMemo(() => screen(scenario), []);
  const ids = useMemo(() => rows.map((row) => row.parcel.properties.id), [rows]);

  // An analysed plot shows its analysed verdict; the rest show the screening one.
  const verdicts = useMemo(() => {
    const out: Record<string, Verdict> = {};
    for (const row of rows) {
      const id = row.parcel.properties.id;
      out[id] = analyses[id]?.verdict ?? row.rule.verdict;
    }
    return out;
  }, [rows, analyses]);

  const colors = useMemo(
    () => Object.fromEntries(Object.entries(verdicts).map(([id, v]) => [id, VERDICT_COLOR[v]])),
    [verdicts],
  );
  const flaggedIds = useMemo(() => Object.keys(flags), [flags]);
  const uncleanedCount = Object.values(verdicts).filter((v) => v === "potentially_uncleaned").length;
  const priority = useMemo(() => priorityList(rows, 6), [rows]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const id = resolveParcelCode(query, ids);
    if (!id) {
      setMiss(true);
      return;
    }
    router.push(`/property/${id}`);
  }

  return (
    <div className="app-shell dash film-world">
      <TopBar lang={lang} setLang={setLang} section={t(lang, copy.dashboard)} hideBanner />

      <div className="dash-body">
        <section className="map-wrap">
          <MapView
            colors={colors}
            selectedId={null}
            focusId={DEMO_FOCUS}
            flaggedIds={flaggedIds}
            orthophoto={orthophoto}
            onSelect={(id) => router.push(`/property/${id}`)}
            offlineNote={t(lang, copy.mapOffline)}
          />
          <div className="map-legend">
            {LEGEND.map((key) => (
              <div key={key}>
                <VerdictDot verdict={key} />
                {t(lang, copy.verdict[key])}
              </div>
            ))}
          </div>
          <LayerSwitch lang={lang} orthophoto={orthophoto} setOrthophoto={setOrthophoto} />
        </section>

        <aside className="panel right dash-panel">
          <form className="dash-search" onSubmit={onSearch}>
            <div className="search-box">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="search-icon">
                <path
                  d="M11.5 11.5L15 15M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <input
                id="kaek"
                list="kaek-list"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setMiss(false);
                }}
                placeholder={t(lang, copy.searchPlaceholder)}
                aria-label={t(lang, copy.searchLabel)}
              />
              <datalist id="kaek-list">
                {ids.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
              <button type="submit" className="btn-search-go" aria-label={t(lang, copy.searchGo)}>
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    d="M3 8h9.5M8.5 3.5L13 8l-4.5 4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            {miss ? <p className="search-miss-text">{t(lang, copy.searchMiss)}</p> : null}
          </form>

          <dl className="dash-tally">
            <div>
              <dt>
                {t(lang, copy.tally.duty)}
                <small>{t(lang, copy.tally.dutyHint)}</small>
              </dt>
              <dd>{rows.length}</dd>
            </div>
            <div className="tally-uncleaned">
              <dt>
                {t(lang, copy.tally.uncleaned)}
                <small>{t(lang, copy.tally.uncleanedHint)}</small>
              </dt>
              <dd>{uncleanedCount}</dd>
            </div>
            <div>
              <dt>
                {t(lang, copy.tally.flagged)}
                <small>{t(lang, copy.tally.flaggedHint)}</small>
              </dt>
              <dd>{flaggedIds.length}</dd>
            </div>
          </dl>

          <section className="dash-queue" aria-labelledby="queue-title">
            <h2 id="queue-title">{t(lang, copy.priorityTitle)}</h2>
            <ul className="plot-list">
              {priority.map((row) => {
                const id = row.parcel.properties.id;
                const p = row.parcel.properties;
                return (
                  <li key={id}>
                    <Link href={`/property/${id}`} className="plot-row">
                      <PlotPhoto id={id} geometry={row.parcel.geometry} className="plot-thumb" small />
                      <span className="plot-text">
                        <span className="plot-id">{id}</span>
                        <span className="plot-street">{t(lang, p.street)}</span>
                        <span className="plot-area">{Math.round(p.areaM2).toLocaleString(lang === "el" ? "el-GR" : "en-GB")} m²</span>
                        <span className="plot-verdict">
                          <VerdictDot verdict={verdicts[id]} />
                          {t(lang, copy.verdict[verdicts[id]])}
                        </span>
                        {flags[id] ? <span className="plot-flag">{t(lang, copy.stats.flagged)}</span> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
