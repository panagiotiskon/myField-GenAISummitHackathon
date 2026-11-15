import { calculateFines } from "./fines";
import { findGaps, ingestMatches } from "./gaps";
import { imageryVerdicts } from "./imagery";
import { deskAskForEvidence } from "./replies";
import { dayRoute } from "./route";
import type {
  AgentLogEntry,
  DraftBundle,
  ImageryVerdict,
  Localized,
  OwnerThread,
  ParcelFeature,
  QueueBucket,
  Scenario,
} from "./types";
import { isOutOfScope } from "./zones";

function nowIso(deskDate: string, hour: number, minute: number): string {
  return `${deskDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`;
}

export function queueBucket(
  parcel: ParcelFeature,
  args: {
    declared: boolean;
    claimedCleaned: boolean;
    hasComplaint: boolean;
    verdict?: ImageryVerdict;
  },
): QueueBucket {
  if (isOutOfScope(parcel.properties.zone)) return "out_of_scope";
  if (args.hasComplaint) return "complaint";
  if (args.declared) {
    const mismatch =
      args.verdict?.status === "uncleared" ||
      (args.claimedCleaned && args.verdict?.status === "inconclusive");
    if (mismatch) return "declaration_vs_imagery";
  }
  if (!args.declared) return "no_declaration";
  return "declaration_vs_imagery";
}

export function suspectedFalseDeclaration(args: {
  declared: boolean;
  claimedCleaned: boolean;
  verdict?: ImageryVerdict;
  hasComplaint: boolean;
  hasDryPhoto: boolean;
}): boolean {
  if (!args.declared || !args.claimedCleaned) return false;
  if (args.verdict?.status === "uncleared") return true;
  if (args.verdict?.status === "inconclusive" && (args.hasComplaint || args.hasDryPhoto)) {
    return true;
  }
  return false;
}

export function buildDraft(args: {
  parcel: ParcelFeature;
  declared: boolean;
  claimedCleaned: boolean;
  verdict?: ImageryVerdict;
  hasComplaint: boolean;
  hasDryPhoto?: boolean;
}): DraftBundle {
  const cleaned = args.verdict?.status === "cleaned";
  const fines = calculateFines({
    parcelId: args.parcel.properties.id,
    areaM2: args.parcel.properties.areaM2,
    declared: args.declared,
    cleaned,
    suspectedFalseDeclaration: suspectedFalseDeclaration({
      declared: args.declared,
      claimedCleaned: args.claimedCleaned,
      verdict: args.verdict,
      hasComplaint: args.hasComplaint,
      hasDryPhoto: Boolean(args.hasDryPhoto),
    }),
  });
  return {
    parcelId: args.parcel.properties.id,
    status: "for_signature_not_notified",
    fines,
    annexA: {
      kind: "annex_a",
      kaekSubstitute: args.parcel.properties.id,
    },
    annexD: {
      kind: "annex_d",
      kaekSubstitute: args.parcel.properties.id,
    },
  };
}

export type DeskRun = {
  ingest: ReturnType<typeof ingestMatches>;
  gaps: ParcelFeature[];
  verdicts: ImageryVerdict[];
  threads: Record<string, OwnerThread>;
  route: ReturnType<typeof dayRoute>;
  drafts: Record<string, DraftBundle>;
  log: AgentLogEntry[];
};

