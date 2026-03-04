"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { usePermission } from "@/lib/hooks/usePermission";
import type { Permission } from "@/lib/constants/permissions";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";

type PermissionMode = "any" | "all";

interface ProtectedRouteProps {
  /**
   * Required permission(s) to access the route
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
   * Optional redirect path when user lacks permission
   * Defaults to /dashboard
   */
  redirectTo?: string;

  /**
   * If true, shows error message instead of redirecting
   */
  showErrorMessage?: boolean;

  /**
   * Custom error message
   */
  errorMessage?: string;

  /**
   * Loading skeleton type
   */
  loadingType?: "table" | "form" | "list" | "header";
}

/**
 * ProtectedRoute - Route-level permission protection
 * Protects entire pages/routes based on user permissions
 *
 * @example
 * ```tsx
 * // In a page component
 * export default function UsersPage() {
 *   return (
 *     <ProtectedRoute permissions={PERMISSIONS.VIEW_USERS}>
 *       <UsersContent />
 *     </ProtectedRoute>
 *   );
 * }
 *
 * // With multiple permissions
 * export default function AdminPage() {
 *   return (
 *     <ProtectedRoute
 *       permissions={[PERMISSIONS.VIEW_USERS, PERMISSIONS.MANAGE_SETTINGS]}
 *       mode="all"
 *       redirectTo="/dashboard"
 *     >
 *       <AdminContent />
 *     </ProtectedRoute>
 *   );
 * }
 * ```
 */
export default function ProtectedRoute({
  permissions,
  mode = "any",
  children,
  redirectTo = "/dashboard",
  showErrorMessage = false,
  errorMessage = "You don't have permission to access this page",
  loadingType = "table",
}: ProtectedRouteProps) {
  const router = useRouter();
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } =
    usePermission();

  // Normalize permissions to array
  const permissionArray = Array.isArray(permissions)
    ? permissions
    : [permissions];

  // Check permissions
  const hasAccess = (() => {
    if (loading) return false;

    if (permissionArray.length === 1) {
      return hasPermission(permissionArray[0]);
    } else if (mode === "all") {
      return hasAllPermissions(permissionArray);
    } else {
      return hasAnyPermission(permissionArray);
    }
  })();

  // Handle redirect when permissions are loaded and user lacks access
  useEffect(() => {
    if (!loading && !hasAccess && !showErrorMessage) {
      router.push(redirectTo);
    }
  }, [loading, hasAccess, showErrorMessage, router, redirectTo]);

  // Show loading state
  if (loading) {
    return <LoadingSkeleton type={loadingType} />;
  }

  // Show error message instead of redirecting
  if (!hasAccess && showErrorMessage) {
    return (
      <div className="p-6">
        <Alert type="error" message={errorMessage} />
      </div>
    );
  }

  // Render children if user has access
  return hasAccess ? <>{children}</> : null;
}
