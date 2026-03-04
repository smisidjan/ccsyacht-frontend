"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Area,
  CreateAreaRequest,
  UpdateAreaRequest,
  ApiError,
} from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Base fetch function for areas
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

// ============ Areas API ============
export const areasApi = {
  getAll: (projectId: string, deckId?: string): Promise<{ data: Area[] }> => {
    const query = deckId ? `?deck_id=${deckId}` : "";
    return apiFetch(`/projects/${projectId}/areas${query}`);
  },

  getById: (projectId: string, areaId: string): Promise<Area> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}`),

  create: (projectId: string, deckId: string, data: CreateAreaRequest): Promise<Area> =>
    apiFetch(`/projects/${projectId}/decks/${deckId}/areas`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (projectId: string, areaId: string, data: UpdateAreaRequest): Promise<Area> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (projectId: string, areaId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}`, {
      method: "DELETE",
    }),
};

// ============ Areas Hook ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useAreas(projectId: string, deckId?: string) {
  const [state, setState] = useState<UseApiState<Area[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchAreas = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await areasApi.getAll(projectId, deckId);
      const data = response.data || [];
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, deckId]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const createArea = async (deckId: string, data: CreateAreaRequest) => {
    await areasApi.create(projectId, deckId, data);
    fetchAreas();
  };

  const updateArea = async (areaId: string, data: UpdateAreaRequest) => {
    await areasApi.update(projectId, areaId, data);
    fetchAreas();
  };

  const deleteArea = async (areaId: string) => {
    await areasApi.delete(projectId, areaId);
    fetchAreas();
  };

  return {
    ...state,
    refetch: fetchAreas,
    createArea,
    updateArea,
    deleteArea,
  };
}

// Hook voor single area (for detail page)
export function useArea(projectId: string, areaId: string) {
  const [state, setState] = useState<UseApiState<Area>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchArea = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await areasApi.getById(projectId, areaId);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, areaId]);

  useEffect(() => {
    fetchArea();
  }, [fetchArea]);

  return {
    ...state,
    refetch: fetchArea,
  };
}