export function runTodaysDesk(scenario: Scenario): DeskRun {
  const log: AgentLogEntry[] = [];
  const stamp = (fn: string, summary: Localized, detail?: string) => {
    log.push({
      id: `log-${log.length + 1}`,
      at: nowIso(scenario.meta.deskDate, 8, log.length),
      fn,
      summary,
      detail,
    });
  };

  const ingest = ingestMatches(scenario);
  stamp(
    "ingestExport",
    {
      el: `Αντιστοίχιση ${scenario.declarations.length} δηλώσεων και ${scenario.complaints.length} καταγγελιών σε ${scenario.parcels.features.length} γεωτεμάχια.`,
      en: `Matched ${scenario.declarations.length} declarations and ${scenario.complaints.length} complaints to ${scenario.parcels.features.length} parcels.`,
    },
    "Simulated municipal export. Demo ids only.",
  );

  const gaps = findGaps(scenario);
  stamp("findGaps", {
    el: `${gaps.length} εντός πεδίου χωρίς δήλωση. Άπρακτη προθεσμία = συναίνεση αυτεπάγγελτου καθαρισμού (άρθρο 5.6) — το σχέδιο το αναφέρει, δεν τον διατάσσει.`,
    en: `${gaps.length} in-duty parcels with no declaration. A lapsed deadline is treated as consent to ex-officio cleaning (article 5.6) — the draft states it and does not order it.`,
  });

  const verdicts = imageryVerdicts(scenario);
  const inconclusive = verdicts.filter((row) => row.status === "inconclusive").length;
  const measured = verdicts.filter((row) => row.reason === "seasonal_index").length;
  stamp("imageryVerdict", {
    el: `${inconclusive} ατελέσφορα (ζώνη 10 μ. / χωρίς ζεύγος σκηνών). ${measured} με μετρημένο δείκτη NDVI, χωρίς βαφή στον χάρτη.`,
    en: `${inconclusive} inconclusive (10 m interior buffer / no scene pair). ${measured} with a measured NDVI, not painted on the map.`,
  });

  const verdictById = new Map(verdicts.map((row) => [row.parcelId, row]));
  const threads: Record<string, OwnerThread> = {};
  for (const feature of scenario.parcels.features as ParcelFeature[]) {
    const id = feature.properties.id;
    const declared = Boolean(ingest.declarations[id]);
    const claimedCleaned = Boolean(ingest.declarations[id]?.claimedCleaned);
    const hasComplaint = (ingest.complaints[id] ?? []).length > 0;
    const verdict = verdictById.get(id);
    const bucket = queueBucket(feature, {
      declared,
      claimedCleaned,
      hasComplaint,
      verdict,
    });
    if (bucket === "out_of_scope") continue;
    if (bucket === "no_declaration" || bucket === "declaration_vs_imagery" || bucket === "complaint") {
      threads[id] = {
        parcelId: id,
        status: "open",
        messages: [
          {
            id: `${id}-desk-1`,
            from: "desk",
            at: nowIso(scenario.meta.deskDate, 8, 20),
            text: deskAskForEvidence,
          },
        ],
      };
    }
  }
  stamp("ownerFollowUp", {
    el: `Αίτημα τεκμηρίων σε ${Object.keys(threads).length} υπόχρεους. Η απάντηση «καθαρίστηκε την περασμένη εβδομάδα» δεν κλείνει υπόθεση.`,
    en: `Evidence request queued for ${Object.keys(threads).length} owners. 'Cleared last week' does not close a case.`,
  });

  const route = dayRoute(scenario, { limit: 6 });
  stamp("dayRoute", {
    el: `Διαδρομή ${route.stops.length} στάσεων. Δείγμα άρθρου 6.1.β: ${route.sampleSize} από ${route.declarationCount} δηλώσεις. Στάσεις εντός δείγματος: ${route.stopsInSample}.`,
    en: `Day route of ${route.stops.length} stops. Article 6.1.b sample: ${route.sampleSize} of ${route.declarationCount} declarations. Stops inside the sample: ${route.stopsInSample}.`,
  });

  const drafts: Record<string, DraftBundle> = {};
  for (const stop of route.stops) {
    const parcel = (scenario.parcels.features as ParcelFeature[]).find(
      (row) => row.properties.id === stop.parcelId,
    );
    if (!parcel) continue;
    drafts[stop.parcelId] = buildDraft({
      parcel,
      declared: Boolean(ingest.declarations[stop.parcelId]),
      claimedCleaned: Boolean(ingest.declarations[stop.parcelId]?.claimedCleaned),
      verdict: verdictById.get(stop.parcelId),
      hasComplaint: (ingest.complaints[stop.parcelId] ?? []).length > 0,
    });
  }
  stamp("draftForSignature", {
    el: `${Object.keys(drafts).length} σχέδια Παραρτήματος Α και Δ. Κατάσταση: προς υπογραφή — δεν έχει κοινοποιηθεί. Δεν υπάρχει έκδοση, κοινοποίηση ή κατάθεση.`,
    en: `${Object.keys(drafts).length} Annex A and D drafts. Status: for signature — not notified. No issue, notify, or file control.`,
  });

  return { ingest, gaps, verdicts, threads, route, drafts, log };
}

export function parcelById(scenario: Scenario, id: string): ParcelFeature | undefined {
  return (scenario.parcels.features as ParcelFeature[]).find(
    (row) => row.properties.id === id,
  );
}
