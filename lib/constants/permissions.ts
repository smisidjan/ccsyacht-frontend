/**
 * Permission constants for the CCS Yacht application.
 * These permissions are returned by the backend API and control user access.
 */

// Permission constants as const for type safety
export const PERMISSIONS = {
  // User Management
  VIEW_USERS: "view_users",
  EDIT_USERS: "edit_users",
  DELETE_USERS: "delete_users",

  // Invitation Management
  VIEW_INVITATIONS: "view_invitations",
  CREATE_INVITATIONS: "create_invitations",
  MANAGE_INVITATIONS: "manage_invitations",

  // Registration Management
  VIEW_REGISTRATIONS: "view_registrations",
  PROCESS_REGISTRATIONS: "process_registrations",

  // Guest Role Management
  MANAGE_GUEST_ROLES: "manage_guest_roles",

  // Settings
  MANAGE_SETTINGS: "manage_settings",

  // Shipyard Management
  VIEW_SHIPYARDS: "view_shipyards",
  CREATE_SHIPYARDS: "create_shipyards",
  EDIT_SHIPYARDS: "edit_shipyards",
  DELETE_SHIPYARDS: "delete_shipyards",

  // Project Management
  VIEW_PROJECTS: "view_projects",
  EDIT_PROJECTS: "edit_projects",
  CREATE_PROJECTS: "create_projects",
  DELETE_PROJECTS: "delete_projects",

  // Document Type Management
  VIEW_DOCUMENT_TYPES: "view_document_types",
  CREATE_DOCUMENT_TYPES: "create_document_types",
  EDIT_DOCUMENT_TYPES: "edit_document_types",
  DELETE_DOCUMENT_TYPES: "delete_document_types",

  // Document Management
  VIEW_DOCUMENTS: "view_documents",
  DOWNLOAD_DOCUMENTS: "download_documents",
  UPLOAD_DOCUMENTS: "upload_documents",
  DELETE_DOCUMENTS: "delete_documents",
} as const;

// Extract all permission values as a union type
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Array of all permissions for validation
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// Permission groups for easier management
export const PERMISSION_GROUPS = {
  USER_MANAGEMENT: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.DELETE_USERS,
  ],
  INVITATION_MANAGEMENT: [
    PERMISSIONS.VIEW_INVITATIONS,
    PERMISSIONS.CREATE_INVITATIONS,
    PERMISSIONS.MANAGE_INVITATIONS,
  ],
  REGISTRATION_MANAGEMENT: [
    PERMISSIONS.VIEW_REGISTRATIONS,
    PERMISSIONS.PROCESS_REGISTRATIONS,
  ],
  SHIPYARD_MANAGEMENT: [
    PERMISSIONS.VIEW_SHIPYARDS,
    PERMISSIONS.CREATE_SHIPYARDS,
    PERMISSIONS.EDIT_SHIPYARDS,
    PERMISSIONS.DELETE_SHIPYARDS,
  ],
  PROJECT_MANAGEMENT: [
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.EDIT_PROJECTS,
    PERMISSIONS.CREATE_PROJECTS,
    PERMISSIONS.DELETE_PROJECTS,
  ],
  DOCUMENT_TYPE_MANAGEMENT: [
    PERMISSIONS.VIEW_DOCUMENT_TYPES,
    PERMISSIONS.CREATE_DOCUMENT_TYPES,
    PERMISSIONS.EDIT_DOCUMENT_TYPES,
    PERMISSIONS.DELETE_DOCUMENT_TYPES,
  ],
  DOCUMENT_MANAGEMENT: [
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.DOWNLOAD_DOCUMENTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS,
  ],
} as const;

// Helper to check if a string is a valid permission
export function isValidPermission(
  permission: string
): permission is Permission {
  return ALL_PERMISSIONS.includes(permission as Permission);
}
