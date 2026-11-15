import type { ReplyIntent } from "./types";

const ALREADY_CLEARED = [
  "already cleared",
  "cleared last week",
  "καθάρισα",
  "καθαρισα",
  "την προηγούμενη",
  "την προηγουμενη",
  "πέρασμένη εβδομάδα",
  "περασμενη εβδομαδα",
  "το καθάρισα",
];

const NOT_MINE = [
  "not my plot",
  "not my property",
  "δεν είναι δικό μου",
  "δεν ειναι δικο μου",
  "δεν είμαι ο ιδιοκτήτης",
  "δεν ειμαι ο ιδιοκτητης",
  "λάθος οικόπεδο",
  "λαθος οικοπεδο",
];

const PHOTO_DRY = [
  "ξηρ",
  "ξερά",
  "ξερα",
  "dry grass",
  "dry vegetation",
  "owner-photo",
];

export function classifyReply(text: string): ReplyIntent {
  const t = text.trim().toLowerCase();
  if (!t) return "silence";
  if (ALREADY_CLEARED.some((k) => t.includes(k))) return "already_cleared";
  if (NOT_MINE.some((k) => t.includes(k))) return "not_my_plot";
  if (PHOTO_DRY.some((k) => t.includes(k))) return "photo_still_dry";
  return "unknown";
}

export function nextStatusAfterReply(
  intent: ReplyIntent,
): "awaiting_officer_review" | "awaiting_reply" | "gap" | "flagged_declaration" {
  switch (intent) {
    case "already_cleared":
      return "awaiting_officer_review";
    case "not_my_plot":
      return "gap";
    case "photo_still_dry":
      return "flagged_declaration";
    case "silence":
      return "awaiting_reply";
    default:
      return "awaiting_reply";
  }
}

export function replyNote(intent: ReplyIntent): string {
  switch (intent) {
    case "already_cleared":
      return "Ο υπόχρεος λέει ότι καθάρισε μετά την προθεσμία. Η υπόθεση μένει ανοιχτή για έλεγχο υπαλλήλου — δεν κλείνει από μήνυμα.";
    case "not_my_plot":
      return "Άρθρο 3.3: συνύπαρξη υπόχρεων / αδυναμία εντοπισμού — ευθύνη εις ολόκληρον. Η υπόθεση μένει ανοιχτή.";
    case "photo_still_dry":
      return "Η φωτογραφία δείχνει ακόμη ξηρή καύσιμη ύλη. Προτεραιότητα αυτοψίας.";
    case "silence":
      return "Καμία απάντηση. Παραμένει στην ημερήσια διαδρομή.";
    default:
      return "Ασαφής απάντηση — χρειάζεται ανάγνωση από υπάλληλο.";
  }
}
