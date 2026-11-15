import type { Declaration, ParcelFeature, Scenario } from "./types";
import { isInDuty } from "./zones";

export function declarationByParcel(
  declarations: Declaration[],
): Map<string, Declaration> {
  return new Map(declarations.map((row) => [row.parcelId, row]));
}

export function findGaps(scenario: Scenario): ParcelFeature[] {
  const declared = declarationByParcel(scenario.declarations);
  return (scenario.parcels.features as ParcelFeature[]).filter((feature) => {
    const zone = feature.properties.zone;
    if (!isInDuty(zone)) return false;
    return !declared.has(feature.properties.id);
  });
}

export function ingestMatches(scenario: Scenario): {
  declarations: Record<string, Declaration | null>;
  complaints: Record<string, Scenario["complaints"][number][]>;
  unmatchedDeclarations: Declaration[];
  unmatchedComplaints: Scenario["complaints"][number][];
} {
  const ids = new Set(
    (scenario.parcels.features as ParcelFeature[]).map((f) => f.properties.id),
  );
  const declarations: Record<string, Declaration | null> = {};
  const unmatchedDeclarations: Declaration[] = [];
  for (const feature of scenario.parcels.features as ParcelFeature[]) {
    declarations[feature.properties.id] = null;
  }
  for (const row of scenario.declarations) {
    if (!ids.has(row.parcelId)) {
      unmatchedDeclarations.push(row);
      continue;
    }
    declarations[row.parcelId] = row;
  }
  const complaints: Record<string, Scenario["complaints"][number][]> = {};
  const unmatchedComplaints: Scenario["complaints"][number][] = [];
  for (const row of scenario.complaints) {
    if (!ids.has(row.parcelId)) {
      unmatchedComplaints.push(row);
      continue;
    }
    complaints[row.parcelId] = [...(complaints[row.parcelId] ?? []), row];
  }
  return { declarations, complaints, unmatchedDeclarations, unmatchedComplaints };
}
