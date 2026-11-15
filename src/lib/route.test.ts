import { describe, expect, it } from "vitest";
import { scenario } from "@/data/scenario";
import { buildCases } from "./desk";
import { buildDayRoute, routeOrder, statutorySampleSize } from "./route";

describe("day route", () => {
  it("puts the high-risk forest-edge complaint ahead of a quiet declared lot", () => {
    const cases = buildCases(scenario);
    const route = buildDayRoute(cases, scenario.meta.deskDate, scenario.declarations.length);
    const order = routeOrder(route);
    expect(order.length).toBeGreaterThan(0);
    expect(order).toContain("MYF-15");
    expect(order.indexOf("MYF-15")).toBeLessThan(order.indexOf("MYF-03") === -1 ? order.length : order.indexOf("MYF-03"));
    const first = cases.find((c) => c.parcel.id === order[0])!;
    const last = cases.find((c) => c.parcel.id === order[order.length - 1])!;
    expect(first.riskScore).toBeGreaterThanOrEqual(last.riskScore);
  });

  it("reports the statutory 5% sample against the declaration count", () => {
    expect(statutorySampleSize(12)).toBe(1);
    expect(statutorySampleSize(100)).toBe(5);
    const cases = buildCases(scenario);
    const route = buildDayRoute(cases, scenario.meta.deskDate, scenario.declarations.length);
    expect(route.declarationCount).toBe(12);
    expect(route.statutorySampleSize).toBe(1);
    expect(route.stopsInSample + route.stopsUndeclared).toBe(route.stops.length);
  });

  it("does not send inspectors to out-of-scope forest or gardens", () => {
    const cases = buildCases(scenario);
    const route = buildDayRoute(cases, scenario.meta.deskDate, scenario.declarations.length);
    const ids = routeOrder(route);
    expect(ids).not.toContain("MYF-21");
    expect(ids).not.toContain("MYF-06");
    expect(ids).not.toContain("MYF-22");
  });
});
