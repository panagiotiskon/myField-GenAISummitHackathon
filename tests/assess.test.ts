import { describe, expect, it } from "vitest";
import {
  capConfidence,
  clampVerdict,
  imageryFor,
  priorityList,
  resolveParcelCode,
  ruleAssessment,
  screen,
  type ParcelImagery,
} from "@/lib/assess";
import { getParcel, scenario } from "@/lib/scenario";
import type { Declaration, ParcelFeature } from "@/lib/types";

const declared = (parcelId: string, date: string): Declaration => ({
  parcelId,
  submittedAt: `${date}T09:00:00+03:00`,
  claimedCleaned: true,
  registryRef: "SIM-TEST",
});

function withNdvi(before: number, after: number, pixelCount = 60): ParcelImagery {
  const scene = (date: string, ndvi: number) => ({
    item: "test",
    date,
    ndvi,
    pixelCount,
    sclMajority: 4,
    clear: true,
    chip: { src: "", bounds: [], sideM: 240 },
  });
  return {
    ortho: null,
    interiorAfterBufferM2: 5000,
    sentinel: {
      before: scene("2026-04-29", before),
      after: scene("2026-06-20", after),
      delta: after - before,
    },
  };
}

describe("measurement gates", () => {
  const large = getParcel("KAEK-05119-003")!;

  it("never assesses a plot outside the duty", () => {
    const forest: ParcelFeature = {
      ...large,
      properties: { ...large.properties, id: "FOREST-TEST", zone: "forest_excluded" },
    };
    const rule = ruleAssessment(forest, null, null);
    expect(rule.verdict).toBe("not_applicable");
    expect(rule.allowed).toEqual(["not_applicable"]);
  });

  it("holds a small plot at uncertain, whatever the owner declared", () => {
    const small: ParcelFeature = {
      ...large,
      properties: { ...large.properties, id: "SMALL-TEST", areaM2: 300 },
    };
    const imagerySmall: ParcelImagery = {
      ortho: null,
      interiorAfterBufferM2: 0,
      sentinel: null,
    };
    const rule = ruleAssessment(small, imagerySmall, declared("SMALL-TEST", "2026-06-10"));
    expect(rule.verdict).toBe("uncertain");
    expect(rule.reason).toBe("too_small_for_sentinel");
    expect(rule.allowed).toEqual(["uncertain"]);
    expect(rule.imageDate).toBeNull();
  });

  it("reads green late-June cover as potentially uncleaned", () => {
    const rule = ruleAssessment(large, withNdvi(0.55, 0.42), null);
    expect(rule.verdict).toBe("potentially_uncleaned");
    expect(rule.allowed).not.toContain("likely_cleaned");
  });

  it("needs both a low index and a sharp drop before likely cleaned", () => {
    expect(ruleAssessment(large, withNdvi(0.5, 0.12), null).verdict).toBe("likely_cleaned");
    expect(ruleAssessment(large, withNdvi(0.22, 0.15), null).verdict).toBe("uncertain");
  });

  it("will not use a picture taken before the declaration", () => {
    const rule = ruleAssessment(large, withNdvi(0.5, 0.12), declared("KAEK-05119-001", "2026-06-21"));
    expect(rule.verdict).toBe("uncertain");
    expect(rule.reason).toBe("image_older_than_declaration");
  });

  it("caps confidence by pixel count and never reaches high", () => {
    expect(ruleAssessment(large, withNdvi(0.55, 0.42, 9), null).confidenceCap).toBe("low");
    expect(ruleAssessment(large, withNdvi(0.55, 0.42, 120), null).confidenceCap).toBe("medium");
    expect(capConfidence("high", "medium")).toBe("medium");
    expect(capConfidence("low", "medium")).toBe("low");
  });

  it("goes uncertain under cloud", () => {
    const cloudy = withNdvi(0.5, 0.12);
    cloudy.sentinel!.after.clear = false;
    expect(ruleAssessment(large, cloudy, null).reason).toBe("cloud_over_plot");
  });
});

describe("model answer is clamped to the measurements", () => {
  const small: ParcelFeature = {
    ...getParcel("KAEK-05119-001")!,
    properties: { ...getParcel("KAEK-05119-001")!.properties, id: "SMALL-TEST", areaM2: 300 },
  };
  const rule = ruleAssessment(small, { ortho: null, interiorAfterBufferM2: 0, sentinel: null }, null);

  it("rejects an upgrade the measurements do not allow", () => {
    expect(clampVerdict("likely_cleaned", rule)).toEqual({ verdict: "uncertain", clamped: true });
    expect(clampVerdict("potentially_uncleaned", rule)).toEqual({ verdict: "uncertain", clamped: true });
  });

  it("lets the model step down to uncertain", () => {
    const green = ruleAssessment(getParcel("KAEK-05119-001")!, withNdvi(0.55, 0.42), null);
    expect(clampVerdict("uncertain", green)).toEqual({ verdict: "uncertain", clamped: false });
  });
});

describe("dashboard screening", () => {
  const rows = screen(scenario);

  it("covers every parcel and keeps exempt plots off the priority list", () => {
    expect(rows).toHaveLength(scenario.parcels.features.length);
    const list = priorityList(rows, 6);
    expect(list).toHaveLength(3);
    expect(list.every((row) => row.rule.verdict !== "not_applicable")).toBe(true);
    expect(list[0].priority).toBeGreaterThanOrEqual(list[2].priority);
  });

  it("ranks a cleaned declaration that the imagery contradicts near the top", () => {
    const top = priorityList(rows, 3);
    const hit = top.find((row) => row.reasons[0] === "declared_vs_imagery");
    expect(hit).toBeTruthy();
    expect(hit!.declaration?.claimedCleaned).toBe(true);
    expect(hit!.rule.verdict).toBe("potentially_uncleaned");
  });

  it("uses the saved real Sentinel-2 numbers for the peri-urban plot", () => {
    const row = rows.find((r) => r.parcel.properties.id === "KAEK-05119-001")!;
    expect(row.rule.imageDate).toBe("2026-04-29");
    expect(row.rule.pixelCount).toBeGreaterThan(20);
    expect(row.rule.ndviAfter).toBeGreaterThan(0);
  });
});

describe("code search", () => {
  const ids = scenario.parcels.features.map((f) => (f.properties as { id: string }).id);

  it("accepts the full code, any case, and short forms", () => {
    expect(resolveParcelCode("kaek-05119-001", ids)).toBe("KAEK-05119-001");
    expect(resolveParcelCode(" 001 ", ids)).toBe("KAEK-05119-001");
    expect(resolveParcelCode("1", ids)).toBe("KAEK-05119-001");
  });

  it("does not pretend to resolve junk", () => {
    expect(resolveParcelCode("KAEK-999", ids)).toBeNull();
    expect(resolveParcelCode("", ids)).toBeNull();
  });
});
