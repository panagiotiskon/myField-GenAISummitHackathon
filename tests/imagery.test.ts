import { describe, expect, it } from "vitest";
import { interiorAfterBufferM2, imageryVerdictForParcel } from "@/lib/imagery";
import { getParcel, scenario } from "@/lib/scenario";

describe("10 m interior-buffer imagery rule", () => {
  it("marks a ~400 m² urban plot inconclusive because the interior vanishes", () => {
    const small = getParcel("DEMO-RAF-002");
    expect(small).toBeTruthy();
    const interior = interiorAfterBufferM2(small!.geometry);
    expect(interior).toBeLessThan(100);
    const verdict = imageryVerdictForParcel(small!, scenario);
    expect(verdict.status).toBe("inconclusive");
    expect(verdict.reason).toBe("interior_buffer_10m");
  });

  it("keeps a measured index only on the peri-urban plot that was actually sampled", () => {
    const large = getParcel("DEMO-RAF-018");
    expect(large).toBeTruthy();
    expect(interiorAfterBufferM2(large!.geometry)).toBeGreaterThan(100);
    const verdict = imageryVerdictForParcel(large!, scenario);
    expect(verdict.status).toBe("uncleared");
    expect(verdict.reason).toBe("seasonal_index");
    expect(verdict.juneNdvi).toBeCloseTo(0.383, 3);
  });
});
