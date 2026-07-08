// API Types based on OpenAPI specification

// ============ Common ============
export interface PaginatedResponse<T> {
  data: T[];
  links?: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
  meta?: {
    current_page: number;
    from?: number;
    last_page: number;
    per_page: number;
    to?: number;
    total: number;
  };
}

// ============ Authentication ============
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

// System login response has different structure
export interface SystemLoginResponse {
  "@context"?: string;
  "@type"?: string;
  actionStatus?: string;
  result: {
    admin: {
      identifier: string;
      name: string;
      email: string;
      isActive: boolean;
    };
    token: string;
  };
}

// Tenant lookup types
export interface TenantInfo {
  identifier: string;
  name: string;
  url: string;
}

export interface LookupResponse {
  "@context"?: string;
  "@type"?: string;
  actionStatus: string;
  result: TenantInfo[];
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface CurrentUserOrganization {
  "@type"?: string;
  identifier: string;
  name: string;
}

export interface CurrentUser {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  email: string;
  emailVerified: boolean;
  active: boolean;
  dateCreated: string;
  dateModified: string;
  roles: UserRole[];
  permissions: string[];
  employmentType?: "employee" | "guest";
  memberOf: CurrentUserOrganization;
  homeOrganization?: {
    "@type"?: string;
    name: string;
  };
}

// ============ Roles ============
export interface Role {
  id: number;
  name: string;
  type: "employee" | "guest";
}

// System Admin - Tenant Role Management
export interface TenantRole {
  "@type"?: string;
  id: string;
  name: string;
  additionalType: "employee" | "guest";
  permissions: string[];
  usersCount: number;
  dateCreated?: string;
  dateModified?: string;
}

export interface CreateTenantRoleRequest {
  name: string;
  type: "employee" | "guest";
  permissions: string[];
}

export interface UpdateTenantRoleRequest {
  name?: string;
  permissions?: string[];
}

// ============ Users ============
export type UserRole =
  | "admin"
  | "main user"
  | "invitation manager"
  | "user"
  | "yard"
  | "surveyor"
  | "painter"
  | "owner representative";

// API response format from backend
export interface ApiUser {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  dateCreated?: string;
  dateModified?: string;
  roles: string[];
  active?: boolean;
  employmentType?: "employee" | "guest";
  memberOf?: {
    identifier: string;
    name: string;
  };
  homeOrganization?: {
    "@type"?: string;
    name: string;
  };
}

// Frontend User format (matches backend)
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  dateCreated: string;
  dateModified: string;
  roles: UserRole[];
  active: boolean;
  employmentType?: "employee" | "guest";
  memberOf?: {
    identifier: string;
    name: string;
  };
  homeOrganization?: {
    name: string;
  };
}

// Transform API user to frontend User
export function mapApiUserToUser(apiUser: ApiUser): User {
  return {
    id: String(apiUser.identifier),
    name: apiUser.name,
    email: apiUser.email,
    emailVerified: apiUser.emailVerified ?? false,
    dateCreated: apiUser.dateCreated ?? "",
    dateModified: apiUser.dateModified ?? "",
    roles: apiUser.roles as UserRole[],
    active: apiUser.active ?? true,
    employmentType: apiUser.employmentType,
    memberOf: apiUser.memberOf,
    homeOrganization: apiUser.homeOrganization,
  };
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  roles?: UserRole[];
  active?: boolean;
}

// ============ Invitations ============
export type InvitationActionStatus =
  | "PotentialActionStatus"
  | "CompletedActionStatus"
  | "FailedActionStatus";

export interface InvitationRecipient {
  "@type"?: string;
  email: string;
}

export interface InvitationAgent {
  "@type"?: string;
  identifier: string;
  name: string;
  email: string;
}

export interface Invitation {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  recipient: InvitationRecipient;
  agent: InvitationAgent;
  actionStatus: InvitationActionStatus;
  role: string;
  dateCreated: string;
  expires: string;
  dateAccepted: string | null;
  dateDeclined: string | null;
  isExpired: boolean;
  object?: {
    roleName?: string;
    employmentType?: "employee" | "guest";
    homeOrganization?: string;
  };
}

export interface CreateInvitationRequest {
  email: string;
  role: string;
  employment_type?: "employee" | "guest";
  home_organization_name?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  name: string;
  password: string;
  password_confirmation: string;
}

export interface DeclineInvitationRequest {
  token: string;
}

// ============ Registration Requests ============
export type RegistrationRequestActionStatus =
  | "PotentialActionStatus"
  | "CompletedActionStatus"
  | "FailedActionStatus";

export interface RegistrationRequestAgent {
  "@type"?: string;
  name: string;
  email: string;
}

export interface RegistrationRequestProcessedBy {
  "@type"?: string;
  identifier: string;
  name: string;
  email: string;
}

export interface RegistrationRequest {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  agent: RegistrationRequestAgent;
  actionStatus: RegistrationRequestActionStatus;
  dateCreated: string;
  processedBy?: RegistrationRequestProcessedBy;
  processedAt?: string;
}

export interface CreateRegistrationRequest {
  name: string;
  email: string;
  password: string;
}

export interface ProcessRegistrationRequest {
  action: "approve" | "reject";
  role?: string;
}

// ============ Tenants (System) ============
export interface Tenant {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  alternateName: string;
  isActive: boolean;
  restrictedPermissions?: string[];
  dateCreated: string;
  dateModified: string;
}

export interface CreateTenantRequest {
  name: string;
  admin_email: string;
  restricted_permissions?: string[];
  subscription: {
    max_projects: number;
    max_users: number;
  };
}

export interface UpdateTenantRequest {
  restricted_permissions?: string[];
}

export interface RegisterAdminRequest {
  token: string;
  email: string;
  name: string;
  password: string;
  password_confirmation: string;
}

export interface RegisterAdminResponse {
  token: string;
  user: User;
}

export interface CreateTenantUserRequest {
  tenantId: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

// Response from /api/tenants/{slug}/registration-info
export interface TenantRegistrationInfo {
  name: string;
  slug: string;
}

// Response from /api/guest-role-permissions
export interface GuestRolePermissions {
  "@type"?: string;
  itemListElement: Array<{
    "@type"?: string;
    roleName: string;
  }>;
  numberOfItems: number;
}

// ============ API Error ============
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  /** Laravel-style validation errors (only on 422 responses). Keys are
   *  dot-notation paths into the request body (e.g. `stages.0.name`). */
  errors?: Record<string, string[]>;
}

// ============ Shipyards ============
export interface ShipyardContactPoint {
  "@type"?: string;
  name?: string;
  email?: string;
  telephone?: string;
}

export interface Shipyard {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  address?: string;
  contactPoint?: ShipyardContactPoint;
  /** True for the reserved "Quayside" entry — a synthetic shipyard the
   *  backend owns per tenant. Projects tied to it can carry a free-text
   *  `quaysideNote` describing the mooring location. Hide edit/delete
   *  affordances and prefer showing it as a fixed third option in the
   *  create/edit project picker. */
  isQuayside?: boolean;
  dateCreated?: string;
  dateModified?: string;
}

export interface CreateShipyardRequest {
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
}

export interface UpdateShipyardRequest {
  name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
}

// ============ Projects ============
export type ProjectType = "new_build" | "refit";
export type ProjectStatus = "setup" | "active" | "archived" | "completed";

