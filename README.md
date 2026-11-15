# myField — uncleared-plot desk

Hackathon demo of a municipal desk for the Greek **ακαθάριστα οικόπεδα** duty
([ΥΠ 1157 / ΦΕΚ Β' 2323/24.4.2026](https://civilprotection.gov.gr/sites/default/files/2026-04/20260202323.pdf),
deadline extended to 22 June 2026 by ΥΠ 1859/2026).

The declaration registry is not open data. This app uses a **simulated municipal
export**, public cadastre-style geometry (hand-traced after the Hellenic Cadastre
WFS returned 404), and demo ids `MYF-*` that are **not KAEKs**.

It does not issue, notify, or file a fine. Drafts stay
«προς υπογραφή — δεν έχει κοινοποιηθεί».

## Loop

1. Ingest declarations and complaints onto parcels
2. List in-duty parcels with no declaration
3. Judge imagery only where a 10 m inward buffer still has interior; Sentinel-2
   cannot see a ~400 m² urban plot
4. Message the owner with the images the desk actually has
5. Route a short inspection day (article 6.2), vs the statutory 5% sample
6. Draft Παράρτημα Α (inspection) and Παράρτημα Δ (fine) for an officer to sign

## Run

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Owner pack:
`/owner/MYF-02`.

## Honesty about imagery

- Cadastre WMS is a **viewing** basemap, not a spring vs June 2026 pair.
- One peri-urban parcel (`MYF-19`) has a measured Sentinel-2 L2A NDVI pair
  (29 Apr 2026 → 23 Jun 2026) sampled from Element84 COGs. No index is painted
  on the map.
- Summer NDVI 0.705 on a declared-cleaned plot is treated as remaining live cover,
  not as legal proof.
