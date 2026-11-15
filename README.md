# myField

myField helps a Greek municipality decide which plots to inspect before fire season. It compares each owner's plot-cleaning declaration with satellite and aerial imagery, and flags the plots where the pictures and the declaration disagree.

Live demo: https://myfield-vert.vercel.app

This is a hackathon demo. The imagery is real; the owners, declarations and complaints are made up.

## The problem

Every spring, owners of plots in and around settlements must clear dry grass, weeds and brush, and declare on gov.gr that they have done so ([ΦΕΚ Β' 2323/24.4.2026](https://civilprotection.gov.gr/sites/default/files/2026-04/20260202323.pdf)). Municipalities do not have the staff to visit every plot, so in practice most declarations are never checked. An uncleared plot next to houses is fuel for a fire.

## What myField does

It does not decide whether an owner broke the rules. It points an officer to the plots most worth a site visit, and shows why.

For each plot it puts three things side by side:

1. **The declaration**: the date the owner said the plot was cleaned.
2. **Two Sentinel-2 satellite scenes**, 29 April and 20 June 2026, at 10 m per pixel. From each it measures NDVI, a standard index of how green the vegetation is. A cleaned plot should go from green in spring to bare or dry by summer, like the fields around it. A plot that is still green in late June probably was not cleaned.
3. **The Hellenic Cadastre aerial photo**, sharper than the satellite, so the officer can see the plot itself. The Cadastre does not publish when it was taken, so it is context, not evidence.

From the measurements, fixed rules give one of three readings:

- **Likely cleaned**: June NDVI below 0.20, and at least 0.15 lower than in April.
- **Potentially uncleaned**: June NDVI of 0.30 or more.
- **Uncertain**: the plot is too small to measure (nothing left after trimming 10 m from the edge, so no whole satellite pixel), there was cloud over it, or the image is older than the declaration.

Uncertain is a common and honest answer. Many town plots are too small for 10 m pixels.

An AI model (Claude, or OpenAI as a fallback) can also look at the images and describe what it sees. It can only agree with the rules or step down to Uncertain. It can never make a reading stronger than the measurements allow. Every result says whether it came from a live AI call, a saved AI answer, or the measurements alone.

## Using it

- `/` opens with a short film from orbit down to one plot and its reading. Sign in with any name (there is no password; this is a demo).
- `/dashboard` shows the plots on a map and lists the ones most worth inspecting. Search by plot code.
- `/property/KAEK-05119-001` shows one plot: the reading, the aerial photo, the two NDVI images, and a button to flag it for inspection. Flags are kept in your browser only.

## Real and simulated

| Real | Simulated |
| --- | --- |
| Sentinel-2 scenes and the NDVI measured over each plot | Owners, declarations and complaints |
| Cadastre aerial photos | Plot outlines (traced by hand or taken from OpenStreetMap) |
| The AI's reading, when an API key is set | Plot codes: they look like KAEK codes but are not real ones |

## Running it locally

Needs Node 20 or later.

```bash
npm install
npm test
npm run dev
```

Then open http://localhost:3000.

To let the AI look at the images, copy `.env.local.example` to `.env.local` and add an Anthropic or OpenAI key. Without a key everything still works: the Analyze button shows the saved AI answer or the measurements alone, and says so.

## Refreshing the imagery

The imagery is fetched once and committed, so the demo needs no network at show time apart from map tiles and the optional AI call.

| Script | What it does |
| --- | --- |
| `npm run imagery` | Aerial photos and Sentinel-2 pictures for every plot |
| `node scripts/remeasure-sentinel.mjs` | Re-measures the NDVI numbers from the two scenes |
| `node scripts/fetch-ndvi-chips.mjs` | The coloured NDVI pictures on the plot page |
| `node scripts/fetch-ortho-hd.mjs` | Sharper aerial photos, without the Cadastre watermark over the plot |
| `node scripts/optimize-images.mjs` | Small copies for the dashboard list |
| `npm run flight` | Tiles for the landing film |

## Limits

- The Cadastre's plot-boundary service was not available (it returns 404), so outlines are approximate and search accepts the demo codes only.
- A 10 m satellite pixel cannot see a small town plot. These plots read Uncertain, and the aerial photo is the only picture.
- NDVI shows how green a plot is, not what is growing there. Healthy trees may stay under the rules, so a green reading needs a person to look.

## Built with

Next.js 15 and React 19, MapLibre GL, Turf. Sentinel-2 L2A via Microsoft Planetary Computer; aerial photos from the Hellenic Cadastre WMS; landing film mosaic: Sentinel-2 cloudless 2016 by EOX (CC BY 4.0). Greek and English throughout.
