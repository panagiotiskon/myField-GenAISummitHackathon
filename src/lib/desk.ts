import type {
  CaseStatus,
  DeskResult,
  LogEntry,
  ParcelCase,
  Scenario,
  ThreadMessage,
} from "./types";
import { classifyZone, isGap } from "./zone";
import { judgeImagery } from "./imagery";
import { riskFlags, riskScore } from "./risk";
import { buildDayRoute } from "./route";

export function ingest(scenario: Scenario): {
  byParcel: Map<
    string,
    { declaration: Scenario["declarations"][number] | null; complaint: Scenario["complaints"][number] | null }
  >;
} {
  const byParcel = new Map<
    string,
    { declaration: Scenario["declarations"][number] | null; complaint: Scenario["complaints"][number] | null }
  >();
  for (const p of scenario.parcels) {
    byParcel.set(p.id, { declaration: null, complaint: null });
  }
  for (const d of scenario.declarations) {
    const row = byParcel.get(d.parcelId);
    if (row) row.declaration = d;
  }
  for (const c of scenario.complaints) {
    const row = byParcel.get(c.parcelId);
    if (row) row.complaint = c;
  }
  return { byParcel };
}

function initialStatus(c: Omit<ParcelCase, "status">): CaseStatus {
  if (!c.zone.inDuty) return "out_of_scope";
  if (c.verdict.kind === "cleared" && c.declaration && !c.complaint) return "quiet";
  if (!c.declaration) return "gap";
  if (c.verdict.kind === "uncleared" || c.verdict.kind === "inconclusive") return "flagged_declaration";
  if (c.complaint) return "complaint";
  return "quiet";
}

export function buildCases(scenario: Scenario): ParcelCase[] {
  const { byParcel } = ingest(scenario);
  return scenario.parcels.map((parcel) => {
    const matched = byParcel.get(parcel.id) ?? { declaration: null, complaint: null };
    const zone = classifyZone(parcel, scenario.context);
    const verdict = judgeImagery(parcel, scenario.imagerySnapshots);
    const risk = riskFlags(parcel, scenario.context, Boolean(matched.complaint));
    const extras = {
      undeclared: matched.declaration === null && zone.inDuty,
      imageryUncleared: verdict.kind === "uncleared",
      imageryInconclusiveDeclared: verdict.kind === "inconclusive" && matched.declaration !== null,
    };
    const partial = {
      parcel,
      zone,
      declaration: matched.declaration,
      complaint: matched.complaint,
      verdict,
      risk,
      riskScore: riskScore(risk, extras),
      ownerLabel: scenario.owners[parcel.id]?.label ?? `Υπόχρεος ${parcel.id} (προσομοίωση)`,
    };
    return { ...partial, status: initialStatus(partial) };
  });
}

export function findGaps(cases: ParcelCase[]): ParcelCase[] {
  return cases.filter((c) => isGap(c.zone, c.declaration));
}

function log(entries: LogEntry[], fn: string, summary: string, date: string, i: number) {
  entries.push({
    id: `log-${i}`,
    at: `${date}T07:${String(10 + i).padStart(2, "0")}:00+03:00`,
    fn,
    summary,
  });
}

export function runDesk(scenario: Scenario): DeskResult {
  const entries: LogEntry[] = [];
  const date = scenario.meta.deskDate;
  let n = 0;

  const { byParcel } = ingest(scenario);
  const matchedDecls = [...byParcel.values()].filter((v) => v.declaration).length;
  const matchedComplaints = [...byParcel.values()].filter((v) => v.complaint).length;
  log(
    entries,
    "ingestExport",
    `Προσομοιωμένη εξαγωγή δήμου: ${scenario.parcels.length} γεωτεμάχια, ${matchedDecls} δηλώσεις, ${matchedComplaints} καταγγελίες. Αντιστοίχιση με demo id (όχι ΚΑΕΚ). Το μητρώο akatharista.gov.gr δεν είναι ανοικτό.`,
    date,
    n++,
  );

  const cases = buildCases(scenario);
  const gaps = findGaps(cases);
  log(
    entries,
    "findGaps",
    `${gaps.length} οικόπεδα εντός υποχρέωσης χωρίς δήλωση. Εκτός πεδίου (δάσος / καλλιέργεια / κήπος / απρόσιτο) δεν μπαίνουν στα κενά.`,
    date,
    n++,
  );

  const tooSmall = cases.filter((c) => c.verdict.kind === "inconclusive" && c.verdict.reason === "too_small").length;
  const measured = cases.filter((c) => c.verdict.kind !== "inconclusive").length;
  log(
    entries,
    "judgeImagery",
    `Sentinel-2 10 m: ${tooSmall} οικόπεδα χωρίς εσωτερικό μετά από εσοχή 10 m (ατελέσφορα). Μετρημένο NDVI μόνο όπου υπάρχει αποθηκευμένο ζεύγος σκηνών (${measured}). Δεν βάφεται δείκτης στον χάρτη.`,
    date,
    n++,
  );

  const follow = cases.filter(
    (c) => c.zone.inDuty && (c.status === "gap" || c.status === "flagged_declaration" || c.complaint),
  );
  log(
    entries,
    "queueFollowUps",
    `${follow.length} μηνύματα προς υπόχρεους: ζητείται φωτογραφία με ημερομηνία ή απόδειξη εργολάβου. Επισυνάπτεται μόνο η εικόνα που υπάρχει.`,
    date,
    n++,
  );

  const route = buildDayRoute(cases, date, scenario.declarations.length);
  log(
    entries,
    "buildDayRoute",
    `Διαδρομή ${route.stops.length} στάσεων. Νόμιμο δείγμα 5% των ${route.declarationCount} δηλώσεων = ${route.statutorySampleSize}. Στη διαδρομή: ${route.stopsInSample} από δηλώσεις, ${route.stopsUndeclared} αδήλωτα. Κριτήρια άρθρου 6.2.`,
    date,
    n++,
  );

  log(
    entries,
    "draftForSignature",
    "Φύλλο ελέγχου (Παράρτημα Α) και πράξη προστίμου (Παράρτημα Δ) για τις στάσεις — κατάσταση «προς υπογραφή — δεν έχει κοινοποιηθεί». Δεν εκδίδεται πρόστιμο.",
    date,
    n++,
  );

  return { cases, gaps, route, log: entries };
}

