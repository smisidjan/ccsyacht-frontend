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
  getEntries: (projectId: string, filters?: LogbookFilters): Promise<PaginatedResponse<LogbookEntry>> => {
    // Backend accepts user_id as a single value, comma-separated, or
    // `user_id[]`. We pick comma-separated for arrays so the URL stays
    // short and the existing buildQueryString helper handles it.
    const userId = Array.isArray(filters?.user_id)
      ? filters?.user_id.length > 0
        ? filters.user_id.join(",")
        : undefined
      : filters?.user_id;

    return apiFetch(`/projects/${projectId}/logbook${buildQueryString({
      action_type: filters?.action_type,
      user_id: userId,
      from_date: filters?.from_date,
      to_date: filters?.to_date,
      per_page: filters?.per_page,
      page: filters?.page,
      punchlist_item_id: filters?.punchlist_item_id,
      category: filters?.category,
      subject_type: filters?.subject_type,
      subject_id: filters?.subject_id,
      search: filters?.search,
    })}`);
  },
};

// ============ Logbook Hook ============
interface LogbookPagination {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

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
  const [pagination, setPagination] = useState<LogbookPagination | null>(null);

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
      if (response.meta) {
        setPagination({
          currentPage: response.meta.current_page ?? 1,
          lastPage: response.meta.last_page ?? 1,
          total: response.meta.total ?? response.data?.length ?? 0,
          perPage: response.meta.per_page ?? response.data?.length ?? 0,
          hasNext: !!response.links?.next,
          hasPrev: !!response.links?.prev,
        });
      } else {
        setPagination(null);
      }
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
      setPagination(null);
    }
  }, [projectId, filtersKey]);

  useEffect(() => {
    fetchLogbook();
  }, [fetchLogbook]);

  return {
    ...state,
    pagination,
    refetch: fetchLogbook,
  };
}
