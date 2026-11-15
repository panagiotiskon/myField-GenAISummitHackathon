import type { ImagerySnapshot, ImageryVerdict, ParcelRecord } from "./types";
import { SENTINEL_PIXEL_M, inwardBufferAreaM2 } from "./geo";

/** Remaining interior after a 10 m inward buffer — below this, Sentinel-2 cannot see the plot. */
export const MIN_INTERIOR_M2 = 100;

/** Late-June NDVI still this high is treated as live cover, not a cleared dry plot. */
export const LIVE_COVER_NDVI = 0.45;

export function interiorAreaM2(parcel: ParcelRecord): number {
  return inwardBufferAreaM2(parcel.geometry, SENTINEL_PIXEL_M);
}

export function judgeImagery(
  parcel: ParcelRecord,
  snapshots: Record<string, ImagerySnapshot> | undefined,
): ImageryVerdict {
  const interiorM2 = interiorAreaM2(parcel);
  const parcelM2 = parcel.areaM2;

  if (interiorM2 < MIN_INTERIOR_M2) {
    return {
      kind: "inconclusive",
      reason: "too_small",
      sentinelMeters: SENTINEL_PIXEL_M,
      interiorM2,
      parcelM2,
    };
  }

  const snap = snapshots?.[parcel.id];
  if (!snap) {
    return {
      kind: "inconclusive",
      reason: "no_scene_pair",
      sentinelMeters: SENTINEL_PIXEL_M,
      interiorM2,
      parcelM2,
    };
  }

  const kind = snap.ndviSummer >= LIVE_COVER_NDVI ? "uncleared" : "cleared";
  return {
    kind,
    reason: "ndvi_pair",
    sentinelMeters: SENTINEL_PIXEL_M,
    interiorM2,
    parcelM2,
    ndviSpring: snap.ndviSpring,
    ndviSummer: snap.ndviSummer,
    ndviDelta: snap.ndviDelta,
    spring: snap.spring,
    summer: snap.summer,
  };
}
