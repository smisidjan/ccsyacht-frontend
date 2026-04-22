"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  StageSignoff,
  SignSignoffRequest,
  RejectSignoffRequest,
  ApiError,
} from "./types";
import { apiFetch } from "./fetch";

// ============ Stage Signoffs API ============
export const stageSignoffsApi = {
  getAll: (projectId: string, stageId: string): Promise<{ data: StageSignoff[] }> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/signoffs`),

  submitForSignoff: (projectId: string, stageId: string): Promise<{ data: StageSignoff[] }> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/submit-for-signoff`, {
      method: "POST",
    }),

  sign: (projectId: string, stageId: string, signoffId: string, data: SignSignoffRequest): Promise<StageSignoff> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/signoffs/${signoffId}/sign`, {
      method: "POST",
      body: data,
    }),

  reject: (projectId: string, stageId: string, signoffId: string, data: RejectSignoffRequest): Promise<StageSignoff> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/signoffs/${signoffId}/reject`, {
      method: "POST",
      body: data,
    }),
};

// ============ Stage Signoffs Hook ============
interface UseStageSignoffsState {
  data: StageSignoff[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useStageSignoffs(projectId: string, stageId: string) {
  const [state, setState] = useState<UseStageSignoffsState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchSignoffs = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await stageSignoffsApi.getAll(projectId, stageId);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, stageId]);

  useEffect(() => {
    fetchSignoffs();
  }, [fetchSignoffs]);

  const submitForSignoff = async () => {
    await stageSignoffsApi.submitForSignoff(projectId, stageId);
    fetchSignoffs();
  };

  const sign = async (signoffId: string, data: SignSignoffRequest) => {
    await stageSignoffsApi.sign(projectId, stageId, signoffId, data);
    fetchSignoffs();
  };

  const reject = async (signoffId: string, data: RejectSignoffRequest) => {
    await stageSignoffsApi.reject(projectId, stageId, signoffId, data);
    fetchSignoffs();
  };

  return {
    ...state,
    refetch: fetchSignoffs,
    submitForSignoff,
    sign,
    reject,
  };
}
