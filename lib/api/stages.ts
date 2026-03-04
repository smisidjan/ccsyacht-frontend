"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Stage,
  CreateStageRequest,
  UpdateStageRequest,
  UpdateStageStatusRequest,
  ApiError,
} from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Base fetch function for stages
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

// ============ Stages API ============
export const stagesApi = {
  getAll: (projectId: string, areaId: string): Promise<{ data: Stage[] }> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}/stages`),

  getById: (projectId: string, stageId: string): Promise<Stage> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}`),

  create: (projectId: string, areaId: string, data: CreateStageRequest): Promise<Stage> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}/stages`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (projectId: string, stageId: string, data: UpdateStageRequest): Promise<Stage> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateStatus: (projectId: string, stageId: string, data: UpdateStageStatusRequest): Promise<Stage> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (projectId: string, stageId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}`, {
      method: "DELETE",
    }),
};

// ============ Stages Hook ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useStages(projectId: string, areaId: string) {
  const [state, setState] = useState<UseApiState<Stage[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchStages = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await stagesApi.getAll(projectId, areaId);
      const data = response.data || [];
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, areaId]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const createStage = async (data: CreateStageRequest) => {
    await stagesApi.create(projectId, areaId, data);
    fetchStages();
  };

  const updateStage = async (stageId: string, data: UpdateStageRequest) => {
    await stagesApi.update(projectId, stageId, data);
    fetchStages();
  };

  const updateStageStatus = async (stageId: string, data: UpdateStageStatusRequest) => {
    await stagesApi.updateStatus(projectId, stageId, data);
    fetchStages();
  };

  const deleteStage = async (stageId: string) => {
    await stagesApi.delete(projectId, stageId);
    fetchStages();
  };

  return {
    ...state,
    refetch: fetchStages,
    createStage,
    updateStage,
    updateStageStatus,
    deleteStage,
  };
}
