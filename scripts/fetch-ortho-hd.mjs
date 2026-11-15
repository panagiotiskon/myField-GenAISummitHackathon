#!/usr/bin/env node
// Sharper Hellenic Cadastre aerial photos for the plot page: a tight window around the plot,
// fetched at 1024 px, with no outline burnt in. The page draws the outline itself as a vector
// from the same bounds, so it stays crisp and sits exactly where the coordinates say.
//
//   node scripts/fetch-ortho-hd.mjs KAEK-05119-001 KAEK-05119-003
//   node scripts/fetch-ortho-hd.mjs                 # every plot

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bbox as turfBbox } from "@turf/turf";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "imagery");
const JSON_PATH = path.join(ROOT, "data", "imagery.json");
const WMS = "https://gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx";
const PX = 1024;
const M_LAT = 111_320;
const PAD = 1.7; // the plot takes a little under two thirds of the frame
const MIN_SIDE_M = 110;

/** A square in metres, centred on the plot's bounding box, as lon/lat bounds. */
function squareBounds(feature) {
  const [w, s, e, n] = turfBbox(feature);
  const cLon = (w + e) / 2;
  const cLat = (s + n) / 2;
  const mLon = M_LAT * Math.cos((cLat * Math.PI) / 180);
  const side = Math.max(MIN_SIDE_M, Math.max((e - w) * mLon, (n - s) * M_LAT) * PAD);
  const half = side / 2;
  return {
    bounds: [cLon - half / mLon, cLat - half / M_LAT, cLon + half / mLon, cLat + half / M_LAT],
    sideM: Math.round(side),
  };
}

async function fetchOrtho(feature, id) {
  const { bounds, sideM } = squareBounds(feature);
  // The service stamps a "Κτηματολόγιο" watermark at a fixed place in each image it returns.
  // Asking for twice the window at twice the pixels pushes the stamp toward the edge; the
  // centre crop is then the requested window, at the same detail, without the stamp over the plot.
  const [w, s, e, n] = bounds;
  const wide = [w - (e - w) / 2, s - (n - s) / 2, e + (e - w) / 2, n + (n - s) / 2];
  const url = new URL(WMS);
  const params = {
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: "BASEMAP",
    STYLES: "",
    FORMAT: "image/jpeg",
    SRS: "EPSG:4326",
    BBOX: wide.join(","),
    WIDTH: String(PX * 2),
    HEIGHT: String(PX * 2),
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let res;
  for (let i = 0; i < 5; i += 1) {
    res = await fetch(url, { signal: AbortSignal.timeout(60_000) }).catch(() => null);
    if (res?.ok && (res.headers.get("content-type") ?? "").startsWith("image/")) break;
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  if (!res?.ok) throw new Error(`${id}: WMS failed`);
  const file = `${id}-ortho-hd.jpg`;
  await sharp(Buffer.from(await res.arrayBuffer()))
    .extract({ left: PX / 2, top: PX / 2, width: PX, height: PX })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(OUT_DIR, file));
  return { src: `/imagery/${file}`, bounds, sideM };
}

const only = new Set(process.argv.slice(2));
const scenario = JSON.parse(await readFile(path.join(ROOT, "data", "scenario.json"), "utf8"));
const doc = JSON.parse(await readFile(JSON_PATH, "utf8"));
for (const feature of scenario.parcels.features) {
  const id = feature.properties.id;
  if (only.size && !only.has(id)) continue;
  if (!doc.parcels[id]) continue;
  doc.parcels[id].orthoHd = await fetchOrtho(feature, id);
  console.log(id, "ortho hd ok", doc.parcels[id].orthoHd.sideM, "m");
}
await writeFile(JSON_PATH, `${JSON.stringify(doc, null, 2)}\n`);
