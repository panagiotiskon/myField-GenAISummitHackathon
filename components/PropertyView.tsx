"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { TopBar, VERDICT_COLOR } from "@/components/Chrome";
import { MapView } from "@/components/MapView";
import {
  imageryDoc,
  imageryFor,
  ruleAssessment,
  rulesOnlyAnalysis,
  type Analysis,
  type LandCover,
} from "@/lib/assess";
import { copy, fill, t } from "@/lib/i18n";
import { getParcel, scenario } from "@/lib/scenario";
import { useAnalyses, useFlags, useLang } from "@/lib/store";
import { zoneMembership } from "@/lib/zones";

const COVER_KEYS: (keyof LandCover)[] = ["trees", "lowVegetation", "bareGround", "built"];

export function PropertyView({ parcelId }: { parcelId: string }) {
  const [lang, setLang] = useLang();
  const { flags, toggle } = useFlags();
  const { analyses, save } = useAnalyses();
  const [busy, setBusy] = useState(false);
  const [orthophoto, setOrthophoto] = useState(true);
  const assessRef = useRef<HTMLHeadingElement>(null);

  const parcel = getParcel(parcelId);
  const imagery = imageryFor(parcelId);
  const declaration = scenario.declarations.find((row) => row.parcelId === parcelId) ?? null;
  const complaints = scenario.complaints.filter((row) => row.parcelId === parcelId);
  const rule = useMemo(
    () => (parcel ? ruleAssessment(parcel, imagery, declaration) : null),
    [parcel, imagery, declaration],
  );

  const analysis: Analysis | undefined = analyses[parcelId];
  const colors = useMemo(() => {
    const verdict = analysis?.verdict ?? rule?.verdict;
    return verdict ? { [parcelId]: VERDICT_COLOR[verdict] } : {};
  }, [analysis, rule, parcelId]);
  const flaggedIds = useMemo(() => Object.keys(flags), [flags]);

  if (!parcel || !rule) {
    return (
      <div className="app-shell">
        <TopBar lang={lang} setLang={setLang} section={t(lang, copy.property)} />
        <main className="empty">
          <p>{t(lang, copy.unknownParcel)}</p>
          <Link href="/">{t(lang, copy.backDashboard)}</Link>
        </main>
      </div>
    );
  }

  const p = parcel.properties;
  const membership = zoneMembership(p.zone);
  const flaggedAt = flags[parcelId];
  const s2 = imagery?.sentinel ?? null;

  async function analyze() {
    setBusy(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parcelId }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      save((await res.json()) as Analysis);
    } catch {
      // Server unreachable: the measurements are in the page already.
      save(rulesOnlyAnalysis(rule!, "call_failed", new Date().toISOString()));
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        assessRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }

  return (
    <div className="app-shell prop">
      <TopBar
        lang={lang}
        setLang={setLang}
        section={t(lang, copy.property)}
        left={<Link href="/">{t(lang, copy.backDashboard)}</Link>}
      />

      <div className="prop-body">
        <section className="map-wrap">
          <MapView
            colors={colors}
            selectedId={parcelId}
            flaggedIds={flaggedIds}
            orthophoto={orthophoto}
            offlineNote={t(lang, copy.mapOffline)}
          />
          <button type="button" className="btn map-toggle" onClick={() => setOrthophoto((v) => !v)}>
            {orthophoto ? t(lang, copy.streets) : t(lang, copy.orthophoto)}
          </button>
        </section>

        <aside className="panel right prop-panel">
          <header className="prop-head">
            <h1>{p.id}</h1>
            <p className="muted">{t(lang, p.street)}</p>
          </header>

          <div className="kv">
            <span>{t(lang, copy.demoId)}</span>
            <strong>{p.id}</strong>
            <span>{t(lang, copy.area)}</span>
            <span>{Math.round(p.areaM2).toLocaleString("el-GR")} m²</span>
            <span>{t(lang, copy.zone)}</span>
            <span>
              {t(lang, copy.zones[p.zone])} · {membership.article}
            </span>
            <span>{t(lang, copy.declaration)}</span>
            <span>
              {declaration
                ? `${declaration.registryRef} · ${t(lang, copy.declaredCleaned)} ${declaration.submittedAt.slice(0, 10)}`
                : t(lang, copy.none)}
            </span>
            <span>{t(lang, copy.complaint)}</span>
            <span>
              {complaints.length ? complaints.map((row) => t(lang, row.text)).join(" ") : t(lang, copy.none)}
            </span>
          </div>

          <h2>{t(lang, copy.imagery)}</h2>
          <div className="chips">
            {imagery?.ortho ? (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagery.ortho.src} alt={t(lang, copy.orthoCaption)} width={512} height={512} />
                <figcaption>
                  <strong>{t(lang, copy.orthoCaption)}</strong>
                  <span>
                    {t(lang, copy.orthoDate)} · {imagery.ortho.sideM} m
                  </span>
                </figcaption>
              </figure>
            ) : null}
            {s2
              ? ([s2.before, s2.after] as const).map((scene) => (
                  <figure key={scene.date}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={scene.chip.src} alt={`Sentinel-2 ${scene.date}`} width={512} height={512} />
                    <figcaption>
                      <strong>
                        {t(lang, copy.s2Caption)} · {scene.date}
                      </strong>
                      <span>
                        NDVI {scene.ndvi.toFixed(2)} · {scene.chip.sideM} m
                      </span>
                    </figcaption>
                  </figure>
                ))
              : null}
          </div>
          {s2 ? (
            <p className="ndvi-line">
              {t(lang, copy.ndvi)}: <strong>{s2.before.ndvi.toFixed(2)}</strong> →{" "}
              <strong>{s2.after.ndvi.toFixed(2)}</strong>
              <span className="muted">
                {" "}
                · {s2.after.pixelCount} {t(lang, copy.pixels)}
              </span>
            </p>
          ) : (
            <p className="panel-sub">{t(lang, copy.noSentinel)}</p>
          )}

          <h2 ref={assessRef}>{t(lang, copy.assessment)}</h2>
          {!analysis ? (
            <div className="assess assess-empty">
              <p>{busy ? t(lang, copy.analyzing) : t(lang, copy.beforeAnalyze)}</p>
            </div>
          ) : (
            <div className={`assess v-edge-${analysis.verdict}`} aria-live="polite">
              <div className="assess-top">
                <span className={`verdict v-${analysis.verdict}`}>{t(lang, copy.verdict[analysis.verdict])}</span>
                <span className="tag">{t(lang, copy.source[analysis.source])}</span>
              </div>
              <div className="kv tight">
                <span>{t(lang, copy.confidenceLabel)}</span>
                <span>{t(lang, copy.confidence[analysis.confidence])}</span>
                <span>{t(lang, copy.imageDate)}</span>
                <span>
                  {analysis.rule.imageDate
                    ? `${analysis.rule.imageDate} · Sentinel-2`
                    : t(lang, copy.imageDateNone)}
                </span>
              </div>

              {analysis.ai ? <p className="summary">{t(lang, analysis.ai.summary)}</p> : null}
              {analysis.aiNote ? <p className="notice">{t(lang, copy.aiNote[analysis.aiNote])}</p> : null}
              {analysis.ai?.clamped ? (
                <p className="notice">
                  {fill(t(lang, copy.clamped), {
                    v: t(lang, copy.verdict[analysis.ai.proposedVerdict]),
                  })}
                </p>
              ) : null}

              <h3>{t(lang, copy.evidence)}</h3>
              <ul>
                <li>{t(lang, copy.ruleReason[analysis.rule.reason])}</li>
                {analysis.rule.ndviAfter != null ? (
                  <li>
                    NDVI {analysis.rule.ndviBefore?.toFixed(2)} ({imageryDoc.sources.sentinel.before.date}) →{" "}
                    {analysis.rule.ndviAfter.toFixed(2)} ({analysis.rule.imageDate}), {analysis.rule.pixelCount}{" "}
                    {t(lang, copy.pixels)}.
                  </li>
                ) : null}
              </ul>

              {analysis.ai ? (
                <>
                  <h3>{t(lang, copy.observations)}</h3>
                  <ul>
                    {analysis.ai.observations.map((row, index) => (
                      <li key={index}>{t(lang, row)}</li>
                    ))}
                  </ul>
                  <h3>{t(lang, copy.landCover)}</h3>
                  <div className="cover">
                    {COVER_KEYS.map((key) => (
                      <div key={key} className="cover-row">
                        <span>{t(lang, copy.cover[key])}</span>
                        <div className="cover-bar">
                          <i className={`cover-${key}`} style={{ width: `${analysis.ai!.landCover[key]}%` }} />
                        </div>
                        <span>{analysis.ai!.landCover[key]}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <h3>{t(lang, copy.limitations)}</h3>
              <ul>
                {(analysis.ai?.limitations ?? []).map((row, index) => (
                  <li key={`ai-${index}`}>{t(lang, row)}</li>
                ))}
                {copy.fixedLimits.map((row, index) => (
                  <li key={index}>{t(lang, row)}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flag-bar">
            <button
              type="button"
              className={analysis ? "btn" : "btn btn-primary"}
              onClick={analyze}
              disabled={busy}
            >
              {busy ? t(lang, copy.analyzing) : t(lang, analysis ? copy.reanalyze : copy.analyze)}
            </button>
            {flaggedAt ? (
              <>
                <span className="flag-on">
                  {t(lang, copy.flagged)} · {flaggedAt.slice(0, 16).replace("T", " ")}
                </span>
                <button type="button" className="btn" onClick={() => toggle(parcelId)}>
                  {t(lang, copy.unflag)}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={analysis ? "btn btn-primary" : "btn"}
                onClick={() => toggle(parcelId)}
              >
                {t(lang, copy.flag)}
              </button>
            )}
            <small className="muted">{t(lang, copy.flagNote)}</small>
          </div>
        </aside>
      </div>
    </div>
  );
}
