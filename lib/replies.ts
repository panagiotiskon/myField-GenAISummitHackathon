import type { CaseStatus, Localized, ReplyIntent } from "./types";

const CLEARED = [
  "cleared last week",
  "cleaned last week",
  "καθάρισα την περασμένη",
  "το καθάρισα την προηγούμενη",
  "καθαρίστηκε την περασμένη εβδομάδα",
  "το έκανα την προηγούμενη εβδομάδα",
  "καθάρισμα την περασμένη",
];

const NOT_MINE = [
  "not my plot",
  "not my property",
  "not the owner",
  "δεν είναι δικό μου",
  "δεν είμαι ο ιδιοκτήτης",
  "λάθος οικόπεδο",
  "δεν μου ανήκει",
];

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\b(it|the|a|to|i|this|is|μου|το|την|τον)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyReply(text: string | null | undefined): ReplyIntent {
  if (text == null) return "silence";
  const value = norm(text);
  if (!value) return "silence";
  if (CLEARED.some((phrase) => value.includes(norm(phrase)))) {
    return "cleared_last_week";
  }
  if (NOT_MINE.some((phrase) => value.includes(norm(phrase)))) {
    return "not_my_plot";
  }
  return "unknown";
}

export function routeReply(intent: ReplyIntent): CaseStatus {
  switch (intent) {
    case "cleared_last_week":
      return "awaiting_officer_review";
    case "not_my_plot":
      return "open_joint_liability";
    case "silence":
      return "follow_up_needed";
    case "dry_cover_photo":
      return "evidence_uncleared";
    default:
      return "open";
  }
}

export const cannedReplies: Record<
  Exclude<ReplyIntent, "unknown" | "silence">,
  Localized
> = {
  cleared_last_week: {
    el: "Το καθάρισα την περασμένη εβδομάδα.",
    en: "I cleared it last week.",
  },
  not_my_plot: {
    el: "Δεν είναι δικό μου οικόπεδο.",
    en: "This is not my plot.",
  },
  dry_cover_photo: {
    el: "Σας στέλνω φωτογραφία από το οικόπεδο.",
    en: "I am sending a photo of the plot.",
  },
};

export const deskAskForEvidence: Localized = {
  el: "Σας στέλνουμε τις εικόνες που έχει πράγματι το γραφείο. Παρακαλούμε αποστείλετε γεωεντοπισμένη φωτογραφία με ημερομηνία ή απόδειξη εργολάβου. Η δήλωση «καθαρίστηκε» σε μικρό οικόπεδο δεν κλείνει την υπόθεση.",
  en: "We are sending the images the desk actually has. Please send a dated, located photo or a contractor receipt. A 'cleaned' claim on a small plot does not close the case.",
};
