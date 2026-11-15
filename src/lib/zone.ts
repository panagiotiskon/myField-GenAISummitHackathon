import type { ParcelRecord, Scenario, ZoneResult } from "./types";
import {
  DUTY_BUFFER_M,
  buffered,
  centroidOf,
  intersects,
  isPointInPolygon,
} from "./geo";

const ARTICLES: Record<ZoneResult["reason"], string> = {
  in_plan: "άρθρο 3.1.α",
  in_settlement: "άρθρο 3.1.β",
  within_100m: "άρθρο 3.1.γ",
  forest_law: "άρθρο 3.1.γ / δασικός χάρτης",
  cultivated: "άρθρο 3.5.α",
  garden: "άρθρο 3.5.β",
  inaccessible: "άρθρο 3.5.γ",
  outside_duty: "εκτός άρθρου 3.1",
};

export function classifyZone(
  parcel: ParcelRecord,
  context: Scenario["context"],
): ZoneResult {
  if (parcel.exclusion === "forest_law") {
    return outOfScope("forest_law");
  }
  if (parcel.exclusion === "cultivated") {
    return outOfScope("cultivated");
  }
  if (parcel.exclusion === "garden") {
    return outOfScope("garden");
  }
  if (parcel.exclusion === "inaccessible") {
    return outOfScope("inaccessible");
  }

  const c = centroidOf(parcel.geometry);
  if (isPointInPolygon(c, context.inPlan)) {
    return inDuty("in_plan", "in_plan");
  }
  if (isPointInPolygon(c, context.settlement)) {
    return inDuty("in_settlement", "in_settlement");
  }

  const ring = buffered(context.settlement, DUTY_BUFFER_M);
  if (ring && intersects(parcel.geometry, ring.geometry as typeof parcel.geometry)) {
    return inDuty("within_100m", "within_100m");
  }

  return {
    class: "outside_duty",
    reason: "outside_duty",
    article: ARTICLES.outside_duty,
    inDuty: false,
  };
}

function inDuty(
  cls: "in_plan" | "in_settlement" | "within_100m",
  reason: ZoneResult["reason"],
): ZoneResult {
  return { class: cls, reason, article: ARTICLES[reason], inDuty: true };
}

function outOfScope(
  reason: "forest_law" | "cultivated" | "garden" | "inaccessible",
): ZoneResult {
  return {
    class: "out_of_scope",
    reason,
    article: ARTICLES[reason],
    inDuty: false,
  };
}

export function isGap(
  zone: ZoneResult,
  declaration: { parcelId: string } | null,
): boolean {
  return zone.inDuty && declaration === null;
}
