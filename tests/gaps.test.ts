import { describe, expect, it } from "vitest";
import { findGaps, ingestMatches } from "@/lib/gaps";
import { scenario } from "@/lib/scenario";
import { isInDuty, isOutOfScope } from "@/lib/zones";

describe("gap list", () => {
  it("matches every simulated declaration and complaint to a demo parcel", () => {
    const ingest = ingestMatches(scenario);
    expect(ingest.unmatchedDeclarations).toEqual([]);
    expect(ingest.unmatchedComplaints).toEqual([]);
    expect(ingest.declarations["DEMO-RAF-002"]?.claimedCleaned).toBe(true);
    expect(ingest.complaints["DEMO-RAF-002"]?.[0]?.id).toBe("SIM-ΚΑΤ-2026-0041");
  });

  it("lists in-duty parcels with no declaration and skips exclusions", () => {
    const gaps = findGaps(scenario);
    const ids = gaps.map((row) => row.properties.id);
    expect(ids).toContain("DEMO-RAF-001");
    expect(ids).toContain("DEMO-RAF-018");
    expect(ids).not.toContain("DEMO-RAF-002");
    expect(ids).not.toContain("DEMO-RAF-019");
    expect(ids).not.toContain("DEMO-RAF-020");
    expect(ids).not.toContain("DEMO-RAF-021");
    expect(ids).not.toContain("DEMO-RAF-022");
    for (const gap of gaps) {
      expect(isInDuty(gap.properties.zone)).toBe(true);
      expect(isOutOfScope(gap.properties.zone)).toBe(false);
    }
  });
});
