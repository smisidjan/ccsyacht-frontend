"use client";

import { useState, useEffect, useCallback } from "react";
import type { LogbookEntry, LogbookFilters, ApiError } from "./types";
import { apiFetch, buildQueryString } from "./fetch";

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

// ============ Logbook API ============
export const logbookApi = {
  getEntries: (projectId: string, filters?: LogbookFilters): Promise<PaginatedResponse<LogbookEntry>> =>
    apiFetch(`/projects/${projectId}/logbook${buildQueryString({
      action_type: filters?.action_type,
      user_id: filters?.user_id,
      from_date: filters?.from_date,
      to_date: filters?.to_date,
      per_page: filters?.per_page,
      page: filters?.page,
      punchlist_item_id: filters?.punchlist_item_id,
    })}`),
};

// ============ Logbook Hook ============
interface UseLogbookState {
  data: LogbookEntry[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useLogbook(projectId: string, filters?: LogbookFilters) {
  const [state, setState] = useState<UseLogbookState>({
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
      const response = await logbookApi.getEntries(
        projectId,
        Object.keys(parsedFilters).length > 0 ? parsedFilters : undefined
      );
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, filtersKey]);

  useEffect(() => {
    fetchLogbook();
  }, [fetchLogbook]);

  return {
    ...state,
    refetch: fetchLogbook,
  };
}
