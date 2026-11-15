import type { DayRoute, ParcelCase, RouteStop } from "./types";
import { riskWhy } from "./risk";

export const MAX_STOPS = 6;

export function statutorySampleSize(declarationCount: number): number {
  return Math.max(1, Math.ceil(declarationCount * 0.05));
}

export function needsFieldVisit(c: ParcelCase): boolean {
  if (!c.zone.inDuty) return false;
  if (c.status === "out_of_scope" || c.status === "quiet") return false;
  if (!c.declaration) return true;
  if (c.complaint) return true;
  if (c.verdict.kind === "uncleared") return true;
  if (c.verdict.kind === "inconclusive") return true;
  return false;
}

export function buildDayRoute(
  cases: ParcelCase[],
  date: string,
  declarationCount: number,
): DayRoute {
  const candidates = cases
    .filter(needsFieldVisit)
    .slice()
    .sort((a, b) => b.riskScore - a.riskScore || a.parcel.id.localeCompare(b.parcel.id));

  const stops: RouteStop[] = candidates.slice(0, MAX_STOPS).map((c, i) => ({
    parcelId: c.parcel.id,
    rank: i + 1,
    riskScore: c.riskScore,
    inDeclarationSample: Boolean(c.declaration),
    why: riskWhy(c),
  }));

  const sampleSize = statutorySampleSize(declarationCount);
  const stopsInSample = stops.filter((s) => s.inDeclarationSample).length;
  const stopsUndeclared = stops.filter((s) => !s.inDeclarationSample).length;

  return {
    date,
    stops,
    declarationCount,
    statutorySampleSize: sampleSize,
    stopsInSample,
    stopsUndeclared,
  };
}

export function routeOrder(route: DayRoute): string[] {
  return route.stops.map((s) => s.parcelId);
}
