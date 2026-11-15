import { describe, expect, it } from "vitest";
import { scenario } from "@/data/scenario";
import { classifyZone, isGap } from "./zone";
import type { ParcelRecord } from "./types";

function parcel(partial: Partial<ParcelRecord> & Pick<ParcelRecord, "id" | "geometry">): ParcelRecord {
  return {
    centroid: { type: "Point", coordinates: partial.geometry.coordinates[0][0] },
    areaM2: 400,
    localOriginM: { x: 0, y: 0 },
    exclusion: null,
    slope: "low",
    poorEscape: false,
    powerline: false,
    frontage: "test",
    ...partial,
  };
}

describe("classifyZone against the Dryotopos fixture", () => {
  it("marks in-plan urban lots as in_plan", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-02")!;
    const z = classifyZone(p, scenario.context);
    expect(z).toMatchObject({ class: "in_plan", inDuty: true, reason: "in_plan" });
  });

  it("marks the eastern settlement-without-plan lot as in_settlement", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-13")!;
    const z = classifyZone(p, scenario.context);
    expect(z.class).toBe("in_settlement");
    expect(z.inDuty).toBe(true);
  });

  it("marks the WUI strip as within_100m", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-15")!;
    const z = classifyZone(p, scenario.context);
    expect(z.class).toBe("within_100m");
    expect(z.inDuty).toBe(true);
  });

  it("keeps forest-law land out of scope even on the 100 m band", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-21")!;
    const z = classifyZone(p, scenario.context);
    expect(z.class).toBe("out_of_scope");
    expect(z.reason).toBe("forest_law");
    expect(z.inDuty).toBe(false);
    expect(isGap(z, null)).toBe(false);
  });

  it("keeps cultivated land out of scope", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-22")!;
    expect(classifyZone(p, scenario.context).reason).toBe("cultivated");
  });

  it("keeps a maintained garden out of scope", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-06")!;
    expect(classifyZone(p, scenario.context).reason).toBe("garden");
  });

  it("keeps inaccessible ground out of scope", () => {
    const p = scenario.parcels.find((x) => x.id === "MYF-24")!;
    expect(classifyZone(p, scenario.context).reason).toBe("inaccessible");
  });
});

describe("synthetic zone geometry", () => {
  const square = (lon: number, lat: number, d = 0.00008): ParcelRecord["geometry"] => ({
    type: "Polygon",
    coordinates: [[
      [lon, lat],
      [lon + d, lat],
      [lon + d, lat + d],
      [lon, lat + d],
      [lon, lat],
    ]],
  });

  it("classifies a centroid inside the in-plan polygon as in_plan", () => {
    const z = classifyZone(
      parcel({ id: "T-PLAN", geometry: square(23.9086, 38.0311) }),
      scenario.context,
    );
    expect(z.class).toBe("in_plan");
  });
});
