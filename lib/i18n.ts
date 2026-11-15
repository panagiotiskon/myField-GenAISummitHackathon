import type { CaseStatus, ImageryReason, ImageryStatus, Lang, QueueBucket, ZoneClass } from "./types";

export const copy = {
  appTitle: { el: "myField", en: "myField" },
  deskName: {
    el: "Γραφείο ακαθάριστων οικοπέδων",
    en: "Uncleared-plot desk",
  },
  ownerPack: { el: "Πακέτο συμμόρφωσης", en: "Compliance pack" },
  notCertificate: {
    el: "Δεν αποτελεί πιστοποιητικό καθαρισμού.",
    en: "This is not a clearance certificate.",
  },
  runDesk: { el: "Εκτέλεση σημερινού γραφείου", en: "Run today’s desk" },
  running: { el: "Εκτελείται…", en: "Running…" },
  ran: { el: "Το γραφείο έτρεξε", en: "Desk has run" },
  queue: { el: "Ουρά", en: "Queue" },
  map: { el: "Χάρτης", en: "Map" },
  route: { el: "Διαδρομή ημέρας", en: "Day route" },
  drafts: { el: "Σχέδια", en: "Drafts" },
  log: { el: "Κλήσεις πράκτορα", en: "Agent log" },
  thread: { el: "Νήμα ιδιοκτήτη", en: "Owner thread" },
  drawer: { el: "Συρτάρι γεωτεμαχίου", en: "Parcel drawer" },
  orthophoto: { el: "Ορθοφωτογραφία Κτηματολογίου", en: "Cadastre orthophoto" },
  streets: { el: "Οδικός χάρτης", en: "Street map" },
  filterAll: { el: "Όλα", en: "All" },
  selectParcel: { el: "Επιλέξτε γεωτεμάχιο από την ουρά ή τον χάρτη.", en: "Select a parcel from the queue or the map." },
  runFirst: {
    el: "Πατήστε «Εκτέλεση σημερινού γραφείου» για να τρέξει η βρόχος: εισαγωγή → κενά → εικόνα → follow-up → διαδρομή → σχέδιο.",
    en: "Press “Run today’s desk” to run ingest → gaps → imagery → follow-up → route → draft.",
  },
  officerName: { el: "Ονοματεπώνυμο υπαλλήλου", en: "Officer name" },
  officerPlaceholder: { el: "πληκτρολογήστε ονοματεπώνυμο", en: "type the officer’s name" },
  draftStatus: {
    el: "προς υπογραφή — δεν έχει κοινοποιηθεί",
    en: "for signature — not notified",
  },
  noIssue: {
    el: "Δεν υπάρχει ενέργεια έκδοσης, κοινοποίησης ή κατάθεσης. Το σχέδιο μένει στον υπάλληλο.",
    en: "There is no control that issues, notifies, or files. The draft stays with the officer.",
  },
  print: { el: "Εκτύπωση σχεδίου", en: "Print draft" },
  annexA: { el: "Παράρτημα Α · Φύλλο ελέγχου δήμου", en: "Annex A · Municipal inspection sheet" },
  annexD: { el: "Παράρτημα Δ · Πράξη προστίμου δήμου", en: "Annex D · Municipal fine act" },
  zone: { el: "Ζώνη", en: "Zone" },
  declaration: { el: "Δήλωση", en: "Declaration" },
  none: { el: "Καμία", en: "None" },
  claimedCleaned: { el: "Δηλώθηκε καθαρισμένο", en: "Declared cleaned" },
  imagery: { el: "Ετυμηγορία εικόνας", en: "Imagery verdict" },
  complaint: { el: "Καταγγελία", en: "Complaint" },
  owner: { el: "Υπόχρεος (προσομοίωση)", en: "Liable person (simulated)" },
  area: { el: "Εμβαδόν", en: "Area" },
  demoId: { el: "Κωδικός επίδειξης (όχι ΚΑΕΚ)", en: "Demo id (not a KAEK)" },
  consent: {
    el: "Άπρακτη προθεσμία δήλωσης: τεκμαίρεται συναίνεση για αυτεπάγγελτο καθαρισμό (άρθρο 5.6). Το σχέδιο το αναφέρει. Δεν διατάσσει τον καθαρισμό.",
    en: "A lapsed declaration deadline is treated as consent to ex-officio cleaning (article 5.6). The draft states this. It does not order the cleaning.",
  },
  sampleCaption: {
    el: "Δειγματοληψία άρθρου 6.1.β",
    en: "Article 6.1.b sample",
  },
  send: { el: "Αποστολή", en: "Send" },
  clearedLastWeek: { el: "Το καθάρισα την περασμένη εβδομάδα", en: "I cleared it last week" },
  notMyPlot: { el: "Δεν είναι δικό μου", en: "Not my plot" },
  silence: { el: "Σιωπή", en: "Silence" },
  attachDry: { el: "Φωτογραφία με ξερή κάλυψη", en: "Photo still showing dry cover" },
  backDesk: { el: "Επιστροφή στο γραφείο", en: "Back to the desk" },
  openOwnerPack: { el: "Πακέτο συμμόρφωσης ιδιοκτήτη", en: "Owner compliance pack" },
  evidenceHave: {
    el: "Εικόνες που έχει πράγματι το γραφείο",
    en: "Images the desk actually has",
  },
  askReceipt: {
    el: "Ζητείται φωτογραφία με ημερομηνία ή απόδειξη εργολάβου.",
    en: "A dated photo or contractor receipt is requested.",
  },
  lawCitesStay: {
    el: "Οι παραπομπές νόμου μένουν στα ελληνικά.",
    en: "Law cites stay in the draft in Greek either way.",
  },
  buckets: {
    no_declaration: { el: "Χωρίς δήλωση", en: "No declaration" },
    declaration_vs_imagery: { el: "Δήλωση ≠ εικόνα", en: "Declaration vs imagery" },
    complaint: { el: "Καταγγελία", en: "Complaint" },
    out_of_scope: { el: "Εκτός πεδίου", en: "Out of scope" },
  } satisfies Record<QueueBucket, { el: string; en: string }>,
  zones: {
    in_plan: { el: "Εντός σχεδίου", en: "Inside a town plan" },
    in_settlement: { el: "Εντός οικισμού", en: "Inside a settlement" },
    within_100m: { el: "Εντός ζώνης 100 μ.", en: "Within 100 m" },
    forest_excluded: { el: "Εκτός — δασικός χάρτης", en: "Out — forest map" },
    cultivated_excluded: { el: "Εκτός — καλλιέργεια", en: "Out — cultivated" },
    garden_excluded: { el: "Εκτός — συντηρημένος κήπος", en: "Out — maintained garden" },
    inaccessible_excluded: { el: "Εκτός — απρόσιτο", en: "Out — inaccessible" },
  } satisfies Record<ZoneClass, { el: string; en: string }>,
  imageryStatus: {
    cleaned: { el: "Καθαρισμένο (εικόνα)", en: "Cleaned (imagery)" },
    uncleared: { el: "Ακαθάριστο (εικόνα)", en: "Uncleared (imagery)" },
    inconclusive: { el: "Ατελέσφορο", en: "Inconclusive" },
  } satisfies Record<ImageryStatus, { el: string; en: string }>,
  imageryReason: {
    interior_buffer_10m: {
      el: "Μετά από εσωτερική ζώνη 10 μ. δεν μένει επιφάνεια που να «βλέπει» το Sentinel-2. Δεν κρίνεται ούτε καθαρό ούτε ακόμα βρώμικο.",
      en: "After a 10 m inward buffer no interior remains that Sentinel-2 can see. Not judged clean or still dirty.",
    },
    no_scene_pair: {
      el: "Το οικόπεδο είναι αρκετά μεγάλο, αλλά δεν ανακτήθηκε ζεύγος σκηνών για αυτό το γεωτεμάχιο.",
      en: "The plot is large enough, but no scene pair was retrieved for this parcel.",
    },
    seasonal_index: {
      el: "Μετρημένος δείκτης NDVI άνοιξη–τέλη Ιουνίου στο ίδιο παράθυρο. Δεν βάφεται στον χάρτη.",
      en: "Measured spring-versus-late-June NDVI on the same window. Not painted on the map.",
    },
  } satisfies Record<ImageryReason, { el: string; en: string }>,
  caseStatus: {
    open: { el: "Ανοιχτή", en: "Open" },
    awaiting_officer_review: {
      el: "Αναμονή ελέγχου υπαλλήλου — δεν καθαρίζεται η υπόθεση",
      en: "Awaiting officer review — not cleared",
    },
    open_joint_liability: {
      el: "Παραμένει ανοιχτή · εις ολόκληρον ευθύνη (άρθρο 3.3)",
      en: "Stays open under joint and several liability (article 3.3)",
    },
    follow_up_needed: { el: "Απαιτείται υπενθύμιση", en: "Follow-up needed" },
    evidence_uncleared: {
      el: "Τεκμήριο ξερής κάλυψης — η υπόθεση μένει ανοιχτή",
      en: "Dry-cover evidence — case stays open",
    },
  } satisfies Record<CaseStatus, { el: string; en: string }>,
  reasons: {
    forest_edge: { el: "Όριο δάσους–οικισμού", en: "Forest–settlement edge" },
    nearby_houses: { el: "Γειτνίαση με κατοικίες", en: "Nearby houses" },
    sensitive_site: { el: "Ευαίσθητη εγκατάσταση", en: "Sensitive site" },
    slope_steep: { el: "Έντονη κλίση", en: "Steep slope" },
    slope_moderate: { el: "Μέτρια κλίση", en: "Moderate slope" },
    poor_escape_road: { el: "Δύσκολη οδός διαφυγής", en: "Poor escape road" },
    open_complaint: { el: "Ανοιχτή καταγγελία", en: "Open complaint" },
    no_declaration: { el: "Χωρίς δήλωση", en: "No declaration" },
  },
  fines: {
    cleaning: { el: "Πρόστιμο μη καθαρισμού (άρθρο 8.1)", en: "Failure to clean (article 8.1)" },
    declaration: { el: "Πρόστιμο μη δήλωσης (άρθρο 8.3)", en: "Failure to declare (article 8.3)" },
    total: { el: "Σύνολο σχεδίου", en: "Draft total" },
    art87: {
      el: "Άρθρο 8.7: μείωση 50% του προστίμου ανά τ.μ. αν καθαριστεί εντός της προθεσμίας ένστασης και το επιβεβαιώσει επανέλεγχος. Δεν εφαρμόζεται αυτόματα.",
      en: "Article 8.7: 50% reduction of the per-m² fine if cleaned inside the objection window and a re-inspection confirms it. Not applied automatically.",
    },
    art86: {
      el: "Άρθρο 8.6: υπόνοια ψευδούς δήλωσης. Η ενημέρωση εισαγγελέα περιμένει το πέρας της δεκαήμερης ένστασης.",
      en: "Article 8.6: suspected false declaration. Prosecutor referral waits until the ten-day objection window ends.",
    },
  },
} as const;

export function t(
  lang: Lang,
  entry: { el: string; en: string } | undefined,
): string {
  if (!entry) return "";
  return entry[lang];
}

export function euro(n: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}
