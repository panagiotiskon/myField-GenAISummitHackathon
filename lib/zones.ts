import type { ZoneClass } from "./types";

const IN_DUTY: ZoneClass[] = ["in_plan", "in_settlement", "within_100m"];
const EXCLUDED: ZoneClass[] = [
  "forest_excluded",
  "cultivated_excluded",
  "garden_excluded",
  "inaccessible_excluded",
];

export function isInDuty(zone: ZoneClass): boolean {
  return IN_DUTY.includes(zone);
}

export function isOutOfScope(zone: ZoneClass): boolean {
  return EXCLUDED.includes(zone);
}

export function zoneMembership(zone: ZoneClass): {
  inDuty: boolean;
  outOfScope: boolean;
  article: string;
} {
  if (zone === "in_plan") {
    return { inDuty: true, outOfScope: false, article: "3.1.α" };
  }
  if (zone === "in_settlement") {
    return { inDuty: true, outOfScope: false, article: "3.1.β" };
  }
  if (zone === "within_100m") {
    return { inDuty: true, outOfScope: false, article: "3.1.γ" };
  }
  if (zone === "forest_excluded") {
    return { inDuty: false, outOfScope: true, article: "3.1.γ / δασικός χάρτης" };
  }
  if (zone === "cultivated_excluded") {
    return { inDuty: false, outOfScope: true, article: "3.5.α" };
  }
  if (zone === "garden_excluded") {
    return { inDuty: false, outOfScope: true, article: "3.5.β" };
  }
  return { inDuty: false, outOfScope: true, article: "3.5.γ" };
}
