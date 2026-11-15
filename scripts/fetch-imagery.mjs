#!/usr/bin/env node
// Fetch real imagery once and save it in the repo, so the demo needs no
// imagery calls at show time.
//
//   node scripts/fetch-imagery.mjs            # all parcels
//   node scripts/fetch-imagery.mjs DEMO-RAF-018
//
// Sources
// - Hellenic Cadastre orthophoto WMS (high detail, capture date NOT published)
// - Sentinel-2 L2A via Microsoft Planetary Computer (10 m, dated)
//
// Sentinel numbers are only taken where a 10 m inward buffer of the outline
// still leaves at least one whole pixel.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { area, bbox as turfBbox, buffer, centroid } from "@turf/turf";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "imagery");
const OUT_JSON = path.join(ROOT, "data", "imagery.json");

const WMS = "https://gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx";
const PC = "https://planetarycomputer.microsoft.com/api/data/v1";
const COLLECTION = "sentinel-2-l2a";
const SCENES = {
  before: {
    item: "S2C_MSIL2A_20260429T090551_R050_T34SGH_20260429T130711",
    date: "2026-04-29",
  },
  after: {
    item: "S2A_MSIL2A_20260620T091041_R050_T34SGH_20260620T143109",
    date: "2026-06-20",
  },
};
const PIXEL_M2 = 100;
const BOA_OFFSET = 1000; // processing baseline >= 04.00
const CLEAR_SCL = new Set([4, 5, 7]); // vegetation, bare, unclassified
const CHIP_PX = 512;
const M_LAT = 111_320;

async function fetchRetry(url, init, tries = 6) {
  let last = "";
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
      if (res.ok) return res;
      last = `HTTP ${res.status}`;
    } catch (error) {
      last = String(error?.message ?? error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
  }
  throw new Error(`${last} after ${tries} tries: ${String(url).slice(0, 120)}`);
}

/** Square window in metres around the parcel centre, as lon/lat bounds. */
function squareBounds(feature, minSideM, pad) {
  const [minLon, minLat, maxLon, maxLat] = turfBbox(feature);
  const [lon, lat] = centroid(feature).geometry.coordinates;
  const mLon = M_LAT * Math.cos((lat * Math.PI) / 180);
  const widthM = (maxLon - minLon) * mLon;
  const heightM = (maxLat - minLat) * M_LAT;
  const half = Math.max(minSideM, Math.max(widthM, heightM) * pad) / 2;
  const cLon = (minLon + maxLon) / 2;
  const cLat = (minLat + maxLat) / 2;
  return {
    bounds: [cLon - half / mLon, cLat - half / M_LAT, cLon + half / mLon, cLat + half / M_LAT],
    sideM: Math.round(half * 2),
    centre: [lon, lat],
  };
}