export function openingMessage(c: ParcelCase, locale: "el" | "en"): ThreadMessage {
  const body =
    locale === "el"
      ? openingEl(c)
      : openingEn(c);
  return {
    id: `out-${c.parcel.id}`,
    at: "2026-06-23T08:00:00+03:00",
    from: "desk",
    body,
  };
}

function openingEl(c: ParcelCase): string {
  const img =
    c.verdict.kind === "inconclusive" && c.verdict.reason === "too_small"
      ? "Το Sentinel-2 (10 m) δεν βλέπει οικόπεδο αυτού του μεγέθους — δεν κρίνουμε «καθαρό» ούτε «ακαθάριστο» από δορυφόρο."
      : c.verdict.kind === "uncleared"
        ? `Μετρήθηκε NDVI ${c.verdict.ndviSpring.toFixed(2)} (29 Απρ) → ${c.verdict.ndviSummer.toFixed(2)} (23 Ιουν) στο εσωτερικό του γεωτεμαχίου. Η θερινή τιμή δείχνει ακόμη ζωντανή κάλυψη.`
        : "Δεν υπάρχει ζεύγος σκηνών Sentinel για αυτό το οικόπεδο.";
  const decl = c.declaration
    ? `Υπάρχει δήλωση ${c.declaration.id} (${c.declaration.submittedAt.slice(0, 10)}) που ισχυρίζεται καθαρισμό.`
    : "Δεν εντοπίστηκε δήλωση στο προσομοιωμένο μητρώο μέχρι τις 22 Ιουνίου 2026.";
  return `Δήμος Δρυότοπου — ακαθάριστα οικόπεδα, ${c.parcel.id} (${c.parcel.frontage}). ${decl} ${img} Παρακαλούμε αποστείλτε φωτογραφία με εμφανή ημερομηνία ή απόδειξη εργολάβου. Αυτό είναι μήνυμα γραφείου, όχι πράξη.`;
}

function openingEn(c: ParcelCase): string {
  const img =
    c.verdict.kind === "inconclusive" && c.verdict.reason === "too_small"
      ? "Sentinel-2 (10 m) cannot see a plot this small — we do not call it clean or dirty from space."
      : c.verdict.kind === "uncleared"
        ? `Measured NDVI ${c.verdict.ndviSpring.toFixed(2)} (29 Apr) → ${c.verdict.ndviSummer.toFixed(2)} (23 Jun) inside the parcel. The June value still reads as live cover.`
        : "No Sentinel scene pair for this parcel.";
  const decl = c.declaration
    ? `Declaration ${c.declaration.id} (${c.declaration.submittedAt.slice(0, 10)}) claims the plot was cleared.`
    : "No declaration in the simulated registry by 22 June 2026.";
  return `Municipality of Dryotopos — uncleared plots, ${c.parcel.id} (${c.parcel.frontage}). ${decl} ${img} Please send a dated photo or a contractor receipt. This is a desk message, not an act.`;
}

export function followUpTargets(cases: ParcelCase[]): ParcelCase[] {
  return cases.filter(
    (c) => c.zone.inDuty && (c.status === "gap" || c.status === "flagged_declaration" || Boolean(c.complaint)),
  );
}