export interface ProjectProducer {
  "@type"?: string;
  identifier: string;
  name: string;
  contactPoint?: ShipyardContactPoint;
  /** Mirrors `Shipyard.isQuayside`. Present on the nested producer so
   *  display surfaces can flag Quayside projects without a second
   *  fetch. */
  isQuayside?: boolean;
}

export interface ProjectAuthor {
  "@type"?: string;
  identifier?: string; // Optional - only present for Person type
  name: string;
  email?: string; // Optional - only present for Person type
}

// General Arrangement document with optional image data for Leaflet viewer
export interface GeneralArrangement {
  "@type"?: string;
  identifier: string;
  name: string;
  contentUrl: string; // URL to download the original PDF
  imageUrl?: string; // URL to the rendered PNG image (for Leaflet viewer)
  imageWidth?: number; // Image width in pixels
  imageHeight?: number; // Image height in pixels
  dateCreated?: string;
  dateModified?: string;
}

export interface Project {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  description?: string;
  externalId?: string;
  additionalType: ProjectType;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  // Can be a string URL (legacy) or GeneralArrangement object (new)
  generalArrangement?: string | GeneralArrangement;
  dateCreated?: string;
  dateModified?: string;
  producer?: ProjectProducer;
  /** Free-text description of the mooring location, only set when the
   *  project's producer is the Quayside shipyard. Absent (not `null`)
   *  when no note was supplied. */
  quaysideNote?: string;
  author?: ProjectAuthor;
  // Backend-provided membership info (avoids N+1 API calls)
  isMember?: boolean;
  memberCount?: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  project_type: ProjectType;
  shipyard_id?: string;
  /** Only meaningful when `shipyard_id` points at the Quayside
   *  shipyard. Optional free-text, max 5000 chars server-side. */
  quayside_note?: string | null;
  start_date?: string;
  end_date?: string;
  external_id?: string;
  /** When false the kickoff-meeting setup task is omitted entirely —
   *  no scheduling, no sign-off, no kickoff document. The project can
   *  be activated without completing a kickoff. Defaults to true on
   *  the server when omitted. */
  include_kickoff_meeting?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  project_type?: ProjectType;
  status?: ProjectStatus;
  shipyard_id?: string;
  /** Send `null` to clear an existing note; omit to leave unchanged. */
  quayside_note?: string | null;
  start_date?: string;
  end_date?: string;
  external_id?: string;
}

export interface UpdateActionResponse {
  "@type"?: string;
  actionStatus?: "CompletedActionStatus" | "FailedActionStatus";
  result: Project;
}

// ============ Document Types ============
export interface DocumentTypeAssignee {
  "@type"?: string;
  identifier: string;
  name: string;
  email: string;
  hasSigned: boolean;
  signedAt: string | null;
  assignedBy: {
    identifier: string;
    name: string;
  };
  message: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  isCompleted: boolean;
  notifiedAt: string | null;
  completedAt: string | null;
}

export interface DocumentType {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  isRequired: boolean;
  isLocked: boolean;
  /** Document types backed by a server-side feature (e.g. release forms
   *  generated from stage data). Locked + uploads via the manual
   *  POST endpoint are rejected with 422. Hide them from the upload-type
   *  picker — content for these types is created elsewhere in the UI. */
  isSystemManaged: boolean;
  documentCount: number;
  dateCreated: string;
  dateModified: string;
  assignees?: DocumentTypeAssignee[];
}

export interface CreateDocumentTypeRequest {
  name: string;
  is_required?: boolean;
  sort_order?: number;
}

export interface UpdateDocumentTypeRequest {
  name?: string;
  is_required?: boolean;
  sort_order?: number;
}

export interface AddDocumentTypeAssigneeRequest {
  user_id: string;
  message?: string;
  due_date?: string;
  send_notification?: boolean;
}

// ============ Documents ============
export interface DocumentAuthor {
  "@type"?: string;
  identifier?: string; // Optional - only present for Person type
  name: string;
  email?: string; // Optional - only present for Person type
}

export interface DocumentCategory {
  "@type"?: string;
  identifier: string;
  name: string;
}

// Document acknowledgement for regular documents
export interface DocumentAcknowledgement {
  "@type"?: "Person" | "AgreeAction";
  identifier: string;
  name: string;
  email?: string;
  // API may return agent as nested object
  agent?: {
    identifier: string;
    name: string;
  };
  hasRead: boolean;
  readAt: string | null;
  hasAgreed: boolean | null;
  agreedAt: string | null;
  disagreementReason: string | null;
}

// Document status based on acknowledgements
export type DocumentStatus = "draft" | "pending_review" | "active" | "disputed";

export interface Document {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  description?: string;
  fileName: string;
  encodingFormat: string;
  contentSize: string;
  contentSizeBytes: number;
  dateCreated: string;
  dateModified: string;
  author: DocumentAuthor;
  category: DocumentCategory;
  uploadedBy?: string;
  uploadedByName?: string;
  // Acknowledgement tracking (legacy)
  acknowledgements?: DocumentAcknowledgement[];
  requiredAcknowledgers?: string[];
  status?: DocumentStatus;
  allAcknowledged?: boolean;
  acknowledgementCount?: number;
  agreedCount?: number;
  disagreedCount?: number;
  totalRequiredAcknowledgers?: number;
  totalAssignees?: number;
  // Approval workflow (new — present when assignees are loaded)
  /** null = no review flow started, otherwise reflects the current phase. */
  approvalStatus?: DocumentApprovalStatus;
  reviewers?: DocumentReviewer[];
  allApproved?: boolean;
  anyDeclined?: boolean;
  pendingReviewCount?: number;
}

export interface UploadDocumentRequest {
  title: string;
  description?: string;
  file: File;
  /** Extra reviewer IDs on top of the automatically assigned ones
   *  (kickoff attendees or project signers). The backend merges both
   *  sets; duplicates are ignored. */
  reviewer_ids?: string[];
}

/** Approval lifecycle of a document. `null` means no review flow was
 *  started (e.g. no signers/attendees were available at upload time). */
export type DocumentApprovalStatus = "pending_review" | "approved" | "declined" | null;

export interface DocumentReviewer {
  "@type"?: string;
  identifier: string;
  name: string;
  hasReviewed: boolean;
  hasApproved: boolean | null;
  declineReason: string | null;
  reviewedAt: string | null;
}

// ============ Decks ============

/** Axis-aligned rectangle on the GA, stored in the legacy percentage
 *  0..100 coordinate system. Used by the deck-drawing UI as its internal
 *  shape; conversion to the wire's polygon format happens at the API
 *  boundary. Also used as the constraint rectangle for area drawing. */
export interface DeckBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DeckPlace {
  "@type"?: string;
  identifier: string;
  name: string;
  position?: number;
  stageCount?: number;
}

/** Primary polygon of a deck on the GA. Coordinates are normalized 0..1
 *  of the GA image — same scheme as `AreaPolygonPoint`. One primary
 *  polygon per deck; `null` until the user draws it. */
export interface DeckPolygon {
  identifier: string;
  name?: string;
  points: AreaPolygonPoint[];
  /** OCR meta from the backend's auto-extraction pass; only present when the
   *  backend ran a detection step. */
  ocrConfidence?: number;
  ocrLabel?: string;
}

/** A side-view polygon for the same deck. 0..N per deck, drawn on the
 *  GA image as additional shapes (typically thin strips of the yacht's
 *  side profile). */
