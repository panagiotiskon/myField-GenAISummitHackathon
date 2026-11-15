"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { scenario } from "@/data/scenario";
import { buildCases } from "@/lib/desk";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function OwnerPack({ parcelId }: { parcelId: string }) {
  const [locale, setLocale] = useState<Locale>("el");
  const tr = t(locale);
  const c = useMemo(() => buildCases(scenario).find((x) => x.parcel.id === parcelId), [parcelId]);

  if (!c) {
    return (
      <main className="owner-page">
        <p>Unknown parcel {parcelId}.</p>
        <Link href="/">← desk</Link>
      </main>
    );
  }

  const v = c.verdict;
  return (
    <main className="owner-page">
      <div className="banner">{scenario.meta.disclaimer[locale]}</div>
      <header className="top" style={{ padding: 0, border: 0 }}>
        <div className="brand">
          <div className="stamp">PACK</div>
          <div>
            <h1>{c.parcel.id}</h1>
            <p>
              {scenario.meta.municipality[locale]} · {tr.ownerPack}
            </p>
          </div>
        </div>
        <div className="top-actions">
          <div className="lang">
            <button type="button" aria-pressed={locale === "el"} onClick={() => setLocale("el")}>
              ΕΛ
            </button>
            <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
              EN
            </button>
          </div>
          <Link className="ghost" href="/">
            ← desk
          </Link>
        </div>
      </header>

      <p className="hint">{tr.notCertificate}</p>

      <article className="sheet">
        <div className="status">{tr.notCertificate}</div>
        <h3>{locale === "el" ? "Στοιχεία οικοπέδου" : "Plot record"}</h3>
        <table>
          <tbody>
            <tr>
              <td>{locale === "el" ? "Αναγνωριστικό (όχι ΚΑΕΚ)" : "Demo id (not a KAEK)"}</td>
              <td>{c.parcel.id}</td>
            </tr>
            <tr>
              <td>{locale === "el" ? "Θέση" : "Location"}</td>
              <td>{c.parcel.frontage}</td>
            </tr>
            <tr>
              <td>{tr.zone}</td>
              <td>
                {c.zone.reason} · {c.zone.article}
              </td>
            </tr>
            <tr>
              <td>{locale === "el" ? "Εμβαδόν" : "Area"}</td>
              <td>{Math.round(c.parcel.areaM2)} m²</td>
            </tr>
            <tr>
              <td>{tr.declaration}</td>
              <td>
                {c.declaration
                  ? `${c.declaration.id} · ${c.declaration.submittedAt.slice(0, 10)} · claimed cleaned`
                  : locale === "el"
                    ? "δεν εντοπίστηκε δήλωση"
                    : "no declaration found"}
              </td>
            </tr>
            <tr>
              <td>{tr.imagery}</td>
              <td>
                {v.kind === "inconclusive"
                  ? v.reason === "too_small"
                    ? locale === "el"
                      ? `Sentinel-2 10 m ατελέσφορο (εσωτερικό ${Math.round(v.interiorM2)} m²)`
                      : `Sentinel-2 10 m inconclusive (interior ${Math.round(v.interiorM2)} m²)`
                    : tr.noPair
                  : `NDVI ${v.ndviSpring.toFixed(3)} (${v.spring.datetime.slice(0, 10)}) → ${v.ndviSummer.toFixed(3)} (${v.summer.datetime.slice(0, 10)})`}
              </td>
            </tr>
            <tr>
              <td>{tr.complaint}</td>
              <td>{c.complaint ? c.complaint.text : "—"}</td>
            </tr>
          </tbody>
        </table>
      </article>

      <p className="hint">{scenario.meta.imageryNote[locale]}</p>
    </main>
  );
}
