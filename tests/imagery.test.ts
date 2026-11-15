import { describe, expect, it } from "vitest";
import { interiorAfterBufferM2, imageryVerdictForParcel } from "@/lib/imagery";
import { getParcel, scenario } from "@/lib/scenario";
import type { ParcelFeature } from "@/lib/types";

describe("10 m interior-buffer imagery rule", () => {
  it("marks a ~400 m² urban plot inconclusive because the interior vanishes", () => {
    const small: ParcelFeature = {
      type: "Feature",
      id: "SMALL-TEST",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [23.9161966, 38.0176719],
            [23.9163859, 38.0176683],
            [23.9163836, 38.017856],
            [23.9161909, 38.0178542],
            [23.9161966, 38.0176719],
          ],
        ],
      },
      properties: {
        id: "SMALL-TEST",
        areaM2: 345,
        street: { el: "Οδός Πεύκων 4", en: "4 Pefkon St" },
        zone: "in_plan",
        owner: "Ιδιοκτήτης",
        forestEdge: false,
        nearbyHouses: true,
        sensitiveSite: false,
        slopeClass: "low",
        poorEscapeRoad: false,
        enclosed: false,
      },
    };
    const interior = interiorAfterBufferM2(small.geometry);
    expect(interior).toBeLessThan(100);
    const verdict = imageryVerdictForParcel(small, scenario);
    expect(verdict.status).toBe("inconclusive");
    expect(verdict.reason).toBe("interior_buffer_10m");
  });

  it("keeps a measured index only on the peri-urban plot that was actually sampled", () => {
    const large = getParcel("KAEK-05119-001");
    expect(large).toBeTruthy();
    expect(interiorAfterBufferM2(large!.geometry)).toBeGreaterThan(100);
  });
});