export interface DeckSideProfilePolygon {
  identifier: string;
  name: string;
  points: AreaPolygonPoint[];
}

/** Write-side shape for the primary deck polygon. */
export interface DeckPolygonInput {
  name?: string;
  points: AreaPolygonPoint[];
}

/** Write-side shape for a side profile. `identifier` lets the backend
 *  reconcile updates vs creates within a `side_profile_polygons` replace
 *  array; omit it for a brand-new entry. */
export interface DeckSideProfilePolygonInput {
  identifier?: string;
  name?: string;
  points: AreaPolygonPoint[];
}

export interface Deck {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  description?: string;
  position: number;
  areaCount: number;
  stageCount: number;
  /** Primary polygon on the GA. `null` for decks created without one. */
  deckPolygon: DeckPolygon | null;
  /** Extra polygons on the same GA image — empty array means none. */
  sideProfilePolygons: DeckSideProfilePolygon[];
  containsPlace?: DeckPlace[];
  dateCreated: string;
  dateModified: string;
}

export interface CreateDeckRequest {
  name: string;
  description?: string;
  deck_polygon?: DeckPolygonInput | null;
  side_profile_polygons?: DeckSideProfilePolygonInput[];
}

/** Mutation semantics for the polygon fields:
 *  - omitted                       → unchanged
 *  - `deck_polygon: null`          → clear the primary polygon (422 if
 *                                     area polygons still reference it)
 *  - `side_profile_polygons: []`   → wipe all side profiles
 *  - `side_profile_polygons: [..]` → full replacement (use `identifier`
 *                                     per entry to preserve existing rows;
 *                                     omit for new ones). */
export interface UpdateDeckRequest {
  name?: string;
  description?: string;
  deck_polygon?: DeckPolygonInput | null;
  side_profile_polygons?: DeckSideProfilePolygonInput[];
}

// ============ Areas ============
export interface AreaDeck {
  "@type"?: string;
  identifier: string;
  name: string;
}

export interface AreaStage {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  position: number;
  status: {
    "@type"?: string;
    name: StageStatus;
  };
}

/** Normalized 0..1 coords on the GA image — same scheme as GaPin. Polygon
 *  is closed implicitly (last vertex connects back to first). */
export interface AreaPolygonPoint {
  x: number;
  y: number;
}

/** One polygon per parent — the same area is drawn separately on the
 *  primary deck polygon and on each of the deck's side profile polygons.
 *  `parentPolygonId` matches either `Deck.deckPolygon.identifier` or one
 *  of `Deck.sideProfilePolygons[i].identifier`. */
export interface AreaPolygonEntry {
  identifier: string;
  parentPolygonId: string;
  points: AreaPolygonPoint[];
}

export interface Area {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  description?: string;
  position: number;
  stageCount: number;
  completedStageCount?: number;
  inProgressStageCount?: number;
  containedInPlace?: AreaDeck;
  containsPlace?: AreaStage[];
  /** Polygon outline on the GA in normalized 0..1 coords. Legacy single-
   *  polygon field kept by the backend for one release; new code should
   *  prefer `polygons` so per-placement outlines are visible. */
  polygon?: AreaPolygonPoint[];
  /** Per-placement polygons. Each entry is the same area projected onto a
   *  different view (primary deck rectangle vs each side profile). */
  polygons?: AreaPolygonEntry[];
  dateCreated: string;
  dateModified: string;
}

/** A single stage entry when creating an area with create_stages=true.
 *  Discriminated by `type`: template entries reference an existing
 *  StageTemplate by id; custom entries supply their own fields. The order
 *  of the surrounding array is the order the stages will be created in. */
export type CreateAreaStageInput =
  | { type: "template"; stage_template_id: string }
  | {
      type: "custom";
      name: string;
      description?: string;
      /** Hex color (`#RRGGBB`) for the new stage. Template entries inherit
       *  their color from the referenced template — only custom entries need
       *  to supply one. */
      color?: string | null;
    };

/** Replace-all entry for the per-parent polygons payload. `parentPolygonId`
 *  must reference either the deck's primary polygon or one of its side
 *  profile polygons. Min 3 vertices, all normalized 0..1. */
export interface AreaPolygonInput {
  parentPolygonId: string;
  points: AreaPolygonPoint[];
}

export interface CreateAreaRequest {
  name: string;
  description?: string;
  /** Legacy single polygon. Prefer `polygons` — backend keeps both for one
   *  release. */
  polygon?: AreaPolygonPoint[];
  /** Per-placement polygons (replace-all). */
  polygons?: AreaPolygonInput[];
  /** Required. When true the backend creates stages on the new area; when
   *  false the area is created without stages and the user adds them later. */
  create_stages: boolean;
  /** Ordered list of stage entries. Mix of template references and custom
   *  stages — final stage order matches array order. Only meaningful when
   *  create_stages is true. */
  stages?: CreateAreaStageInput[];
}

export interface UpdateAreaRequest {
  name?: string;
  description?: string;
  /** Legacy single polygon. Prefer `polygons` — backend keeps both for one
   *  release. */
  polygon?: AreaPolygonPoint[];
  /** Per-placement polygons (replace-all). */
  polygons?: AreaPolygonInput[];
}

export interface BulkCreateAreasRequest {
  areas: {
    name: string;
    description?: string;
    sort_order: number;
  }[];
}

// ============ Stage Templates ============
export interface StageTemplate {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  description?: string;
  /** Hex color (`#RRGGBB`) used as the visual marker for this template and
   *  for stages instantiated from it. May be null on legacy data. */
  color: string | null;
  position: number;
  isActive: boolean;
  canDelete: boolean;
  /** Required link to the release form template that gates every stage
   *  spawned from this template. Backend guarantees it's set (non-null
   *  FK), but kept optional in the type for defensive reads. `name`
   *  may be absent depending on the endpoint (e.g. the bulk-replace
   *  response ships only the identifier). */
  releaseFormTemplate?: {
    "@type"?: string;
    identifier: string;
    name?: string;
  };
  dateCreated: string;
  dateModified: string;
}

export interface CreateStageTemplateRequest {
  name: string;
  description?: string;
  color?: string | null;
  sort_order?: number;
  is_active?: boolean;
  /** Required — every stage template must point at a release form
   *  template. Picker is mandatory in the UI. */
  release_form_template_id: string;
}

export interface UpdateStageTemplateRequest {
  name?: string;
  description?: string;
  color?: string | null;
  sort_order?: number;
  is_active?: boolean;
  /** Optional on update — omitting keeps the existing link. Sending
   *  null is rejected by the backend. */
  release_form_template_id?: string;
}

/** One row in the bulk-replace payload. `identifier=null` (or omitted) means
 *  create; a uuid means update the existing template at that id. Templates
 *  currently in the DB but absent from the payload are deleted. The array
 *  order becomes `sort_order` 0..n. */
export interface BulkStageTemplateEntry {
  identifier?: string | null;
  name: string;
  description?: string;
  color?: string | null;
  is_active?: boolean;
  /** Required per row — bulk-replace rejects entries without a release
   *  form template link. */
  release_form_template_id: string;
}

export interface BulkReplaceStageTemplatesRequest {
  stages: BulkStageTemplateEntry[];
}

export interface ReorderStageTemplatesRequest {
  order: string[];
}

// ============ Stages ============
export type StageStatus = "not_started" | "in_progress" | "pending_signoff" | "completed" | "rejected";

