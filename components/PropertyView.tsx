"use client";

import { useMemo, useState } from "react";
import { BackLink, LayerSwitch, PlotCode, TopBar, VERDICT_COLOR, VerdictDot } from "@/components/Chrome";
import { KaekNotFound } from "@/components/KaekNotFound";
import { PlotSurvey } from "@/components/PlotShape";
import { MapView } from "@/components/MapView";
import { PlotPhoto } from "@/components/PlotPhoto";
import {
  imageryFor,
  ruleAssessment,
  type Analysis,
} from "@/lib/assess";
import { copy, t } from "@/lib/i18n";
import { getParcel, scenario } from "@/lib/scenario";
import { useAnalyses, useFlags, useLang } from "@/lib/store";

export function PropertyView({ parcelId }: { parcelId: string }) {
  const [lang, setLang] = useLang();
  const { flags, toggle } = useFlags();
  const { analyses } = useAnalyses();
  const [orthophoto, setOrthophoto] = useState(true);

  const parcel = getParcel(parcelId);
  const imagery = imageryFor(parcelId);
  const declaration = scenario.declarations.find((row) => row.parcelId === parcelId) ?? null;
  const rule = useMemo(
    () => (parcel ? ruleAssessment(parcel, imagery, declaration) : null),
    [parcel, imagery, declaration],
  );

  const analysis: Analysis | undefined = analyses[parcelId];
  const verdict = analysis?.verdict ?? rule?.verdict ?? "potentially_uncleaned";

  const colors = useMemo(() => {
    return verdict ? { [parcelId]: VERDICT_COLOR[verdict] } : {};
  }, [verdict, parcelId]);

  const flaggedIds = useMemo(() => Object.keys(flags), [flags]);

  if (!parcel || !rule) {
    return <KaekNotFound code={parcelId} lang={lang} setLang={setLang} />;
  }

  const p = parcel.properties;
  const flaggedAt = flags[parcelId];
  const s2 = imagery?.sentinel ?? null;
  const ndvi = s2?.ndviChips ?? null;
  const locale = lang === "el" ? "el-GR" : "en-GB";
  const longDate = (iso: string) =>
    new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  return (
    <div className="app-shell prop film-world">
      <TopBar
        lang={lang}
        setLang={setLang}
        section={t(lang, copy.property)}
        left={<BackLink label={t(lang, copy.backDashboard)} />}
        hideBanner
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
          <LayerSwitch lang={lang} orthophoto={orthophoto} setOrthophoto={setOrthophoto} />
        </section>

        <aside className="panel right prop-panel prop-quiet">
          <header className="prop-head">
            <div className="prop-title">
              <PlotCode id={p.id} className="prop-code" />
              <h1>{t(lang, p.street)}</h1>
              <p className="prop-facts">
                {Math.round(p.areaM2).toLocaleString(locale)} m², {t(lang, copy.zones[p.zone]).toLowerCase()}
              </p>
            </div>
            <PlotSurvey
              geometry={parcel.geometry}
              verdict={verdict}
              insetLabel={t(lang, copy.insetLabel)}
              noInsetLabel={t(lang, copy.noInsetLabel)}
              lang={lang}
              caption={false}
            />
          </header>

          <section className="prop-reading" aria-label={t(lang, copy.verdict[verdict])}>
            <p className="prop-verdict">
              <VerdictDot verdict={verdict} />
              {t(lang, copy.verdict[verdict])}
            </p>
            <dl className="prop-numbers">
              {declaration ? (
                <div>
                  <dt>{t(lang, copy.declaredCleaned)}</dt>
                  <dd>{longDate(declaration.submittedAt)}</dd>
                </div>
              ) : null}
              {s2 ? (
                <div>
                  <dt>NDVI</dt>
                  <dd>
                    {s2.before.ndvi.toFixed(2)} → {s2.after.ndvi.toFixed(2)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {imagery?.ortho || ndvi ? (
            <section className="prop-images" aria-labelledby="prop-images-title">
              <h2 id="prop-images-title">{t(lang, copy.evidenceTitle)}</h2>
              <div className="prop-image-row">
                {imagery?.ortho || imagery?.orthoHd ? (
                  <figure>
                    <PlotPhoto id={parcelId} geometry={parcel.geometry} alt={t(lang, copy.orthoCaption)} />
                    <figcaption>{t(lang, copy.orthoCaption)}</figcaption>
                  </figure>
                ) : null}
                {ndvi
                  ? (["before", "after"] as const).map((which) => (
                      <figure key={which}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="pixelated"
                          src={ndvi[which].src}
                          alt={`NDVI, Sentinel-2, ${longDate(ndvi[which].date)}`}
                          width={528}
                          height={528}
                        />
                        <figcaption>NDVI, {longDate(ndvi[which].date)}</figcaption>
                      </figure>
                    ))
                  : null}
              </div>
              {ndvi ? (
                <figure className="ndvi-key" aria-label={t(lang, copy.ndviKeyLabel)}>
                  <div className="ndvi-key-bar">
                    <i style={{ left: `${(0.3 / ndvi.rescale[1]) * 100}%` }} />
                  </div>
                  <figcaption>
                    <span>{t(lang, copy.ndviLow)} ({ndvi.rescale[0].toFixed(1)})</span>
                    <span className="ndvi-key-mark" style={{ left: `${(0.3 / ndvi.rescale[1]) * 100}%` }}>
                      0.30 {t(lang, copy.ndviThreshold)}
                    </span>
                    <span>{t(lang, copy.ndviHigh)} ({ndvi.rescale[1].toFixed(1)})</span>
                  </figcaption>
                </figure>
              ) : null}
            </section>
          ) : null}

          <div className="prop-flag">
            {flaggedAt ? (
              <div className="prop-flagged">
                <span>
                  {t(lang, copy.flaggedAction)}, {longDate(flaggedAt)}
                </span>
                <button type="button" className="prop-unflag" onClick={() => toggle(parcelId)}>
                  {t(lang, copy.unflag)}
                </button>
              </div>
            ) : (
              <button type="button" className="prop-flag-btn" onClick={() => toggle(parcelId)}>
                {t(lang, copy.flagAction)}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
