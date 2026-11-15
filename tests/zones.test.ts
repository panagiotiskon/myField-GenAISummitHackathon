import { describe, expect, it } from "vitest";
import { isInDuty, isOutOfScope, zoneMembership } from "@/lib/zones";

describe("zone membership, article 3", () => {
  it("treats in-plan, in-settlement and the 100 m band as in duty", () => {
    expect(zoneMembership("in_plan")).toEqual({
      inDuty: true,
      outOfScope: false,
      article: "3.1.α",
    });
    expect(zoneMembership("in_settlement")).toEqual({
      inDuty: true,
      outOfScope: false,
      article: "3.1.β",
    });
    expect(zoneMembership("within_100m")).toEqual({
      inDuty: true,
      outOfScope: false,
      article: "3.1.γ",
    });
    expect(isInDuty("in_plan")).toBe(true);
    expect(isInDuty("in_settlement")).toBe(true);
    expect(isInDuty("within_100m")).toBe(true);
  });

  it("treats forest land as excluded even inside the 100 m band", () => {
    const row = zoneMembership("forest_excluded");
    expect(row.inDuty).toBe(false);
    expect(row.outOfScope).toBe(true);
    expect(row.article).toMatch(/δασικός/);
    expect(isOutOfScope("forest_excluded")).toBe(true);
  });

  it("treats cultivated land as out of scope, not as a gap", () => {
    const row = zoneMembership("cultivated_excluded");
    expect(row.inDuty).toBe(false);
    expect(row.outOfScope).toBe(true);
    expect(row.article).toBe("3.5.α");
    expect(isInDuty("cultivated_excluded")).toBe(false);
  });
});
