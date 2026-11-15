import type { AnalysisSource, Confidence, RuleReason, Verdict } from "./assess";
import type { Lang, Localized, ZoneClass } from "./types";

export const copy = {
  appTitle: { el: "PlotCheck", en: "PlotCheck" },
  tagline: {
    el: "Έλεγχος δηλώσεων καθαρισμού οικοπέδων",
    en: "Plot-cleaning declaration check",
  },
  dashboard: { el: "Πίνακας δήμου", en: "Municipal dashboard" },
  backDashboard: { el: "← Πίνακας δήμου", en: "← Dashboard" },
  banner: {
    el: "Επίδειξη. Δορυφορικές λήψεις και ορθοφωτογραφίες είναι πραγματικές. Τα όρια είναι χειροκίνητα ιχνηλατημένα και οι ιδιοκτήτες, δηλώσεις και καταγγελίες προσομοιωμένα: τίποτα εδώ δεν αποτελεί ισχυρισμό για πραγματικό ακίνητο. Οι κωδικοί DEMO-RAF-* δεν είναι ΚΑΕΚ.",
    en: "Demo. Satellite scenes and orthophotos are real. Outlines are hand-traced and owners, declarations and complaints are simulated: nothing here is a statement about a real property. DEMO-RAF-* codes are not KAEKs.",
  },

  searchLabel: { el: "ΚΑΕΚ", en: "KAEK" },
  searchPlaceholder: { el: "π.χ. DEMO-RAF-017", en: "e.g. DEMO-RAF-017" },
  searchGo: { el: "Εύρεση οικοπέδου", en: "Find plot" },
  searchHint: {
    el: "Η επίδειξη δέχεται κωδικούς DEMO-RAF-001 έως 024. Η αναζήτηση πραγματικού ΚΑΕΚ χρειάζεται το WFS του Κτηματολογίου, που δεν αποκρίνεται.",
    en: "The demo accepts codes DEMO-RAF-001 to 024. Real KAEK lookup needs the Cadastre WFS, which is not responding.",
  },
  searchMiss: {
    el: "Δεν βρέθηκε οικόπεδο επίδειξης με αυτόν τον κωδικό.",
    en: "No demo plot with that code.",
  },

  stats: {
    declarations: { el: "Δηλώσεις καθαρισμού", en: "Cleaning declarations" },
    ofInDuty: { el: "σε {n} υπόχρεα οικόπεδα", en: "across {n} plots under the duty" },
    uncleaned: { el: "Πιθανώς ακαθάριστα", en: "Potentially uncleaned" },
    uncleanedSub: { el: "η εικόνα δείχνει πράσινη κάλυψη", en: "imagery shows green cover" },
    uncertain: { el: "Αβέβαια", en: "Uncertain" },
    uncertainSub: { el: "η εικόνα δεν αρκεί", en: "imagery cannot tell" },
    flagged: { el: "Για αυτοψία", en: "Flagged for inspection" },
    flaggedSub: { el: "σημειωμένα από εσάς", en: "marked by you" },
  },
  priority: { el: "Προτεραιότητα αυτοψίας", en: "Inspection priority" },
  prioritySub: {
    el: "Κίνδυνος θέσης, καταγγελίες και ένδειξη εικόνας. Όχι κρίση συμμόρφωσης.",
    en: "Site risk, complaints and imagery signal. Not a compliance finding.",
  },
  open: { el: "Άνοιγμα", en: "Open" },
  orthophoto: { el: "Ορθοφωτογραφία", en: "Orthophoto" },
  streets: { el: "Οδικός χάρτης", en: "Street map" },
  mapOffline: {
    el: "Το υπόβαθρο δεν φορτώθηκε. Εμφανίζονται μόνο τα όρια.",
    en: "Basemap did not load. Showing outlines only.",
  },

  verdict: {
    likely_cleaned: { el: "Πιθανώς καθαρισμένο", en: "Likely cleaned" },
    potentially_uncleaned: { el: "Πιθανώς ακαθάριστο", en: "Potentially uncleaned" },
    uncertain: { el: "Αβέβαιο", en: "Uncertain" },
    not_applicable: { el: "Εκτός υποχρέωσης", en: "Outside the duty" },
  } satisfies Record<Verdict, Localized>,
  confidence: {
    low: { el: "χαμηλή", en: "low" },
    medium: { el: "μέτρια", en: "medium" },
    high: { el: "υψηλή", en: "high" },
  } satisfies Record<Confidence, Localized>,
  confidenceLabel: { el: "Βεβαιότητα", en: "Confidence" },
  ruleReason: {
    outside_duty: {
      el: "Το οικόπεδο εξαιρείται από την υποχρέωση. Δεν γίνεται εκτίμηση.",
      en: "The plot is exempt from the duty. No assessment is made.",
    },
    too_small_for_sentinel: {
      el: "Το οικόπεδο είναι μικρότερο από ό,τι βλέπει το Sentinel-2: μετά από εσωτερική ζώνη 10 μ. δεν χωρά ούτε ένα εικονοστοιχείο.",
      en: "The plot is smaller than Sentinel-2 can see: after a 10 m inward buffer not one whole pixel fits.",
    },
    no_sentinel_data: {
      el: "Δεν υπάρχει αποθηκευμένη λήψη Sentinel-2 για αυτό το οικόπεδο.",
      en: "No Sentinel-2 scene is saved for this plot.",
    },
    cloud_over_plot: {
      el: "Σύννεφο ή σκιά πάνω από το οικόπεδο σε μία από τις δύο λήψεις.",
      en: "Cloud or shadow over the plot in one of the two scenes.",
    },
    image_older_than_declaration: {
      el: "Η τελευταία καθαρή λήψη είναι παλαιότερη από τη δήλωση.",
      en: "The latest clear scene is older than the declaration.",
    },
    green_cover_after: {
      el: "Ο δείκτης βλάστησης μένει υψηλός στα τέλη Ιουνίου: υπάρχει ακόμα πράσινη κάλυψη.",
      en: "The vegetation index stays high in late June: green cover is still present.",
    },
    low_cover_after_with_drop: {
      el: "Ο δείκτης βλάστησης έπεσε απότομα από την άνοιξη και είναι χαμηλός στα τέλη Ιουνίου.",
      en: "The vegetation index fell sharply from spring and is low in late June.",
    },
    index_in_between: {
      el: "Ο δείκτης βλάστησης δεν είναι ούτε καθαρά υψηλός ούτε καθαρά χαμηλός.",
      en: "The vegetation index is neither clearly high nor clearly low.",
    },
  } satisfies Record<RuleReason, Localized>,
  source: {
    ai_live: { el: "Ανάλυση ΤΝ · ζωντανή κλήση", en: "AI analysis · live call" },
    ai_saved: { el: "Ανάλυση ΤΝ · αποθηκευμένη", en: "AI analysis · saved result" },
    rules_only: { el: "Μόνο μετρήσεις · χωρίς ΤΝ", en: "Measurements only · no AI" },
  } satisfies Record<AnalysisSource, Localized>,
  aiNote: {
    no_key: {
      el: "Δεν έχει οριστεί κλειδί API, άρα το μοντέλο δεν κοίταξε τις εικόνες.",
      en: "No API key is set, so the model did not look at the images.",
    },
    call_failed: {
      el: "Η κλήση στο μοντέλο απέτυχε.",
      en: "The call to the model failed.",
    },
    declined: {
      el: "Το μοντέλο δεν απάντησε σε αυτό το αίτημα.",
      en: "The model declined this request.",
    },
  },
  clamped: {
    el: "Το μοντέλο πρότεινε «{v}». Οι μετρήσεις δεν το επιτρέπουν, άρα η εκτίμηση μένει όπως φαίνεται.",
    en: "The model proposed “{v}”. The measurements do not allow it, so the assessment stays as shown.",
  },

  property: { el: "Έλεγχος οικοπέδου", en: "Plot verification" },
  unknownParcel: { el: "Άγνωστος κωδικός οικοπέδου.", en: "Unknown plot code." },
  facts: { el: "Στοιχεία", en: "Facts" },
  demoId: { el: "Κωδικός (όχι ΚΑΕΚ)", en: "Code (not a KAEK)" },
  address: { el: "Θέση", en: "Location" },
  area: { el: "Εμβαδόν", en: "Area" },
  zone: { el: "Ζώνη", en: "Zone" },
  declaration: { el: "Δήλωση (προσομοίωση)", en: "Declaration (simulated)" },
  declaredCleaned: { el: "δηλώθηκε καθαρισμένο στις", en: "declared cleaned on" },
  none: { el: "Καμία", en: "None" },
  complaint: { el: "Καταγγελία (προσομοίωση)", en: "Complaint (simulated)" },

  imagery: { el: "Εικόνες", en: "Imagery" },
  orthoCaption: { el: "Ορθοφωτογραφία Κτηματολογίου", en: "Cadastre orthophoto" },
  orthoDate: { el: "ημερομηνία λήψης μη δημοσιευμένη", en: "capture date not published" },
  s2Caption: { el: "Sentinel-2 · 10 μ.", en: "Sentinel-2 · 10 m" },
  real: { el: "πραγματική", en: "real" },
  noSentinel: {
    el: "Δεν υπάρχει χρήσιμη λήψη Sentinel-2 για οικόπεδο αυτού του μεγέθους.",
    en: "No usable Sentinel-2 view for a plot this size.",
  },
  ndvi: { el: "Δείκτης βλάστησης (NDVI)", en: "Vegetation index (NDVI)" },
  pixels: { el: "εικονοστοιχεία εντός ορίου", en: "pixels inside the outline" },

  assessment: { el: "Εκτίμηση", en: "Assessment" },
  analyze: { el: "Ανάλυση εικόνων", en: "Analyze imagery" },
  analyzing: { el: "Το μοντέλο κοιτά τις εικόνες…", en: "The model is reading the images…" },
  reanalyze: { el: "Νέα ανάλυση", en: "Analyze again" },
  beforeAnalyze: {
    el: "Οι εικόνες είναι φορτωμένες. Η ανάλυση συνδυάζει τις μετρήσεις με ό,τι βλέπει το μοντέλο εντός του ορίου.",
    en: "The images are loaded. Analysis combines the measurements with what the model sees inside the outline.",
  },
  imageDate: { el: "Ημερομηνία εικόνας", en: "Image date" },
  imageDateNone: { el: "καμία χρονολογημένη εικόνα", en: "no dated image" },
  evidence: { el: "Τεκμήρια", en: "Evidence" },
  observations: { el: "Τι βλέπει το μοντέλο", en: "What the model sees" },
  landCover: { el: "Κάλυψη εντός ορίου (εκτίμηση ΤΝ, από την ορθοφωτογραφία)", en: "Cover inside the outline (AI estimate, from the orthophoto)" },
  cover: {
    trees: { el: "Δέντρα", en: "Trees" },
    lowVegetation: { el: "Χαμηλή βλάστηση", en: "Low vegetation" },
    bareGround: { el: "Γυμνό έδαφος", en: "Bare ground" },
    built: { el: "Δομημένο", en: "Built" },
  },
  limitations: { el: "Όρια της εκτίμησης", en: "Limits of this assessment" },
  fixedLimits: [
    {
      el: "Η εικόνα δεν αποδεικνύει συμμόρφωση ή παράβαση. Μόνο η αυτοψία το κάνει.",
      en: "Imagery does not prove compliance or a breach. Only a site visit does.",
    },
    {
      el: "Ξερά χόρτα και γυμνό έδαφος δίνουν και τα δύο χαμηλό NDVI. Τα αειθαλή δέντρα δίνουν υψηλό ακόμα και με καθαρό έδαφος.",
      en: "Dry grass and bare soil both read as low NDVI. Evergreen trees read high even over cleared ground.",
    },
    {
      el: "Το όριο είναι χειροκίνητα ιχνηλατημένο, όχι από το Κτηματολόγιο.",
      en: "The outline is hand-traced, not taken from the Cadastre.",
    },
  ] as Localized[],

  flag: { el: "Σήμανση για αυτοψία", en: "Flag for inspection" },
  flagged: { el: "Σημειώθηκε για αυτοψία", en: "Flagged for inspection" },
  unflag: { el: "Αναίρεση", en: "Undo" },
  flagNote: {
    el: "Η σήμανση μένει σε αυτόν τον περιηγητή. Δεν αποστέλλεται πουθενά.",
    en: "The flag stays in this browser. Nothing is sent anywhere.",
  },

  zones: {
    in_plan: { el: "Εντός σχεδίου", en: "Inside a town plan" },
    in_settlement: { el: "Εντός οικισμού", en: "Inside a settlement" },
    within_100m: { el: "Εντός ζώνης 100 μ.", en: "Within 100 m" },
    forest_excluded: { el: "Εκτός — δασικός χάρτης", en: "Out — forest map" },
    cultivated_excluded: { el: "Εκτός — καλλιέργεια", en: "Out — cultivated" },
    garden_excluded: { el: "Εκτός — συντηρημένος κήπος", en: "Out — maintained garden" },
    inaccessible_excluded: { el: "Εκτός — απρόσιτο", en: "Out — inaccessible" },
  } satisfies Record<ZoneClass, Localized>,
  reasons: {
    declared_vs_imagery: {
      el: "Δηλώθηκε καθαρισμένο, η εικόνα δείχνει πράσινο",
      en: "Declared cleaned, imagery shows green",
    },
    imagery_green: { el: "Πράσινη κάλυψη στην εικόνα", en: "Green cover in imagery" },
    forest_edge: { el: "Όριο δάσους–οικισμού", en: "Forest–settlement edge" },
    nearby_houses: { el: "Γειτνίαση με κατοικίες", en: "Nearby houses" },
    sensitive_site: { el: "Ευαίσθητη εγκατάσταση", en: "Sensitive site" },
    slope_steep: { el: "Έντονη κλίση", en: "Steep slope" },
    slope_moderate: { el: "Μέτρια κλίση", en: "Moderate slope" },
    poor_escape_road: { el: "Δύσκολη οδός διαφυγής", en: "Poor escape road" },
    open_complaint: { el: "Ανοιχτή καταγγελία", en: "Open complaint" },
    no_declaration: { el: "Χωρίς δήλωση", en: "No declaration" },
  } as Record<string, Localized>,
} as const;

export function t(lang: Lang, entry: Localized | undefined): string {
  if (!entry) return "";
  return entry[lang];
}

export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}
