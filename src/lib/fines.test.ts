import { describe, expect, it } from "vitest";
import {
  cleaningFineEuros,
  computeSanctions,
  reducedCleaningFine,
  undeclaredFineEuros,
} from "./fines";

describe("cleaningFineEuros (article 8.1)", () => {
  it("uses the 200 € floor", () => {
    expect(cleaningFineEuros(50)).toBe(200);
    expect(cleaningFineEuros(199)).toBe(200);
  });

  it("charges 1 € per m² in the middle", () => {
    expect(cleaningFineEuros(360)).toBe(360);
    expect(cleaningFineEuros(741)).toBe(741);
  });

  it("caps at 2 000 €", () => {
    expect(cleaningFineEuros(2000)).toBe(2000);
    expect(cleaningFineEuros(7938)).toBe(2000);
  });
});

describe("undeclaredFineEuros (article 8.3)", () => {
  it("is 500 € when also uncleaned", () => {
    expect(undeclaredFineEuros(false)).toBe(500);
  });

  it("is 100 € when cleaned but undeclared", () => {
    expect(undeclaredFineEuros(true)).toBe(100);
  });
});

describe("computeSanctions", () => {
  it("stacks 8.1 and 8.3.α when there is no declaration and no cleaning", () => {
    const s = computeSanctions({ areaM2: 360, declared: false, cleaned: false });
    expect(s.cleaning).toBe(360);
    expect(s.undeclared).toBe(500);
    expect(s.total).toBe(860);
  });

  it("charges only 100 € when cleaned but undeclared", () => {
    const s = computeSanctions({ areaM2: 800, declared: false, cleaned: true });
    expect(s.cleaning).toBeNull();
    expect(s.undeclared).toBe(100);
    expect(s.total).toBe(100);
  });

  it("charges only 8.1 when declared but uncleaned", () => {
    const s = computeSanctions({ areaM2: 500, declared: true, cleaned: false });
    expect(s.cleaning).toBe(500);
    expect(s.undeclared).toBeNull();
    expect(s.total).toBe(500);
  });

  it("notes the 50% 8.7 reduction on the 8.1 amount", () => {
    expect(reducedCleaningFine(500)).toBe(250);
    const s = computeSanctions({ areaM2: 500, declared: true, cleaned: false });
    expect(s.cleaningReducedIfCompliant).toBe(250);
  });

  it("records a suspected false declaration without issuing it", () => {
    const s = computeSanctions({
      areaM2: 7938,
      declared: true,
      cleaned: false,
      falseDeclarationSuspected: true,
    });
    expect(s.falseDeclarationSuspected).toBe(true);
    expect(s.notes.some((n) => n.includes("8.6"))).toBe(true);
  });
});
