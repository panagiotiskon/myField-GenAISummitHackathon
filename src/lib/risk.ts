import type { ParcelCase, RiskFlags, Scenario } from "./types";
import {
  buffered,
  centroidOf,
  intersects,
  nearestHouseMeters,
} from "./geo";

const HOUSE_M = 40;
const FOREST_EDGE_M = 50;
const SCHOOL_M = 80;

export function riskFlags(
  parcel: Scenario["parcels"][number],
  context: Scenario["context"],
  hasComplaint: boolean,
): RiskFlags {
  const c = centroidOf(parcel.geometry);
  const forestBuf = buffered(context.forest, FOREST_EDGE_M);
  const forestEdge = Boolean(
    forestBuf && intersects(parcel.geometry, forestBuf.geometry as typeof parcel.geometry),
  );
  const nearHouses = nearestHouseMeters(c, context.houses) <= HOUSE_M;
  const school = context.sensitiveSites[0];
  const schoolBuf = school ? buffered(school.geometry, SCHOOL_M) : undefined;
  const sensitiveSite = Boolean(
    schoolBuf && intersects(parcel.geometry, schoolBuf.geometry as typeof parcel.geometry),
  );
  return {
    forestEdge,
    nearHouses,
    sensitiveSite,
    slope: parcel.slope,
    poorEscape: parcel.poorEscape,
    powerline: parcel.powerline,
    openComplaint: hasComplaint,
  };
}

export function riskScore(flags: RiskFlags, extra: { undeclared: boolean; imageryUncleared: boolean; imageryInconclusiveDeclared: boolean }): number {
  let score = 0;
  if (flags.forestEdge) score += 30;
  if (flags.nearHouses) score += 20;
  if (flags.sensitiveSite) score += 25;
  if (flags.slope === "steep") score += 15;
  else if (flags.slope === "moderate") score += 8;
  if (flags.poorEscape) score += 12;
  if (flags.powerline) score += 8;
  if (flags.openComplaint) score += 20;
  if (extra.undeclared) score += 10;
  if (extra.imageryUncleared) score += 15;
  if (extra.imageryInconclusiveDeclared) score += 8;
  return score;
}

export function riskWhy(c: ParcelCase): string[] {
  const why: string[] = [];
  if (c.risk.openComplaint) why.push("καταγγελία");
  if (c.risk.forestEdge) why.push("ζώνη μίξης δάσους–οικισμού");
  if (c.risk.nearHouses) why.push("γειτνίαση με κατοικίες");
  if (c.risk.sensitiveSite) why.push("ευαίσθητη εγκατάσταση (σχολείο)");
  if (c.risk.slope === "steep") why.push("έντονη κλίση");
  else if (c.risk.slope === "moderate") why.push("μέτρια κλίση");
  if (c.risk.poorEscape) why.push("δύσκολη απομάκρυνση / πρόσβαση");
  if (c.risk.powerline) why.push("εναέρια καλώδια");
  if (!c.declaration) why.push("χωρίς δήλωση");
  if (c.verdict.kind === "uncleared") why.push("NDVI ακόμη υψηλό μετά την προθεσμία");
  if (c.verdict.kind === "inconclusive" && c.declaration) why.push("δήλωση χωρίς αξιόπιστη εικόνα");
  return why;
}