export interface StageArea {
  "@type"?: string;
  identifier: string;
  name: string;
}

export interface StageDeck {
  "@type"?: string;
  identifier: string;
  name: string;
}

export interface Stage {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  description?: string;
  /** Hex color (`#RRGGBB`) — snapshot at stage-creation time from the
   *  template (if any) or supplied for custom stages. May be null on
   *  legacy data. */
  color: string | null;
  position: number;
  status: {
    "@type"?: string;
    name: StageStatus;
  };
  area?: StageArea;
  deck?: StageDeck;
  template?: {
    "@type"?: string;
    identifier: string;
    name: string;
    /** Marker that this stage's template links to a release form
     *  template. The actual content is fetched on demand via the
     *  dedicated endpoint — only `identifier`, `name`, `hasFile`
     *  ship on the stage response. */
    releaseFormTemplate?: {
      "@type"?: string;
      identifier: string;
      name: string;
      hasFile: boolean;
    } | null;
  } | null;
  /** Counts of attached records that block deletion. Mirror the
   *  categories the DELETE 422 reports on, so a non-zero value on any
   *  of these means the backend will reject a delete with a clear
   *  message. UI uses them to lock the row up front. */
  punchlistItemsCount: number;
  remarksCount: number;
  releaseFormsCount: number;
  dateCreated: string;
  dateModified: string;
}

export interface CreateStageRequest {
  name: string;
  description?: string;
  color?: string | null;
  status?: StageStatus;
  sort_order?: number;
}

export interface UpdateStageRequest {
  name?: string;
  description?: string;
  color?: string | null;
  status?: StageStatus;
  sort_order?: number;
}

export interface UpdateStageStatusRequest {
  status: StageStatus;
}

export interface BulkCreateStagesRequest {
  stages: {
    name: string;
    color?: string | null;
    sort_order: number;
  }[];
}

// ============ Stage Signoffs ============
export type SignoffStatus = "pending" | "signed" | "rejected";

export interface RejectionHistoryEntry {
  rejected_by: string;
  rejected_by_name: string;
  rejected_at: string;
  notes: string;
}

export interface StageSignoff {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  actionStatus: string;
  status: SignoffStatus;
  recipient: {
    "@type"?: string;
    identifier: string;
    name: string;
    email?: string;
  };
  agent?: {
    "@type"?: string;
    identifier: string;
    name: string;
  } | null;
  object: {
    "@type"?: string;
    identifier: string;
    name: string;
  };
  signedAt: string | null;
  notes: string | null;
  hasSignature: boolean;
  rejectionHistory?: RejectionHistoryEntry[];
  dateCreated: string;
  dateModified: string;
}

export interface SignSignoffRequest {
  signature_data?: string; // Base64 image
  notes?: string;          // max 1000 chars
}

export interface RejectSignoffRequest {
  notes: string;           // Required, max 1000 chars
}

// ============ GA Pins ============
export interface GAPin {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  label: string | null;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  color: string | null; // hex color
  stage: {
    "@type"?: string;
    identifier: string;
    name: string;
    status: StageStatus;
    remarksCount: number;
    punchlistItemsCount: number;
  };
  area: {
    "@type"?: string;
    identifier: string;
    name: string;
  };
  deck: {
    "@type"?: string;
    identifier: string;
    name: string;
  };
  creator: {
    "@type"?: string;
    identifier: string;
    name: string;
  };
  punchlistItem?: {
    "@type"?: string;
    identifier: string;
    name: string;
    description: string | null;
    status: PunchlistItemStatus;
    priority: PunchlistItemPriority;
    dueDate: string | null;
    assignees: {
      identifier: string;
      name: string;
    }[];
    attachmentCount: number;
    dateCreated: string;
  };
  dateCreated: string;
  dateModified: string;
}

export interface CreateGAPinRequest {
  // GA Pin fields
  stage_id: string;
  label: string; // REQUIRED - wordt ook punchlist title
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  color?: string; // hex color

  // Punchlist item fields (optioneel)
  description?: string;
  priority?: PunchlistItemPriority; // low, medium, high
  due_date?: string; // YYYY-MM-DD
  assignee_ids?: string[];

  // Attachments (sent as FormData in API call)
  // attachments?: File[]; // max 10MB per file
}

export interface UpdateGAPinRequest {
  stage_id?: string;
  label?: string;
  x?: number;
  y?: number;
  color?: string;
}

export interface BulkSyncGAPinsRequest {
  pins: Array<{
    identifier?: string; // if updating existing
    stage_id: string;
    label?: string;
    x: number;
    y: number;
    color?: string;
  }>;
}

// ============ Logbook ============
/** Coarse grouping for logbook entries, set server-side from the
 *  action_type. `other` is the documented fallback (not emitted by
 *  current data). `null` only appears if the action_type didn't map. */
export type LogbookCategory =
  | "project"
  | "members"
  | "decks_areas"
  | "stages"
  | "release_forms"
  | "punchlist"
  | "documents"
  | "kickoff"
  | "other";

/** Entity types a logbook entry can point at. Drives deep-link
 *  destinations once the FE detail routes exist for each type. */
export type LogbookSubjectType =
  | "stage"
  | "punchlist_item"
  | "release_form"
  | "area"
  | "deck"
  | "document"
  | "user";

export interface LogbookSubject {
  type: LogbookSubjectType;
  id: string;
  name: string;
}

export interface LogbookEntry {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  actionStatus: string;
  name: string;
  /** Coarse grouping for filtering / iconography. `null` is the
   *  documented unmapped state — treat it as "uncategorised". */
  category: LogbookCategory | null;
  /** Entity the action touched. `null` for bulk events that don't
   *  hang off a single entity. */
  subject: LogbookSubject | null;
  description: string;
  agent: {
    "@type"?: string;
    identifier?: string; // Optional - only present for Person type
    name: string;
  };
  additionalProperty?: Record<string, unknown>;
  startTime: string;
}

export interface LogbookFilters {
  action_type?: string;
  /** Single user id or an array — the API client serialises arrays
   *  as comma-separated so the backend can do WHERE user_id IN (...). */
  user_id?: string | string[];
  from_date?: string;
  to_date?: string;
  per_page?: number;
  page?: number;
  /** Server-side filter on `metadata.item_id` so a single punchlist
   *  item can pull its own history without paginating through the
   *  whole project logbook. */
  punchlist_item_id?: string;
  /** Coarse category filter (e.g. "stages" includes remarks and
   *  signoffs). Combines with the other query params. */
  category?: LogbookCategory;
  /** Pair with `subject_id` to pull a single entity's history. */
  subject_type?: LogbookSubjectType;
  subject_id?: string;
  /** Free-text search; case-insensitive ILIKE on description,
   *  action_type, subject_name, actor_name, and user.name. */
  search?: string;
}

// ============ Project Members & Signers ============
export interface ProjectMember {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  roleName: string;
  member: {
    "@type"?: string;
    identifier: string;
    name: string;
    email: string;
  };
  dateCreated: string;
}

export interface AddMemberRequest {
  user_id: string;
}

export type ProjectSigner = ProjectMember;
export type AddSignerRequest = AddMemberRequest;

/** A custom (stage-scoped) signer. Separate from `ProjectSigner` —
 *  these only exist on the stage they're added to and don't show up
 *  on every stage by default. Identifier is the stage_signer record,
 *  not the user; use it for DELETE. */
