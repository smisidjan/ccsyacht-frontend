"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  StageSignoff,
  SignSignoffRequest,
  RejectSignoffRequest,
  ApiError,
} from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Base fetch function for stage signoffs
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

// ============ Stage Signoffs API ============
export const stageSignoffsApi = {
  // Get all signoffs for a stage
  getAll: (projectId: string, stageId: string): Promise<{ data: StageSignoff[] }> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/signoffs`),

  // Submit stage for signoff (creates signoffs for all project signers)
  // Also used for resubmit - backend handles both cases
  submitForSignoff: (projectId: string, stageId: string): Promise<{ data: StageSignoff[] }> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/submit-for-signoff`, {
      method: "POST",
    }),

  // Sign a signoff (requires view_stages permission)
  sign: (
    projectId: string,
    stageId: string,
    signoffId: string,
    data: SignSignoffRequest
  ): Promise<StageSignoff> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/signoffs/${signoffId}/sign`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Reject a signoff (requires view_stages permission)
  reject: (
    projectId: string,
    stageId: string,
    signoffId: string,
    data: RejectSignoffRequest
  ): Promise<StageSignoff> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/signoffs/${signoffId}/reject`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============ Stage Signoffs Hook ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useStageSignoffs(projectId: string, stageId: string) {
  const [state, setState] = useState<UseApiState<StageSignoff[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchSignoffs = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await stageSignoffsApi.getAll(projectId, stageId);
      const data = response.data || [];
      setState({ data, loading: false, error: null });
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
