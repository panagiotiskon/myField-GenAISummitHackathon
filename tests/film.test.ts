import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHAPTERS,
  CHAPTER_STILL,
  FETCH_VIEWS,
  FILM_END,
  FILM_PLOT,
  ORTHO_STILLS,
  PLOT_CENTER,
  PLOT_SIDE_M,
  beatsAt,
  cameraAt,
  chapterAt,
  cuesAt,
  flightTiles,
  swathPolygon,
} from "@/lib/film";
import { getParcel } from "@/lib/scenario";

const desktop = FETCH_VIEWS[0];

describe("film flight", () => {
  it("aims at the worked example's real outline", () => {
    const ring = getParcel(FILM_PLOT)!.geometry.coordinates[0];
    const lngs = ring.map((pair) => pair[0]);
    const lats = ring.map((pair) => pair[1]);
    const centre = [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
    expect(centre[0]).toBeCloseTo(PLOT_CENTER[0], 5);
    expect(centre[1]).toBeCloseTo(PLOT_CENTER[1], 5);
    const widthM = (Math.max(...lngs) - Math.min(...lngs)) * 111320 * Math.cos((PLOT_CENTER[1] * Math.PI) / 180);
    const heightM = (Math.max(...lats) - Math.min(...lats)) * 111320;
    expect(Math.max(widthM, heightM)).toBeCloseTo(PLOT_SIDE_M, 0);
  });

  it("ends above the plot, north up, and stays there", () => {
    for (const view of FETCH_VIEWS) {
      const end = cameraAt(FILM_END, view);
      expect(end.lng).toBeCloseTo(PLOT_CENTER[0], 6);
      expect(end.lat).toBeCloseTo(PLOT_CENTER[1], 6);
      expect(end.bearing).toBe(0);
      // the closest Cadastre still covers the whole final frame, so no coarser layer shows at the edges
      const metresPerPx = (78271.517 * Math.cos((PLOT_CENTER[1] * Math.PI) / 180)) / 2 ** end.zoom;
      const closest = ORTHO_STILLS[ORTHO_STILLS.length - 1].sideM;
      expect(Math.max(view.width, view.height) * metresPerPx).toBeLessThan(closest);
      expect(cameraAt(10400, view)).toEqual(end);
    }
  });

  it("never jumps: every frame is a small step from the last", () => {
    let last = cameraAt(0, desktop);
    for (let t = 16; t <= FILM_END; t += 16) {
      const next = cameraAt(t, desktop);
      expect(Math.abs(next.zoom - last.zoom)).toBeLessThan(0.12);
      // degrees moved shrink with zoom; compare in screen pixels
      const px = (Math.hypot(next.lng - last.lng, next.lat - last.lat) * 512 * 2 ** next.zoom) / 360;
      expect(px).toBeLessThan(14);
      last = next;
    }
  });

  it("only ever closes in: the subject never shrinks on screen", () => {
    let last = -Infinity;
    for (let t = 0; t <= FILM_END; t += 50) {
      const camera = cameraAt(t, desktop);
      // zoom with the latitude term taken out is the size of things on screen
      const scale = camera.zoom - Math.log2(Math.cos((camera.lat * Math.PI) / 180));
      expect(scale).toBeGreaterThanOrEqual(last - 1e-9);
      last = scale;
    }
  });
});

describe("film chapters and cues", () => {
  it("orders the chapters and rests each still inside its own chapter", () => {
    for (let i = 1; i < CHAPTERS.length; i += 1) expect(CHAPTERS[i].at).toBeGreaterThan(CHAPTERS[i - 1].at);
    expect(CHAPTERS.at(-1)!.at).toBeLessThan(FILM_END);
    for (const chapter of CHAPTERS) {
      const still = CHAPTER_STILL[chapter.id];
      // a chapter's still is its settled last frame, at or just before the next chapter starts
      expect(chapterAt(Math.max(chapter.at, still - 1))).toBe(chapter.id);
    }
    expect(chapterAt(FILM_END)).toBe("result");
  });

  it("names the imagery that is actually on screen", () => {
    expect(cuesAt(1000, desktop).source).toBe("mosaic");
    expect(cuesAt(10400, desktop).source).toBe("ortho");
    expect(cuesAt(11800, desktop).source).toBe("scenes");
    expect(cuesAt(FILM_END, desktop).source).toBe("ortho");
  });

  it("shows the Sentinel-2 scenes only during the analysis and clears them for the result", () => {
    expect(beatsAt(10000).april).toBe(0);
    expect(beatsAt(11400).april).toBe(1);
    expect(beatsAt(11400).june).toBe(0);
    expect(beatsAt(12500).june).toBe(1);
    const end = beatsAt(FILM_END);
    expect(end.april).toBe(0);
    expect(end.june).toBe(0);
    expect(end.outline).toBe(1);
    expect(end.verdictFill).toBe(1);
    expect(end.swath).toBe(0);
  });

  it("sweeps the swath southwards over the plot", () => {
    const start = swathPolygon(0);
    const done = swathPolygon(1);
    expect(Math.min(...done.map((p) => p[1]))).toBeLessThan(Math.min(...start.map((p) => p[1])));
    const atPlot = done.filter((p) => Math.abs(p[1] - PLOT_CENTER[1]) < 0.6).map((p) => p[0]);
    expect(Math.min(...atPlot)).toBeLessThan(PLOT_CENTER[0]);
    expect(Math.max(...atPlot)).toBeGreaterThan(PLOT_CENTER[0]);
  });
});

describe("committed flight imagery", () => {
  it("has every tile the flight asks for, and the three stills", () => {
    const missing: string[] = [];
    for (const view of FETCH_VIEWS) {
      for (const key of flightTiles(view)) {
        const [z, x, y] = key.split("/");
        if (!existsSync(path.join(process.cwd(), "public", "flight", "s2", z, x, `${y}.jpg`))) missing.push(key);
      }
    }
    expect(missing).toEqual([]);
    for (const still of ORTHO_STILLS) {
      expect(existsSync(path.join(process.cwd(), "public", still.src))).toBe(true);
    }
  });

  it("asks for coarse tiles first", () => {
    const zooms = flightTiles(desktop).map((key) => Number(key.split("/")[0]));
    expect([...zooms].sort((a, b) => a - b)).toEqual(zooms);
  });
});
