"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { authApi, getAuthToken } from "@/lib/api/client";
import { useAuth } from "@/app/context/AuthContext";
import type { CurrentUser, ApiError } from "@/lib/api/types";

interface CurrentUserContextValue {
  currentUser: CurrentUser | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  // Subscribe to the auth token so a same-tab login/logout refetches the
  // user immediately. The `storage` listener below only fires in *other*
  // tabs, so without this the first-login flow would land on a protected
  // route with currentUser=null → permission check fails → ProtectedRoute
  // redirects to /dashboard → /dashboard forwards to /dashboard/projects
  // → redirect loop.
  const { token } = useAuth();

  const fetchUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await authApi.me();
      setCurrentUser(data);
    } catch (err) {
      setError(err as ApiError);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user on mount and whenever the auth token changes in the
  // current tab (login/logout).
  useEffect(() => {
    fetchUser();
  }, [fetchUser, token]);

  // Listen for auth changes (login/logout)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_token") {
        fetchUser();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [fetchUser]);

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      error,
      refetch: fetchUser,
    }),
    [currentUser, loading, error, fetchUser]
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUserContext() {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error("useCurrentUserContext must be used within CurrentUserProvider");
  }
  return context;
}
