/**
 * System Admin Feature Components
 * Barrel export for all system administration components
 */

// Tabs
export { default as TenantsTab } from "./TenantsTab";
export { default as TenantUsersTab } from "./TenantUsersTab";
export { default as TenantTemplatesTab } from "./TenantTemplatesTab";

// Tables
export { default as TenantUsersTable } from "./TenantUsersTable";
export { default as TenantRolesTable } from "./TenantRolesTable";
export { default as TenantProjectsTable } from "./TenantProjectsTable";
export { default as TenantInvitationsTable } from "./TenantInvitationsTable";
export { default as StageTemplatesTable } from "./StageTemplatesTable";
export { default as DocumentTypeTemplatesTable } from "./DocumentTypeTemplatesTable";

// Views
export { default as ProjectDetailView } from "./ProjectDetailView";

// Modals
export { default as CreateTenantModal } from "./CreateTenantModal";
export { default as EditTenantPermissionsModal } from "./EditTenantPermissionsModal";
export { default as TenantSettingsModal } from "./TenantSettingsModal";
export { default as CreateRoleModal } from "./CreateRoleModal";
export { default as EditRoleModal } from "./EditRoleModal";
export { default as DeleteRoleModal } from "./DeleteRoleModal";
export { default as SystemCreateProjectModal } from "./SystemCreateProjectModal";

// Template Forms
export { default as StageTemplateForm } from "./StageTemplateForm";
export { default as DocumentTypeTemplateForm } from "./DocumentTypeTemplateForm";
export { default as KickoffDocumentTemplateForm } from "./KickoffDocumentTemplateForm";
