import raw from "@/data/imagery.json";
import { fieldRecord, readField, type FieldReading } from "./fieldwatch";
import { inspectionScore } from "./route";
import type { Declaration, Localized, ParcelFeature, Scenario } from "./types";
import { isInDuty } from "./zones";

export type Verdict =
  | "likely_cleaned"
  | "potentially_uncleaned"
  | "uncertain"
  | "not_applicable";

export type Confidence = "low" | "medium" | "high";

export type RuleReason =
  | "outside_duty"
  | "too_small_for_sentinel"
  | "no_sentinel_data"
  | "cloud_over_plot"
  | "image_older_than_declaration"
  | "green_cover_after"
  | "low_cover_after_with_drop"
  | "index_in_between"
  | "worked_before_season"
  | "worked_after_season_start"
  | "covered_at_season_start"
  | "series_inconclusive";

export type Chip = { src: string; bounds: number[]; sideM: number };

export type SentinelScene = {
  item: string;
  date: string;
  ndvi: number;
  pixelCount: number;
  sclMajority: number;
  clear: boolean;
  chip: Chip;
};

export type ParcelImagery = {
  ortho: Chip | null;
  sentinel: { before: SentinelScene; after: SentinelScene; delta: number } | null;
  interiorAfterBufferM2: number;
  errors?: string[];
};

export type ImageryDoc = {
  generatedAt: string;
  sources: {
    ortho: { name: string; url: string; captureDate: string | null; note: string };
    sentinel: {
      name: string;
      via: string;
      before: { item: string; date: string };
      after: { item: string; date: string };
      ndvi: string;
    };
  };
  parcels: Record<string, ParcelImagery>;
};

export const imageryDoc = raw as unknown as ImageryDoc;

export function imageryFor(parcelId: string): ParcelImagery | undefined {
  return imageryDoc.parcels[parcelId];
}

/** What the measurements alone support. The model can lower this, never raise it. */
export type RuleAssessment = {
  parcelId: string;
  verdict: Verdict;
  confidenceCap: Confidence;
  allowed: Verdict[];
  reason: RuleReason;
  imageDate: string | null;
  ndviBefore: number | null;
  ndviAfter: number | null;
  pixelCount: number;
  /** Present when the plot has a year of Sentinel-2 dates rather than one pair. */
  timeline?: FieldReading;
};

export const NDVI_GREEN = 0.3;
export const NDVI_LOW = 0.2;
export const NDVI_DROP = 0.15;
const PIXELS_FOR_MEDIUM = 50;

export function ruleAssessment(
  parcel: ParcelFeature,
  imagery: ParcelImagery | undefined,
  declaration: Declaration | null | undefined,
): RuleAssessment {
  const base = {
    parcelId: parcel.properties.id,
    imageDate: null as string | null,
    ndviBefore: null as number | null,
    ndviAfter: null as number | null,
    pixelCount: 0,
  };
  const uncertain = (reason: RuleReason, extra: Partial<RuleAssessment> = {}): RuleAssessment => ({
    ...base,
    verdict: "uncertain",
    confidenceCap: "low",
    allowed: ["uncertain"],
    reason,
    ...extra,
  });

  if (!isInDuty(parcel.properties.zone)) {
    return {
      ...base,
      verdict: "not_applicable",
      confidenceCap: "low",
      allowed: ["not_applicable"],
      reason: "outside_duty",
    };
  }

  const record = fieldRecord(parcel.properties.id);
  if (record) return timelineAssessment(base, readField(record));

  const s2 = imagery?.sentinel;
  if (!s2) {
    const tooSmall = (imagery?.interiorAfterBufferM2 ?? 0) < 100;
    return uncertain(tooSmall ? "too_small_for_sentinel" : "no_sentinel_data");
  }

  const measured = {
    imageDate: s2.after.date,
    ndviBefore: s2.before.ndvi,
    ndviAfter: s2.after.ndvi,
    pixelCount: s2.after.pixelCount,
  };
  if (!s2.after.clear || !s2.before.clear) return uncertain("cloud_over_plot", measured);

  // A picture taken before the owner declared says nothing about the declared state.
  if (declaration && s2.after.date < declaration.submittedAt.slice(0, 10)) {
    return uncertain("image_older_than_declaration", measured);
  }

  // Satellite alone never earns "high".
  const confidenceCap: Confidence = s2.after.pixelCount >= PIXELS_FOR_MEDIUM ? "medium" : "low";

  if (s2.after.ndvi >= NDVI_GREEN) {
    return {
      ...base,
      ...measured,
      verdict: "potentially_uncleaned",
      confidenceCap,
      allowed: ["potentially_uncleaned", "uncertain"],
      reason: "green_cover_after",
    };
  }
  if (s2.after.ndvi < NDVI_LOW && s2.delta <= -NDVI_DROP) {
    return {
      ...base,
      ...measured,
      verdict: "likely_cleaned",
      confidenceCap,
      allowed: ["likely_cleaned", "uncertain"],
      reason: "low_cover_after_with_drop",
    };
  }
  return {
    ...base,
    ...measured,
    verdict: "uncertain",
    confidenceCap: "low",
    allowed: ["uncertain", "potentially_uncleaned"],
    reason: "index_in_between",
  };
}

