---
version: 1
slug: "components-landing-tsx"
primary_target: "components/Landing.tsx"
related_targets: ["components/FilmVideo.tsx","lib/film.ts"]
---

# Landing (`/`): the film

Scope: `components/Landing.tsx`, `components/FilmVideo.tsx`, `lib/film.ts`. Mode: Persuade. Build path: code-led.

Audience and job: a municipal civil-protection officer deciding whether this tool is worth opening, with hackathon judges watching. Action: sign in (a name, no password) and open the dashboard, or open the worked example plot. Proof: the real flight imagery and the real measurements for DEMO-RAF-017. Constraints: Greek first and bilingual; demo banner and "not a compliance finding" always visible; nothing fabricated; WCAG 2.1 AA; app functions untouched.

Memorable moment: the sharp orthophoto dissolving into nine 10 m Sentinel-2 pixels inside the plot's outline.

Unresolved: no saved Claude reading exists yet, so the reading is tagged "Measurements only, no AI" until `data/analysis-cache.json` holds one.

## Direction contract

THESIS: The landing is the product's method shown once at true scale: one unbroken camera descent from orbit to a 1,260 m² plot, ending on its real reading. It refuses the Earth-observation default of a near-black HUD with neon cyan, radar sweeps and glowing edges.

OWN-WORLD: Space black with a trace of pine (#060a08, panels #0f1612), limestone type (#eef1ea). The imagery is the only colour. Annotation is survey linework from the app: the plot outline in the app's selection yellow (#ffe14a) with four boundary pins, a dashed 10 m interior, white swath lines, the app's verdict colours. One family, Commissioner, flared cut at display size. The reading arrives as a light paper sheet from the app's own world.

STORY: The visitor understands that a satellite passes over Greece every few days, believes the tool looks honestly at one declared plot (and says what it cannot tell), and signs in or opens that plot.

FIRST VIEWPORT: Full-bleed picture under the top bar and demo banner. Lower left, in a 520 px column on a scrim: h1 at up to 52 px, the lead, and the sign-in panel with the primary action. Right of it the subject (globe, then Greece, then the plot at about 210 px). Bottom centre: one subtitle line per chapter. Bottom right at the end: the 380 px reading sheet. Along the bottom: source line, five chapter bars, Skip/Replay.

FORM: Orbit-to-plot film with cinema subtitles and a chapter rail; seed: none (pinned) — "premium Earth-observation intelligence product", "Earth from orbit → Satellite scanning Greece → Zoom into a property → AI analysis → Verification results". Signature interaction: the chapter rail (click any chapter mid-flight; Skip; Replay). Motion grammar: one clock; the camera eases in and out per leg; overlays only fade or rise 8–12 px on an ease-out; every jump in time is a short dip to black; reduced motion gets five stills.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
