"use client";

import { copy, euro, t } from "@/lib/i18n";
import { scenario } from "@/lib/scenario";
import type { DraftBundle, Lang, ParcelFeature } from "@/lib/types";
import { zoneMembership } from "@/lib/zones";

export function DraftView(props: {
  lang: Lang;
  parcel: ParcelFeature;
  draft: DraftBundle;
  officerName: string;
  declared: boolean;
  claimedCleaned: boolean;
  complaintText?: string;
}) {
  const { lang, parcel, draft, officerName } = props;
  const p = parcel.properties;
  const zone = zoneMembership(p.zone);
  const finding = !props.declared
    ? "ΜΗ ΥΠΟΒΟΛΗ ΔΗΛΩΣΗΣ / ΜΗ ΚΑΘΑΡΙΣΜΟΣ"
    : draft.fines.prosecutorReferralPending
      ? "ΥΠΟΒΟΛΗ ΨΕΥΔΟΥΣ ΔΗΛΩΣΗΣ (υπόνοια) / ΜΗ ΚΑΘΑΡΙΣΜΟΣ"
      : "ΜΗ ΚΑΘΑΡΙΣΜΟΣ";

  return (
    <article className="draft" id="printable-draft">
      <div className="gazette">ΕΦΗΜΕΡΙΣ ΤΗΣ ΚΥΒΕΡΝΗΣΕΩΣ · ΦΕΚ Β΄ 2323/24.4.2026</div>
      <h3>{t(lang, copy.annexA)}</h3>
      <p className="cite">{scenario.meta.law.primary} · άρθρα 6.1.β και 6.2</p>
      <div className="stamp">{t(lang, copy.draftStatus)}</div>
      <table>
        <tbody>
          <tr>
            <th>ΗΜΕΡΟΜΗΝΙΑ</th>
            <td>{scenario.meta.deskDate}</td>
            <th>ΩΡΑ</th>
            <td>08:40</td>
          </tr>
          <tr>
            <th>ΠΕΡΙΦΕΡΕΙΑΚΗ ΕΝΟΤΗΤΑ</th>
            <td>Ανατολική Αττική</td>
            <th>ΔΗΜΟΣ</th>
            <td>{t(lang, scenario.meta.municipality)}</td>
          </tr>
          <tr>
            <th>ΟΙΚΙΣΜΟΣ</th>
            <td>{t(lang, scenario.meta.settlement)}</td>
            <th>ΟΔΟΣ</th>
            <td>{t(lang, p.street)}</td>
          </tr>
          <tr>
            <th>ΚΩΔΙΚΟΣ ΕΠΙΔΕΙΞΗΣ (ΟΧΙ ΚΑΕΚ)</th>
            <td>{p.id}</td>
            <th>ΕΜΒΑΔΟΝ</th>
            <td>{p.areaM2} m²</td>
          </tr>
          <tr>
            <th>ΖΩΝΗ / ΑΡΘΡΟ</th>
            <td colSpan={3}>
              {t(lang, copy.zones[p.zone])} · {zone.article}
            </td>
          </tr>
          <tr>
            <th>ΕΙΔΟΣ ΧΩΡΟΥ</th>
            <td>{p.enclosed ? "ΠΕΡΙΦΡΑΓΜΕΝΟΣ" : "ΕΛΕΥΘΕΡΟΣ"}</td>
            <th>ΕΙΔΟΣ ΕΛΕΓΧΟΥ</th>
            <td>{props.complaintText ? "ΕΞΕΤΑΣΗ ΚΑΤΑΓΓΕΛΙΑΣ" : "ΑΡΧΙΚΟΣ ΕΛΕΓΧΟΣ"}</td>
          </tr>
          <tr>
            <th>ΥΠΟΧΡΕΟΣ (ΠΡΟΣΟΜΟΙΩΣΗ)</th>
            <td colSpan={3}>{p.owner}</td>
          </tr>
          <tr>
            <th>ΑΠΟΤΕΛΕΣΜΑ</th>
            <td colSpan={3}>{finding}</td>
          </tr>
          <tr>
            <th>ΠΑΡΑΤΗΡΗΣΕΙΣ</th>
            <td colSpan={3}>
              {props.complaintText ?? "—"}
              {!props.declared ? ` ${t(lang, copy.consent)}` : ""}
            </td>
          </tr>
          <tr>
            <th>Ο ΔΙΕΝΕΡΓΩΝ ΤΟΝ ΕΛΕΓΧΟ</th>
            <td colSpan={3}>{officerName || "—"}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ marginTop: "1.2rem" }}>{t(lang, copy.annexD)}</h3>
      <p className="cite">{scenario.meta.law.primary} · άρθρα 8.1, 8.3, 8.6, 8.7</p>
      <table>
        <tbody>
          <tr>
            <th>{t(lang, copy.fines.cleaning)}</th>
            <td>{euro(draft.fines.cleaningFineEur)}</td>
          </tr>
          <tr>
            <th>{t(lang, copy.fines.declaration)}</th>
            <td>{euro(draft.fines.declarationFineEur)}</td>
          </tr>
          <tr>
            <th>{t(lang, copy.fines.total)}</th>
            <td>
              <strong>{euro(draft.fines.totalEur)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="cite">{t(lang, copy.fines.art87)}</p>
      {draft.fines.prosecutorReferralPending ? (
        <p className="cite">{t(lang, copy.fines.art86)}</p>
      ) : null}
      <p className="cite">{t(lang, copy.noIssue)}</p>
    </article>
  );
}