/** Year-long record: the question is whether the ground was worked before the fire season opened. */
function timelineAssessment(
  base: Pick<RuleAssessment, "parcelId">,
  reading: FieldReading,
): RuleAssessment {
  const measured = {
    ...base,
    timeline: reading,
    pixelCount: reading.pixels,
    imageDate: reading.event?.date ?? reading.startDate,
    ndviBefore: reading.event?.before ?? reading.springPeak,
    ndviAfter: reading.event?.after ?? reading.startNdvi,
  };
  const confidenceCap: Confidence = reading.pixels >= PIXELS_FOR_MEDIUM ? "medium" : "low";
  switch (reading.status) {
    case "worked_before_season":
      return {
        ...measured,
        verdict: "likely_cleaned",
        confidenceCap,
        allowed: ["likely_cleaned", "uncertain"],
        reason: "worked_before_season",
      };
    case "covered_at_season_start":
      return {
        ...measured,
        verdict: "potentially_uncleaned",
        confidenceCap,
        allowed: ["potentially_uncleaned", "uncertain"],
        reason: "covered_at_season_start",
      };
    case "worked_after_season_start":
      return {
        ...measured,
        verdict: "uncertain",
        confidenceCap: "low",
        allowed: ["uncertain", "potentially_uncleaned"],
        reason: "worked_after_season_start",
      };
    default:
      return {
        ...measured,
        verdict: "uncertain",
        confidenceCap: "low",
        allowed: ["uncertain"],
        reason: "series_inconclusive",
      };
  }
}

const CONFIDENCE_ORDER: Confidence[] = ["low", "medium", "high"];

export function capConfidence(value: Confidence, cap: Confidence): Confidence {
  return CONFIDENCE_ORDER.indexOf(value) > CONFIDENCE_ORDER.indexOf(cap) ? cap : value;
}

/** Keep the model inside what the measurements allow. */
export function clampVerdict(
  proposed: Verdict,
  rule: RuleAssessment,
): { verdict: Verdict; clamped: boolean } {
  if (rule.allowed.includes(proposed)) return { verdict: proposed, clamped: false };
  return { verdict: rule.allowed.includes("uncertain") ? "uncertain" : rule.verdict, clamped: true };
}

export type LandCover = { trees: number; lowVegetation: number; bareGround: number; built: number };

export type AiFinding = {
  summary: Localized;
  observations: Localized[];
  limitations: Localized[];
  landCover: LandCover;
  proposedVerdict: Verdict;
  clamped: boolean;
};

export type AnalysisSource = "ai_live" | "ai_saved" | "rules_only";

export type Analysis = {
  parcelId: string;
  verdict: Verdict;
  confidence: Confidence;
  source: AnalysisSource;
  model: string | null;
  analysedAt: string;
  rule: RuleAssessment;
  ai: AiFinding | null;
  /** Why no live model answer, when there is none. */
  aiNote: "no_key" | "call_failed" | "declined" | null;
};

export function rulesOnlyAnalysis(
  rule: RuleAssessment,
  aiNote: Analysis["aiNote"],
  analysedAt: string,
): Analysis {
  return {
    parcelId: rule.parcelId,
    verdict: rule.verdict,
    confidence: "low",
    source: "rules_only",
    model: null,
    analysedAt,
    rule,
    ai: null,
    aiNote,
  };
}

export type ScreeningRow = {
  parcel: ParcelFeature;
  declaration: Declaration | null;
  hasComplaint: boolean;
  rule: RuleAssessment;
  priority: number;
  reasons: string[];
};

/** One pass over the fixture: screening verdict and inspection priority per parcel. */
export function screen(scenario: Scenario): ScreeningRow[] {
  const declared = new Map(scenario.declarations.map((row) => [row.parcelId, row]));
  const complained = new Set(scenario.complaints.map((row) => row.parcelId));
  return (scenario.parcels.features as ParcelFeature[]).map((parcel) => {
    const id = parcel.properties.id;
    const declaration = declared.get(id) ?? null;
    const hasComplaint = complained.has(id);
    const rule = ruleAssessment(parcel, imageryFor(id), declaration);
    const { score, reasons } = inspectionScore(parcel, {
      hasComplaint,
      hasDeclaration: Boolean(declaration),
    });
    // The case this tool exists for: the owner says cleaned, the image says green.
    const green = rule.verdict === "potentially_uncleaned";
    const contradicts = green && Boolean(declaration?.claimedCleaned);
    const bump = contradicts ? 8 : green ? 3 : 0;
    return {
      parcel,
      declaration,
      hasComplaint,
      rule,
      priority: rule.verdict === "not_applicable" ? 0 : score + bump,
      reasons: contradicts
        ? ["declared_vs_imagery", ...reasons]
        : green
          ? ["imagery_green", ...reasons]
          : reasons,
    };
  });
}

export function priorityList(rows: ScreeningRow[], limit = 6): ScreeningRow[] {
  return rows
    .filter((row) => row.rule.verdict !== "not_applicable")
    .sort(
      (a, b) =>
        b.priority - a.priority || a.parcel.properties.id.localeCompare(b.parcel.properties.id),
    )
    .slice(0, limit);
}

/** Accepts "DEMO-RAF-018", "raf-18", "pik-3", "18". Real KAEK lookup is not wired. */
export function resolveParcelCode(input: string, ids: string[]): string | null {
  const value = input.trim().toUpperCase();
  if (!value) return null;
  if (ids.includes(value)) return value;
  const digits = value.match(/(\d{1,3})$/)?.[1];
  if (!digits || /^\d{4,}$/.test(value)) return null;
  const padded = digits.padStart(3, "0");
  const area = value.match(/(RAF|PIK)/)?.[1];
  return ids.find((id) => id.endsWith(`-${padded}`) && (!area || id.includes(`-${area}-`))) ?? null;
}
