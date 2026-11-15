import type { FineBreakdown } from "./types";

const CLEANING_PER_M2 = 1;
const CLEANING_MIN = 200;
const CLEANING_MAX = 2000;
const UNDECLARED_UNCLEANED = 500;
const UNDECLARED_CLEANED = 100;

export function cleaningFineEur(areaM2: number): number {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return CLEANING_MIN;
  const raw = Math.round(areaM2 * CLEANING_PER_M2);
  return Math.min(CLEANING_MAX, Math.max(CLEANING_MIN, raw));
}

export function declarationFineEur(args: {
  declared: boolean;
  cleaned: boolean;
}): number {
  if (args.declared) return 0;
  return args.cleaned ? UNDECLARED_CLEANED : UNDECLARED_UNCLEANED;
}

export function calculateFines(args: {
  parcelId: string;
  areaM2: number;
  declared: boolean;
  cleaned: boolean;
  suspectedFalseDeclaration?: boolean;
}): FineBreakdown {
  const cleaning = args.cleaned ? 0 : cleaningFineEur(args.areaM2);
  const declaration = declarationFineEur({
    declared: args.declared,
    cleaned: args.cleaned,
  });
  return {
    parcelId: args.parcelId,
    areaM2: args.areaM2,
    cleaned: args.cleaned,
    declared: args.declared,
    cleaningFineEur: cleaning,
    declarationFineEur: declaration,
    totalEur: cleaning + declaration,
    reduction50Note:
      "Article 8.7: the per-square-metre fine of article 8.1 is reduced by 50% if the owner cleans inside the objection window and a re-inspection confirms it. Not applied in this draft.",
    prosecutorReferralPending: Boolean(args.suspectedFalseDeclaration),
  };
}
