// The landing film: one clock, from orbit down to one plot.
// The picture is a recorded video (public/film); these pure functions of time drive
// the words, chapters and captions laid over it, in step with that recording.

export const FILM_PLOT = "KAEK-05119-001";
/** The recorded picture. Versioned by folder: the files are cached as immutable. */
export const FILM_DIR = "/film/v2";
export const FILM_SHAPES = ["desktop", "mobile"] as const;

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

// ---------------------------------------------------------------- chapters and beats
export function chapterAt(time: number): ChapterId {
  let current: ChapterId = "orbit";
  for (const chapter of CHAPTERS) if (time >= chapter.at) current = chapter.id;
  return current;
}

/** Midway through the video's crossfade from the Sentinel-2 mosaic to the Cadastre orthophoto. */
const ORTHO_IN = 8700;
const CHIPS_IN = 10600;
const JUNE_IN = 11600;
const CHIPS_OUT = 12900;

export type SourceId = "mosaic" | "ortho" | "scenes";

/** Discrete states the overlays switch on. Only changes a handful of times per run. */
export type Cues = {
  chapter: ChapterId;
  source: SourceId;
  plot: boolean;
  measured: boolean;
  june: boolean;
  ended: boolean;
};

export function cuesAt(time: number): Cues {
  const chips = time >= CHIPS_IN && time < CHIPS_OUT + 250;
  return {
    chapter: chapterAt(time),
    source: chips ? "scenes" : time >= ORTHO_IN ? "ortho" : "mosaic",
    plot: time >= 9800,
    measured: time >= CHIPS_IN,
    june: time >= JUNE_IN,
    ended: time >= FILM_END,
  };
}
