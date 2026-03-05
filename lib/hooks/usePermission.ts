"use client";

import { useMemo } from "react";
import { useCurrentUser } from "@/lib/api/hooks";
import type { Permission } from "@/lib/constants/permissions";
import {
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  getMissingPermissions as getPermissionsMissing,
} from "@/lib/utils/permissions";

/**
 * Hook for checking user permissions
 * Wraps useCurrentUser and provides permission checking utilities
 *
 * @example
 * ```tsx
 * const { hasPermission, loading } = usePermission();
 *
 * if (loading) return <Spinner />;
 *
 * if (hasPermission(PERMISSIONS.EDIT_USERS)) {
 *   return <EditButton />;
 * }
 * ```
 */
export function usePermission() {
  const { data: currentUser, loading, error, refetch } = useCurrentUser();

  // Memoize permission check functions to prevent unnecessary re-renders
  const permissionChecks = useMemo(
    () => ({
      /**
       * Check if current user has a specific permission
       */
      hasPermission: (permission: Permission) =>
        checkPermission(currentUser, permission),

      /**
       * Check if current user has ANY of the specified permissions
       */
      hasAnyPermission: (permissions: Permission[]) =>
        checkAnyPermission(currentUser, permissions),

      /**
       * Check if current user has ALL of the specified permissions
       */
      hasAllPermissions: (permissions: Permission[]) =>
        checkAllPermissions(currentUser, permissions),

      /**
       * Get missing permissions for current user
       */
      getMissingPermissions: (requiredPermissions: Permission[]) =>
        getPermissionsMissing(currentUser, requiredPermissions),

      /**
       * Check if user can manage users (view, edit, or delete)
       * Convenience method for common permission checks
       */
      canManageUsers: () =>
        checkAnyPermission(currentUser, [
          "view_users" as Permission,
          "edit_users" as Permission,
          "delete_users" as Permission,
        ]),

      /**
       * Check if user can manage invitations
       */
      canManageInvitations: () =>
        checkAnyPermission(currentUser, [
          "view_invitations" as Permission,
          "create_invitations" as Permission,
          "manage_invitations" as Permission,
        ]),

      /**
       * Check if user can manage projects
       */
      canManageProjects: () =>
        checkAnyPermission(currentUser, [
          "view_projects" as Permission,
          "edit_projects" as Permission,
          "create_projects" as Permission,
          "delete_projects" as Permission,
        ]),
    }),
    [currentUser]
  );

  return {
    user: currentUser,
    loading,
    error,
    refetch,
    ...permissionChecks,
  };
}
