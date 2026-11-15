// The landing film: one clock, one camera, from orbit down to one plot.
// Pure functions of time, so the stage, the overlays, the tests and the tile
// fetch script all read the same flight. Erasable TypeScript only: Node runs
// this file directly from scripts/fetch-flight.mjs.

export const FILM_PLOT = "KAEK-05119-001";
/** Centre of the plot's outline and its longer side in metres. tests/film.test.ts holds these to the scenario. */
export const PLOT_CENTER: [number, number] = [23.97893, 37.97238];
export const PLOT_SIDE_M = 114.8;

export type ChapterId = "orbit" | "scan" | "descent" | "analysis" | "result";
export const CHAPTERS: { id: ChapterId; at: number }[] = [
  { id: "orbit", at: 0 },
  { id: "scan", at: 2600 },
  { id: "descent", at: 5800 },
  { id: "analysis", at: 10400 },
  { id: "result", at: 12800 },
];
export const FILM_END = 14000;

/** Where a reduced-motion visitor lands when stepping to a chapter: its settled frame. */
export const CHAPTER_STILL: Record<ChapterId, number> = {
  orbit: 1200,
  scan: 5400,
  descent: 10400,
  analysis: 12700,
  result: FILM_END,
};

export type Padding = { top: number; right: number; bottom: number; left: number };
/**
 * The frame the camera composes in. `pad` keeps the subject clear of the copy
 * during the flight; `endPad` also clears the reading card on the last frame.
 */
export type View = { width: number; height: number; pad: Padding; endPad?: Padding };
export type Camera = { lng: number; lat: number; zoom: number; bearing: number };

// ---------------------------------------------------------------- easing
// Curves from easings.co; nothing hand-rolled.
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i += 1) {
      const dx = sampleX(u) - x;
      if (Math.abs(dx) < 1e-6) return sampleY(u);
      const slope = slopeX(u);
      if (Math.abs(slope) < 1e-6) break;
      u -= dx / slope;
    }
    let lo = 0;
    let hi = 1;
    u = x;
    for (let i = 0; i < 24; i += 1) {
      const dx = sampleX(u) - x;
      if (Math.abs(dx) < 1e-6) break;
      if (dx > 0) hi = u;
      else lo = u;
      u = (lo + hi) / 2;
    }
    return sampleY(u);
  };
}

export const easeInOutSine = bezier(0.37, 0, 0.63, 1);
export const easeInOutCubic = bezier(0.65, 0, 0.35, 1);
export const easeOutCubic = bezier(0.33, 1, 0.68, 1);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const span = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
/** 0 before `from`, 1 after `to`, eased out between. */
const ramp = (t: number, from: number, to: number) => easeOutCubic(span(t, from, to));

// ---------------------------------------------------------------- camera
const RAD = Math.PI / 180;
const ORBIT_START: [number, number] = [-2, 27];
const GREECE: [number, number] = [23.7, 38.4];
const GREECE_SPAN_DEG = 9.4; // Corfu to Kastellorizo
const START_BEARING = -11;

/**
 * "Scale" is zoom with the latitude term taken out, so the globe keeps its
 * size on screen while the centre climbs from the tropics to Attica.
 */
const scaleToZoom = (scale: number, lat: number) => scale + Math.log2(Math.cos(lat * RAD));

const free = (view: View, pad: Padding) => ({
  w: Math.max(120, view.width - pad.left - pad.right),
  h: Math.max(120, view.height - pad.top - pad.bottom),
});

export function flightScales(view: View) {
  const flight = free(view, view.pad);
  const landing = free(view, view.endPad ?? view.pad);
  const disc = Math.min(0.92 * flight.h, 0.9 * flight.w);
  const greecePx = Math.min(0.8 * flight.w, 1.05 * flight.h);
  const plotPx = Math.min(250, Math.max(110, 0.42 * Math.min(landing.w, landing.h)));
  const endZoom = Math.log2((78271.517 * Math.cos(PLOT_CENTER[1] * RAD)) / (PLOT_SIDE_M / plotPx));
  return {
    orbit: Math.log2((disc * Math.PI) / 512),
    greece: Math.log2((360 * greecePx) / (GREECE_SPAN_DEG * 512)),
    end: endZoom - Math.log2(Math.cos(PLOT_CENTER[1] * RAD)),
    endZoom,
  };
}

const SWING_END = 5600; // settled over Greece
const PUSH_START = 2000; // the orbit holds its distance until here
const DESCENT_START = 5800;
const DESCENT_END = 10400;

/** The frame's padding slides to the end frame's during the descent, with the camera. */
export function paddingAt(time: number, view: View): Padding {
  const end = view.endPad ?? view.pad;
  const p = easeInOutSine(span(time, DESCENT_START, DESCENT_END));
  return {
    top: mix(view.pad.top, end.top, p),
    right: mix(view.pad.right, end.right, p),
    bottom: mix(view.pad.bottom, end.bottom, p),
    left: mix(view.pad.left, end.left, p),
  };
}

