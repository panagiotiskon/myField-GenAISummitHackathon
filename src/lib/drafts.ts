import type { DraftBundle, FineBreakdown, ParcelCase } from "./types";
import { computeSanctions } from "./fines";

const STATUS = "προς υπογραφή — δεν έχει κοινοποιηθεί";

export function officerFinding(c: ParcelCase): { cleaned: boolean; suspectedFalse: boolean } {
  if (c.verdict.kind === "uncleared") {
    return { cleaned: false, suspectedFalse: Boolean(c.declaration?.claimedCleaned) };
  }
  if (!c.declaration) {
    return { cleaned: false, suspectedFalse: false };
  }
  // Small-plot declaration: imagery cannot confirm. Draft still proposes inspection, not a finding of cleaning.
  return { cleaned: false, suspectedFalse: false };
}

export function sanctionsFor(c: ParcelCase): FineBreakdown {
  const { cleaned, suspectedFalse } = officerFinding(c);
  return computeSanctions({
    areaM2: c.parcel.areaM2,
    declared: Boolean(c.declaration),
    cleaned,
    falseDeclarationSuspected: suspectedFalse,
  });
}

export function buildDrafts(c: ParcelCase, officerName: string, deskDate: string): DraftBundle {
  const amounts = sanctionsFor(c);
  const zone = `${labelZone(c)} (${c.zone.article})`;
  const cleanedFinding = officerFinding(c).cleaned ? "εκπληρώθηκε" : "δεν εκπληρώθηκε / δεν επιβεβαιώθηκε";

  const inspection = {
    annex: "Α" as const,
    title: "Παράρτημα Α — Φύλλο ελέγχου καθαρισμού (Δήμος)",
    fields: [
      { label: "Δήμος", value: "Δήμος Δρυότοπου (προσομοίωση)" },
      { label: "Ημερομηνία σύνταξης", value: deskDate },
      { label: "Αναγνωριστικό οικοπέδου", value: `${c.parcel.id} (όχι ΚΑΕΚ)` },
      { label: "Πρόσοψη / θέση", value: c.parcel.frontage },
      { label: "Εμβαδόν", value: `${Math.round(c.parcel.areaM2)} m²` },
      { label: "Υπόχρεος", value: c.ownerLabel },
      { label: "Πεδίο εφαρμογής", value: zone },
      { label: "Δήλωση", value: c.declaration ? `${c.declaration.id} · ${c.declaration.submittedAt.slice(0, 10)} · ισχυρίζεται καθαρισμό` : "δεν υποβλήθηκε" },
      { label: "Καταγγελία", value: c.complaint ? `${c.complaint.id} · ${c.complaint.severity}` : "—" },
      { label: "Εικόνα", value: imageryLine(c) },
      { label: "Διαπίστωση καθαρισμού", value: cleanedFinding },
      { label: "Συντάκτης (χειρόγραφο)", value: officerName.trim() || "________________" },
    ],
    findings: [
      c.declaration
        ? "Δειγματοληπτικός έλεγχος δήλωσης (άρθρο 6.1.β)."
        : "Αδήλωτο οικόπεδο εντός υποχρέωσης. Άρθρο 5.6: τεκμαιρόμενη συναίνεση για αυτεπάγγελτο καθαρισμό — δεν διατάσσεται από το παρόν φύλλο.",
      ...amounts.notes,
    ],
    statusLine: STATUS,
  };

  const fine = {
    annex: "Δ" as const,
    title: "Παράρτημα Δ — Πράξη επιβολής προστίμου (Δήμος)",
    fields: [
      { label: "Δήμος", value: "Δήμος Δρυότοπου (προσομοίωση)" },
      { label: "Ημερομηνία", value: deskDate },
      { label: "Αναγνωριστικό οικοπέδου", value: `${c.parcel.id} (όχι ΚΑΕΚ)` },
      { label: "Υπόχρεος", value: c.ownerLabel },
      { label: "Νομική βάση", value: "ΥΠ 1157 / ΦΕΚ Β' 2323/24.4.2026, άρθρα 8 και 6" },
      { label: "Πρόστιμο μη καθαρισμού (8.1)", value: amounts.cleaning === null ? "—" : `${amounts.cleaning} €` },
      { label: "Πρόστιμο μη δήλωσης (8.3)", value: amounts.undeclared === null ? "—" : `${amounts.undeclared} €` },
      { label: "Σύνολο προς υπογραφή", value: `${amounts.total} €` },
      { label: "Μείωση 8.7 αν καθαρίσει εντός ένστασης", value: amounts.cleaningReducedIfCompliant === null ? "—" : `${amounts.cleaningReducedIfCompliant} € (μόνο το 8.1)` },
      { label: "Υπογραφή αρμόδιου οργάνου", value: officerName.trim() || "________________" },
    ],
    amounts,
    legal: amounts.notes,
    statusLine: STATUS,
  };

  return { parcelId: c.parcel.id, inspection, fine };
}

function labelZone(c: ParcelCase): string {
  switch (c.zone.reason) {
    case "in_plan":
      return "εντός σχεδίου";
    case "in_settlement":
      return "εντός ορίων οικισμού";
    case "within_100m":
      return "εντός 100 m από σχέδιο / οικισμό";
    default:
      return c.zone.reason;
  }
}

function imageryLine(c: ParcelCase): string {
  if (c.verdict.kind === "inconclusive" && c.verdict.reason === "too_small") {
    return `Sentinel-2 10 m: ατελέσφορο (εσωτερικό μετά από εσοχή 10 m: ${Math.round(c.verdict.interiorM2)} m²)`;
  }
  if (c.verdict.kind === "inconclusive") {
    return "Sentinel-2: αρκετό εμβαδόν, δεν ανακτήθηκε ζεύγος σκηνών για αυτό το οικόπεδο";
  }
  return `NDVI άνοιξη ${c.verdict.ndviSpring.toFixed(3)} → ${c.verdict.summer.datetime.slice(0, 10)} ${c.verdict.ndviSummer.toFixed(3)} (Δ ${c.verdict.ndviDelta.toFixed(3)})`;
}
