"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  StageRemark,
  StageRemarkAttachment,
  CreateStageRemarkRequest,
  UpdateStageRemarkRequest,
  ApiError,
} from "./types";
import { apiFetch, buildQueryString } from "./fetch";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Query parameters for stage remarks
export interface StageRemarksQueryParams {
  parent_id?: string;
  include_replies?: boolean;
  per_page?: number;
  page?: number;
}

// ============ Stage Remarks API ============
export const stageRemarksApi = {
  getAll: (projectId: string, stageId: string, params?: StageRemarksQueryParams): Promise<{ data: StageRemark[] }> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/remarks${buildQueryString({
      parent_id: params?.parent_id,
      include_replies: params?.include_replies,
      per_page: params?.per_page,
      page: params?.page,
    })}`),

  getById: (projectId: string, remarkId: string): Promise<StageRemark> =>
    apiFetch(`/projects/${projectId}/remarks/${remarkId}`),

  create: (projectId: string, stageId: string, data: CreateStageRemarkRequest): Promise<StageRemark> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/remarks`, {
      method: "POST",
      body: data,
    }),

  update: (projectId: string, remarkId: string, data: UpdateStageRemarkRequest): Promise<StageRemark> =>
    apiFetch(`/projects/${projectId}/remarks/${remarkId}`, {
      method: "PUT",
      body: data,
    }),

  delete: (projectId: string, remarkId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/remarks/${remarkId}`, {
      method: "DELETE",
    }),

  getAttachments: (projectId: string, remarkId: string): Promise<{ data: StageRemarkAttachment[] }> =>
    apiFetch(`/projects/${projectId}/remarks/${remarkId}/attachments`),

  // Upload attachment - uses FormData so needs custom handling
  uploadAttachment: async (projectId: string, remarkId: string, file: File): Promise<StageRemarkAttachment> => {
    const token = getAuthToken();
    const tenantUrl = getTenantUrl();

    const formData = new FormData();
    formData.append("file", file);

    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (tenantUrl) headers["X-Tenant-ID"] = tenantUrl;

    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/remarks/${remarkId}/attachments`,
      { method: "POST", headers, body: formData }
    );

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
  },

  deleteAttachment: (projectId: string, remarkId: string, attachmentId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/remarks/${remarkId}/attachments/${attachmentId}`, {
      method: "DELETE",
    }),

  getDownloadUrl: (projectId: string, remarkId: string, attachmentId: string): string =>
    `${API_BASE_URL}/projects/${projectId}/remarks/${remarkId}/attachments/${attachmentId}/download`,
};

// ============ Hooks ============
interface UseStageRemarksState {
  data: StageRemark[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useStageRemarks(projectId: string, stageId: string, params?: StageRemarksQueryParams) {
  const [state, setState] = useState<UseStageRemarksState>({
    data: null,
    loading: true,
    error: null,
  });

  const paramsString = JSON.stringify(params);

  const fetchRemarks = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const parsedParams = paramsString ? JSON.parse(paramsString) : undefined;
      const response = await stageRemarksApi.getAll(projectId, stageId, parsedParams);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, stageId, paramsString]);

  useEffect(() => {
    fetchRemarks();
  }, [fetchRemarks]);

  const createRemark = async (data: CreateStageRemarkRequest) => {
    await stageRemarksApi.create(projectId, stageId, data);
    fetchRemarks();
  };

  const updateRemark = async (remarkId: string, data: UpdateStageRemarkRequest) => {
    await stageRemarksApi.update(projectId, remarkId, data);
    fetchRemarks();
  };

  const deleteRemark = async (remarkId: string) => {
    await stageRemarksApi.delete(projectId, remarkId);
    fetchRemarks();
  };

  return {
    ...state,
    refetch: fetchRemarks,
    createRemark,
    updateRemark,
    deleteRemark,
  };
}

interface UseStageRemarkAttachmentsState {
  data: StageRemarkAttachment[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useStageRemarkAttachments(projectId: string, remarkId: string, enabled: boolean = true) {
  const [state, setState] = useState<UseStageRemarkAttachmentsState>({
    data: null,
    loading: enabled,
    error: null,
  });

  const fetchAttachments = useCallback(async () => {
    if (!enabled) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await stageRemarksApi.getAttachments(projectId, remarkId);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, remarkId, enabled]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  return {
    ...state,
    refetch: fetchAttachments,
  };
}
