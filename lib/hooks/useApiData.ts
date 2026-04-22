/**
 * Generic API Data Hook
 * Eliminates duplicate state management across API hooks
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiError } from "@/lib/api/types";

export interface UseApiDataState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export interface UseApiDataOptions {
  /** Skip initial fetch (useful for conditional fetching) */
  skip?: boolean;
  /** Dependencies that trigger refetch when changed */
  deps?: unknown[];
}

export interface UseApiDataReturn<T> extends UseApiDataState<T> {
  /** Manually refetch data */
  refetch: () => Promise<void>;
  /** Update data optimistically */
  setData: (data: T | null | ((prev: T | null) => T | null)) => void;
}

/**
 * Generic hook for fetching API data with loading and error states
 *
 * @example
 * ```tsx
 * const { data: areas, loading, error, refetch } = useApiData(
 *   () => areasApi.getAll(projectId),
 *   { deps: [projectId] }
 * );
 * ```
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  options: UseApiDataOptions = {}
): UseApiDataReturn<T> {
  const { skip = false, deps = [] } = options;

  const [state, setState] = useState<UseApiDataState<T>>({
    data: null,
    loading: !skip,
    error: null,
  });

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (skip) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetcher();
      if (isMounted.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (err) {
      if (isMounted.current) {
        setState({
          data: null,
          loading: false,
          error: err as ApiError,
        });
      }
    }
  }, [fetcher, skip]);

  // Initial fetch and refetch on deps change
  useEffect(() => {
    fetchData();
  }, [fetchData, ...deps]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const setData = useCallback(
    (dataOrFn: T | null | ((prev: T | null) => T | null)) => {
      setState((prev) => ({
        ...prev,
        data: typeof dataOrFn === "function"
          ? (dataOrFn as (prev: T | null) => T | null)(prev.data)
          : dataOrFn,
      }));
    },
    []
  );

  return {
    ...state,
    refetch: fetchData,
    setData,
  };
}

/**
 * Hook for fetching data that returns { data: T } wrapper
 * Common pattern in our API responses
 */
export function useApiDataWrapped<T>(
  fetcher: () => Promise<{ data: T }>,
  options: UseApiDataOptions = {}
): UseApiDataReturn<T> {
  const wrappedFetcher = useCallback(async () => {
    const response = await fetcher();
    return response.data;
  }, [fetcher]);

  return useApiData(wrappedFetcher, options);
}
