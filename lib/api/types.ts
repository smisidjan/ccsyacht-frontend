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
export type ProjectType = "new_built" | "refit";
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

export interface Project {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  description?: string;
  additionalType: ProjectType;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  generalArrangement?: string;
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
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  project_type?: ProjectType;
  status?: ProjectStatus;
  shipyard_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface UpdateActionResponse {
  "@type"?: string;
  actionStatus?: "CompletedActionStatus" | "FailedActionStatus";
  result: Project;
}

// ============ Document Types ============
export interface DocumentType {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  isRequired: boolean;
  position: number;
  documentCount: number;
  dateCreated: string;
  dateModified: string;
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

export interface Deck {
  "@context"?: string;
  "@type"?: string;
  identifier: string;
  name: string;
  description?: string;
  position: number;
  areaCount: number;
  stageCount: number;
  containsPlace?: DeckPlace[];
  dateCreated: string;
  dateModified: string;
}

export interface CreateDeckRequest {
  name: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateDeckRequest {
  name?: string;
  description?: string;
  sort_order?: number;
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
  sort_order?: number;
}

export interface UpdateAreaRequest {
  name?: string;
  description?: string;
  sort_order?: number;
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
