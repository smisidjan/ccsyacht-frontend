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

  // Project Management
  VIEW_PROJECTS: "view_projects",
  EDIT_PROJECTS: "edit_projects",
  CREATE_PROJECTS: "create_projects",
  DELETE_PROJECTS: "delete_projects",
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
  PROJECT_MANAGEMENT: [
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.EDIT_PROJECTS,
    PERMISSIONS.CREATE_PROJECTS,
    PERMISSIONS.DELETE_PROJECTS,
  ],
} as const;

// Helper to check if a string is a valid permission
export function isValidPermission(
  permission: string
): permission is Permission {
  return ALL_PERMISSIONS.includes(permission as Permission);
}
