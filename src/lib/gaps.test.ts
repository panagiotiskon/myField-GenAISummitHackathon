import { describe, expect, it } from "vitest";
import { scenario } from "@/data/scenario";
import { buildCases, findGaps } from "./desk";

describe("gap list", () => {
  it("lists in-duty parcels with no declaration", () => {
    const cases = buildCases(scenario);
    const gaps = findGaps(cases).map((c) => c.parcel.id).sort();
    expect(gaps).toContain("MYF-01");
    expect(gaps).toContain("MYF-05");
    expect(gaps).toContain("MYF-07");
    expect(gaps).toContain("MYF-15");
    expect(gaps).not.toContain("MYF-02");
    expect(gaps).not.toContain("MYF-06");
    expect(gaps).not.toContain("MYF-21");
    expect(gaps).not.toContain("MYF-22");
    expect(gaps).not.toContain("MYF-23");
    expect(gaps).not.toContain("MYF-24");
  });

  it("does not treat out-of-scope exclusions as gaps", () => {
    const cases = buildCases(scenario);
    for (const id of ["MYF-06", "MYF-21", "MYF-22", "MYF-24"]) {
      const c = cases.find((x) => x.parcel.id === id)!;
      expect(c.zone.inDuty).toBe(false);
      expect(c.status).toBe("out_of_scope");
    }
  });
});
