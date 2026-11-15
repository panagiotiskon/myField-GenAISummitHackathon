import { describe, expect, it } from "vitest";
import { calculateFines, cleaningFineEur, declarationFineEur } from "@/lib/fines";

describe("fine brackets, article 8", () => {
  it("charges €1/m² with a €200 floor and €2,000 cap", () => {
    expect(cleaningFineEur(150)).toBe(200);
    expect(cleaningFineEur(200)).toBe(200);
    expect(cleaningFineEur(500)).toBe(500);
    expect(cleaningFineEur(1999.4)).toBe(1999);
    expect(cleaningFineEur(2000)).toBe(2000);
    expect(cleaningFineEur(3000)).toBe(2000);
  });

  it("charges €500 when undeclared and uncleaned, €100 when undeclared and cleaned", () => {
    expect(declarationFineEur({ declared: false, cleaned: false })).toBe(500);
    expect(declarationFineEur({ declared: false, cleaned: true })).toBe(100);
    expect(declarationFineEur({ declared: true, cleaned: false })).toBe(0);
    expect(declarationFineEur({ declared: true, cleaned: true })).toBe(0);
  });

  it("adds both fines and notes the 50% reduction without applying it", () => {
    const row = calculateFines({
      parcelId: "DEMO-RAF-001",
      areaM2: 345,
      declared: false,
      cleaned: false,
    });
    expect(row.cleaningFineEur).toBe(345);
    expect(row.declarationFineEur).toBe(500);
    expect(row.totalEur).toBe(845);
    expect(row.reduction50Note).toMatch(/8\.7/);
    expect(row.prosecutorReferralPending).toBe(false);
  });

  it("flags a prosecutor referral as pending for a suspected false declaration", () => {
    const row = calculateFines({
      parcelId: "DEMO-RAF-002",
      areaM2: 342,
      declared: true,
      cleaned: false,
      suspectedFalseDeclaration: true,
    });
    expect(row.declarationFineEur).toBe(0);
    expect(row.cleaningFineEur).toBe(342);
    expect(row.prosecutorReferralPending).toBe(true);
  });
});
