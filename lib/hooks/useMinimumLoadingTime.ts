"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Hook that enforces a minimum loading time to prevent flickering
 *
 * @param loading - The actual loading state from API/data fetching
 * @param minTime - Minimum time in milliseconds to show loading state (default: 500ms)
 * @returns boolean - The wrapped loading state that respects minimum time
 *
 * @example
 * ```tsx
 * const { data, loading: apiLoading } = useProjects();
 * const loading = useMinimumLoadingTime(apiLoading);
 *
 * if (loading) {
 *   return <LoadingSkeleton />;
 * }
 * ```
 */
export function useMinimumLoadingTime(loading: boolean, minTime: number = 500): boolean {
  const [isLoading, setIsLoading] = useState(loading);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // When loading starts, record the start time
    if (loading && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      setIsLoading(true);
    }

    // When loading finishes, enforce minimum time
    if (!loading && startTimeRef.current !== null) {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, minTime - elapsed);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Wait for remaining time before setting loading to false
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        startTimeRef.current = null;
        timeoutRef.current = null;
      }, remaining);
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loading, minTime]);

  return isLoading;
}
