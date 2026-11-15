#!/usr/bin/env node
// Fetch the imagery the landing film flies through, once, and save it in the
// repo, so the film makes no imagery calls at show time.
//
//   node scripts/fetch-flight.mjs          # tiles and stills
//   node scripts/fetch-flight.mjs stills   # only the Cadastre stills
//   node scripts/fetch-flight.mjs tiles    # only the mosaic tiles
//
// Sources
// - Sentinel-2 cloudless 2016 by EOX (CC BY 4.0): the mosaic from orbit down to ~10 m
// - Hellenic Cadastre orthophoto WMS: three stills around the plot for the last stretch
//
// The camera path lives in lib/film.ts; this script asks it which tiles it shows.
// Needs Node 22.18 or newer (it imports that TypeScript file directly).

import { mkdir, readFile, readdir, rm, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { FETCH_VIEWS, ORTHO_STILLS, flightTiles } from "../lib/film.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "flight");
const MANIFEST = path.join(ROOT, "data", "flight-manifest.json");

const S2 = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg";
const WMS = "https://gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx";
// the two wider stills are on screen for a fraction of a second each
// widest to closest, matching ORTHO_STILL_SIDES in lib/film.ts
const STILL_PX = { 8000: 1536, 3000: 1536, 1200: 2560 };
const STILL_QUALITY = { 8000: 76, 3000: 78, 1200: 84 };

async function fetchRetry(url, tries = 5) {
  let last = "";
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "flight-imagery-fetch" },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      last = `HTTP ${res.status}`;
      if (res.status === 404) break;
    } catch (error) {
      last = String(error?.message ?? error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1200 * (i + 1)));
  }
  throw new Error(`${last}: ${String(url).slice(0, 140)}`);
}

async function exists(file) {
  try {
    return (await stat(file)).size > 0;
  } catch {
    return false;
  }
}

async function pool(items, size, work) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        await work(items[index], index);
      }
    }),
  );
}

async function fetchTiles() {
  const keys = new Set();
  for (const view of FETCH_VIEWS) for (const key of flightTiles(view)) keys.add(key);
  const list = [...keys];
  let bytes = 0;
  let fetched = 0;
  let missing = 0;
  await pool(list, 10, async (key) => {
    const [z, x, y] = key.split("/");
    const file = path.join(OUT, "s2", z, x, `${y}.jpg`);
    if (!(await exists(file))) {
      try {
        const body = await fetchRetry(S2.replace("{z}", z).replace("{x}", x).replace("{y}", y));
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, body);
        fetched += 1;
      } catch (error) {
        missing += 1;
        console.warn(`  tile ${key}: ${error.message}`);
        return;
      }
    }
    const { size } = await stat(file);
    bytes += size;
  });
  // drop tiles an earlier flight path needed and this one does not
  let pruned = 0;
  for (const entry of await readdir(path.join(OUT, "s2"), { recursive: true })) {
    if (!entry.endsWith(".jpg")) continue;
    if (keys.has(entry.replace(/\\/g, "/").replace(/\.jpg$/, ""))) continue;
    await rm(path.join(OUT, "s2", entry));
    pruned += 1;
  }
  if (pruned) console.log(`tiles: ${pruned} no longer needed, removed`);
  console.log(`tiles: ${list.length} wanted, ${fetched} fetched now, ${missing} missing, ${(bytes / 1e6).toFixed(1)} MB`);
  return { count: list.length - missing, bytes };
}

/** Soft edges, so a sharper still does not end in a hard square over a coarser one. */
async function feather(jpeg, px, quality) {
  const edge = Math.round(px * 0.06);
  const mask = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}"><rect x="${edge}" y="${edge}" width="${px - 2 * edge}" height="${px - 2 * edge}" fill="#fff"/></svg>`,
    ),
  )
    .blur(edge / 2.2)
    .extractChannel(0)
    .raw()
    .toBuffer();
  return sharp(jpeg)
    .removeAlpha()
    .joinChannel(mask, { raw: { width: px, height: px, channels: 1 } })
    .webp({ quality, alphaQuality: 90 })
    .toBuffer();
}

