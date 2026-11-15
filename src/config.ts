/**
 * One clock for the 60-second English pitch.
 * The desk beat stays empty until the screen recording is cut in:
 * set `deskRecording` to a file under public/ and the hold card steps aside.
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const COMPOSITION_ID = "MyFieldPitch";

export const colors = {
  ground: "#edefea",
  paper: "#f9faf7",
  well: "#e2e5df",
  ink: "#16261d",
  ink2: "#2c3d33",
  muted: "#546158",
  accent: "#23408e",
  cleaned: "#2f7a4a",
  uncleaned: "#c23a1e",
  uncertain: "#b07d17",
  outside: "#8e958f",
  line: "rgba(22, 38, 29, 0.14)",
  lowBand: "#d9d0c0",
  greenBand: "#c5d7cb",
} as const;

/** Paths under public/, passed to staticFile(). */
export const assets = {
  wildfire: "fal/wildfire-crisis.jpg",
  orthoWide: "flight/ortho-8000.webp",
  plotOrtho: "imagery/DEMO-RAF-017-ortho.jpg",
  plotApril: "imagery/DEMO-RAF-017-s2-before.jpg",
  plotJune: "imagery/DEMO-RAF-017-s2-after.jpg",
} as const;

/**
 * Null until the English desk capture exists.
 * The file should be 26.0 s, 30 fps, 1920×1080, and live under public/.
 */
export const deskRecording: string | null = null;

export type BeatId = "hook" | "duty" | "reveal" | "rule" | "desk" | "close";

export type Beat = {
  id: BeatId;
  from: number;
  duration: number;
};

export const beats: readonly Beat[] = [
  { id: "hook", from: 0, duration: 150 },
  { id: "duty", from: 150, duration: 240 },
  { id: "reveal", from: 390, duration: 150 },
  { id: "rule", from: 540, duration: 240 },
  { id: "desk", from: 780, duration: 780 },
  { id: "close", from: 1560, duration: 240 },
];

export const DURATION_IN_FRAMES = 1800;

export function beat(id: BeatId): Beat {
  const found = beats.find((row) => row.id === id);
  if (!found) throw new Error(`Missing beat ${id}`);
  return found;
}

/** Numbers the officer UI actually prints or stores. */
export const evidence = {
  plotId: "DEMO-RAF-017",
  aprilIso: "2026-04-29",
  juneIso: "2026-06-20",
  aprilLabel: "29 April 2026",
  juneLabel: "20 June 2026",
  deadlineLabel: "22 June 2026",
  declaredLabel: "7 June 2026",
  ndviBefore: 0.608,
  ndviAfter: 0.43,
  beforeLabel: "0.61",
  afterLabel: "0.43",
  dropLabel: "0.18",
  pixels: 9,
  plots: 24,
  dutyPlots: 20,
  uncertainDuty: 18,
  uncleaned: 2,
  cleaned: 0,
  outsideDuty: 4,
  declarations: 10,
  sampleSize: 1,
  ndviGreen: 0.3,
  ndviLow: 0.2,
  ndviDrop: 0.15,
  scaleMax: 0.8,
} as const;

export const copy = {
  generatedPlate: "Generated plate",
  orthoCredit: "Hellenic Cadastre orthophoto. Capture date not published.",
  hook: "Every summer, fire moves through the dry grass between houses.",
  duty: "Plots under the duty had to be declared cleared by 22 June. Ten came in. The statutory sample is one.",
  revealTitle: "myField",
  revealBody: "Screens each declaration against two Sentinel-2 scenes and the Cadastre orthophoto.",
  revealAside: "It does not decide. A site visit does.",
  ruleEyebrow: "Sentinel-2 L2A · 10 m pixels",
  ruleCountLead: "of 20 plots under the duty",
  ruleCountRest: "have no whole pixel after a 10 m inward buffer.",
  ruleSample: "DEMO-RAF-017 · hand-traced sample · not a KAEK",
  orthoCaption: "Cadastre orthophoto",
  orthoMeta: "capture date unpublished",
  aprilMeta: "NDVI 0.61",
  juneMeta: "NDVI 0.43",
  scaleFoot: "Below 0.20 reads bare. 0.30 and up reads green.",
  formula: "NDVI = (NIR − Red) / (NIR + Red). Band means, BOA offset removed.",
  gateUncleaned: "Potentially uncleaned",
  gateUncleanedBody: "June NDVI at or above 0.30. This plot reads 0.43, from 9 pixels.",
  gateCleaned: "Likely cleaned",
  gateCleanedBody: "June NDVI under 0.20 and a drop of at least 0.15. None in this demo.",
  gateUncertain: "Uncertain",
  gateUncertainBody: "No whole pixel, cloud, a stale scene, or a value in between.",
  outsideNote: "4 plots sit outside the duty and are not assessed.",
  deskKicker: "Live desk",
  deskTitle: "Held for the English screen recording.",
  deskBody: "Twenty-six seconds. The application is not on this card.",
  closeTitle: "myField",
  closeLine: "A screening, not a finding.",
  closeTag: "Plot-cleaning declaration check",
} as const;

export type CaptionPlace = "lower-third" | "scene";

export type Caption = {
  id: string;
  from: number;
  to: number;
  text: string;
  place: CaptionPlace;
};

export const captions: readonly Caption[] = [
  { id: "hook", from: 16, to: 138, text: copy.hook, place: "lower-third" },
  { id: "duty", from: 166, to: 376, text: copy.duty, place: "lower-third" },
  { id: "reveal", from: 406, to: 528, text: copy.revealBody, place: "scene" },
  { id: "rule", from: 556, to: 768, text: copy.ruleCountRest, place: "scene" },
  { id: "close", from: 1590, to: 1788, text: copy.closeLine, place: "scene" },
];

export type DeskShot = {
  id: string;
  title: string;
  detail: string;
};

export const deskShots: readonly DeskShot[] = [
  {
    id: "tally",
    title: "Tally",
    detail: "10 of 20 plots under the duty are declared cleaned. The bar is 2 potentially uncleaned and 18 uncertain.",
  },
  {
    id: "queue",
    title: "Queue",
    detail: "DEMO-RAF-013 is first: uncertain, forest edge, open complaint. DEMO-RAF-017 is second.",
  },
  {
    id: "search",
    title: "Search",
    detail: "Find DEMO-RAF-017. The field is labeled KAEK. The hint says these codes are not.",
  },
  {
    id: "survey",
    title: "Survey",
    detail: "Dashed 10 m inset. Within 100 m of a settlement. Declared cleaned on 7 June 2026.",
  },
  {
    id: "scale",
    title: "Scale",
    detail: "0.61 down to 0.43, still in the green band. Leave Analyze unpressed.",
  },
  {
    id: "flag",
    title: "Flag",
    detail: "Flag for inspection. The note stays readable: the flag remains in this browser.",
  },
];
