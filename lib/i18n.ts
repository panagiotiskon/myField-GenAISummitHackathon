import type { AnalysisSource, Confidence, RuleReason, Verdict } from "./assess";
import type { Lang, Localized, ZoneClass } from "./types";

export const copy = {
  appTitle: { el: "myField", en: "myField" },
  tagline: {
    el: "Έλεγχος δηλώσεων καθαρισμού οικοπέδων",
    en: "Plot-cleaning declaration check",
  },
  dashboard: { el: "Πίνακας δήμου", en: "Municipal dashboard" },
  backDashboard: { el: "Πίνακας δήμου", en: "Dashboard" },
  region: { el: "Ανατολική Αττική", en: "East Attica" },
  banner: {
    el: "Δορυφορικές λήψεις και ορθοφωτογραφίες είναι πραγματικές. Τα όρια είναι χειροκίνητα ιχνηλατημένα (DEMO-RAF-*) ή από το OpenStreetMap (DEMO-FIELD-*). Ιδιοκτήτες, δηλώσεις και καταγγελίες είναι προσομοιωμένα: τίποτα εδώ δεν αποτελεί ισχυρισμό για πραγματικό ακίνητο. Οι κωδικοί DEMO-* δεν είναι ΚΑΕΚ.",
    en: "Satellite scenes and orthophotos are real. Outlines are hand-traced (DEMO-RAF-*) or from OpenStreetMap (DEMO-FIELD-*). Owners, declarations and complaints are simulated: nothing here is a statement about a real property. DEMO-* codes are not KAEKs.",
  },

  demoTag: { el: "Επίδειξη", en: "Demo" },
  findTitle: { el: "Εύρεση οικοπέδου", en: "Find a plot" },
  mapLayer: { el: "Υπόβαθρο χάρτη", en: "Map layer" },
  screening: { el: "Προέλεγχος", en: "Screening" },
  ndviScale: { el: "Κάτω από 0,20 γυμνό, από 0,30 και πάνω πράσινο", en: "Below 0.20 reads bare, 0.30 and up reads green" },
  insetLabel: {
    el: "Κάθε τετράγωνο είναι 10 μ., ένα εικονοστοιχείο Sentinel-2. Μετράμε μόνο μέσα στη διακεκομμένη, 10 μ. από το όριο.",
    en: "Each square is 10 m, one Sentinel-2 pixel. Only the area inside the dashed line, 10 m in from the edge, is measured.",
  },
  noInsetLabel: {
    el: "Κάθε τετράγωνο είναι 10 μ., ένα εικονοστοιχείο Sentinel-2. Τίποτα δεν μένει 10 μ. μέσα από το όριο, άρα ο δορυφόρος δεν μπορεί να το μετρήσει.",
    en: "Each square is 10 m, one Sentinel-2 pixel. Nothing is left 10 m in from the edge, so the satellite cannot measure this plot.",
  },
  duty: { el: "υπόχρεα οικόπεδα", en: "plots under the duty" },
  tallyLead: {
    el: "από {n} υπόχρεα οικόπεδα έχουν δηλωθεί καθαρισμένα",
    en: "of {n} plots under the duty are declared cleaned",
  },
  flaggedOn: { el: "Σημειώθηκε για αυτοψία στις", en: "Flagged for inspection on" },
  landing: {
    title: {
      el: "Δορυφορικός έλεγχος δηλώσεων καθαρισμού για δήμους",
      en: "Satellite checks of plot-cleaning declarations for municipalities",
    },
    lead: {
      el: "Το myField βάζει κάθε δήλωση δίπλα σε δύο λήψεις Sentinel-2 και στην ορθοφωτογραφία του Κτηματολογίου, και δείχνει στον υπάλληλο πολιτικής προστασίας ποια οικόπεδα αξίζουν αυτοψία.",
      en: "myField sets each declaration beside two Sentinel-2 scenes and the Cadastre orthophoto, and shows the civil-protection officer which plots are worth a site visit.",
    },
    signIn: { el: "Σύνδεση υπαλλήλου", en: "Officer sign-in" },
    name: { el: "Το όνομά σας", en: "Your name" },
    namePlaceholder: { el: "π.χ. Μ. Παπαδοπούλου", en: "e.g. M. Papadopoulou" },
    nameHint: {
      el: "Προαιρετικό. Εμφανίζεται στον πίνακα και μένει σε αυτόν τον περιηγητή.",
      en: "Optional. Shown on the dashboard and kept in this browser.",
    },
    enter: { el: "Άνοιγμα πίνακα δήμου", en: "Open the dashboard" },
    continueAs: { el: "Συνέχεια ως {name}", en: "Continue as {name}" },
    switchUser: { el: "Σύνδεση με άλλο όνομα", en: "Sign in with another name" },
    noAuth: {
      el: "Επίδειξη: δεν χρειάζεται λογαριασμός ή κωδικός. Η πραγματική σύνδεση υπαλλήλων δεν είναι συνδεδεμένη.",
      en: "Demo: no account or password. Real staff sign-in is not connected.",
    },
    ownerTitle: { el: "Για ιδιοκτήτες οικοπέδων", en: "For plot owners" },
    ownerBody: {
      el: "Η δήλωση καθαρισμού υποβάλλεται και φαίνεται στην επίσημη υπηρεσία του gov.gr. Το myField το χρησιμοποιούν μόνο οι δήμοι.",
      en: "Cleaning declarations are filed and shown on the official gov.gr service. myField is used by municipalities only.",
    },
    ownerLink: { el: "Δείτε τη δήλωσή σας στο gov.gr", en: "See your declaration on gov.gr" },
    ownerUrl: "https://www.gov.gr/el/services/1001947/delose-katharismou-oikopedou",
    stepsTitle: { el: "Τρία βήματα ανά οικόπεδο", en: "Three steps per plot" },
    steps: [
      {
        el: "Πληκτρολογήστε τον κωδικό. Το οικόπεδο ανοίγει πάνω στην ορθοφωτογραφία του Κτηματολογίου.",
        en: "Type its code. The plot opens on the Cadastre orthophoto.",
      },
      {
        el: "Ο δείκτης βλάστησης από τις λήψεις Sentinel-2 της {spring} και της {june}, μαζί με ό,τι βλέπει το μοντέλο μέσα στο όριο.",
        en: "The vegetation index from the Sentinel-2 scenes of {spring} and {june}, read with what the model sees inside the outline.",
      },
      {
        el: "Η εκτίμηση δεν είναι κρίση συμμόρφωσης. Η αυτοψία αποφασίζει, και τα σημειωμένα οικόπεδα μετρώνται στον πίνακα.",
        en: "The reading is not a compliance finding. A site visit decides, and flagged plots are counted on the dashboard.",
      },
    ] as Localized[],
    stepAlt: [
      { el: "Ορθοφωτογραφία Κτηματολογίου του DEMO-RAF-017 με το όριό του", en: "Cadastre orthophoto of DEMO-RAF-017 with its outline" },
      { el: "Λήψη Sentinel-2 της άνοιξης πάνω στο DEMO-RAF-017", en: "Spring Sentinel-2 scene over DEMO-RAF-017" },
      { el: "Λήψη Sentinel-2 του Ιουνίου πάνω στο DEMO-RAF-017", en: "June Sentinel-2 scene over DEMO-RAF-017" },
    ] as Localized[],
    planLabel: {
      el: "Τοπογραφικό των 24 οικοπέδων επίδειξης στο Δράφι, χρωματισμένα κατά τον προέλεγχο.",
      en: "Site plan of the 24 demo plots in Drafi, coloured by screening result.",
    },
    plots: { el: "Οικόπεδα", en: "Plots" },
    declarations: { el: "Δηλώσεις (προσομοίωση)", en: "Declarations (simulated)" },
    scenes: { el: "Λήψεις Sentinel-2", en: "Sentinel-2 scenes" },
    scale: { el: "Κλίμακα", en: "Scale" },
    settlementEdge: { el: "Όριο οικισμού", en: "Settlement edge" },
    sources: {
      el: "Ορθοφωτογραφίες: Ελληνικό Κτηματολόγιο. Δορυφορικές λήψεις: Copernicus Sentinel-2 L2A. Πλαίσιο:",
      en: "Orthophotos: Hellenic Cadastre. Satellite scenes: Copernicus Sentinel-2 L2A. Rules:",
    },
  },
  film: {
    stageLabel: {
      el: "Ταινία: από την τροχιά του Sentinel-2 ως το οικόπεδο {code} στα Μεσόγεια, με τις δύο λήψεις και την εκτίμηση.",
      en: "Film: from Sentinel-2's orbit down to plot {code} in the Mesogeia plain, with the two scenes and the assessment.",
    },
    chapters: {
      orbit: { el: "Τροχιά", en: "Orbit" },
      scan: { el: "Σάρωση", en: "Scan" },
      descent: { el: "Οικόπεδο", en: "Plot" },
      analysis: { el: "Ανάλυση", en: "Analysis" },
      result: { el: "Εκτίμηση", en: "Assessment" },
    },
    chaptersLabel: { el: "Κεφάλαια ταινίας", en: "Film chapters" },
    lines: {
      orbit: {
        el: "Το Sentinel-2 φωτογραφίζει όλη την Ελλάδα κάθε λίγες ημέρες.",
        en: "Sentinel-2 photographs all of Greece every few days.",
      },
      scan: {
        el: "Κάθε πέρασμα καλύπτει λωρίδα 290 χλμ., με εικονοστοιχεία 10 μέτρων.",
        en: "Each pass covers a strip 290 km wide, in 10-metre pixels.",
      },
      descent: {
        el: "Το myField κοιτά ένα οικόπεδο τη φορά. Στην επίδειξη, το {code} δηλώθηκε καθαρισμένο στις {date}.",
        en: "myField looks at one plot at a time. In this demo, {code} was declared cleaned on {date}.",
      },
      april: {
        el: "Έτσι το βλέπει ο δορυφόρος: {n} εικονοστοιχεία μέσα στο όριο. {date}: δείκτης βλάστησης {ndvi}.",
        en: "This is what the satellite sees: {n} pixels inside the outline. {date}: vegetation index {ndvi}.",
      },
      june: {
        el: "{date}, {days} ημέρες μετά τη δήλωση: {ndvi}.",
        en: "{date}, {days} days after the declaration: {ndvi}.",
      },
    },
    sources: {
      mosaic: {
        el: "Εικόνα: Sentinel-2 cloudless 2016, s2maps.eu, EOX IT Services GmbH (τροποποιημένα δεδομένα Copernicus Sentinel), CC BY 4.0",
        en: "Imagery: Sentinel-2 cloudless 2016, s2maps.eu, EOX IT Services GmbH (modified Copernicus Sentinel data), CC BY 4.0",
      },
      ortho: {
        el: "Εικόνα: ορθοφωτογραφία Κτηματολογίου, ημερομηνία λήψης μη δημοσιευμένη",
        en: "Imagery: Cadastre orthophoto, capture date not published",
      },
      scenes: { el: "Εικόνα: Sentinel-2 L2A, {date}", en: "Imagery: Sentinel-2 L2A, {date}" },
    },
    skip: { el: "Παράλειψη", en: "Skip" },
    replay: { el: "Επανάληψη", en: "Replay" },
    decides: {
      el: "Προέλεγχος, όχι κρίση συμμόρφωσης. Η αυτοψία αποφασίζει.",
      en: "A screening, not a compliance finding. A site visit decides.",
    },
    openPlot: { el: "Άνοιγμα του {code}", en: "Open {code}" },
    cardTo: { el: "έως", en: "to" },
    cardNote: {
      el: "{from} → {to} · Sentinel-2 · Προέλεγχος, όχι κρίση συμμόρφωσης",
      en: "{from} → {to} · Sentinel-2 · Screening, not a compliance finding",
    },
    signInShort: { el: "Σύνδεση", en: "Sign in" },
    close: { el: "Κλείσιμο", en: "Close" },
    planTitle: { el: "Και τα {n} οικόπεδα της επίδειξης", en: "All {n} demo plots" },
    planBody: {
      el: "Κάθε περίγραμμα είναι ένα οικόπεδο στο Δράφι, χρωματισμένο κατά τον προέλεγχο. Επιλέξτε ένα για να το ανοίξετε.",
      en: "Each outline is one plot in Drafi, coloured by its screening result. Pick one to open it.",
    },
    mosaicCredit: {
      el: "Μωσαϊκό πτήσης: Sentinel-2 cloudless, s2maps.eu, EOX IT Services GmbH (περιέχει τροποποιημένα δεδομένα Copernicus Sentinel 2016 και 2017), CC BY 4.0.",
      en: "Flight mosaic: Sentinel-2 cloudless, s2maps.eu, by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016 and 2017), CC BY 4.0.",
    },
  },
  signOut: { el: "Αποσύνδεση", en: "Sign out" },
  demoOfficer: { el: "Υπάλληλος επίδειξης", en: "Demo officer" },
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
    worked_before_season: {
      el: "Πριν από την 1η Μαΐου ο δείκτης βλάστησης πέφτει από πράσινο σε γυμνό έδαφος μέσα σε 45 ημέρες και μένει χαμηλά: το έδαφος δουλεύτηκε (όργωμα, φρεζάρισμα ή κοπή).",
      en: "Before 1 May the vegetation index goes from green to bare ground within 45 days and stays down: the ground was worked (ploughed, rotavated or cut).",
    },
    worked_after_season_start: {
      el: "Το έδαφος δουλεύτηκε, αλλά μετά την έναρξη της αντιπυρικής περιόδου (1η Μαΐου).",
      en: "The ground was worked, but after the fire season opened on 1 May.",
    },
    covered_at_season_start: {
      el: "Καμία γρήγορη πτώση σε γυμνό έδαφος σε όλο το έτος. Την 1η Μαΐου ο δείκτης είναι ακόμα υψηλός και μετά πέφτει σιγά σιγά, όπως όταν η βλάστηση ξεραίνεται επιτόπου.",
      en: "No fast drop to bare ground all year. On 1 May the index is still high, then it slides down slowly, as when vegetation dries where it stands.",
    },
    series_inconclusive: {
      el: "Η καμπύλη του έτους δεν δείχνει ούτε καθαρό δούλεμα του εδάφους ούτε πράσινη κάλυψη στην έναρξη της περιόδου.",
      en: "The year's curve shows neither clearly worked ground nor green cover at the start of the season.",
    },
  } satisfies Record<RuleReason, Localized>,
  source: {
    ai_live: { el: "Ανάλυση ΤΝ, ζωντανή", en: "AI analysis, live" },
    ai_saved: { el: "Ανάλυση ΤΝ, αποθηκευμένη", en: "AI analysis, saved" },
    rules_only: { el: "Μόνο μετρήσεις, χωρίς ΤΝ", en: "Measurements only, no AI" },
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
  declaredCleaned: { el: "Δηλώθηκε καθαρισμένο στις", en: "Declared cleaned on" },
  none: { el: "Καμία", en: "None" },
  complaint: { el: "Καταγγελία (προσομοίωση)", en: "Complaint (simulated)" },

  imagery: { el: "Εικόνες", en: "Imagery" },
  orthoCaption: { el: "Ορθοφωτογραφία Κτηματολογίου", en: "Cadastre orthophoto" },
  orthoDate: { el: "ημερομηνία λήψης μη δημοσιευμένη", en: "capture date not published" },
  s2Caption: { el: "Sentinel-2, 10 μ.", en: "Sentinel-2, 10 m" },
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
