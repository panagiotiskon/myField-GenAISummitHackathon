"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Chevron, LayerSwitch, TopBar, VERDICT_COLOR, VerdictDot } from "@/components/Chrome";
import { PlotGlyph } from "@/components/PlotShape";
import { MapView } from "@/components/MapView";
import { priorityList, resolveParcelCode, screen, type Verdict } from "@/lib/assess";
import { copy, fill, t } from "@/lib/i18n";
import { scenario } from "@/lib/scenario";
import { useAnalyses, useFlags, useLang } from "@/lib/store";

const LEGEND: Verdict[] = ["potentially_uncleaned", "uncertain", "likely_cleaned", "not_applicable"];
const BAR: Verdict[] = ["potentially_uncleaned", "uncertain", "likely_cleaned"];

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

      <div className="dash-body">
        <form className="search" onSubmit={onSearch}>
          <h2 className="search-title">{t(lang, copy.findTitle)}</h2>
          <label htmlFor="kaek">{t(lang, copy.searchLabel)}</label>
          <div className="search-row">
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
          </div>
          <p id="kaek-hint" className={miss ? "search-hint miss" : "search-hint"} role={miss ? "alert" : undefined}>
            {miss ? `${t(lang, copy.searchMiss)} ` : ""}
            {t(lang, copy.searchHint)}
          </p>
        </form>

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
          <LayerSwitch lang={lang} orthophoto={orthophoto} setOrthophoto={setOrthophoto} />
        </section>

        <aside className="panel right">
          <section className="tally" aria-labelledby="tally-title">
            <p className="tally-lead" id="tally-title">
              <strong>{scenario.declarations.length}</strong>
              <span>{fill(t(lang, copy.tallyLead), { n: inDuty })}</span>
            </p>
            <div className="tally-bar" role="img" aria-label={BAR.map((v) => `${t(lang, copy.verdict[v])}: ${count(v)}`).join(", ")}>
              {BAR.map((v) =>
                count(v) ? <i key={v} className={`v-${v}`} style={{ flexGrow: count(v) }} /> : null,
              )}
            </div>
            <ul className="tally-key">
              {BAR.map((v) => (
                <li key={v}>
                  <b className={`n v-${v}`}>{count(v)}</b>
                  {t(lang, copy.verdict[v])}
                </li>
              ))}
            </ul>
            <p className={flaggedIds.length ? "tally-flag on" : "tally-flag"}>
              <b>{flaggedIds.length}</b>
              {t(lang, copy.stats.flagged)}, {t(lang, copy.stats.flaggedSub)}
            </p>
          </section>

          <div className="list-head">
            <h2>{t(lang, copy.priority)}</h2>
            <p className="panel-sub">{t(lang, copy.prioritySub)}</p>
          </div>
          <ol className="queue">
            {priority.map((row, index) => {
              const id = row.parcel.properties.id;
              return (
                <li key={id}>
                  <Link href={`/property/${id}`} className="queue-item">
                    <span className="rank">{index + 1}</span>
                    <PlotGlyph geometry={row.parcel.geometry} verdict={verdicts[id]} size={40} />
                    <span className="queue-main">
                      <span className="queue-head">
                        <strong>{id}</strong>
                        <span className="area">{Math.round(row.parcel.properties.areaM2).toLocaleString("el-GR")} m²</span>
                      </span>
                      <span className={`queue-verdict v-${verdicts[id]}`}>
                        {t(lang, copy.verdict[verdicts[id]])}
                        {flags[id] ? <span className="tag tag-flag">{t(lang, copy.stats.flagged)}</span> : null}
                      </span>
                      <small>
                        {row.reasons
                          .slice(0, 3)
                          .map((reason) => t(lang, copy.reasons[reason]))
                          .join("; ")}
                      </small>
                    </span>
                    <Chevron />
                  </Link>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </div>
  );
}
