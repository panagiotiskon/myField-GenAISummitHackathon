#!/usr/bin/env node
// Lighter copies of the plot pictures for the screens that show them small:
//   {id}-thumb.webp   320 px, for the dashboard list (from the sharp photo when there is one)
//   {id}-ortho-hd.webp the sharp photo as WebP, for the plot page
// Re-run after fetch-ortho-hd.mjs or fetch-imagery.mjs.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "public");
const JSON_PATH = path.join(ROOT, "data", "imagery.json");
const doc = JSON.parse(await readFile(JSON_PATH, "utf8"));

for (const [id, row] of Object.entries(doc.parcels)) {
  const source = row.orthoHd ?? row.ortho;
  if (!source) continue;
  const input = path.join(PUB, source.src.replace(/^\//, "").replace(/\.webp$/, ".jpg"));
  const thumb = `/imagery/${id}-thumb.webp`;
  await sharp(input).resize(320, 320).webp({ quality: 74 }).toFile(path.join(PUB, thumb));
  row.thumb = { src: thumb, bounds: source.bounds, sideM: source.sideM, outlined: !row.orthoHd };
  if (row.orthoHd) {
    const hd = `/imagery/${id}-ortho-hd.webp`;
    await sharp(input).webp({ quality: 78 }).toFile(path.join(PUB, hd));
    row.orthoHd.src = hd;
  }
  console.log(id, "ok");
}
await writeFile(JSON_PATH, `${JSON.stringify(doc, null, 2)}\n`);
