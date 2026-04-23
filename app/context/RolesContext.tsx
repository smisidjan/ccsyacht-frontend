"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { rolesApi } from "@/lib/api/client";
import type { Role, ApiError } from "@/lib/api/types";

interface RolesContextValue {
  employeeRoles: Role[];
  guestRoles: Role[];
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

const RolesContext = createContext<RolesContextValue | undefined>(undefined);

export function RolesProvider({ children }: { children: ReactNode }) {
  const [employeeRoles, setEmployeeRoles] = useState<Role[]>([]);
  const [guestRoles, setGuestRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both role types in parallel
      const [employeeResponse, guestResponse] = await Promise.all([
        rolesApi.getAll("employee"),
        rolesApi.getAll("guest"),
      ]);

      setEmployeeRoles(employeeResponse || []);
      setGuestRoles(guestResponse || []);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch roles once on mount
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const value = useMemo(
    () => ({
      employeeRoles,
      guestRoles,
      loading,
      error,
      refetch: fetchRoles,
    }),
    [employeeRoles, guestRoles, loading, error, fetchRoles]
  );

  return (
    <RolesContext.Provider value={value}>
      {children}
    </RolesContext.Provider>
  );
}

export function useRolesContext() {
  const context = useContext(RolesContext);
  if (!context) {
    throw new Error("useRolesContext must be used within RolesProvider");
  }
  return context;
}

// Convenience hook that returns roles for a specific type
export function useRolesByType(type: "employee" | "guest") {
  const { employeeRoles, guestRoles, loading, error } = useRolesContext();
  return {
    data: type === "employee" ? employeeRoles : guestRoles,
    loading,
    error,
  };
}
