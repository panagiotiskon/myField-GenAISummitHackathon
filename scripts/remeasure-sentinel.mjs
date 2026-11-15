#!/usr/bin/env node
// Re-measure the Sentinel-2 numbers in data/imagery.json from the two scenes as they exist in the
// Planetary Computer catalogue, over the 10 m inward buffer of each plot. Pictures are left alone.
//
//   node scripts/remeasure-sentinel.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { area, buffer } from "@turf/turf";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = path.join(ROOT, "data", "imagery.json");
const PC = "https://planetarycomputer.microsoft.com/api/data/v1";
const SCENES = {
  before: { item: "S2C_MSIL2A_20260429T090551_R050_T34SGH_20260429T130711", date: "2026-04-29" },
  after: { item: "S2A_MSIL2A_20260620T091041_R050_T34SGH_20260620T143109", date: "2026-06-20" },
};
const BOA_OFFSET = 1000; // processing baseline >= 04.00
const CLEAR_SCL = new Set([4, 5, 7]); // vegetation, bare, unclassified

async function stats(geometry, item) {
  const url = `${PC}/item/statistics?collection=sentinel-2-l2a&item=${item}&assets=B04&assets=B08&assets=SCL`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "Feature", properties: {}, geometry }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${item}: HTTP ${res.status}`);
  const s = (await res.json()).properties.statistics;
  const red = s.B04_b1.mean - BOA_OFFSET;
  const nir = s.B08_b1.mean - BOA_OFFSET;
  return {
    ndvi: Math.round(((nir - red) / (nir + red)) * 1000) / 1000,
    pixelCount: Math.round(s.B04_b1.count),
    sclMajority: s.SCL_b1.majority,
    clear: CLEAR_SCL.has(s.SCL_b1.majority) && s.SCL_b1.min >= 4 && s.SCL_b1.max <= 7,
  };
}

const scenario = JSON.parse(await readFile(path.join(ROOT, "data", "scenario.json"), "utf8"));
const doc = JSON.parse(await readFile(JSON_PATH, "utf8"));
for (const feature of scenario.parcels.features) {
  const id = feature.properties.id;
  const row = doc.parcels[id];
  if (!row?.sentinel) continue;
  const inner = buffer(feature, -10, { units: "meters" });
  if (!inner?.geometry || area(inner) < 100) continue;
  for (const which of ["before", "after"]) {
    const measured = await stats(inner.geometry, SCENES[which].item);
    row.sentinel[which] = { ...row.sentinel[which], ...SCENES[which], ...measured };
  }
  row.sentinel.delta = Math.round((row.sentinel.after.ndvi - row.sentinel.before.ndvi) * 1000) / 1000;
  console.log(id, row.sentinel.before.ndvi, "->", row.sentinel.after.ndvi, `(${row.sentinel.after.pixelCount} px)`);
}
doc.sources.sentinel.before = SCENES.before;
doc.sources.sentinel.after = SCENES.after;
await writeFile(JSON_PATH, `${JSON.stringify(doc, null, 2)}\n`);