export interface StageCustomSigner {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  user: {
    "@type"?: string;
    identifier: string;
    name: string;
    email: string;
  };
  addedBy: {
    "@type"?: string;
    identifier: string;
    name: string;
  } | null;
  addedAt: string;
}

export interface AddCustomSignerRequest {
  user_id: string;
}

// ============ Punchlist Items ============
export type PunchlistItemStatus =
  | "open"
  | "in_progress"
  | "done"
  | "cancelled";
export type PunchlistItemPriority = "low" | "medium" | "high";

export interface PunchlistItemAssignee {
  "@type"?: string;
  identifier: string;
  name: string;
  email: string;
  assignedAt: string;
}

export interface PunchlistItem {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  /** `null` for top-level items, parent identifier for children.
   *  Self-referential parent / child tree — sub-items are just
   *  punchlist items with `parentId` set, so every action a
   *  top-level item supports (status, priority, assignees, due_date,
   *  attachments, logbook, signoff gating) works for children too. */
  parentId: string | null;
  /** Child sub-items, only present when the relation is loaded by
   *  the backend (index endpoints inline them; mutation responses
   *  may omit). One level deep — backend rejects sub-sub-items. */
  children?: PunchlistItem[];
  name: string;
  description?: string;
  actionStatus: string;
  status: PunchlistItemStatus;
  priority: PunchlistItemPriority;
  dueDate?: string;
  isOverdue: boolean;
  stage: {
    "@type"?: string;
    identifier: string;
    name: string;
    area?: {
      "@type"?: string;
      identifier: string;
      name: string;
      deck?: {
        "@type"?: string;
        identifier: string;
        name: string;
      };
    };
  };
  creator: {
    "@type"?: string;
    identifier: string;
    name: string;
  };
  assignees: PunchlistItemAssignee[];
  attachmentCount: number;
  dateCreated: string;
  dateModified: string;
  cancellation?: {
    "@type"?: string;
    cancelledBy: {
      "@type"?: string;
      identifier: string;
      name: string;
    };
    cancelledAt: string;
    reason: string;
  };
}

/** Pin entry on a `CreatePunchlistItemRequest`. When the array is
 *  supplied the backend creates one GA pin per entry — deck / area /
 *  stage are inferred from the `stageId` in the URL, so the client
 *  only sends coordinates. */
export interface CreatePunchlistItemPinInput {
  /** Percentage 0–100 across the GA image. */
  x: number;
  /** Percentage 0–100 down the GA image. */
  y: number;
  /** Optional per-pin label; defaults server-side to the item title. */
  label?: string;
  /** Hex `#RRGGBB`; defaults server-side to `#3B82F6`. */
  color?: string;
}

/** Child sub-item on a `CreatePunchlistItemRequest`. Inherits the
 *  parent's stage server-side; can carry its own assignees, priority,
 *  due date and pins. Only one level deep — backend rejects a
 *  `children` field on a child entry. */
export interface CreatePunchlistItemChildInput {
  title: string;
  description?: string;
  priority?: PunchlistItemPriority;
  due_date?: string; // YYYY-MM-DD
  assignee_ids?: string[];
  pins?: CreatePunchlistItemPinInput[];
}

export interface CreatePunchlistItemRequest {
  title: string;
  description?: string;
  priority?: PunchlistItemPriority;
  due_date?: string; // YYYY-MM-DD
  assignee_ids?: string[];
  /** Optional list of GA pins to drop alongside the item — same
   *  endpoint creates the item and every pin atomically. Omit for
   *  "punchlist item without a location" workflows. */
  pins?: CreatePunchlistItemPinInput[];
  /** Optional sub-items created together with the parent. Each
   *  child becomes its own `PunchlistItem` with `parentId` pointing
   *  to the new parent. Server runs the whole tree in a single
   *  transaction. */
  children?: CreatePunchlistItemChildInput[];
}

export interface UpdatePunchlistItemRequest {
  title?: string;
  description?: string;
  priority?: PunchlistItemPriority;
  due_date?: string; // YYYY-MM-DD
  assignee_ids?: string[];
}

export interface UpdatePunchlistItemStatusRequest {
  status: PunchlistItemStatus;
  reason?: string; // Required when status is "cancelled", max 1000 chars
}

export interface AddAssigneesRequest {
  user_ids: string[];
}

export interface PunchlistItemAttachment {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  encodingFormat: string;
  contentSize: number;
  contentSizeHuman: string;
  isImage: boolean;
  uploadedBy: {
    "@type"?: string;
    identifier: string;
    name: string;
  };
  dateCreated: string;
}

// ============ Stage Remarks ============
export interface StageRemarkAttachment {
  "@context"?: string;
  "@type"?: string; // "MediaObject"
  identifier: string;
  name: string;
  encodingFormat: string;
  contentSize: number;
  contentSizeHuman: string;
  isImage: boolean;
  uploadedBy: {
    "@type"?: string;
    identifier: string;
    name: string;
  };
  dateCreated: string;
}

export interface StageRemark {
  "@context"?: string;
  "@type"?: string; // "Comment"
  identifier: string;
  text: string;
  author: {
    "@type"?: string; // "Person"
    identifier: string;
    name: string;
    email: string;
  };
  stage: {
    "@type"?: string; // "HowToStep"
    identifier: string;
    name: string;
  };
  parentComment?: {
    identifier: string;
  };
  replies?: StageRemark[];
  replyCount: number;
  attachments?: StageRemarkAttachment[];
  attachmentCount: number;
  dateCreated: string;
  dateModified: string;
}

export interface CreateStageRemarkRequest {
  content: string;
  parent_id?: string;
}

export interface UpdateStageRemarkRequest {
  content: string;
}

// ============ Document Type Templates ============
export interface DocumentTypeTemplate {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  isRequired: boolean;
  isLocked: boolean;
  isActive: boolean;
  /** Same flag the per-project DocumentType carries — when true the
   *  backend forbids manual document uploads (422), and consumers
   *  hide the upload/request UI. Settable from the system-admin
   *  template editor. */
  isSystemManaged: boolean;
  canDelete: boolean;
  dateCreated: string;
  dateModified: string;
}

