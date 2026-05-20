"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  StageCustomSigner,
  AddCustomSignerRequest,
  ApiError,
} from "./types";
import { apiFetch } from "./fetch";

// ============ Stage Custom Signers API ============
export const stageCustomSignersApi = {
  getAll: (
    projectId: string,
    stageId: string
  ): Promise<{ data: StageCustomSigner[] }> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/custom-signers`),

  add: (
    projectId: string,
    stageId: string,
    data: AddCustomSignerRequest
  ): Promise<StageCustomSigner> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/custom-signers`, {
      method: "POST",
      body: data,
    }),

  remove: (
    projectId: string,
    stageId: string,
    signerId: string
  ): Promise<void> =>
    apiFetch(
      `/projects/${projectId}/stages/${stageId}/custom-signers/${signerId}`,
      { method: "DELETE" }
    ),
};

// ============ Hook ============
interface UseStageCustomSignersState {
  data: StageCustomSigner[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useStageCustomSigners(projectId: string, stageId: string) {
  const [state, setState] = useState<UseStageCustomSignersState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchSigners = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await stageCustomSignersApi.getAll(projectId, stageId);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, stageId]);

  useEffect(() => {
    fetchSigners();
  }, [fetchSigners]);

  const addSigner = async (data: AddCustomSignerRequest) => {
    await stageCustomSignersApi.add(projectId, stageId, data);
    await fetchSigners();
  };

  const removeSigner = async (signerId: string) => {
    await stageCustomSignersApi.remove(projectId, stageId, signerId);
    await fetchSigners();
  };

  return {
    ...state,
    refetch: fetchSigners,
    addSigner,
    removeSigner,
  };
}
