import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHAPTERS,
  CHAPTER_STILL,
  FILM_DIR,
  FILM_END,
  FILM_PLOT,
  FILM_SHAPES,
  chapterAt,
  cuesAt,
} from "@/lib/film";

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
    expect(cuesAt(1000).source).toBe("mosaic");
    expect(cuesAt(10400).source).toBe("ortho");
    expect(cuesAt(11800).source).toBe("scenes");
    expect(cuesAt(FILM_END).source).toBe("ortho");
  });
});

describe("committed film", () => {
  it("has the video in every codec and both stills, for each layout", () => {
    for (const shape of FILM_SHAPES) {
      for (const file of [
        `${shape}.av1.mp4`,
        `${shape}.hevc.mp4`,
        `${shape}-lite.av1.mp4`,
        `${shape}-lite.hevc.mp4`,
        `${shape}-start.webp`,
        `${shape}-end.webp`,
      ]) {
        expect(existsSync(path.join(process.cwd(), "public", FILM_DIR, `earth-${file}`)), file).toBe(true);
      }
    }
  });
});
