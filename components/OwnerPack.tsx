"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapView } from "@/components/MapView";
import { queueBucket, runTodaysDesk } from "@/lib/desk";
import { copy, t } from "@/lib/i18n";
import { getParcel, scenario } from "@/lib/scenario";
import type { Lang, QueueBucket } from "@/lib/types";
import { zoneMembership } from "@/lib/zones";

export function OwnerPack({ parcelId }: { parcelId: string }) {
  const [lang, setLang] = useState<Lang>("el");
  const parcel = getParcel(parcelId);
  const run = useMemo(() => runTodaysDesk(scenario), []);
  const buckets = useMemo(() => {
    const out: Record<string, QueueBucket> = {};
    const verdictById = new Map(run.verdicts.map((row) => [row.parcelId, row]));
    for (const row of scenario.parcels.features) {
      const id = (row.properties as { id: string }).id;
      const feature = getParcel(id);
      if (!feature) continue;
      out[id] = queueBucket(feature, {
        declared: Boolean(run.ingest.declarations[id]),
        claimedCleaned: Boolean(run.ingest.declarations[id]?.claimedCleaned),
        hasComplaint: (run.ingest.complaints[id] ?? []).length > 0,
        verdict: verdictById.get(id),
      });
    }
    return out;
  }, [run]);

  if (!parcel) {
    return (
      <main className="owner-page">
        <p>Unknown demo parcel.</p>
        <Link href="/">{t(lang, copy.backDesk)}</Link>
      </main>
    );
  }

  const verdict = run.verdicts.find((row) => row.parcelId === parcelId);
  const declaration = run.ingest.declarations[parcelId];
  const membership = zoneMembership(parcel.properties.zone);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>myField</strong>
          <span>{t(lang, copy.ownerPack)}</span>
        </div>
        <div className="meta-line">
          <Link href="/">{t(lang, copy.backDesk)}</Link>
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
      <div className="banner">{t(lang, scenario.meta.banner)}</div>
      <main className="owner-page">
        <p className="watermark">{t(lang, copy.notCertificate)}</p>
        <div className="owner-grid">
          <section className="map-wrap" style={{ minHeight: 480, height: 480, position: "relative" }}>
            <MapView
              buckets={buckets}
              selectedId={parcelId}
              orthophoto={false}
              onSelect={() => undefined}
            />
          </section>
          <section className="pack-card">
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "1.4rem" }}>
              {parcel.properties.id}
            </h1>
            <p className="muted">{t(lang, parcel.properties.street)}</p>
            <div className="kv">
              <span>{t(lang, copy.owner)}</span>
              <span>{parcel.properties.owner}</span>
              <span>{t(lang, copy.area)}</span>
              <span>{parcel.properties.areaM2} m²</span>
              <span>{t(lang, copy.zone)}</span>
              <span>
                {t(lang, copy.zones[parcel.properties.zone])} · {membership.article}
              </span>
              <span>{t(lang, copy.declaration)}</span>
              <span>{declaration ? declaration.registryRef : t(lang, copy.none)}</span>
              <span>{t(lang, copy.imagery)}</span>
              <span>
                {verdict
                  ? `${t(lang, copy.imageryStatus[verdict.status])}. ${t(lang, copy.imageryReason[verdict.reason])}`
                  : "—"}
              </span>
            </div>
            <h2>{t(lang, copy.evidenceHave)}</h2>
            {verdict?.reason === "seasonal_index" ? (
              <p>
                Sentinel-2 {scenario.meta.imagery.springDate} NDVI {verdict.springNdvi?.toFixed(3)} →{" "}
                {scenario.meta.imagery.juneDate} NDVI {verdict.juneNdvi?.toFixed(3)}.
              </p>
            ) : (
              <p>{t(lang, copy.imageryReason[verdict?.reason ?? "interior_buffer_10m"])}</p>
            )}
            <p>{t(lang, copy.askReceipt)}</p>
            <p className="muted">{t(lang, copy.notCertificate)}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
