export type Lang = "el" | "en";

export type Localized = { el: string; en: string };

export type ZoneClass =
  | "in_plan"
  | "in_settlement"
  | "within_100m"
  | "forest_excluded"
  | "cultivated_excluded"
  | "garden_excluded"
  | "inaccessible_excluded";

export type SlopeClass = "low" | "moderate" | "steep";

export type QueueBucket =
  | "no_declaration"
  | "declaration_vs_imagery"
  | "complaint"
  | "out_of_scope";

export type ImageryStatus = "cleaned" | "uncleared" | "inconclusive";

export type ImageryReason =
  | "interior_buffer_10m"
  | "no_scene_pair"
  | "seasonal_index";

export type ReplyIntent =
  | "cleared_last_week"
  | "not_my_plot"
  | "silence"
  | "dry_cover_photo"
  | "unknown";

export type CaseStatus =
  | "open"
  | "awaiting_officer_review"
  | "open_joint_liability"
  | "follow_up_needed"
  | "evidence_uncleared";

export type ParcelProperties = {
  id: string;
  areaM2: number;
  street: Localized;
  zone: ZoneClass;
  owner: string;
  forestEdge: boolean;
  nearbyHouses: boolean;
  sensitiveSite: boolean;
  slopeClass: SlopeClass;
  poorEscapeRoad: boolean;
  enclosed: boolean;
  exclusionNote?: Localized;
};

export type ParcelFeature = {
  type: "Feature";
  id: string;
  geometry: GeoJSON.Polygon;
  properties: ParcelProperties;
};

export type Declaration = {
  parcelId: string;
  submittedAt: string;
  claimedCleaned: boolean;
  registryRef: string;
};

export type Complaint = {
  id: string;
  parcelId: string;
  filedAt: string;
  text: Localized;
};

export type ImageryVerdict = {
  parcelId: string;
  status: ImageryStatus;
  reason: ImageryReason;
  areaM2: number;
  interiorAfterBufferM2: number;
  springNdvi?: number;
  juneNdvi?: number;
  springScene?: string;
  juneScene?: string;
};

export type FineBreakdown = {
  parcelId: string;
  areaM2: number;
  cleaned: boolean;
  declared: boolean;
  cleaningFineEur: number;
  declarationFineEur: number;
  totalEur: number;
  reduction50Note: string;
  prosecutorReferralPending: boolean;
};

export type RouteStop = {
  parcelId: string;
  rank: number;
  score: number;
  inStatutorySample: boolean;
  reasons: string[];
};

export type ThreadMessage = {
  id: string;
  from: "desk" | "owner";
  at: string;
  intent?: ReplyIntent;
  text: Localized;
  photoSrc?: string;
};

export type OwnerThread = {
  parcelId: string;
  status: CaseStatus;
  messages: ThreadMessage[];
};

export type DraftKind = "annex_a" | "annex_d";

export type DraftBundle = {
  parcelId: string;
  annexA: Record<string, string>;
  annexD: Record<string, string>;
  fines: FineBreakdown;
  status: "for_signature_not_notified";
};

export type AgentLogEntry = {
  id: string;
  at: string;
  fn: string;
  summary: Localized;
  detail?: string;
};

export type Scenario = {
  meta: {
    title: string;
    municipality: Localized;
    settlement: Localized;
    deskDate: string;
    declarationDeadline: string;
    law: { primary: string; extension: string; pdf: string };
    geometrySource: string;
    geometryNote: string;
    wfsAttempt: string;
    orthophotoWms: string;
    imagery: {
      springScene: string;
      juneScene: string;
      springDate: string;
      juneDate: string;
      sampledParcelId: string;
      springNdvi: number;
      juneNdvi: number;
      delta: number;
      note: string;
    };
    banner: Localized;
  };
  parcels: GeoJSON.FeatureCollection;
  declarations: Declaration[];
  complaints: Complaint[];
  settlementBoundary: GeoJSON.Polygon;
  landmarks: { id: string; name: Localized; coordinates: [number, number] }[];
};
