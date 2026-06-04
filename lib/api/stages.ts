"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Stage,
  CreateStageRequest,
  UpdateStageRequest,
  UpdateStageStatusRequest,
  BulkCreateStagesRequest,
  ApiError,
} from "./types";
import { apiFetch } from "./fetch";

// ============ Stages API ============
export const stagesApi = {
  getAll: (projectId: string, areaId: string): Promise<{ data: Stage[] }> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}/stages`),

  getAllForProject: (projectId: string): Promise<{ data: Stage[] }> =>
    apiFetch(`/projects/${projectId}/stages`),

  getById: (projectId: string, stageId: string): Promise<Stage> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}`),

  create: (projectId: string, areaId: string, data: CreateStageRequest): Promise<Stage> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}/stages`, {
      method: "POST",
      body: data,
    }),

  update: (projectId: string, stageId: string, data: UpdateStageRequest): Promise<Stage> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}`, {
      method: "PUT",
      body: data,
    }),

  updateStatus: (projectId: string, stageId: string, data: UpdateStageStatusRequest): Promise<Stage> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/status`, {
      method: "PUT",
      body: data,
    }),

  delete: (projectId: string, stageId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}`, {
      method: "DELETE",
    }),

  bulkCreate: (projectId: string, areaId: string, data: BulkCreateStagesRequest): Promise<{ data: Stage[] }> =>
    apiFetch(`/projects/${projectId}/areas/${areaId}/stages/bulk`, {
      method: "POST",
      body: data,
    }),
};

// ============ Stages Hook ============
interface UseStagesState {
  data: Stage[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useStages(projectId: string, areaId: string) {
  const [state, setState] = useState<UseStagesState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchStages = useCallback(async () => {
    // Skip when no area is selected — the URL would be malformed
    // (`/areas//stages`) and the backend returns 404. Idle state is
    // the correct semantic here: there's nothing to fetch yet.
    if (!projectId || !areaId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await stagesApi.getAll(projectId, areaId);
      setState({ data: response.data || [], loading: false, error: null });
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

// ============ Project Stages Hook (all stages in a project) ============
export function useProjectStages(projectId: string) {
  const [state, setState] = useState<UseStagesState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchStages = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await stagesApi.getAllForProject(projectId);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  return {
    ...state,
    refetch: fetchStages,
  };
}
