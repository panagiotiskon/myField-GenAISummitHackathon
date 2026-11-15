import { describe, expect, it } from "vitest";
import { dayRoute, statutorySampleSize } from "@/lib/route";
import { scenario } from "@/lib/scenario";

describe("day-route ranking, article 6.2", () => {
  it("requires a 5% sample of declarations, at least one", () => {
    expect(statutorySampleSize(0)).toBe(0);
    expect(statutorySampleSize(10)).toBe(1);
    expect(statutorySampleSize(40)).toBe(2);
  });

  it("puts the forest-edge complaint ahead of an ordinary gap", () => {
    const { stops, sampleSize, declarationCount } = dayRoute(scenario, {
      limit: 6,
    });
    expect(declarationCount).toBe(scenario.declarations.length);
    expect(sampleSize).toBe(1);
    expect(stops[0]?.parcelId).toBe("DEMO-RAF-013");
    expect(stops.map((row) => row.parcelId)).toContain("DEMO-RAF-002");
    const forest = stops.find((row) => row.parcelId === "DEMO-RAF-013");
    const quietGap = stops.find((row) => row.parcelId === "DEMO-RAF-004");
    if (quietGap && forest) {
      expect(forest.score).toBeGreaterThan(quietGap.score);
    }
    const scores = stops.map((row) => row.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
