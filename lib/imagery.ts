import { area, buffer } from "@turf/turf";
import type { Feature, Polygon } from "geojson";
import type { ImageryVerdict, ParcelFeature, Scenario } from "./types";

const PIXEL_M2 = 100; // one 10 m Sentinel-2 pixel

export function interiorAfterBufferM2(geometry: Polygon): number {
  const feature: Feature<Polygon> = { type: "Feature", properties: {}, geometry };
  try {
    const inset = buffer(feature, -10, { units: "meters" });
    if (!inset?.geometry) return 0;
    if (inset.geometry.type !== "Polygon" && inset.geometry.type !== "MultiPolygon") {
      return 0;
    }
    const sqm = area(inset);
    return Number.isFinite(sqm) ? sqm : 0;
  } catch {
    return 0;
  }
}

export function imageryVerdictForParcel(
  parcel: ParcelFeature,
  scenario: Scenario,
): ImageryVerdict {
  const interior = interiorAfterBufferM2(parcel.geometry);
  const areaM2 = parcel.properties.areaM2;
  if (interior < PIXEL_M2) {
    return {
      parcelId: parcel.properties.id,
      status: "inconclusive",
      reason: "interior_buffer_10m",
      areaM2,
      interiorAfterBufferM2: Math.round(interior * 10) / 10,
    };
  }

  const sampled = scenario.meta.imagery;
  if (parcel.properties.id === sampled.sampledParcelId) {
    const stillVegetated = sampled.juneNdvi >= 0.25;
    return {
      parcelId: parcel.properties.id,
      status: stillVegetated ? "uncleared" : "cleaned",
      reason: "seasonal_index",
      areaM2,
      interiorAfterBufferM2: Math.round(interior * 10) / 10,
      springNdvi: sampled.springNdvi,
      juneNdvi: sampled.juneNdvi,
      springScene: sampled.springScene,
      juneScene: sampled.juneScene,
    };
  }

  return {
    parcelId: parcel.properties.id,
    status: "inconclusive",
    reason: "no_scene_pair",
    areaM2,
    interiorAfterBufferM2: Math.round(interior * 10) / 10,
  };
}

export function imageryVerdicts(scenario: Scenario): ImageryVerdict[] {
  return (scenario.parcels.features as ParcelFeature[]).map((feature) =>
    imageryVerdictForParcel(feature, scenario),
  );
}
