import { describe, expect, it } from "vitest";
import { dayRoute, statutorySampleSize } from "@/lib/route";
import { scenario } from "@/lib/scenario";

describe("day-route ranking, article 6.2", () => {
  it("requires a 5% sample of declarations, at least one", () => {
    expect(statutorySampleSize(0)).toBe(0);
    expect(statutorySampleSize(10)).toBe(1);
    expect(statutorySampleSize(40)).toBe(2);
  });

  it("prioritizes higher risk stops in sorted order", () => {
    const { stops, sampleSize, declarationCount } = dayRoute(scenario, {
      limit: 6,
    });
    expect(declarationCount).toBe(scenario.declarations.length);
    expect(sampleSize).toBe(statutorySampleSize(declarationCount));
    expect(stops.length).toBe(3);
    const scores = stops.map((row) => row.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
