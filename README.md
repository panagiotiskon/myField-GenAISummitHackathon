# myField

Satellite screening for wildfire-prevention plot cleaning in Greek municipalities.

Under [ΦΕΚ Β' 2323/2026](https://civilprotection.gov.gr/sites/default/files/2026-04/20260202323.pdf), property owners must declare on gov.gr each spring that they've cleared dry vegetation from their land. Municipalities get millions of declarations, a handful of inspectors, and only weeks before fire season opens on 1 May. Most declarations go unchecked, and overgrown plots stay as fuel next to homes and forest.

myField helps Civil Protection officers (Πολιτική Προστασία) decide which plots to inspect first. It doesn't fine anyone, because imagery alone can't prove a violation. Instead it flags plots that look clearly uncleared («Ακαθάριστο»), shows the evidence, and ranks them for a field visit.

## How it helps prevent fires

Wildfires need fuel, and an uncleared plot full of dry grass and brush is exactly that. One spark from a cigarette, machinery or a power line can set it alight. On a slope or at the edge of a forest, the fire then spreads quickly to the trees and homes around it. Clearing that vegetation before summer removes the fuel, so a fire either doesn't start or stays small enough to put out.

myField makes sure the clearing actually happens where it matters most. Crews reach the most dangerous uncleared plots in the weeks before 1 May, so owners still have time to clean them before fire season.

## How it works

- **Sentinel-2 NDVI, April → June.** Surrounding fields dry out or get mown, so an uncleared plot stays green and stands out.
- **Cadastre orthophotos.** The Ktimanet aerial photo for each parcel, clipped to its boundary, makes overgrown brush easy to spot.
- **Risk-ranked queue.** Plots are ordered by forest–settlement proximity, slope, escape-road width, complaints, and whether the declaration contradicts the imagery.

## Stack

Next.js 15 · React 19 · TypeScript · MapLibre GL 5.7 · Turf.js · Ktimanet WMS · Sentinel-2 L2A via Microsoft Planetary Computer · Vitest. Bilingual (EL/EN), WCAG 2.1 AA.

## Run it

Requires Node 20+.

```bash
npm install && npm test && npm run dev
```

Open http://localhost:3000:

- `/`: landing page with an orbital descent to Attica
- `/dashboard`: inspection queue and parcel search
- `/property/KAEK-05119-001`: an example uncleared plot