function outlineSvg(ring, bounds, colour) {
  const [minLon, minLat, maxLon, maxLat] = bounds;
  const points = ring
    .map(([lon, lat]) => {
      const x = ((lon - minLon) / (maxLon - minLon)) * CHIP_PX;
      const y = ((maxLat - lat) / (maxLat - minLat)) * CHIP_PX;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CHIP_PX}" height="${CHIP_PX}">` +
      `<polygon points="${points}" fill="none" stroke="#000" stroke-width="5" stroke-linejoin="round"/>` +
      `<polygon points="${points}" fill="none" stroke="${colour}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `</svg>`,
  );
}

async function saveChip(buffer, ring, bounds, file, { nearest = false } = {}) {
  const base = sharp(buffer).resize(CHIP_PX, CHIP_PX, {
    fit: "fill",
    kernel: nearest ? "nearest" : "lanczos3",
  });
  await base
    .composite([{ input: outlineSvg(ring, bounds, "#ffe14a") }])
    .jpeg({ quality: 86 })
    .toFile(path.join(OUT_DIR, file));
  return `/imagery/${file}`;
}

async function orthoChip(feature, id) {
  const { bounds, sideM } = squareBounds(feature, 70, 2.2);
  const url = new URL(WMS);
  const params = {
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: "BASEMAP",
    STYLES: "",
    FORMAT: "image/jpeg",
    SRS: "EPSG:4326",
    BBOX: bounds.join(","),
    WIDTH: String(CHIP_PX),
    HEIGHT: String(CHIP_PX),
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetchRetry(url);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error(`WMS returned ${type}`);
  const src = await saveChip(
    Buffer.from(await res.arrayBuffer()),
    feature.geometry.coordinates[0],
    bounds,
    `${id}-ortho.jpg`,
  );
  return { src, bounds, sideM };
}

async function sentinelStats(interior, item) {
  const url = `${PC}/item/statistics?collection=${COLLECTION}&item=${item}&assets=B04&assets=B08&assets=SCL`;
  const res = await fetchRetry(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "Feature", properties: {}, geometry: interior.geometry }),
  });
  const stats = (await res.json()).properties.statistics;
  const red = stats.B04_b1.mean - BOA_OFFSET;
  const nir = stats.B08_b1.mean - BOA_OFFSET;
  const scl = stats.SCL_b1;
  return {
    ndvi: Math.round(((nir - red) / (nir + red)) * 1000) / 1000,
    pixelCount: Math.round(stats.B04_b1.count),
    sclMajority: scl.majority,
    clear: CLEAR_SCL.has(scl.majority) && scl.min >= 4 && scl.max <= 7,
  };
}

async function sentinelChip(feature, id, which) {
  const { bounds, sideM } = squareBounds(feature, 240, 2.2);
  const scene = SCENES[which];
  const url = `${PC}/item/bbox/${bounds.join(",")}/256x256.png?collection=${COLLECTION}&item=${scene.item}&assets=visual`;
  const res = await fetchRetry(url);
  const src = await saveChip(
    Buffer.from(await res.arrayBuffer()),
    feature.geometry.coordinates[0],
    bounds,
    `${id}-s2-${which}.jpg`,
    { nearest: true },
  );
  return { src, bounds, sideM };
}

async function processParcel(feature) {
  const id = feature.properties.id;
  const out = { ortho: null, sentinel: null, errors: [] };

  try {
    out.ortho = await orthoChip(feature, id);
  } catch (error) {
    out.errors.push(`ortho: ${error.message}`);
  }

  let interiorM2 = 0;
  let interior = null;
  try {
    interior = buffer(feature, -10, { units: "meters" });
    interiorM2 = interior?.geometry ? area(interior) : 0;
  } catch {
    interiorM2 = 0;
  }
  out.interiorAfterBufferM2 = Math.round(interiorM2 * 10) / 10;

  if (interior && interiorM2 >= PIXEL_M2) {
    try {
      const [before, after, chipBefore, chipAfter] = await Promise.all([
        sentinelStats(interior, SCENES.before.item),
        sentinelStats(interior, SCENES.after.item),
        sentinelChip(feature, id, "before"),
        sentinelChip(feature, id, "after"),
      ]);
      out.sentinel = {
        before: { ...SCENES.before, ...before, chip: chipBefore },
        after: { ...SCENES.after, ...after, chip: chipAfter },
        delta: Math.round((after.ndvi - before.ndvi) * 1000) / 1000,
      };
    } catch (error) {
      out.errors.push(`sentinel: ${error.message}`);
    }
  }
  if (out.errors.length === 0) delete out.errors;
  return [id, out];
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const scenario = JSON.parse(await readFile(path.join(ROOT, "data", "scenario.json"), "utf8"));
  await mkdir(OUT_DIR, { recursive: true });

  let previous = { parcels: {} };
  try {
    previous = JSON.parse(await readFile(OUT_JSON, "utf8"));
  } catch {
    // first run
  }

  const features = scenario.parcels.features.filter(
    (feature) => only.size === 0 || only.has(feature.properties.id),
  );
  const parcels = { ...previous.parcels };
  for (let i = 0; i < features.length; i += 4) {
    const rows = await Promise.all(features.slice(i, i + 4).map(processParcel));
    for (const [id, row] of rows) {
      parcels[id] = row;
      const s = row.sentinel;
      console.log(
        id,
        row.ortho ? "ortho ok" : "ortho FAIL",
        s ? `ndvi ${s.before.ndvi} -> ${s.after.ndvi} (${s.after.pixelCount} px)` : "no sentinel",
        row.errors?.join("; ") ?? "",
      );
    }
  }

  const doc = {
    generatedAt: new Date().toISOString(),
    sources: {
      ortho: {
        name: "Hellenic Cadastre orthophoto WMS (BASEMAP)",
        url: WMS,
        captureDate: null,
        note: "The service does not publish a capture date. Context only.",
      },
      sentinel: {
        name: "Copernicus Sentinel-2 L2A, 10 m",
        via: "Microsoft Planetary Computer",
        before: SCENES.before,
        after: SCENES.after,
        ndvi: "ratio of band means (B08, B04) over the 10 m inward-buffered outline, BOA offset removed",
      },
    },
    parcels,
  };
  await writeFile(OUT_JSON, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`wrote ${path.relative(ROOT, OUT_JSON)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
