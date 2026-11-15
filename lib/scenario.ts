import raw from "@/data/scenario.json";
import type { ParcelFeature, Scenario } from "./types";

export const scenario = raw as unknown as Scenario;

export const parcels = scenario.parcels.features as ParcelFeature[];

export function getParcel(id: string): ParcelFeature | undefined {
  return parcels.find((row) => row.properties.id === id);
}
