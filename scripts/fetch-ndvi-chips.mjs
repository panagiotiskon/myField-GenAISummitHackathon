#!/usr/bin/env node
// NDVI pictures for the plot page: the same two Sentinel-2 scenes, drawn as vegetation
// (green) against bare or dry ground (red to yellow), in a tight window around the plot so
// the outline is large enough to compare with its neighbours.
//
//   node scripts/fetch-ndvi-chips.mjs                 # every plot with Sentinel data
//   node scripts/fetch-ndvi-chips.mjs KAEK-05119-001
//
// Colour scale: NDVI 0 (red) to 0.7 (green), the RdYlGn ramp. The screening rule calls a plot
// still vegetated at NDVI >= 0.30, which sits in the yellow-green part of the ramp.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { centroid } from "@turf/turf";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "imagery");
const JSON_PATH = path.join(ROOT, "data", "imagery.json");
const PC = "https://planetarycomputer.microsoft.com/api/data/v1";

// The scenes as they exist in the Planetary Computer catalogue (tile T34SGH).
const SCENES = {
  before: { item: "S2C_MSIL2A_20260429T090551_R050_T34SGH_20260429T130711", date: "2026-04-29" },
  after: { item: "S2A_MSIL2A_20260620T091041_R050_T34SGH_20260620T143109", date: "2026-06-20" },
};
const SIDE_M = 330; // 33 Sentinel-2 pixels across
const SRC_PX = 66; // two samples per 10 m pixel, so nearest-neighbour keeps square pixels
const OUT_PX = 528;
const M_LAT = 111_320;
const RESCALE = [0, 0.7];

function squareBounds(feature) {
  const [lon, lat] = centroid(feature).geometry.coordinates;
  const half = SIDE_M / 2;
  const mLon = M_LAT * Math.cos((lat * Math.PI) / 180);
  return [lon - half / mLon, lat - half / M_LAT, lon + half / mLon, lat + half / M_LAT];
}

function outline(ring, bounds) {
  const [w, s, e, n] = bounds;
  const pts = ring
    .map(([x, y]) => `${(((x - w) / (e - w)) * OUT_PX).toFixed(1)},${(((n - y) / (n - s)) * OUT_PX).toFixed(1)}`)
    .join(" ");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_PX}" height="${OUT_PX}">` +
      `<polygon points="${pts}" fill="none" stroke="#000" stroke-width="6" stroke-linejoin="round"/>` +
      `<polygon points="${pts}" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>` +
      `</svg>`,
  );
}

async function chip(feature, id, which) {
  const bounds = squareBounds(feature);
  const params = new URLSearchParams({
    collection: "sentinel-2-l2a",
    item: SCENES[which].item,
    // BOA offset of 1000 removed from both bands (processing baseline >= 04.00)
    expression: "(B08-B04)/(B08+B04-2000)",
    asset_as_band: "true",
    rescale: RESCALE.join(","),
    colormap_name: "rdylgn",
    resampling: "nearest",
  });
  const url = `${PC}/item/bbox/${bounds.join(",")}/${SRC_PX}x${SRC_PX}.png?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${which}: HTTP ${res.status} ${await res.text()}`);
  const file = `${id}-ndvi-${which}.png`;
  await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(OUT_PX, OUT_PX, { kernel: "nearest" })
    .composite([{ input: outline(feature.geometry.coordinates[0], bounds) }])
    .png()
    .toFile(path.join(OUT_DIR, file));
  return { src: `/imagery/${file}`, bounds, sideM: SIDE_M, item: SCENES[which].item, date: SCENES[which].date };
}

const only = new Set(process.argv.slice(2));
const scenario = JSON.parse(await readFile(path.join(ROOT, "data", "scenario.json"), "utf8"));
const doc = JSON.parse(await readFile(JSON_PATH, "utf8"));
for (const feature of scenario.parcels.features) {
  const id = feature.properties.id;
  const row = doc.parcels[id];
  if (!row?.sentinel || (only.size && !only.has(id))) continue;
  const [before, after] = await Promise.all([chip(feature, id, "before"), chip(feature, id, "after")]);
  row.sentinel.ndviChips = { before, after, rescale: RESCALE, colormap: "RdYlGn" };
  console.log(id, "ndvi chips ok");
}
await writeFile(JSON_PATH, `${JSON.stringify(doc, null, 2)}\n`);
