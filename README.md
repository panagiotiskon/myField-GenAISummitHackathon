# myField

Hackathon demo. Greek owners declare each year that their plot has been cleaned of dry vegetation
([gov.gr service](https://www.gov.gr/el/services/1001947/delose-katharismou-oikopedou),
[ΥΠ 1157 / ΦΕΚ Β' 2323/24.4.2026](https://civilprotection.gov.gr/sites/default/files/2026-04/20260202323.pdf)).
Nobody checks the declarations. myField lets a municipal civil-protection officer look up a plot,
see it on real imagery, get an evidence-backed reading, and flag it for a site visit.

It screens. It does not decide. Imagery alone never proves a plot is cleaned or uncleaned.

## The one journey

1. The landing page opens with a short film: from orbit, down through Greece, to one plot and its reading. Open the dashboard from there (demo sign-in: a name, no password).
2. Enter a plot code on the dashboard.
3. The plot opens on the Cadastre orthophoto with its outline.
4. **Analyze imagery** combines measured Sentinel-2 vegetation index with what Claude sees inside the outline.
5. Read the assessment: *Likely cleaned*, *Potentially uncleaned* or *Uncertain*, with image date, evidence, confidence and limits.
6. **Flag for inspection.** The dashboard counts it.

Three screens: `/` (landing and demo sign-in), `/dashboard` (municipal dashboard) and `/property/[id]` (verification).

## What is real and what is not

| Real | Simulated |
|---|---|
| Cadastre orthophotos (capture date not published by the service) | Plot outlines: hand-traced, not from the Cadastre |
| Sentinel-2 L2A scenes of 2026-04-29 and 2026-06-20, and the NDVI measured over each outline | Owners, declarations, complaints |
| Claude's reading of those images, when an API key is set | Plot codes `DEMO-RAF-*` (not KAEKs) |
| The landing film's flight imagery: Sentinel-2 cloudless 2016 mosaic (EOX) and three Cadastre orthophoto stills | The film's Sentinel-2 swath: a pass over Attica drawn at the real width and heading, not the exact ground track |

Real KAEK lookup is not wired: the Cadastre INSPIRE WFS returns 404. The search box accepts the demo codes only.

## How the verdict is made

Code decides what the measurements allow. The model can only stay inside that or step down to *Uncertain*.

- Exempt zone → no assessment.
- No whole 10 m pixel fits inside the plot after a 10 m inward buffer → *Uncertain*. This is 18 of the 20 plots under the duty.
- Cloud over the plot, or the image is older than the declaration → *Uncertain*.
- Late-June NDVI ≥ 0.30 → *Potentially uncleaned*.
- Late-June NDVI < 0.20 and a drop of ≥ 0.15 since spring → *Likely cleaned*.
- Confidence is capped at *low* under 50 pixels and never reaches *high*.

Every result is tagged with where it came from: live AI call, saved AI result, or measurements only.

## Run

Node 20.19 or newer (`.nvmrc` pins 22).

```bash
nvm use
npm install
npm test
cp .env.local.example .env.local   # add ANTHROPIC_API_KEY for live AI analysis
npm run build && npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Try `DEMO-RAF-017`: declared cleaned, imagery still green.

Without a key the app works and says the model did not run. Each successful live answer is saved to
`data/analysis-cache.json` and reused if a later call fails.

## Imagery

`npm run imagery` refetches everything into `public/imagery/` and `data/imagery.json`
(Cadastre WMS, and Sentinel-2 through Microsoft Planetary Computer). It is done once and committed,
so the demo makes no imagery calls except live map tiles. If the basemap cannot load, the map falls
back to outlines on a plain ground.

## The landing film

`components/Film.tsx` draws the film on a MapLibre globe from one clock (`lib/film.ts`): camera, chapters and
every overlay are functions of its time. It plays once per browser session and can be skipped, replayed or
stepped by chapter. With reduced motion it shows five stills instead of travelling; without WebGL it shows
the plot on its orthophoto. `/?t=6000` holds a single frame and `/?film=play` forces a replay.

`npm run flight` refetches its imagery into `public/flight/` (about 12 MB) and writes `data/flight-manifest.json`.
It needs Node 22.18 or newer. The Cadastre service stamps its watermark at a random place on every response;
the script asks four times and keeps the response whose stamp is furthest from the plot. The stamp is never removed.

The film's reading for `DEMO-RAF-017` comes from this browser's own analysis, else from
`data/analysis-cache.json`, else from the measurements alone, and is tagged accordingly.

## Layout

- `lib/assess.ts` verdict gates, clamping, priority, code search
- `app/api/analyze/route.ts` Claude vision call with saved-result fallback
- `components/Dashboard.tsx`, `components/PropertyView.tsx` the two screens
- `components/Landing.tsx`, `components/Film.tsx`, `lib/film.ts` the landing and its film
- `scripts/fetch-flight.mjs` film imagery fetch
- `scripts/fetch-imagery.mjs` imagery fetch
- `lib/fines.ts`, `lib/replies.ts`, `lib/gaps.ts`, `lib/desk.ts` logic from the earlier desk prototype; tested, not on screen
