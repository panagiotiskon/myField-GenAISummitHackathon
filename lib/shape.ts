import { buffer } from "@turf/turf";
import type { Feature, Polygon, Position } from "geojson";

// Local metres around the ring's first vertex: plenty accurate at plot scale.
const M_PER_DEG_LAT = 110_574;

type Pt = [number, number];

function toMetres(ring: Position[], origin: Position): Pt[] {
  const k = Math.cos((origin[1] * Math.PI) / 180) * 111_320;
  return ring.map(([lon, lat]) => [(lon - origin[0]) * k, (lat - origin[1]) * M_PER_DEG_LAT]);
}

export type Edge = { x: number; y: number; nx: number; ny: number; lengthM: number };

export type PlotShape = {
  outline: string;
  inset: string | null;
  edges: Edge[];
  widthM: number;
  heightM: number;
  scale: number; // px per metre
};

/** Fit a plot polygon into a box, y up turned to y down. Optionally the 10 m inward buffer. */
export function plotShape(geometry: Polygon, box: number, pad = 0, withInset = false): PlotShape {
  const ring = geometry.coordinates[0];
  const origin = ring[0];
  const pts = toMetres(ring, origin);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxY = Math.max(...ys);
  const widthM = Math.max(...xs) - minX;
  const heightM = maxY - Math.min(...ys);
  const scale = (box - pad * 2) / Math.max(widthM, heightM, 1);
  const offX = pad + (box - pad * 2 - widthM * scale) / 2;
  const offY = pad + (box - pad * 2 - heightM * scale) / 2;
  const project = (p: Pt): Pt => [offX + (p[0] - minX) * scale, offY + (maxY - p[1]) * scale];
  const path = (ps: Pt[]) => ps.map((p, i) => `${i ? "L" : "M"}${project(p)[0].toFixed(1)} ${project(p)[1].toFixed(1)}`).join("") + "Z";

  // Signed area tells the winding, so normals point outward either way.
  let signed = 0;
  for (let i = 0; i < pts.length - 1; i++) signed += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
  const outward = signed > 0 ? 1 : -1;

  const edges: Edge[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthM = Math.hypot(dx, dy);
    if (lengthM < 1) continue;
    const [mx, my] = project([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    // outward normal in metre space, then y flipped for the screen
    const nx = (outward * dy) / lengthM;
    const ny = (outward * -dx) / lengthM;
    edges.push({ x: mx, y: my, nx, ny: -ny, lengthM });
  }

  let inset: string | null = null;
  if (withInset) {
    try {
      const feature: Feature<Polygon> = { type: "Feature", properties: {}, geometry };
      const inner = buffer(feature, -10, { units: "meters" });
      if (inner?.geometry?.type === "Polygon" && inner.geometry.coordinates[0]?.length > 3) {
        inset = path(toMetres(inner.geometry.coordinates[0], origin));
      }
    } catch {
      inset = null;
    }
  }

  return { outline: path(pts), inset, edges, widthM, heightM, scale };
}

export type SitePlan = { paths: string[]; boundary: string | null; scale: number };

/** Several polygons on one shared projection, fitted into width x height. */
export function sitePlan(polys: Polygon[], boundary: Polygon | null, width: number, height: number, pad: number): SitePlan {
  const origin = (boundary ?? polys[0]).coordinates[0][0];
  const rings = polys.map((p) => toMetres(p.coordinates[0], origin));
  const outer = boundary ? toMetres(boundary.coordinates[0], origin) : null;
  const all = [...rings.flat(), ...(outer ?? [])];
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  const scale = Math.min((width - pad * 2) / (maxX - minX || 1), (height - pad * 2) / (maxY - minY || 1));
  const offX = (width - (maxX - minX) * scale) / 2;
  const offY = (height - (maxY - minY) * scale) / 2;
  const path = (ps: Pt[]) =>
    ps.map((p, i) => `${i ? "L" : "M"}${(offX + (p[0] - minX) * scale).toFixed(1)} ${(offY + (maxY - p[1]) * scale).toFixed(1)}`).join("") + "Z";
  return { paths: rings.map(path), boundary: outer ? path(outer) : null, scale };
}
