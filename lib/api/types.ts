// API Types based on OpenAPI specification

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
  dateCreated: string;
  dateModified: string;
}

export interface CreateTenantRequest {
  name: string;
  admin_email: string;
  subscription: {
    max_projects: number;
    max_users: number;
  };
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
export type ProjectStatus = "setup" | "active" | "locked" | "completed";

export interface ProjectProducer {
  "@type"?: string;
  identifier: string;
  name: string;
  contactPoint?: ShipyardContactPoint;
}

export interface ProjectAuthor {
  "@type"?: string;
  identifier: string;
  name: string;
  email: string;
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
  identifier: string;
  name: string;
  email: string;
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

// ============ Stages ============
export type StageStatus = "not_started" | "in_progress" | "completed";

export interface StageLocation {
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
  location?: StageLocation;
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
    identifier: string;
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
