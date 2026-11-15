# myField 🛰️🌿

> **Satellite-Powered Wildfire Screening & Plot-Cleaning Verification for Municipalities**  
> *Cross-referencing annual citizen cleaning declarations against real-world Sentinel-2 and Cadastre imagery.*

---

## ⏱️ 60-Second Overview

### 👤 What Product It Is & Who Uses It
**myField** is an intelligent triage and screening platform designed specifically for **Municipal Civil Protection Officers** (*Πολιτική Προστασία*) and fire-prevention teams across Greece.

### ⚠️ The Problem
Under Greek law ([ΦΕΚ Β' 2323/2026](https://civilprotection.gov.gr/sites/default/files/2026-04/20260202323.pdf)), millions of property owners are legally required each spring to declare on `gov.gr` that they have cleared dry vegetation from their land.  
* **The Reality:** Municipalities lack the human crews to physically inspect thousands of plots before fire season opens on May 1st. False or neglected declarations go unchecked, turning overgrown parcels into catastrophic wildfire fuses.

### 💡 The Solution: *Screen, Never Decide*
myField eliminates blind spot guesswork by triaging declarations against multi-temporal satellite data and high-resolution orthophotos.  
* **Not an automated fine bot:** Imagery alone cannot legally penalize an owner. Instead, myField acts as an evidence-backed radar: identifying evident violations (**«Ακαθάριστο»**) and ranking physical inspection routes for municipal teams.

---

## 🔍 How We Solve It

1. **Multispectral Sentinel-2 NDVI Tracking:**  
   Measures seasonal biomass drop from spring (April) to dry summer (June). When surrounding agricultural fields dry out or get mown, uncleared plots remain distinct high-NDVI green anomalies.
2. **Hellenic Cadastre Orthophoto Verification:**  
   Displays crisp aerial survey photography inside the plot boundary, visually contrasting overgrown wild brush with neighboring mowed or built properties.
3. **Risk-Weighted Triage Queue:**  
   Prioritizes field crews based on combined hazard metrics: forest-settlement edges, steep fire-climbing slopes, narrow escape roads, citizen complaints, and conflicting cleaning declarations.

---

## 🛠️ Tech Stack

* **Core Framework:** Next.js 15 (App Router, Turbopack) & React 19 (TypeScript).
* **Geospatial & Mapping:** MapLibre GL 5.7, Turf.js spatial analysis, Hellenic Cadastre (Ktimanet) WMS service.
* **Earth Observation:** ESA Sentinel-2 L2A via Microsoft Planetary Computer, NDVI time-series processing.
* **Design & Accessibility:** High-craft architectural UI adhering to Impeccable principles and WCAG 2.1 AA standards; bilingual (Greek / English).
* **Testing:** Vitest (100% passing test suite across assessment rules, spatial calculations, and navigation).

---

## ⚡ Quickstart

```bash
# 1. Install dependencies (Node 20+)
npm install

# 2. Run unit & integration tests
npm test

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view:
* **`/` (Landing Screen):** Interactive 3D orbital descent down to Attica with automated film playback.
* **`/dashboard`:** Municipal prioritization desk and parcel search.
* **`/property/KAEK-05119-001`:** Distilled evidence inspection showing uncleaned vegetative biomass contrasted with cleared surroundings.
