import type { Feature, LineString, Point, Polygon, Position } from "geojson";

export type Locale = "el" | "en";

export type Localized = { el: string; en: string };

export type Exclusion =
  | "forest_law"
  | "cultivated"
  | "garden"
  | "inaccessible";

export type SlopeClass = "low" | "moderate" | "steep";

export type ZoneClass =
  | "in_plan"
  | "in_settlement"
  | "within_100m"
  | "out_of_scope"
  | "outside_duty";

export type ZoneReason =
  | "in_plan"
  | "in_settlement"
  | "within_100m"
  | "forest_law"
  | "cultivated"
  | "garden"
  | "inaccessible"
  | "outside_duty";

export type ZoneResult = {
  class: ZoneClass;
  reason: ZoneReason;
  article: string;
  inDuty: boolean;
};

export type ParcelRecord = {
  id: string;
  geometry: Polygon;
  centroid: Point;
  areaM2: number;
  localOriginM: { x: number; y: number };
  exclusion: Exclusion | null;
  slope: SlopeClass;
  poorEscape: boolean;
  powerline: boolean;
  frontage: string;
};

export type DeclarationRecord = {
  id: string;
  parcelId: string;
  submittedAt: string;
  claimedCleaned: boolean;
  channel: string;
};

export type ComplaintRecord = {
  id: string;
  parcelId: string;
  submittedAt: string;
  severity: "typical" | "serious" | "very_serious" | "urgent";
  text: string;
};

export type SensitiveSite = {
  id: string;
  kind: "school";
  label: Localized;
  geometry: Polygon;
};

export type Scenario = {
  meta: {
    municipality: Localized;
    settlement: Localized;
    region: Localized;
    deskDate: string;
    deadline: string;
    legalDeadline: string;
    extension: string;
    instrument: string;
    disclaimer: Localized;
    imageryNote: Localized;
    wfsAttempt: string;
    origin: { lon: number; lat: number };
    metersPerDegree: { lon: number; lat: number };
  };
  context: {
    inPlan: Polygon;
    settlement: Polygon;
    forest: Polygon;
    sensitiveSites: SensitiveSite[];
    houses: Point[];
    road: LineString;
  };
  parcels: ParcelRecord[];
  declarations: DeclarationRecord[];
  complaints: ComplaintRecord[];
  owners: Record<string, { label: string; channel: string }>;
  imagerySnapshots?: Record<string, ImagerySnapshot>;
};

export type ImagerySnapshot = {
  spring: SceneMeta;
  summer: SceneMeta;
  ndviSpring: number;
  ndviSummer: number;
  ndviDelta: number;
  sampledInteriorM2: number;
  note: string;
};

export type SceneMeta = {
  id: string;
  datetime: string;
  cloudCover: number;
  collection: string;
};

export type ImageryVerdict =
  | {
      kind: "inconclusive";
      reason: "too_small" | "no_scene_pair";
      sentinelMeters: 10;
      interiorM2: number;
      parcelM2: number;
    }
  | {
      kind: "uncleared" | "cleared";
      reason: "ndvi_pair";
      sentinelMeters: 10;
      interiorM2: number;
      parcelM2: number;
      ndviSpring: number;
      ndviSummer: number;
      ndviDelta: number;
      spring: SceneMeta;
      summer: SceneMeta;
    };

export type ReplyIntent =
  | "already_cleared"
  | "not_my_plot"
  | "photo_still_dry"
  | "silence"
  | "unknown";

export type CaseStatus =
  | "gap"
  | "flagged_declaration"
  | "complaint"
  | "awaiting_reply"
  | "awaiting_officer_review"
  | "out_of_scope"
  | "quiet";

export type RiskFlags = {
  forestEdge: boolean;
  nearHouses: boolean;
  sensitiveSite: boolean;
  slope: SlopeClass;
  poorEscape: boolean;
  powerline: boolean;
  openComplaint: boolean;
};

export type ParcelCase = {
  parcel: ParcelRecord;
  zone: ZoneResult;
  declaration: DeclarationRecord | null;
  complaint: ComplaintRecord | null;
  verdict: ImageryVerdict;
  risk: RiskFlags;
  riskScore: number;
  status: CaseStatus;
  ownerLabel: string;
};

export type RouteStop = {
  parcelId: string;
  rank: number;
  riskScore: number;
  inDeclarationSample: boolean;
  why: string[];
};

export type DayRoute = {
  date: string;
  stops: RouteStop[];
  declarationCount: number;
  statutorySampleSize: number;
  stopsInSample: number;
  stopsUndeclared: number;
};

export type FineBreakdown = {
  cleaning: number | null;
  undeclared: number | null;
  total: number;
  cleaningReducedIfCompliant: number | null;
  falseDeclarationSuspected: boolean;
  notes: string[];
};

export type DraftBundle = {
  parcelId: string;
  inspection: InspectionDraft;
  fine: FineDraft;
};

export type InspectionDraft = {
  annex: "Α";
  title: string;
  fields: { label: string; value: string }[];
  findings: string[];
  statusLine: string;
};

export type FineDraft = {
  annex: "Δ";
  title: string;
  fields: { label: string; value: string }[];
  amounts: FineBreakdown;
  legal: string[];
  statusLine: string;
};

export type LogEntry = {
  id: string;
  at: string;
  fn: string;
  summary: string;
};

export type ThreadMessage = {
  id: string;
  at: string;
  from: "desk" | "owner";
  body: string;
  intent?: ReplyIntent;
  photoSrc?: string;
};

export type DeskResult = {
  cases: ParcelCase[];
  gaps: ParcelCase[];
  route: DayRoute;
  log: LogEntry[];
};

export type Position2 = Position;
export type PolygonFeature = Feature<Polygon>;