export interface CreateDocumentTypeTemplateRequest {
  name: string;
  is_required?: boolean;
  is_locked?: boolean;
  is_system_managed?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateDocumentTypeTemplateRequest {
  name?: string;
  is_required?: boolean;
  is_locked?: boolean;
  is_system_managed?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export interface ReorderDocumentTypeTemplatesRequest {
  order: string[];
}

export interface GetDocumentTypeTemplatesParams {
  active_only?: boolean;
}

// ============ Setup Tasks ============

export type SetupTaskType = "upload_documents" | "add_members_and_signers" | "add_members" | "add_signers" | "kickoff_meeting" | "define_decks" | "custom";
export type SetupTaskStatus = "pending" | "awaiting_responses" | "scheduled" | "completed";
export type SetupTaskMeetingFormat = "online" | "live";

export interface SetupTaskAssignee {
  "@type": "Person";
  identifier: string;
  name: string;
  email: string;
  hasSigned: boolean;
  signedAt: string | null;
}

export interface SetupTaskChecklistItemCheck {
  "@type": "AssessAction";
  identifier: string;
  agent: {
    "@type": "Person";
    identifier: string;
    name: string;
  };
  dateCreated: string;
}

export interface SetupTaskChecklistItem {
  "@type": "CheckAction";
  identifier: string;
  description: string;
  sortOrder: number;
  isCompleted: boolean;
  fromTemplate: boolean;
  checks?: SetupTaskChecklistItemCheck[];
}

export interface SetupTaskNote {
  "@type": "Comment";
  identifier: string;
  text: string;
  author: {
    "@type": "Person";
    identifier: string;
    name: string;
  };
  dateCreated: string;
}

export interface SetupTaskDocument {
  "@context"?: string;
  "@type"?: "DigitalDocument";
  identifier: string;
  name: string; // document name/filename
  fileName: string; // original file name
  encodingFormat: string; // MIME type (e.g., "application/pdf")
  contentSize: string; // human-readable size (e.g., "84.61 KB")
  contentSizeBytes: number; // size in bytes
  dateCreated: string; // ISO date string
  dateModified: string; // ISO date string
  author: {
    "@type"?: string; // e.g., "Organization" or "Person"
    identifier?: string; // uploader ID
    name: string; // uploader name
  };
}

export interface SetupTask {
  "@context"?: "https://schema.org";
  "@type": "Action";
  identifier: string;
  name: string;
  description: string;
  additionalType: SetupTaskType;
  actionStatus: SetupTaskStatus;
  scheduledDate: string | null;
  scheduledEndDate: string | null;
  meetingFormat: SetupTaskMeetingFormat | null;
  meetingLink: string | null;
  completedAt: string | null;
  sortOrder: number;
  allDocumentsAcknowledged: boolean; // All required documents acknowledged
  allSigned: boolean;
  allItemsCompleted: boolean;
  isComplete: boolean;
  assignees: SetupTaskAssignee[];
  checklistItems: SetupTaskChecklistItem[];
  notes: SetupTaskNote[];
  documents: SetupTaskDocument[];
  proposedDates?: ProposedDate[];
  kickoffForm?: KickoffFormData;
  availableMembers?: ProjectMember[]; // Available members for kickoff meetings
}

// Kickoff Meeting Form Types
export type KickoffFormStatus = "draft" | "in_progress" | "completed" | "signed";

export interface KickoffFormDocumentControl {
  projectNumber: string;
  contractReference: string;
  revisionHistory: Array<{
    revision: string;
    date: string;
    author: string;
    description: string;
  }>;
}

export interface KickoffFormVesselInfo {
  vesselName: string;
  builder: string;
  yearBuilt: string;
  loa: string; // Length Overall
  beam: string;
  draft: string;
  grossTonnage: string;
  vesselType: string;
}

export interface KickoffFormConstructionMaterials {
  hull: string;
  superstructure: string;
  decks: string;
  tenders: string;
  pools: string;
  tanks: string;
  notes: string;
}

export interface KickoffFormPaintSpecifications {
  underwater: {
    system: string;
    manufacturer: string;
    color: string;
  };
  hull: {
    system: string;
    manufacturer: string;
    color: string;
  };
  superstructure: {
    system: string;
    manufacturer: string;
    color: string;
  };
  deck: {
    system: string;
    manufacturer: string;
    color: string;
  };
  domes: {
    system: string;
    manufacturer: string;
    color: string;
  };
  offBoatItems: string;
  notes: string;
}

export interface KickoffFormSurfacePreparation {
  steel: string;
  aluminium: string;
  stainlessSteel: string;
  wood: string;
  composites: string;
  blastStandards: string;
  notes: string;
}

export interface KickoffFormAcceptanceStandards {
  isoStandards: string[];
  saltTesting: {
    method: string;
    acceptableLevels: string;
  };
  dftRequirements: {
    minimum: string;
    maximum: string;
    target: string;
  };
  adhesionTesting: {
    method: string;
    acceptableLevels: string;
  };
  fairingTolerances: string;
  finalFinish: string;
  notes: string;
}

export interface KickoffFormTechnicalDrawings {
  gaReference: string;
  colourPlan: string;
  cutLinePlan: string;
  radiiPlan: string;
  renderings: string;
  notes: string;
}

export interface KickoffFormShipyardRules {
  workingHours: {
    weekdays: string;
    weekends: string;
    holidays: string;
  };
  accessRequirements: string;
  noticePeriods: string;
  contacts: Array<{
    name: string;
    role: string;
    phone: string;
    email: string;
  }>;
  environmentalControls: string;
  safetyRequirements: string;
  notes: string;
}

export interface KickoffFormQAQC {
  scope: string;
  recordsAvailability: string;
  escalationProcess: string;
  documentationProtocol: string;
  holdPoints: string[];
  witnessPoints: string[];
  notes: string;
}

export interface KickoffFormData {
  "@type"?: "KickoffForm";
  identifier?: string;
  documentControl: KickoffFormDocumentControl;
  vesselInfo: KickoffFormVesselInfo;
  constructionMaterials: KickoffFormConstructionMaterials;
  paintSpecifications: KickoffFormPaintSpecifications;
  surfacePreparation: KickoffFormSurfacePreparation;
  acceptanceStandards: KickoffFormAcceptanceStandards;
  technicalDrawings: KickoffFormTechnicalDrawings;
  shipyardRules: KickoffFormShipyardRules;
  qaQc: KickoffFormQAQC;
  formStatus: KickoffFormStatus;
  lastModified: string;
  lastModifiedBy: {
    identifier: string;
    name: string;
  };
  completedAt?: string;
  completedBy?: {
    identifier: string;
    name: string;
  };
}

// CCS Internal Project Setup Types (employees only)
export interface InternalProjectSetupScope {
  coatingInspections: boolean;
  fairingInspections: boolean;
  tankInspections: boolean;
  advisoryOnly: boolean;
  notes: string;
}

export interface InternalProjectSetupTimeAllocation {
  siteDaysPerWeek: string;
  totalInspectionDays: string;
  travelAllocation: string;
  reportingFrequency: "weekly" | "monthly" | "as-needed";
}

export interface InternalProjectSetupDeliverables {
  reportTypes: string[];
  turnaroundTime: string;
  photoDocLevel: "minimal" | "standard" | "comprehensive";
}

export interface InternalProjectSetupLimits {
  noAuthorityToStopWorks: boolean;
  noAcceptanceOfWorks: boolean;
  attendanceSubjectToNotice: boolean;
  customLimits: string;
}

export interface InternalProjectSetup {
  "@type"?: "InternalProjectSetup";
  identifier?: string;
  scope: InternalProjectSetupScope;
  timeAllocation: InternalProjectSetupTimeAllocation;
  deliverables: InternalProjectSetupDeliverables;
  limitsAssumptions: InternalProjectSetupLimits;
  riskFlags: string[];
  notes: string;
  lastModified: string;
  lastModifiedBy: {
    identifier: string;
    name: string;
  };
}

// Document Acknowledgement Types
export interface RequiredDocumentAcknowledgement {
  "@type"?: "AgreeAction" | "Person";
  identifier: string;
  name?: string;
  // Agent object (backend nests user data here for AgreeAction type)
  agent?: {
    "@type"?: "Person";
    identifier: string;
    name: string;
    email?: string;
  };
  acknowledgedAt?: string | null;
  dateCreated?: string | null;
  hasRead: boolean;
  readAt: string | null;
  hasAgreed: boolean | null;
  agreedAt: string | null;
  disagreementReason: string | null;
}

export interface RequiredDocument {
  "@context"?: string;
  "@type"?: "DigitalDocument";
  identifier: string;
  name: string;
  fileName?: string;
  category?: {
    "@type"?: "DefinedTerm";
    identifier: string;
    name: string;
  };
  encodingFormat?: string;
  contentSize?: string;
  contentSizeBytes?: number;
  contentUrl?: string;
  isRequired: boolean;
  isFinalDocument?: boolean;
  dateCreated?: string;
  dateModified?: string;
  acknowledgements: RequiredDocumentAcknowledgement[];
  allAcknowledged: boolean;
  acknowledgementCount: number;
  agreedCount: number;
  disagreedCount: number;
  totalAssignees: number;
}

export interface DocumentAcknowledgementStatusItem {
  id: string;
  title: string;
  acknowledgedCount: number;
  totalAssignees: number;
  allAcknowledged: boolean;
}

export interface DocumentAcknowledgementStatus {
  totalDocuments: number;
  allAcknowledged: boolean;
  documents: DocumentAcknowledgementStatusItem[];
}

// ============ Kickoff Meeting Scheduling ============

export interface TimeSlotResponseUser {
  userId: string;
  userName: string;
  canAttendOnline: boolean;
  canAttendLive: boolean;
  isAvailable: boolean; // Computed: canAttendOnline OR canAttendLive
}

export interface TimeSlot {
  "@type"?: "Event";
  id: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isSelected: boolean;
  availableCount: number; // Users who can attend (online or live)
  unavailableCount?: number; // Users who can't attend at all
  onlineCount?: number; // Users who can attend online
  liveCount?: number; // Users who can attend live
  responseCount?: number;
  totalAttendees: number;
  allCanAttend: boolean;
  responses: TimeSlotResponseUser[];
}

export interface ProposedDate {
  "@type"?: "Event";
  id: string;
  proposedDate: string; // YYYY-MM-DD format
  hasSelectedTimeSlot?: boolean;
  timeSlots: TimeSlot[];
}

export interface SelectedTimeSlot {
  identifier: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingFormat: SetupTaskMeetingFormat | null;
  responses: TimeSlotResponseUser[];
}

export interface SchedulingStatus {
  status: SetupTaskStatus;
  proposedDates: ProposedDate[];
  allResponded: boolean;
  respondedCount: number;
  totalAttendees: number;
  timeSlotsWhereAllCanAttend: string[]; // Array of time slot IDs
  selectedTimeSlot?: SelectedTimeSlot;
}

// Request types for scheduling
export interface TimeSlotInput {
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
}

export interface AddProposedDateRequest {
  date: string; // YYYY-MM-DD format
  time_slots: TimeSlotInput[];
}

export interface AddTimeSlotRequest {
  start_time: string;
  end_time: string;
}

export interface RespondToTimeSlotRequest {
  can_attend_online: boolean;
  can_attend_live: boolean;
}

export interface BulkTimeSlotResponse {
  time_slot_id: string;
  can_attend_online: boolean;
  can_attend_live: boolean;
}

export interface BulkRespondRequest {
  responses: BulkTimeSlotResponse[];
}

// Legacy - keep for backwards compatibility
export interface AddProposedDatesRequest {
  dates: string[]; // ISO date strings (deprecated)
}

export interface RespondToDateRequest {
  is_available: boolean;
}

export interface CreateSetupTaskNoteRequest {
  content: string;
}

export interface UpdateSetupTaskNoteRequest {
  content: string;
}

export interface UploadSetupTaskDocumentRequest {
  file: File;
  name?: string;
}

export interface SetupTasksUnifiedStatus {
  "@context": "https://schema.org";
  "@type": "ItemList";
  documents: {
    isComplete: boolean;
    required: string[];
    uploaded: string[];
    missing: string[];
  };
  members: {
    isComplete: boolean;
    count: number;
    minimum: number;
  };
  signers: {
    isComplete: boolean;
    required: string[];
    assigned: string[];
    missing: string[];
  };
  kickoffMeeting: {
    isComplete: boolean;
    exists: boolean;
    scheduledDate: string | null;
    allChecklistItemsCompleted: boolean;
    allAttendeesSigned: boolean;
    details: {
      attendeeCount: number;
      signedCount: number;
      checklistItemCount: number;
      completedChecklistItemCount: number;
    };
  };
  customTasks: any[];
}

export interface UpdateSetupTaskRequest {
  scheduled_date?: string;
  description?: string;
}

export interface AddSetupTaskAssigneeRequest {
  user_id: string;
}

export interface CreateChecklistItemRequest {
  description: string;
}

// ============ Kickoff Document Templates ============
export interface KickoffDocumentTemplateFile {
  fileName: string;
  encodingFormat: string;
  contentSize: string;
  contentSizeBytes: number;
}

export interface KickoffDocumentTemplate {
  "@context"?: "https://schema.org";
  "@type": "DigitalDocument";
  identifier: string;
  name: string;
  description: string | null;
  content: Record<string, unknown> | null; // TipTap JSON content
  hasFile: boolean;
  file?: KickoffDocumentTemplateFile;
  sortOrder: number;
  isActive: boolean;
  canDelete: boolean;
  dateCreated: string;
  dateModified: string;
}

export interface CreateKickoffDocumentTemplateRequest {
  name: string;
  description?: string;
  content?: Record<string, unknown>;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateKickoffDocumentTemplateRequest {
  name?: string;
  description?: string;
  content?: Record<string, unknown>;
  is_active?: boolean;
  remove_file?: boolean;
}

export interface ReorderKickoffDocumentTemplatesRequest {
  order: string[];
}

// ============ Release Form Templates ============
/** Same file metadata shape as the kickoff template's. Kept as a
 *  separate type so each surface can evolve independently. */
export interface ReleaseFormTemplateFile {
  fileName: string;
  encodingFormat: string;
  contentSize: string;
  contentSizeBytes: number;
}

export interface ReleaseFormTemplate {
  "@context"?: "https://schema.org";
  "@type": "DigitalDocument";
  identifier: string;
  name: string;
  description: string | null;
  content: Record<string, unknown> | null; // TipTap JSON
  hasFile: boolean;
  file?: ReleaseFormTemplateFile;
  sortOrder: number;
  isActive: boolean;
  /** `false` once at least one stage template links to this release
   *  form template. Backend rejects DELETE in that case with a 422. */
  canDelete: boolean;
  /** Present on the per-stage template list response only — marks the
   *  template the stage's `template.releaseFormTemplate` points at so
   *  the picker can preselect it. Absent in the system-admin CRUD
   *  responses (no stage context there). */
  isDefaultForStage?: boolean;
  dateCreated: string;
  dateModified: string;
}

export interface CreateReleaseFormTemplateRequest {
  name: string;
  description?: string;
  content?: Record<string, unknown>;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateReleaseFormTemplateRequest {
  name?: string;
  description?: string;
  content?: Record<string, unknown>;
  is_active?: boolean;
  remove_file?: boolean;
}

export interface ReorderReleaseFormTemplatesRequest {
  order: string[];
}

// ============ Stage Release Forms (per-stage instances) ============
export interface CreateStageReleaseFormRequest {
  /** TipTap JSON document. Title is generated server-side from
   *  project / deck / area / stage names; no file upload — the
   *  backend renders the PDF from this content. */
  content: Record<string, unknown>;
  description?: string;
  /** Which template the user started from. When omitted the backend
   *  falls back to the stage's default. */
  release_form_template_id?: string;
}

export interface StageReleaseFormFile {
  fileName: string;
  encodingFormat: string;
  contentSize: string;
  contentSizeBytes: number;
}

/** A release form instance attached to a single stage. Multiple per
 *  stage are allowed; sorted newest-first by the backend. */
export interface StageReleaseForm {
  "@context"?: "https://schema.org";
  "@type": "DigitalDocument";
  identifier: string;
  stageId: string;
  title: string;
  description: string | null;
  /** TipTap JSON — may be null if the user only uploaded a file. */
  content: Record<string, unknown> | null;
  hasFile: boolean;
  file: StageReleaseFormFile | null;
  /** The template this instance was started from. `null` when the
   *  origin template has been deleted (nullOnDelete). */
  originTemplate: {
    "@type"?: string;
    identifier: string;
    name: string;
  } | null;
  createdBy: {
    "@type"?: string;
    identifier: string;
    name: string;
  };
  dateCreated: string;
  dateModified: string;
}

// ============ Kickoff Document (Per Project) ============
export interface KickoffDocumentSigner {
  "@type"?: "Person";
  identifier: string;
  name: string;
  email?: string;
  hasSigned: boolean;
  signedAt: string | null;
}

export interface KickoffDocument {
  "@context"?: "https://schema.org";
  "@type": "DigitalDocument";
  identifier: string;
  name: string;
  hasFile: boolean;
  fileName: string | null;
  encodingFormat: string | null;
  contentSize: string | null;
  contentSizeBytes: number | null;
  isEditable: boolean;
  content: Record<string, unknown> | null; // TipTap JSON content
  version?: number; // Optimistic-locking version on editable documents
  /**
   * Document workflow phase:
   * - `commenting` (default): comments allowed, content saves rejected.
   * - `editing`: content saves allowed for the host, comments locked.
   * - `finalized`: read-only, signing phase.
   * Older API responses may omit this — treat absent as `commenting`.
   */
  phase?: "commenting" | "editing" | "finalized";
  description?: string;
  dateCreated: string;
  dateModified: string;
  // Finalization fields
  isFinalDocument: boolean;
  finalizedAt: string | null;
  finalizedBy: {
    "@type"?: "Person";
    identifier: string;
    name: string;
  } | null;
  // Signing fields (for finalized documents)
  signers: KickoffDocumentSigner[];
  allSigned: boolean;
  signedCount: number;
  totalAssignees: number;
}

export interface UpdateKickoffDocumentContentRequest {
  content: Record<string, unknown>;
  version?: number;
  force?: boolean;
}

// ============ Document Comments ============
export interface DocumentCommentAuthor {
  "@type": "Person";
  identifier: string;
  name: string;
}

export interface DocumentCommentReply {
  identifier: string;
  text: string;
  author: DocumentCommentAuthor;
  dateCreated: string;
}

export interface DocumentComment {
  "@context"?: "https://schema.org";
  "@type": "Comment";
  identifier: string;
  text: string;
  author: DocumentCommentAuthor;
  dateCreated: string;
  dateModified: string;
  selectedText: string | null;
  from: number | null;
  to: number | null;
  isResolved: boolean;
  replies: DocumentCommentReply[];
}

export interface CreateDocumentCommentRequest {
  content: string;
  selected_text?: string;
  from?: number;
  to?: number;
}

export interface UpdateDocumentCommentRequest {
  content?: string;
  is_resolved?: boolean;
}

export interface CreateCommentReplyRequest {
  content: string;
}

export interface ResolveCommentRequest {
  is_resolved: boolean;
}

// ============ My Tasks ============
export type MyTaskType = "document_request" | "punchlist_item" | "setup_task";
export type MyTaskStatus = "pending" | "in_progress" | "overdue" | "completed";

export interface MyTaskProject {
  identifier: string;
  name: string;
}

export interface MyTaskDocumentRequest {
  type: "document_request";
  identifier: string;
  documentType: {
    identifier: string;
    name: string;
  };
  project: MyTaskProject;
  message: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  isCompleted: boolean;
  assignedBy: {
    identifier: string;
    name: string;
  };
  assignedAt: string;
  completedAt: string | null;
}

export interface MyTaskPunchlistItem {
  type: "punchlist_item";
  identifier: string;
  name: string;
  description: string | null;
  project: MyTaskProject;
  area: {
    identifier: string;
    name: string;
  };
  stage: {
    identifier: string;
    name: string;
  };
  priority: PunchlistItemPriority;
  status: PunchlistItemStatus;
  dueDate: string | null;
  isOverdue: boolean;
  assignedAt: string;
}

export interface MyTaskSetupTask {
  type: "setup_task";
  identifier: string;
  name: string;
  description: string | null;
  taskType: SetupTaskType;
  project: MyTaskProject;
  scheduledDate: string | null;
  scheduledEndDate: string | null;
  meetingFormat: SetupTaskMeetingFormat | null;
  meetingLink: string | null;
  hasSigned: boolean;
  signedAt: string | null;
  assignedAt: string;
}

export interface MyTaskDocumentAcknowledgement {
  type: "document_acknowledgement";
  identifier: string;
  document: {
    identifier: string;
    title: string;
    fileName: string;
  };
  documentType: {
    identifier: string;
    name: string;
  };
  project: MyTaskProject;
  setupTask: {
    identifier: string;
    name: string;
    type: SetupTaskType;
  };
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
}

export interface MyTaskStageSignoff {
  type: "stage_signoff";
  identifier: string;
  /** "pending" while waiting on the current user, "signed" once they
   *  put their signature on it. Mirrors the per-stage signoff status. */
  status: "pending" | "signed";
  hasSigned: boolean;
  signedAt: string | null;
  stage: {
    identifier: string;
    name: string;
    color: string | null;
    status: StageStatus;
  };
  area: {
    identifier: string;
    name: string;
  };
  deck: {
    identifier: string;
    name: string;
  };
  project: MyTaskProject;
  requestedAt: string;
}

export interface MyTaskDocumentReview {
  type: "document_review";
  /** The reviewer-assignment UUID (used to identify the row, not for API calls). */
  identifier: string;
  document: {
    identifier: string;
    title: string;
    fileName: string;
    approvalStatus: "pending_review";
  };
  documentType: {
    identifier: string;
    name: string;
  };
  project: MyTaskProject;
  hasReviewed: boolean;
  hasApproved: boolean | null;
  declineReason: string | null;
  reviewedAt: string | null;
  assignedAt: string;
}

export type MyTask =
  | MyTaskDocumentRequest
  | MyTaskPunchlistItem
  | MyTaskSetupTask
  | MyTaskDocumentAcknowledgement
  | MyTaskStageSignoff
  | MyTaskDocumentReview;

export interface MyTasksResponse {
  documentRequests: MyTaskDocumentRequest[];
  punchlistItems: MyTaskPunchlistItem[];
  setupTasks: MyTaskSetupTask[];
  documentAcknowledgements: MyTaskDocumentAcknowledgement[];
  /** Stage signoffs the user has been asked to provide. Optional so the
   *  type tolerates older backend versions that don't include the field. */
  stageSignoffs?: MyTaskStageSignoff[];
  /** Document reviews where the current user is a reviewer. Optional so
   *  the type tolerates older backend versions that don't include the field. */
  documentReviews?: MyTaskDocumentReview[];
  counts: {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
  };
}
