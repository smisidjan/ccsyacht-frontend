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
  start_date?: string;
  end_date?: string;
  external_id?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  project_type?: ProjectType;
  status?: ProjectStatus;
  shipyard_id?: string;
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
  // Acknowledgement tracking
  acknowledgements?: DocumentAcknowledgement[];
  requiredAcknowledgers?: string[]; // User IDs who need to acknowledge
  status?: DocumentStatus;
  allAcknowledged?: boolean;
  acknowledgementCount?: number;
  agreedCount?: number;
  disagreedCount?: number;
  totalRequiredAcknowledgers?: number;
  totalAssignees?: number; // API returns this field
}

export interface UploadDocumentRequest {
  title: string;
  description?: string;
  file: File;
}

// ============ Decks ============
export interface DeckPlace {
  "@type"?: string;
  identifier: string;
  name: string;
  position?: number;
  stageCount?: number;
}

/** Placement of the deck on the GA. Coordinates are percentages 0–100 of
 *  the GA image. One placement per deck (the primary top-down marker). */
export interface DeckPlacement {
  identifier: string;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  /** OCR meta from the backend's auto-extraction pass; only present when the
   *  backend ran a detection step. */
  ocrConfidence?: number;
  ocrLabel?: string;
}

/** A side-view marker for the same deck. 0..N per deck, all placed on the
 *  GA image as additional rectangles (typically thin horizontal strips of
 *  the yacht's side profile). */
export interface DeckSideProfilePlacement {
  identifier: string;
  name: string;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
}

/** Write-side shape for the primary deck placement. */
export interface DeckPlacementInput {
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
}

/** Write-side shape for a side profile. `identifier` lets the backend
 *  reconcile updates vs creates within a `side_profiles` replace array;
 *  omit it for a brand-new entry. */
export interface DeckSideProfileInput {
  identifier?: string;
  name: string;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
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
  /** Primary marker on the GA. `null` for decks created without one. */
  deckPlacement: DeckPlacement | null;
  /** Extra markers on the same GA image — empty array means none. */
  sideProfiles: DeckSideProfilePlacement[];
  containsPlace?: DeckPlace[];
  dateCreated: string;
  dateModified: string;
}

export interface CreateDeckRequest {
  name: string;
  description?: string;
  deck_placement?: DeckPlacementInput | null;
  side_profiles?: DeckSideProfileInput[];
}

/** Mutation semantics for the placement fields:
 *  - omitted          → unchanged
 *  - `deck_placement: null` → clear the primary placement
 *  - `side_profiles: []`    → wipe all side profiles
 *  - `side_profiles: [...]` → full replacement (use `identifier` per entry to
 *                              preserve existing rows; omit for new ones). */
export interface UpdateDeckRequest {
  name?: string;
  description?: string;
  deck_placement?: DeckPlacementInput | null;
  side_profiles?: DeckSideProfileInput[];
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
  /** Polygon outline on the GA in image-percentage coords. Optional for older
   *  records that were created before polygon support was added. */
  polygon?: AreaPolygonPoint[];
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

export interface CreateAreaRequest {
  name: string;
  description?: string;
  polygon?: AreaPolygonPoint[];
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
  /** Replacement polygon (0..1 normalized vertices). Omit when only
   *  text fields are being edited. */
  polygon?: AreaPolygonPoint[];
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
  dateCreated: string;
  dateModified: string;
}

export interface CreateStageTemplateRequest {
  name: string;
  description?: string;
  color?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateStageTemplateRequest {
  name?: string;
  description?: string;
  color?: string | null;
  sort_order?: number;
  is_active?: boolean;
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
  };
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
export interface LogbookEntry {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  actionStatus: string;
  name: string;
  description: string;
  agent: {
    "@type"?: string;
    identifier?: string; // Optional - only present for Person type
    name: string;
  };
  startTime: string;
}

export interface LogbookFilters {
  action_type?: string;
  user_id?: string;
  from_date?: string;
  to_date?: string;
  per_page?: number;
  page?: number;
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

// ============ Punchlist Items ============
export type PunchlistItemStatus = "open" | "in_progress" | "done" | "cancelled";
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

export interface CreatePunchlistItemRequest {
  title: string;
  description?: string;
  priority?: PunchlistItemPriority;
  due_date?: string; // YYYY-MM-DD
  assignee_ids?: string[];
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
  canDelete: boolean;
  dateCreated: string;
  dateModified: string;
}

export interface CreateDocumentTypeTemplateRequest {
  name: string;
  is_required?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateDocumentTypeTemplateRequest {
  name?: string;
  is_required?: boolean;
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

export type SetupTaskType = "upload_documents" | "add_members" | "add_signers" | "kickoff_meeting" | "define_decks" | "custom";
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

export type MyTask =
  | MyTaskDocumentRequest
  | MyTaskPunchlistItem
  | MyTaskSetupTask
  | MyTaskDocumentAcknowledgement
  | MyTaskStageSignoff;

export interface MyTasksResponse {
  documentRequests: MyTaskDocumentRequest[];
  punchlistItems: MyTaskPunchlistItem[];
  setupTasks: MyTaskSetupTask[];
  documentAcknowledgements: MyTaskDocumentAcknowledgement[];
  /** Stage signoffs the user has been asked to provide. Optional so the
   *  type tolerates older backend versions that don't include the field. */
  stageSignoffs?: MyTaskStageSignoff[];
  counts: {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
  };
}
