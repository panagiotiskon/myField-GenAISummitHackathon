import { describe, expect, it } from "vitest";
import { scenario } from "@/data/scenario";
import { interiorAreaM2, judgeImagery, MIN_INTERIOR_M2 } from "./imagery";

describe("Sentinel-2 10 m interior rule", () => {
  it("rejects a ~360 m² urban plot", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-02")!;
    expect(p.areaM2).toBeLessThan(400);
    expect(interiorAreaM2(p)).toBeLessThan(MIN_INTERIOR_M2);
    const v = judgeImagery(p, scenario.imagerySnapshots);
    expect(v.kind).toBe("inconclusive");
    if (v.kind === "inconclusive") expect(v.reason).toBe("too_small");
  });

  it("does not treat too-small as cleaned or dirty", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-02")!;
    const v = judgeImagery(p, scenario.imagerySnapshots);
    expect(v.kind).not.toBe("cleared");
    expect(v.kind).not.toBe("uncleared");
  });

  it("leaves a measurable plot without a snapshot as no_scene_pair", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-20")!;
    const interior = interiorAreaM2(p);
    if (interior >= MIN_INTERIOR_M2) {
      const v = judgeImagery(p, {});
      expect(v).toMatchObject({ kind: "inconclusive", reason: "no_scene_pair" });
    } else {
      expect(interior).toBeLessThan(MIN_INTERIOR_M2);
    }
  });

  it("uses the measured MYF-19 pair and flags remaining live cover", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-19")!;
    expect(interiorAreaM2(p)).toBeGreaterThanOrEqual(MIN_INTERIOR_M2);
    const v = judgeImagery(p, scenario.imagerySnapshots);
    expect(v.kind).toBe("uncleared");
    if (v.kind === "uncleared") {
      expect(v.ndviSummer).toBe(0.705);
      expect(v.ndviSpring).toBe(0.887);
      expect(v.spring.id).toContain("20260429");
      expect(v.summer.id).toContain("20260623");
    }
  });
});
