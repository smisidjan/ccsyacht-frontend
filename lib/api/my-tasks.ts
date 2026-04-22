"use client";

import { useState, useEffect, useCallback } from "react";
import type { MyTasksResponse, ApiError } from "./types";
import { apiFetch } from "./fetch";

// ============ My Tasks API ============
export const myTasksApi = {
  getAll: (): Promise<MyTasksResponse> => apiFetch("/me/tasks"),
};

// ============ My Tasks Hook ============
interface UseMyTasksState {
  data: MyTasksResponse | null;
  loading: boolean;
  error: ApiError | null;
}

export function useMyTasks() {
  const [state, setState] = useState<UseMyTasksState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchMyTasks = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await myTasksApi.getAll();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, []);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  return {
    ...state,
    refetch: fetchMyTasks,
  };
}
