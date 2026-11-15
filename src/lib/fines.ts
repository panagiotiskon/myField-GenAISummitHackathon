import type { FineBreakdown } from "./types";

/** Article 8.1 — €1 / m², min €200, max €2,000. */
export function cleaningFineEuros(areaM2: number): number {
  const area = Number.isFinite(areaM2) ? Math.max(0, areaM2) : 0;
  return Math.min(2000, Math.max(200, Math.round(area)));
}

/** Article 8.3 — €500 if also uncleaned, €100 if cleaned. */
export function undeclaredFineEuros(cleaned: boolean): number {
  return cleaned ? 100 : 500;
}

/** Article 8.7 — 50% of the article 8.1 amount if the owner cleans inside the objection window. */
export function reducedCleaningFine(amount: number): number {
  return Math.round(amount * 0.5);
}

export function computeSanctions(input: {
  areaM2: number;
  declared: boolean;
  cleaned: boolean;
  falseDeclarationSuspected?: boolean;
}): FineBreakdown {
  const notes: string[] = [];
  const cleaning = input.cleaned ? null : cleaningFineEuros(input.areaM2);
  const undeclared = input.declared ? null : undeclaredFineEuros(input.cleaned);

  if (cleaning !== null) {
    notes.push(
      `Άρθρο 8.1: ${cleaning} € (1 €/m², ελάχιστο 200 €, μέγιστο 2.000 €) για μη καθαρισμό.`,
    );
  }
  if (undeclared !== null) {
    notes.push(
      input.cleaned
        ? "Άρθρο 8.3.β: 100 € — καθαρισμός χωρίς δήλωση."
        : "Άρθρο 8.3.α: 500 € — ούτε καθαρισμός ούτε δήλωση.",
    );
  }
  if (!input.declared) {
    notes.push(
      "Άρθρο 5.6: άπρακτη προθεσμία δήλωσης = τεκμαιρόμενη συναίνεση για αυτεπάγγελτο καθαρισμό. Το γραφείο δεν διατάσσει τον καθαρισμό.",
    );
  }
  if (input.falseDeclarationSuspected) {
    notes.push(
      "Άρθρο 8.6: υπόνοια ψευδούς δήλωσης — η εισαγγελική ενημέρωση αναμένει την πάροδο της προθεσμίας ένστασης. Δεν κοινοποιείται από το σύστημα.",
    );
  }
  if (cleaning !== null) {
    notes.push(
      `Άρθρο 8.7: αν καθαρίσει εντός της προθεσμίας ένστασης, το πρόστιμο 8.1 πέφτει στα ${reducedCleaningFine(cleaning)} € (−50%).`,
    );
  }

  const total = (cleaning ?? 0) + (undeclared ?? 0);
  return {
    cleaning,
    undeclared,
    total,
    cleaningReducedIfCompliant: cleaning === null ? null : reducedCleaningFine(cleaning),
    falseDeclarationSuspected: Boolean(input.falseDeclarationSuspected),
    notes,
  };
}
