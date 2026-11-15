import { area } from "@turf/area";
import { bbox } from "@turf/bbox";
import { booleanIntersects } from "@turf/boolean-intersects";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { buffer } from "@turf/buffer";
import { centroid } from "@turf/centroid";
import { distance } from "@turf/distance";
import { feature, point } from "@turf/helpers";
import type { Point, Polygon, Position } from "geojson";

export const SENTINEL_PIXEL_M = 10;
export const DUTY_BUFFER_M = 100;

export function polygonFeature(geom: Polygon) {
  return feature(geom);
}

export function geodesicAreaM2(geom: Polygon): number {
  return area(geom);
}

export function polygonBbox(geom: Polygon): [number, number, number, number] {
  const box = bbox(geom);
  return [box[0], box[1], box[2], box[3]];
}

export function centroidOf(geom: Polygon): Position {
  return centroid(geom).geometry.coordinates;
}

export function isPointInPolygon(pt: Point | Position, poly: Polygon): boolean {
  const coord = Array.isArray(pt) ? pt : pt.coordinates;
  return booleanPointInPolygon(coord, feature(poly));
}

export function inwardBufferAreaM2(geom: Polygon, meters: number): number {
  try {
    const inner = buffer(geom, -meters, { units: "meters" });
    if (!inner) return 0;
    const geomOut = inner.geometry;
    if (!geomOut || (geomOut.type !== "Polygon" && geomOut.type !== "MultiPolygon")) {
      return 0;
    }
    return area(inner);
  } catch {
    return 0;
  }
}

export function buffered(geom: Polygon, meters: number) {
  return buffer(geom, meters, { units: "meters" });
}

export function intersects(a: Polygon, b: Polygon): boolean {
  return booleanIntersects(feature(a), feature(b));
}

export function metersBetween(a: Position, b: Position): number {
  return distance(point(a), point(b), { units: "meters" });
}

export function nearestHouseMeters(centroidPt: Position, houses: Point[]): number {
  if (houses.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(
    ...houses.map((h) => metersBetween(centroidPt, h.coordinates)),
  );
}
