# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** a municipal civil-protection officer in Greece. Every year, plot owners must declare on gov.gr that they have cleared their plot of dry vegetation (ΥΠ 1157 / ΦΕΚ Β' 2323/24.4.2026). Nobody checks those declarations. The officer's job is to decide which plots are worth a site visit before fire season. They look up a plot by code, read what the imagery supports, and flag it for inspection.

**Secondary:** hackathon judges watching a live demo. They see the officer's workflow and need to come away believing it is a real tool. Design serves the officer first. The demo works because the officer workflow holds up, not because of pitch staging.

Plot owners are not users. They file and view declarations on gov.gr; the landing page only points them there.

## Product Purpose

myField sets each cleaning declaration beside real imagery: two Sentinel-2 L2A scenes (2026-04-29 and 2026-06-20) and the Hellenic Cadastre orthophoto. It returns an evidence-backed screening reading of *Likely cleaned*, *Potentially uncleaned* or *Uncertain*, with image date, evidence, confidence and limits. The officer can then flag the plot, and the dashboard counts flagged plots.

Success: an officer sees in minutes which declarations the imagery contradicts and which ones it cannot judge, and sends inspectors to the right plots.

## Positioning

It screens; it does not decide. Code turns measurements into the verdict. Claude's visual reading can only stay within those rule gates or step down to *Uncertain*, and every result says where it came from (live AI call, saved AI result, or measurements only). The product says openly what satellite imagery cannot tell: 18 of the 20 plots under the duty are too small for a whole 10 m pixel after the 10 m inward buffer, so they read *Uncertain*.

## Operating Context

- One journey across three screens: `/` (landing and demo sign-in, a name and no password), `/dashboard` (municipal dashboard), `/property/[id]` (verification on the map, analysis, flag).
- Demo setting: 24 plots in Drafi (Δράφι). Codes are `DEMO-RAF-001` to `024`. The worked example is `DEMO-RAF-017`: declared cleaned, imagery still green.
- Domain terms: KAEK (ΚΑΕΚ, the Cadastre plot code), declaration (δήλωση καθαρισμού), plots under the duty (υπόχρεα οικόπεδα), exempt zone, site visit / inspection (αυτοψία), NDVI.
- Works offline from committed imagery. The only live network calls are map tiles and the optional Claude call. If the basemap fails, the map falls back to outlines on a plain ground.

## Capabilities and Constraints

- Verdict gates (in `lib/assess.ts`): exempt zone → no assessment; no whole pixel inside the buffered plot, cloud over the plot, or an image older than the declaration → *Uncertain*; late-June NDVI ≥ 0.30 → *Potentially uncleaned*; late-June NDVI < 0.20 with a drop of ≥ 0.15 since spring → *Likely cleaned*; confidence capped at *low* under 50 pixels and never *high*.
- Without `ANTHROPIC_API_KEY` the app still works and says the model did not run.
- Real KAEK lookup is not wired (the Cadastre INSPIRE WFS returns 404). Search accepts demo codes only.
- Simulated: plot outlines (hand-traced), owners, declarations, complaints. Real: orthophotos (capture date not published by the service), Sentinel-2 scenes and the NDVI measured over each outline, Claude's reading when a key is set.
- Next.js 15 / React 19, MapLibre GL, Turf. Fines, replies, gaps and desk logic from an earlier prototype are tested but not on screen.

## Brand Commitments

- Name: **myField**.
- **Greek first, bilingual.** Greek is the default language and English is a full equal behind the language switch. Every string ships in both (`lib/i18n.ts`).
- **Honesty about simulated data is not negotiable.** The demo banner, the real/simulated split, the "DEMO-RAF-* codes are not KAEKs" notice, and "the reading is not a compliance finding" stay visible and are never softened.
- Voice: plain, exact, modest. It says what the measurements allow and stops there. Mark: `components/Chrome.tsx` (`Mark`), `public/favicon.svg`.

## Evidence on Hand

- Imagery: `public/imagery/` (orthophotos for the demo plots; Sentinel-2 before/after for DEMO-RAF-017 to 020), `data/imagery.json`.
- Landing film: `public/film/` (one recorded video per layout, built from the Sentinel-2 cloudless 2016 mosaic by EOX, CC BY 4.0, and Cadastre orthophoto stills).
- Scenario: `data/scenario.json`. Saved AI readings: `data/analysis-cache.json`.
- Legal sources: the gov.gr declaration service and ΦΕΚ Β' 2323/24.4.2026 (linked in the README).
- Absent, so never fabricate: real municipalities using it, testimonials, accuracy benchmarks, real owners or KAEKs, deployment or pricing claims.

## Product Principles

1. **Screen, never decide.** Every reading points to a site visit and never stands in for one.
2. **Show the limits as clearly as the result.** *Uncertain* is an honest, frequent outcome. Present it as information, not failure.
3. **Every claim carries its source.** Image date, measurement, and whether the AI ran sit next to the verdict.
4. **Real versus simulated is always visible.** Nothing may read as a statement about a real property.
5. **Built around the officer's workflow.** Code → plot → reading → flag, with no detours.

## Accessibility & Inclusion

WCAG 2.1 AA, as expected of EU public-sector software (EN 301 549). This applies in both Greek and English, including the map and verdict colors: a verdict never relies on color alone.