export function cameraAt(time: number, view: View): Camera {
  const t = Math.min(FILM_END, Math.max(0, time));
  const scales = flightScales(view);

  if (t <= DESCENT_START) {
    const swing = easeInOutSine(span(t, 0, SWING_END));
    const push = easeInOutCubic(span(t, PUSH_START, SWING_END));
    const lng = mix(ORBIT_START[0], GREECE[0], swing);
    const lat = mix(ORBIT_START[1], GREECE[1], swing);
    return {
      lng,
      lat,
      zoom: scaleToZoom(mix(scales.orbit, scales.greece, push), lat),
      bearing: mix(START_BEARING, 0, swing),
    };
  }

  const leg = span(t, DESCENT_START, DESCENT_END);
  // The centre finds the plot while still high, so the deep zoom is a straight fall.
  const aim = easeOutCubic(span(leg, 0, 0.45));
  const lng = mix(GREECE[0], PLOT_CENTER[0], aim);
  const lat = mix(GREECE[1], PLOT_CENTER[1], aim);
  return {
    lng,
    lat,
    zoom: scaleToZoom(mix(scales.greece, scales.end, easeInOutSine(leg)), lat),
    bearing: 0,
  };
}

// ---------------------------------------------------------------- chapters and beats
export function chapterAt(time: number): ChapterId {
  let current: ChapterId = "orbit";
  for (const chapter of CHAPTERS) if (time >= chapter.at) current = chapter.id;
  return current;
}

/** Zoom at which the Cadastre orthophoto has fully replaced the Sentinel-2 mosaic. */
export const ORTHO_FADE: [number, number] = [12.4, 13.8];
const CHIPS_IN = 10600;
const JUNE_IN = 11600;
const CHIPS_OUT = 12900;

export type SourceId = "mosaic" | "ortho" | "scenes";

export type Beats = {
  /** 0..1 how far the Sentinel-2 swath has advanced, and how visible it is */
  swathHead: number;
  swath: number;
  outline: number;
  pins: [number, number, number, number];
  /** April and June Sentinel-2 chips over the plot, and the measured interior */
  april: number;
  june: number;
  interior: number;
  verdictFill: number;
};

export function beatsAt(time: number): Beats {
  const t = time;
  const chipsOut = 1 - ramp(t, CHIPS_OUT, CHIPS_OUT + 500);
  return {
    swathHead: span(t, 3300, 5200),
    swath: Math.min(ramp(t, 3300, 3600), 1 - ramp(t, 5300, 5900)),
    outline: ramp(t, 9800, 10400),
    pins: [0, 1, 2, 3].map((i) => ramp(t, 9900 + i * 40, 10200 + i * 40)) as Beats["pins"],
    april: ramp(t, CHIPS_IN, CHIPS_IN + 500) * chipsOut,
    june: ramp(t, JUNE_IN, JUNE_IN + 500) * chipsOut,
    interior: ramp(t, CHIPS_IN, CHIPS_IN + 400) * chipsOut,
    verdictFill: ramp(t, 13000, 13500),
  };
}

/** Discrete states the overlays switch on. Only changes a handful of times per run. */
export type Cues = {
  chapter: ChapterId;
  source: SourceId;
  plot: boolean;
  measured: boolean;
  june: boolean;
  ended: boolean;
};

export function cuesAt(time: number, view: View): Cues {
  const camera = cameraAt(time, view);
  const chips = time >= CHIPS_IN && time < CHIPS_OUT + 250;
  return {
    chapter: chapterAt(time),
    source: chips ? "scenes" : camera.zoom >= (ORTHO_FADE[0] + ORTHO_FADE[1]) / 2 ? "ortho" : "mosaic",
    plot: time >= 9800,
    measured: time >= CHIPS_IN,
    june: time >= JUNE_IN,
    ended: time >= FILM_END,
  };
}

// ---------------------------------------------------------------- swath
/**
 * Sentinel-2 images a 290 km strip on a descending pass heading about 193°
 * at this latitude. The strip is placed over Attica; its exact ground track
 * for relative orbit 50 is not reproduced, so the caption calls it a pass, not the pass.
 */
const SWATH_KM = 290;
const SWATH_HEADING = 193;
const SWATH_NORTH = 46.5;
const SWATH_SOUTH = 31.5;

export function swathPolygon(head: number): [number, number][] {
  const southTo = mix(SWATH_NORTH, SWATH_SOUTH, clamp01(head));
  const steps = 16;
  const west: [number, number][] = [];
  const east: [number, number][] = [];
  // longitude of the strip's centre line shifts west as it goes south
  const slope = Math.tan((SWATH_HEADING - 180) * RAD);
  for (let i = 0; i <= steps; i += 1) {
    const lat = mix(SWATH_NORTH, southTo, i / steps);
    const kmPerDegLng = 111.32 * Math.cos(lat * RAD);
    const centre = GREECE[0] + 0.25 - ((lat - GREECE[1]) * 111.32 * -slope) / kmPerDegLng;
    const half = SWATH_KM / 2 / Math.cos((SWATH_HEADING - 180) * RAD) / kmPerDegLng;
    west.push([centre - half, lat]);
    east.push([centre + half, lat]);
  }
  return [...west, ...east.reverse(), west[0]];
}

