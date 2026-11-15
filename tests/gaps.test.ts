import { describe, expect, it } from "vitest";
import { findGaps, ingestMatches } from "@/lib/gaps";
import { scenario } from "@/lib/scenario";
import { isInDuty, isOutOfScope } from "@/lib/zones";

describe("gap list", () => {
  it("matches every simulated declaration and complaint to a demo parcel", () => {
    const ingest = ingestMatches(scenario);
    expect(ingest.unmatchedDeclarations).toEqual([]);
    expect(ingest.unmatchedComplaints).toEqual([]);
    expect(ingest.declarations["KAEK-05119-001"]?.claimedCleaned).toBe(true);
    expect(ingest.complaints["KAEK-05119-001"]?.[0]?.id).toBe("KAT-2026-0012");
  });

  it("lists in-duty parcels with no declaration and skips exclusions", () => {
    const customScenario = {
      ...scenario,
      declarations: scenario.declarations.filter((d) => d.parcelId !== "KAEK-05119-003"),
    };
    const gaps = findGaps(customScenario);
    const ids = gaps.map((row) => row.properties.id);
    expect(ids).toContain("KAEK-05119-003");
    expect(ids).not.toContain("KAEK-05119-001");
    for (const gap of gaps) {
      expect(isInDuty(gap.properties.zone)).toBe(true);
      expect(isOutOfScope(gap.properties.zone)).toBe(false);
    }
  });
});
