# myField — uncleared-plot desk

Hackathon demo of a municipal desk for the Greek ακαθάριστα οικόπεδα duty
([ΥΠ 1157 / ΦΕΚ Β' 2323/24.4.2026](https://civilprotection.gov.gr/sites/default/files/2026-04/20260202323.pdf),
deadline extended to 22 June 2026 by ΥΠ 1859/2026).

It is a pitchable fixture, not a connection to the ministry registry.

## What it does

`IngestExport → FindGaps → ImageryVerdict → OwnerFollowUp → DayRoute → DraftForSignature`

- Simulated declarations and complaints only.
- Parcel ids are `DEMO-RAF-*`. They are not KAEKs.
- Sentinel-2 at 10 m: if a 10 m inward buffer leaves less than one pixel, the plot is `inconclusive`. Not judged clean or still dirty.
- One peri-urban plot (`DEMO-RAF-018`) carries a measured spring/June NDVI because a scene pair was actually retrieved while building. The index is not painted on the map.
- Drafts (Παράρτημα Α and Δ) are for officer signature. There is no control that issues, notifies, or files.
- Copy is Greek, with an English toggle. Law cites stay in the drafts.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Owner compliance pack (not a certificate):
[http://127.0.0.1:3000/owner/DEMO-RAF-002](http://127.0.0.1:3000/owner/DEMO-RAF-002)

Click through: run the day, open a gap (`DEMO-RAF-001`) and the small-plot “cleaned” declaration (`DEMO-RAF-002`), send both owner replies, open the route, open the draft, type an officer name.

## Geometry

The Hellenic Cadastre INSPIRE WFS was unreachable while building (404 / blocked). The scenario is hand-traced at the settlement edge of Drafi, Municipality of Rafina-Pikermi, so the map still mixes small urban plots with one larger peri-urban plot. Cadastre orthophoto WMS is an optional basemap.

## Tests

`npm test` covers fine brackets, zone membership, the gap list, reply routing, route order, and the 10 m interior-buffer rule.
