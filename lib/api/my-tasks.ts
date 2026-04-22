"use client";

import { useState, useEffect, useCallback } from "react";
import type { MyTasksResponse, ApiError } from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Base fetch function for my-tasks
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

  return response.json();
}

// ============ My Tasks API ============
export const myTasksApi = {
  getAll: (): Promise<MyTasksResponse> =>
    apiFetch("/me/tasks"),
};

// ============ My Tasks Hook ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useMyTasks() {
  const [state, setState] = useState<UseApiState<MyTasksResponse>>({
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