/** The pushbroom line: the strip's leading edge. */
export function swathEdge(head: number): [number, number][] {
  const ring = swathPolygon(head);
  const n = (ring.length - 1) / 2;
  return [ring[n - 1], ring[n]];
}

// ---------------------------------------------------------------- tiles
export const S2_MAX_TILE_ZOOM = 14;
/** Above this zoom the mosaic is switched off: the widest orthophoto still covers the frame. */
export const MOSAIC_MAX_ZOOM = 15;

const mercX = (lng: number) => (lng + 180) / 360;
const mercY = (lat: number) => (1 - Math.asinh(Math.tan(lat * RAD)) / Math.PI) / 2;

/**
 * Sentinel-2 mosaic tiles (256 px, XYZ) the flight shows in this view, lowest zoom first.
 * Low zooms are taken whole: on the globe the horizon decides what is visible, not the viewport.
 */
export function flightTiles(view: View, stepMs = 40): string[] {
  const keys = new Set<string>();
  for (let z = 0; z <= 3; z += 1) {
    const n = 2 ** z;
    for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) keys.add(`${z}/${x}/${y}`);
  }
  const margin = 1.2;
  for (let t = 0; t <= DESCENT_END; t += stepMs) {
    const camera = cameraAt(t, view);
    const pad = paddingAt(t, view);
    const centreX = pad.left + (view.width - pad.left - pad.right) / 2;
    const centreY = pad.top + (view.height - pad.top - pad.bottom) / 2;
    if (camera.zoom >= MOSAIC_MAX_ZOOM) break; // the orthophoto has taken over
    const ideal = Math.floor(camera.zoom) + 1;
    // on the globe the renderer may also ask for one level coarser toward the limb
    const levels = camera.zoom < 6 ? [ideal - 1, ideal] : [ideal];
    for (const level of levels) {
      const z = Math.min(S2_MAX_TILE_ZOOM, Math.max(0, level));
      if (z <= 3) continue;
      const n = 2 ** z;
      // px across the whole map, taken where this tile level covers the most ground
      const world = 512 * 2 ** Math.floor(camera.zoom);
      // far from the centre the sphere shows more ground per pixel than a flat map would
      const globe = z === 4 ? 1.9 : camera.zoom < 6 ? 1.35 : 1;
      const x0 = mercX(camera.lng) - (centreX * margin * globe) / world;
      const x1 = mercX(camera.lng) + ((view.width - centreX) * margin * globe) / world;
      const y0 = mercY(camera.lat) - (centreY * margin * globe) / world;
      const y1 = mercY(camera.lat) + ((view.height - centreY) * margin * globe) / world;
      const tx0 = Math.max(0, Math.floor(x0 * n));
      const tx1 = Math.min(n - 1, Math.floor(x1 * n));
      const ty0 = Math.max(0, Math.floor(y0 * n));
      const ty1 = Math.min(n - 1, Math.floor(y1 * n));
      for (let y = ty0; y <= ty1; y += 1) for (let x = tx0; x <= tx1; x += 1) keys.add(`${z}/${x}/${y}`);
    }
  }
  return [...keys].sort((a, b) => Number(a.split("/")[0]) - Number(b.split("/")[0]));
}

/** Views the committed tile set is built for. Larger screens fall back to coarser tiles at the edges. */
export const FETCH_VIEWS: View[] = [
  {
    width: 1680,
    height: 900,
    pad: { top: 0, right: 60, bottom: 56, left: 560 },
    endPad: { top: 0, right: 440, bottom: 56, left: 560 },
  },
  {
    width: 430,
    height: 660,
    pad: { top: 120, right: 0, bottom: 130, left: 0 },
    endPad: { top: 120, right: 0, bottom: 300, left: 0 },
  },
];

/**
 * Cadastre stills that carry the last stretch of the descent, widest first.
 * The closest one is sized to the plot so it still fills the final frame.
 */
export const ORTHO_STILL_SIDES = [8000, 3000, 1200];
export const ORTHO_STILLS = ORTHO_STILL_SIDES.map((sideM) => {
  const dLat = sideM / 2 / 111320;
  const dLng = sideM / 2 / (111320 * Math.cos(PLOT_CENTER[1] * RAD));
  return {
    sideM,
    src: `/flight/ortho-${sideM}.webp`,
    bounds: [PLOT_CENTER[0] - dLng, PLOT_CENTER[1] - dLat, PLOT_CENTER[0] + dLng, PLOT_CENTER[1] + dLat] as [
      number,
      number,
      number,
      number,
    ],
  };
});
