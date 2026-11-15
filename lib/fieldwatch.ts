import raw from "@/data/fieldwatch.json";

/** [date, NDVI, NDTI, BSI] for one clear Sentinel-2 date. */
export type FieldPoint = [string, number, number, number];

export type FieldRecord = {
  osmId: number;
  osmLanduse: string;
  cluster: string;
  pixels: number;
  /** What the curve and frames showed when the plot was picked. Never read by the rule. */
  curatedRole: "covered" | "worked";
  series: FieldPoint[];
  /** Frames with this plot's outline drawn in, for the model. */
  keyFrames?: { date: string; src: string; sideM: number }[];
};

export type FieldFrame = { date: string; src: string };

export type FieldCluster = {
  id: string;
  bounds: [number, number, number, number];
  sideM: number;
  ortho: string;
  members: string[];
  frames: FieldFrame[];
};

export type FieldWatchDoc = {
  generatedAt: string;
  seasonStart: string;
  seasonEnd: string;
  source: { name: string; via: string; scenes: number; window: string; outlines: string; index: string };
  clusters: FieldCluster[];
  parcels: Record<string, FieldRecord>;
};

export const fieldWatch = raw as unknown as FieldWatchDoc;

export function fieldRecord(parcelId: string): FieldRecord | undefined {
  return fieldWatch.parcels[parcelId];
}

export function fieldCluster(parcelId: string): FieldCluster | undefined {
  const record = fieldRecord(parcelId);
  return record ? fieldWatch.clusters.find((row) => row.id === record.cluster) : undefined;
}

/** Green cover: the plot had something growing that could be removed. */
export const GREEN = 0.45;
/** Worked ground: ploughed, rotavated or cut to stubble stays at or below this. */
export const WORKED_CEILING = 0.3;
/** Green to worked inside this many days counts as clearing. Real ploughing can take a few passes. */
const CLEARING_WINDOW_DAYS = 45;
/** Still this green on the first day of the fire season: cover was left standing. */
export const COVER_AT_START = GREEN;
const START_WINDOW_DAYS = 10;
const MIN_DATES = 12;

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

/** Drop single-date dips that bounce straight back: haze or cloud edges the mask missed. */
export function cleanSeries(series: FieldPoint[]): FieldPoint[] {
  return series.filter((point, i) => {
    if (i === 0 || i === series.length - 1) return true;
    const prev = series[i - 1][1];
    const next = series[i + 1][1];
    return !(point[1] < Math.min(prev, next) - 0.12 && Math.abs(prev - next) < 0.08);
  });
}

export type ClearingEvent = {
  /** First clear date that shows the worked ground. */
  date: string;
  /** Last clear date before it. */
  prevDate: string;
  /** Highest index in the 45 days before. */
  before: number;
  after: number;
  drop: number;
};

/**
 * The plot goes from green (>= GREEN) to worked ground (<= WORKED_CEILING) within
 * 45 days and stays down for the next clear dates. Returns the first time that
 * happens. Spring grass in Attica does not dry that far that fast on its own
 * before May; later in the year it can, which is why a clearing after the
 * season opens is only ever "uncertain".
 */
export function detectClearing(series: FieldPoint[]): ClearingEvent | null {
  for (let i = 1; i < series.length; i += 1) {
    const [date, ndvi] = series[i];
    const following = series.slice(i, i + 3).map((p) => p[1]);
    if (following.length < 2 || Math.max(...following) > WORKED_CEILING) continue;
    const window = series.slice(0, i).filter((p) => day(date) - day(p[0]) <= CLEARING_WINDOW_DAYS);
    if (!window.length) continue;
    const before = Math.max(...window.map((p) => p[1]));
    if (before < GREEN) continue;
    return {
      date,
      prevDate: series[i - 1][0],
      before: round(before),
      after: round(ndvi),
      drop: round(before - ndvi),
    };
  }
  return null;
}

export type FieldStatus =
  | "worked_before_season"
  | "worked_after_season_start"
  | "covered_at_season_start"
  | "series_inconclusive";

export type FieldReading = {
  status: FieldStatus;
  event: ClearingEvent | null;
  seasonStart: string;
  /** Clear date closest to the season start, and the index on it. */
  startDate: string | null;
  startNdvi: number | null;
  springPeak: number | null;
  dates: number;
  pixels: number;
};

export function readField(record: FieldRecord, seasonStart = fieldWatch.seasonStart): FieldReading {
  const series = cleanSeries(record.series);
  const start = day(seasonStart);
  const near = series
    .filter((p) => Math.abs(day(p[0]) - start) <= START_WINDOW_DAYS)
    .sort((a, b) => Math.abs(day(a[0]) - start) - Math.abs(day(b[0]) - start))[0];
  const spring = series
    .filter((p) => p[0] >= `${seasonStart.slice(0, 4)}-02-01` && p[0] < seasonStart)
    .map((p) => p[1])
    .sort((a, b) => b - a);
  const event = detectClearing(series);
  const base = {
    event,
    seasonStart,
    startDate: near?.[0] ?? null,
    startNdvi: near ? near[1] : null,
    springPeak: spring.length >= 2 ? spring[1] : (spring[0] ?? null),
    dates: series.length,
    pixels: record.pixels,
  };

  if (series.length < MIN_DATES || !near) return { ...base, status: "series_inconclusive" };
  if (event && event.date <= seasonStart) return { ...base, status: "worked_before_season" };
  if (event) return { ...base, status: "worked_after_season_start" };
  if (near[1] >= COVER_AT_START) return { ...base, status: "covered_at_season_start" };
  return { ...base, status: "series_inconclusive" };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
