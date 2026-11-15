import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DURATION_IN_FRAMES,
  FPS,
  HEIGHT,
  WIDTH,
  assets,
  beats,
  captions,
  copy,
  deskRecording,
  deskShots,
  evidence,
} from "@/src/config";

const greek = /[\u0370-\u03FF\u1F00-\u1FFF]/;

describe("English pitch clock", () => {
  it("fills 60 seconds at 30 fps without gaps", () => {
    expect(FPS).toBe(30);
    expect(WIDTH).toBe(1920);
    expect(HEIGHT).toBe(1080);
    expect(DURATION_IN_FRAMES).toBe(1800);
    expect(beats.reduce((sum, row) => sum + row.duration, 0)).toBe(DURATION_IN_FRAMES);
    beats.forEach((row, index) => {
      const next = beats[index + 1];
      expect(row.from + row.duration).toBe(next ? next.from : DURATION_IN_FRAMES);
    });
  });

  it("keeps the desk as an open slot and the spoken lines in English", () => {
    expect(deskRecording).toBeNull();
    expect(deskShots).toHaveLength(6);
    const lines = [...captions.map((row) => row.text), ...Object.values(copy), ...deskShots.flatMap((row) => [row.title, row.detail])];
    for (const line of lines) expect(line).not.toMatch(greek);
  });

  it("uses the measured DEMO-RAF-017 reading", () => {
    expect(evidence.plotId).toBe("DEMO-RAF-017");
    expect(evidence.ndviBefore).toBeCloseTo(0.608, 3);
    expect(evidence.ndviAfter).toBeCloseTo(0.43, 3);
    expect(evidence.pixels).toBe(9);
    expect(evidence.uncertainDuty).toBe(18);
    expect(evidence.cleaned).toBe(0);
    expect(evidence.declarations).toBe(10);
    expect(evidence.sampleSize).toBe(1);
  });

  it("points picture beats at files that exist", () => {
    for (const file of Object.values(assets)) {
      expect(existsSync(path.join(process.cwd(), "public", file)), file).toBe(true);
    }
  });
});
