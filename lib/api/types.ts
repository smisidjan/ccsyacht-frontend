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

export interface DeckBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
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
  boundingBox?: DeckBoundingBox;
  containsPlace?: DeckPlace[];
  dateCreated: string;
  dateModified: string;
}

export interface CreateDeckRequest {
  name: string;
  description?: string;
  bbox_x?: number;
  bbox_y?: number;
  bbox_width?: number;
  bbox_height?: number;
}

export interface UpdateDeckRequest {
  name?: string;
  description?: string;
  bbox_x?: number;
  bbox_y?: number;
  bbox_width?: number;
  bbox_height?: number;
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
  dateCreated: string;
  dateModified: string;
}

export interface CreateAreaRequest {
  name: string;
  description?: string;
}

export interface UpdateAreaRequest {
  name?: string;
  description?: string;
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
  position: number;
  requiresReleaseForm: boolean;
  isActive: boolean;
  canDelete: boolean;
  dateCreated: string;
  dateModified: string;
}

export interface CreateStageTemplateRequest {
  name: string;
  description?: string;
  requires_release_form?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateStageTemplateRequest {
  name?: string;
  description?: string;
  requires_release_form?: boolean;
  sort_order?: number;
  is_active?: boolean;
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
  position: number;
  status: {
    "@type"?: string;
    name: StageStatus;
  };
  requiresReleaseForm: boolean;
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
  status?: StageStatus;
  requires_release_form?: boolean;
  sort_order?: number;
}

export interface UpdateStageRequest {
  name?: string;
  description?: string;
  status?: StageStatus;
  requires_release_form?: boolean;
  sort_order?: number;
}

export interface UpdateStageStatusRequest {
  status: StageStatus;
}

export interface BulkCreateStagesRequest {
  stages: {
    name: string;
    requires_release_form: boolean;
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

// ============ Area Templates ============
export interface AreaTemplate {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  description?: string;
  isActive: boolean;
  canDelete: boolean;
  dateCreated: string;
  dateModified: string;
}

export interface CreateAreaTemplateRequest {
  name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateAreaTemplateRequest {
  name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ReorderAreaTemplatesRequest {
  order: string[];
}

export interface GetAreaTemplatesParams {
  active_only?: boolean;
}

// ============ Setup Tasks ============

export type SetupTaskType = "upload_documents" | "add_members" | "add_signers" | "kickoff_meeting" | "define_decks" | "custom";
export type SetupTaskStatus = "pending" | "awaiting_responses" | "scheduled" | "completed";

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
}

// Document Acknowledgement Types
export interface RequiredDocumentAcknowledgement {
  "@type"?: "Person";
  identifier: string;
  name: string;
  acknowledgedAt: string | null;
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
  isAvailable: boolean;
}

export interface TimeSlot {
  "@type"?: "Event";
  id: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isSelected: boolean;
  availableCount: number;
  unavailableCount?: number;
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
  is_available: boolean;
}

export interface BulkTimeSlotResponse {
  time_slot_id: string;
  is_available: boolean;
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

export interface ChecklistTemplate {
  "@context"?: "https://schema.org";
  "@type": "Thing";
  identifier: string;
  additionalType: SetupTaskType;
  description: string;
  sortOrder: number;
  isActive: boolean;
  canDelete: boolean;
}

export interface CreateChecklistTemplateRequest {
  type: SetupTaskType;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface UpdateChecklistTemplateRequest {
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ReorderChecklistTemplatesRequest {
  order: string[];
}

export interface GetChecklistTemplatesParams {
  type?: SetupTaskType;
  active_only?: boolean;
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

export type MyTask = MyTaskDocumentRequest | MyTaskPunchlistItem | MyTaskSetupTask | MyTaskDocumentAcknowledgement;

export interface MyTasksResponse {
  documentRequests: MyTaskDocumentRequest[];
  punchlistItems: MyTaskPunchlistItem[];
  setupTasks: MyTaskSetupTask[];
  documentAcknowledgements: MyTaskDocumentAcknowledgement[];
  counts: {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
  };
}