/**
 * The service stamps its watermark at a different place on every request.
 * The film zooms into the centre of each still, so ask a few times and keep
 * the answer whose stamp sits furthest from the centre. The stamp is never
 * removed: the kept image is one untouched response.
 */
async function clearCentre(url, attempts = 4) {
  const SMALL = 256;
  const shots = [];
  for (let i = 0; i < attempts; i += 1) {
    const body = await fetchRetry(url);
    const grey = await sharp(body).resize(SMALL, SMALL).greyscale().raw().toBuffer();
    shots.push({ body, grey });
  }
  const lo = Math.round(SMALL * 0.22);
  const hi = Math.round(SMALL * 0.78);
  let best = shots[0];
  let bestScore = Infinity;
  for (const shot of shots) {
    // where this response differs from the others' median is where its stamp is
    let score = 0;
    for (let y = lo; y < hi; y += 1) {
      for (let x = lo; x < hi; x += 1) {
        const at = y * SMALL + x;
        const others = shots.map((other) => other.grey[at]).sort((a, b) => a - b);
        const median = (others[Math.floor((others.length - 1) / 2)] + others[Math.ceil((others.length - 1) / 2)]) / 2;
        score += Math.abs(shot.grey[at] - median);
      }
    }
    if (score < bestScore) {
      bestScore = score;
      best = shot;
    }
  }
  return best.body;
}

async function fetchStills() {
  const stills = [];
  for (const still of ORTHO_STILLS) {
    const url = new URL(WMS);
    for (const [key, value] of Object.entries({
      SERVICE: "WMS",
      VERSION: "1.1.1",
      REQUEST: "GetMap",
      LAYERS: "BASEMAP",
      STYLES: "",
      FORMAT: "image/jpeg",
      TRANSPARENT: "false",
      SRS: "EPSG:4326",
      BBOX: still.bounds.join(","),
      WIDTH: String(STILL_PX[still.sideM]),
      HEIGHT: String(STILL_PX[still.sideM]),
    })) {
      url.searchParams.set(key, value);
    }
    const file = path.join(OUT, path.basename(still.src));
    try {
      const body = await feather(await clearCentre(url), STILL_PX[still.sideM], STILL_QUALITY[still.sideM]);
      await mkdir(OUT, { recursive: true });
      await writeFile(file, body);
      console.log(`still ${still.sideM} m: ${(body.length / 1e3).toFixed(0)} kB`);
      stills.push({ ...still, bytes: body.length });
    } catch (error) {
      console.warn(`still ${still.sideM} m: ${error.message}`);
      if (await exists(file)) stills.push({ ...still, bytes: (await stat(file)).size });
    }
  }
  return stills;
}

const only = process.argv[2];
let previous = {};
try {
  previous = JSON.parse(await readFile(MANIFEST, "utf8"));
} catch {
  // first run
}
const tiles = only === "stills" ? previous.tiles : await fetchTiles();
const stills = only === "tiles" ? previous.stills : await fetchStills();

await writeFile(
  MANIFEST,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sources: {
        mosaic: {
          name: "Sentinel-2 cloudless 2016",
          attribution:
            "Sentinel-2 cloudless – https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017)",
          license: "CC BY 4.0",
          maxTileZoom: 14,
        },
        ortho: {
          name: "Hellenic Cadastre orthophoto WMS",
          attribution: "Ελληνικό Κτηματολόγιο",
          captureDate: null,
          note: "Capture date is not published by the service. Each request carries the service's watermark.",
        },
      },
      tiles,
      stills,
    },
    null,
    2,
  )}\n`,
);
console.log(`manifest: ${path.relative(ROOT, MANIFEST)}`);
