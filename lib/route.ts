import type {
  Complaint,
  Declaration,
  ParcelFeature,
  RouteStop,
  Scenario,
} from "./types";
import { isInDuty } from "./zones";

const WEIGHTS = {
  forestEdge: 3,
  nearbyHouses: 2,
  sensitiveSite: 3,
  slopeModerate: 1,
  slopeSteep: 2,
  poorEscapeRoad: 2,
  openComplaint: 3,
  noDeclaration: 1,
};

export function statutorySampleSize(declarationCount: number): number {
  if (declarationCount <= 0) return 0;
  return Math.max(1, Math.ceil(declarationCount * 0.05));
}

export function inspectionScore(
  parcel: ParcelFeature,
  args: { hasComplaint: boolean; hasDeclaration: boolean },
): { score: number; reasons: string[] } {
  const p = parcel.properties;
  let score = 0;
  const reasons: string[] = [];
  if (p.forestEdge) {
    score += WEIGHTS.forestEdge;
    reasons.push("forest_edge");
  }
  if (p.nearbyHouses) {
    score += WEIGHTS.nearbyHouses;
    reasons.push("nearby_houses");
  }
  if (p.sensitiveSite) {
    score += WEIGHTS.sensitiveSite;
    reasons.push("sensitive_site");
  }
  if (p.slopeClass === "steep") {
    score += WEIGHTS.slopeSteep;
    reasons.push("slope_steep");
  } else if (p.slopeClass === "moderate") {
    score += WEIGHTS.slopeModerate;
    reasons.push("slope_moderate");
  }
  if (p.poorEscapeRoad) {
    score += WEIGHTS.poorEscapeRoad;
    reasons.push("poor_escape_road");
  }
  if (args.hasComplaint) {
    score += WEIGHTS.openComplaint;
    reasons.push("open_complaint");
  }
  if (!args.hasDeclaration) {
    score += WEIGHTS.noDeclaration;
    reasons.push("no_declaration");
  }
  return { score, reasons };
}

export function dayRoute(
  scenario: Scenario,
  options: { limit?: number } = {},
): {
  stops: RouteStop[];
  sampleSize: number;
  declarationCount: number;
  stopsInSample: number;
} {
  const limit = options.limit ?? 6;
  const declared = new Set(scenario.declarations.map((row) => row.parcelId));
  const complained = new Set(scenario.complaints.map((row) => row.parcelId));
  const ranked = (scenario.parcels.features as ParcelFeature[])
    .filter((feature) => isInDuty(feature.properties.zone))
    .map((feature) => {
      const { score, reasons } = inspectionScore(feature, {
        hasComplaint: complained.has(feature.properties.id),
        hasDeclaration: declared.has(feature.properties.id),
      });
      return { feature, score, reasons };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.feature.properties.id.localeCompare(b.feature.properties.id);
    });

  const sampleSize = statutorySampleSize(scenario.declarations.length);
  const sampleIds = new Set(
    ranked
      .filter((row) => declared.has(row.feature.properties.id))
      .slice(0, sampleSize)
      .map((row) => row.feature.properties.id),
  );

  const stops: RouteStop[] = ranked.slice(0, limit).map((row, index) => ({
    parcelId: row.feature.properties.id,
    rank: index + 1,
    score: row.score,
    inStatutorySample: sampleIds.has(row.feature.properties.id),
    reasons: row.reasons,
  }));

  return {
    stops,
    sampleSize,
    declarationCount: scenario.declarations.length,
    stopsInSample: stops.filter((stop) => stop.inStatutorySample).length,
  };
}

export type { Complaint, Declaration };
