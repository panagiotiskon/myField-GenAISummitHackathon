import { describe, expect, it } from "vitest";
import { ruleAssessment, imageryFor, resolveParcelCode, screen } from "@/lib/assess";
import {
  cleanSeries,
  detectClearing,
  fieldWatch,
  readField,
  type FieldPoint,
  type FieldRecord,
} from "@/lib/fieldwatch";
import { getParcel, scenario } from "@/lib/scenario";

/** Roughly every 5 days from 1 Nov to 31 Oct, NDVI from a function of the date. */
function curve(ndvi: (iso: string) => number): FieldPoint[] {
  const out: FieldPoint[] = [];
  const d = new Date(Date.UTC(2025, 10, 1));
  while (d <= new Date(Date.UTC(2026, 9, 31))) {
    const iso = d.toISOString().slice(0, 10);
    out.push([iso, ndvi(iso), 0.2, 0.15]);
    d.setUTCDate(d.getUTCDate() + 5);
  }
  return out;
}
const record = (series: FieldPoint[], pixels = 60): FieldRecord => ({
  osmId: 1,
  osmLanduse: "test",
  cluster: "T",
  pixels,
  curatedRole: "covered",
  series,
});

// Green to 1 May, then dries by a little every date: no step.
const driesInPlace = curve((iso) => (iso < "2026-05-01" ? 0.7 : Math.max(0.34, 0.7 - 0.008 * ((Date.parse(iso) - Date.parse("2026-05-01")) / 864e5))));
const ploughed = (on: string) => curve((iso) => (iso < on ? 0.7 : 0.18));

describe("detectClearing", () => {
  it("finds a step and dates it to the first worked scene", () => {
    const event = detectClearing(ploughed("2026-04-10"));
    expect(event?.date).toBe("2026-04-10");
    expect(event?.drop).toBeCloseTo(0.52, 2);
  });

  it("catches ploughing done in passes over three weeks", () => {
    const passes = curve((iso) => (iso < "2026-03-05" ? 0.65 : iso < "2026-03-15" ? 0.5 : iso < "2026-03-25" ? 0.38 : 0.2));
    expect(detectClearing(passes)?.date).toBe("2026-03-26");
  });

  it("ignores slow drying", () => {
    expect(detectClearing(driesInPlace)).toBeNull();
  });

  it("ignores a drop that bounces back up", () => {
    const series = curve((iso) => (iso >= "2026-03-01" && iso < "2026-03-07" ? 0.2 : 0.7));
    expect(detectClearing(series)).toBeNull();
  });
});

describe("cleanSeries", () => {
  it("drops a single-date dip", () => {
    const series: FieldPoint[] = [
      ["2026-03-01", 0.7, 0, 0],
      ["2026-03-06", 0.3, 0, 0],
      ["2026-03-11", 0.69, 0, 0],
    ];
    expect(cleanSeries(series).map((p) => p[0])).toEqual(["2026-03-01", "2026-03-11"]);
  });
});

describe("readField", () => {
  it("worked before 1 May", () => {
    expect(readField(record(ploughed("2026-03-20"))).status).toBe("worked_before_season");
  });
  it("worked only after the season opened", () => {
    expect(readField(record(ploughed("2026-05-20"))).status).toBe("worked_after_season_start");
  });
  it("left standing and green on 1 May", () => {
    const reading = readField(record(driesInPlace));
    expect(reading.status).toBe("covered_at_season_start");
    expect(reading.startNdvi).toBeGreaterThanOrEqual(0.45);
  });
  it("too few dates says nothing", () => {
    expect(readField(record(ploughed("2026-03-20").slice(0, 8))).status).toBe("series_inconclusive");
  });
});

describe("field-watch plots in the scenario", () => {
  const ids = Object.keys(fieldWatch.parcels);

  it("every plot has a parcel, a declaration of cleaned, and an orthophoto", () => {
    expect(ids.length).toBeGreaterThanOrEqual(6);
    for (const id of ids) {
      expect(getParcel(id)).toBeDefined();
      expect(scenario.declarations.find((d) => d.parcelId === id)?.claimedCleaned).toBe(true);
      expect(imageryFor(id)?.ortho).toBeTruthy();
    }
  });

  it("the rule agrees with what the curve and frames showed when the plots were picked", () => {
    for (const id of ids) {
      const rule = ruleAssessment(getParcel(id)!, imageryFor(id), null);
      const expected = fieldWatch.parcels[id].curatedRole === "covered" ? "potentially_uncleaned" : "likely_cleaned";
      expect([id, rule.verdict]).toEqual([id, expected]);
    }
  });

  it("each covered plot is flagged as declared-vs-imagery; worked neighbours are not", () => {
    const rows = new Map(screen(scenario).map((row) => [row.parcel.properties.id, row]));
    for (const id of ids) {
      const flagged = rows.get(id)!.reasons.includes("declared_vs_imagery");
      expect([id, flagged]).toEqual([id, fieldWatch.parcels[id].curatedRole === "covered"]);
    }
  });

  it("looks up PIK codes by their own prefix", () => {
    const all = scenario.parcels.features.map((f) => String(f.id));
    expect(resolveParcelCode("pik-3", all)).toBe("DEMO-PIK-003");
    expect(resolveParcelCode("raf-3", all)).toBe("DEMO-RAF-003");
  });
});
