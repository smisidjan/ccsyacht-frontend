"use client";

import { useState, useEffect, useCallback } from "react";
import type { Area, CreateAreaRequest, UpdateAreaRequest, ApiError } from "./types";
import { apiFetch, buildQueryString } from "./fetch";

// ============ Areas API ============
export const areasApi = {
  getAll: (projectId: string, deckId?: string): Promise<{ data: Area[] }> =>
    apiFetch(`/projects/${projectId}/areas${buildQueryString({ deck_id: deckId })}`),

  getById: (projectId: string, areaId: string): Promise<Area> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}`),

  create: (projectId: string, deckId: string, data: CreateAreaRequest): Promise<Area> =>
    apiFetch(`/projects/${projectId}/decks/${deckId}/areas`, {
      method: "POST",
      body: data,
    }),

  update: (projectId: string, areaId: string, data: UpdateAreaRequest): Promise<Area> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}`, {
      method: "PUT",
      body: data,
    }),

  delete: (projectId: string, areaId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}`, {
      method: "DELETE",
    }),
};

// ============ Areas Hook ============
interface UseAreasState {
  data: Area[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useAreas(projectId: string, deckId?: string) {
  const [state, setState] = useState<UseAreasState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchAreas = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await areasApi.getAll(projectId, deckId);
      setState({ data: response.data || [], loading: false, error: null });
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

// Hook for single area (for detail page)
interface UseAreaState {
  data: Area | null;
  loading: boolean;
  error: ApiError | null;
}

export function useArea(projectId: string, areaId: string) {
  const [state, setState] = useState<UseAreaState>({
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
