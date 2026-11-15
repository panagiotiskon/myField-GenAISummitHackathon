"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { TopBar, VERDICT_COLOR, VerdictDot } from "@/components/Chrome";
import { MapView } from "@/components/MapView";
import { priorityList, resolveParcelCode, screen, type Verdict } from "@/lib/assess";
import { copy, fill, t } from "@/lib/i18n";
import { scenario } from "@/lib/scenario";
import { useAnalyses, useFlags, useLang } from "@/lib/store";

const LEGEND: Verdict[] = ["potentially_uncleaned", "uncertain", "likely_cleaned", "not_applicable"];

export function Dashboard() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const { flags } = useFlags();
  const { analyses } = useAnalyses();
  const [query, setQuery] = useState("");
  const [miss, setMiss] = useState(false);
  const [orthophoto, setOrthophoto] = useState(false);

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
  const count = (v: Verdict) => Object.values(verdicts).filter((x) => x === v).length;
  const inDuty = rows.filter((row) => row.rule.verdict !== "not_applicable").length;
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
    <div className="app-shell dash">
      <TopBar lang={lang} setLang={setLang} section={t(lang, copy.dashboard)} />

      <form className="search" onSubmit={onSearch}>
        <label htmlFor="kaek">{t(lang, copy.searchLabel)}</label>
        <input
          id="kaek"
          list="kaek-list"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setMiss(false);
          }}
          placeholder={t(lang, copy.searchPlaceholder)}
          aria-describedby="kaek-hint"
        />
        <datalist id="kaek-list">
          {ids.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
        <button type="submit" className="btn btn-primary">
          {t(lang, copy.searchGo)}
        </button>
        <p id="kaek-hint" className={miss ? "search-hint miss" : "search-hint"} role={miss ? "alert" : undefined}>
          {miss ? `${t(lang, copy.searchMiss)} ` : ""}
          {t(lang, copy.searchHint)}
        </p>
      </form>

      <div className="dash-body">
        <section className="map-wrap">
          <MapView
            colors={colors}
            selectedId={null}
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
          <button type="button" className="btn map-toggle" onClick={() => setOrthophoto((v) => !v)}>
            {orthophoto ? t(lang, copy.streets) : t(lang, copy.orthophoto)}
          </button>
        </section>

        <aside className="panel right">
          <div className="stats">
            <div className="stat">
              <strong>{scenario.declarations.length}</strong>
              <span>{t(lang, copy.stats.declarations)}</span>
              <small>{fill(t(lang, copy.stats.ofInDuty), { n: inDuty })}</small>
            </div>
            <div className="stat">
              <strong className="v-potentially_uncleaned">{count("potentially_uncleaned")}</strong>
              <span>{t(lang, copy.stats.uncleaned)}</span>
              <small>{t(lang, copy.stats.uncleanedSub)}</small>
            </div>
            <div className="stat">
              <strong className="v-uncertain">{count("uncertain")}</strong>
              <span>{t(lang, copy.stats.uncertain)}</span>
              <small>{t(lang, copy.stats.uncertainSub)}</small>
            </div>
            <div className="stat">
              <strong>{flaggedIds.length}</strong>
              <span>{t(lang, copy.stats.flagged)}</span>
              <small>{t(lang, copy.stats.flaggedSub)}</small>
            </div>
          </div>

          <h2>{t(lang, copy.priority)}</h2>
          <p className="panel-sub">{t(lang, copy.prioritySub)}</p>
          {priority.map((row, index) => {
            const id = row.parcel.properties.id;
            return (
              <Link key={id} href={`/property/${id}`} className="queue-item">
                <div className="queue-head">
                  <span>
                    <VerdictDot verdict={verdicts[id]} />
                    <strong>
                      {index + 1}. {id}
                    </strong>
                  </span>
                  {flags[id] ? <span className="tag">{t(lang, copy.stats.flagged)}</span> : null}
                </div>
                <small>
                  {t(lang, copy.verdict[verdicts[id]])} · {Math.round(row.parcel.properties.areaM2)} m²
                  {" · "}
                  {row.reasons
                    .slice(0, 3)
                    .map((reason) => t(lang, copy.reasons[reason]))
                    .join(" · ")}
                </small>
              </Link>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
