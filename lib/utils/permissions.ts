import type { Permission } from "@/lib/constants/permissions";
import type { CurrentUser } from "@/lib/api/types";

/**
 * Check if a user has a specific permission
 * @param user - Current user object with permissions array
 * @param permission - Permission to check
 * @returns true if user has the permission, false otherwise
 */
export function hasPermission(
  user: CurrentUser | null | undefined,
  permission: Permission
): boolean {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
}

/**
 * Check if a user has ANY of the specified permissions
 * @param user - Current user object with permissions array
 * @param permissions - Array of permissions to check
 * @returns true if user has at least one permission, false otherwise
 */
export function hasAnyPermission(
  user: CurrentUser | null | undefined,
  permissions: Permission[]
): boolean {
  if (!user || !user.permissions || permissions.length === 0) return false;
  return permissions.some((permission) => user.permissions.includes(permission));
}

/**
 * Check if a user has ALL of the specified permissions
 * @param user - Current user object with permissions array
 * @param permissions - Array of permissions to check
 * @returns true if user has all permissions, false otherwise
 */
export function hasAllPermissions(
  user: CurrentUser | null | undefined,
  permissions: Permission[]
): boolean {
  if (!user || !user.permissions || permissions.length === 0) return false;
  return permissions.every((permission) => user.permissions.includes(permission));
}

/**
 * Get missing permissions for a user
 * Useful for debugging and error messages
 * @param user - Current user object with permissions array
 * @param requiredPermissions - Array of required permissions
 * @returns Array of missing permissions
 */
export function getMissingPermissions(
  user: CurrentUser | null | undefined,
  requiredPermissions: Permission[]
): Permission[] {
  if (!user || !user.permissions) return requiredPermissions;
  return requiredPermissions.filter(
    (permission) => !user.permissions.includes(permission)
  );
}

/**
 * Check if user has permission based on role (legacy support)
 * This is a fallback for existing role-based checks
 * @deprecated Use hasPermission instead
 */
export function hasRolePermission(
  user: CurrentUser | null | undefined,
  allowedRoles: string[]
): boolean {
  if (!user || !user.roles) return false;
  return user.roles.some((role) => allowedRoles.includes(role));
}
