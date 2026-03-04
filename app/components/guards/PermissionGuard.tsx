"use client";

import type { ReactNode } from "react";
import { usePermission } from "@/lib/hooks/usePermission";
import type { Permission } from "@/lib/constants/permissions";

type PermissionMode = "any" | "all";

interface PermissionGuardProps {
  /**
   * Required permission(s) to render children
   */
  permissions: Permission | Permission[];

  /**
   * Mode for checking multiple permissions
   * - "any": User needs at least one permission (default)
   * - "all": User needs all permissions
   */
  mode?: PermissionMode;

  /**
   * Content to render when user has permission
   */
  children: ReactNode;

  /**
   * Optional fallback to render when user lacks permission
   * If not provided, nothing is rendered
   */
  fallback?: ReactNode;

  /**
   * Optional loading component to show while checking permissions
   */
  loadingComponent?: ReactNode;

  /**
   * If true, renders fallback during loading instead of loadingComponent
   */
  showFallbackOnLoading?: boolean;
}

/**
 * PermissionGuard - Conditionally render content based on user permissions
 *
 * @example
 * ```tsx
 * // Single permission check
 * <PermissionGuard permissions={PERMISSIONS.EDIT_USERS}>
 *   <EditButton />
 * </PermissionGuard>
 *
 * // Multiple permissions (any)
 * <PermissionGuard
 *   permissions={[PERMISSIONS.EDIT_USERS, PERMISSIONS.DELETE_USERS]}
 *   mode="any"
 * >
 *   <ManageUsersButton />
 * </PermissionGuard>
 *
 * // With fallback
 * <PermissionGuard
 *   permissions={PERMISSIONS.VIEW_ADMIN_PANEL}
 *   fallback={<div>Access denied</div>}
 * >
 *   <AdminPanel />
 * </PermissionGuard>
 * ```
 */
export default function PermissionGuard({
  permissions,
  mode = "any",
  children,
  fallback = null,
  loadingComponent = null,
  showFallbackOnLoading = false,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } =
    usePermission();

  // Handle loading state
  if (loading) {
    return showFallbackOnLoading ? <>{fallback}</> : <>{loadingComponent}</>;
  }

  // Normalize permissions to array
  const permissionArray = Array.isArray(permissions)
    ? permissions
    : [permissions];

  // Check permissions based on mode
  let hasAccess = false;

  if (permissionArray.length === 1) {
    hasAccess = hasPermission(permissionArray[0]);
  } else if (mode === "all") {
    hasAccess = hasAllPermissions(permissionArray);
  } else {
    hasAccess = hasAnyPermission(permissionArray);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
