"use client";

import { useState, useEffect, useCallback } from "react";
import type { LogbookEntry, LogbookFilters, ApiError } from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Paginated response type
interface PaginatedResponse<T> {
  data: T[];
  links?: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
  meta?: {
    current_page?: number;
    from?: number;
    last_page?: number;
    path?: string;
    per_page?: number;
    to?: number;
    total?: number;
  };
}

// Base fetch function
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const tenantUrl = getTenantUrl();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  if (tenantUrl) {
    (headers as Record<string, string>)["X-Tenant-ID"] = tenantUrl;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = {
      message: errorData.message || errorData.error || `HTTP error ${response.status}`,
      code: errorData.code,
      status: response.status,
    };
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============ Logbook API ============
export const logbookApi = {
  getEntries: (projectId: string, filters?: LogbookFilters): Promise<PaginatedResponse<LogbookEntry>> => {
    const query = new URLSearchParams();
    if (filters?.action_type) query.append("action_type", filters.action_type);
    if (filters?.user_id) query.append("user_id", filters.user_id);
    if (filters?.from_date) query.append("from_date", filters.from_date);
    if (filters?.to_date) query.append("to_date", filters.to_date);
    if (filters?.per_page) query.append("per_page", String(filters.per_page));
    if (filters?.page) query.append("page", String(filters.page));
    const queryString = query.toString();
    return apiFetch(`/projects/${projectId}/logbook${queryString ? `?${queryString}` : ""}`);
  },
};

// ============ Logbook Hook ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useLogbook(projectId: string, filters?: LogbookFilters) {
  const [state, setState] = useState<UseApiState<LogbookEntry[]>>({
    data: null,
    loading: true,
    error: null,
  });

  // Serialize filters to avoid infinite loop caused by object reference changes
  const filtersKey = JSON.stringify(filters || {});

  const fetchLogbook = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const parsedFilters = JSON.parse(filtersKey) as LogbookFilters;
      const response = await logbookApi.getEntries(projectId, Object.keys(parsedFilters).length > 0 ? parsedFilters : undefined);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, filtersKey]); // Use serialized filters to prevent infinite loop

  useEffect(() => {
    fetchLogbook();
  }, [fetchLogbook]);

  return {
    ...state,
    refetch: fetchLogbook,
  };
}
