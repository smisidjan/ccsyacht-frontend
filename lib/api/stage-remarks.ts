"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  StageRemark,
  StageRemarkAttachment,
  CreateStageRemarkRequest,
  UpdateStageRemarkRequest,
  ApiError,
} from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Base fetch function
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

// Query parameters for stage remarks
export interface StageRemarksQueryParams {
  parent_id?: string;
  include_replies?: boolean;
  per_page?: number;
  page?: number;
}

// ============ Stage Remarks API ============
export const stageRemarksApi = {
  // Get all remarks for a stage
  getAll: (
    projectId: string,
    stageId: string,
    params?: StageRemarksQueryParams
  ): Promise<{ data: StageRemark[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.parent_id) queryParams.append("parent_id", params.parent_id);
    if (params?.include_replies !== undefined) queryParams.append("include_replies", String(params.include_replies));
    if (params?.per_page) queryParams.append("per_page", String(params.per_page));
    if (params?.page) queryParams.append("page", String(params.page));

    const queryString = queryParams.toString();
    const url = `/projects/${projectId}/stages/${stageId}/remarks${queryString ? `?${queryString}` : ""}`;
    return apiFetch(url);
  },

  // Get single remark by ID
  getById: (projectId: string, remarkId: string): Promise<StageRemark> =>
    apiFetch(`/projects/${projectId}/remarks/${remarkId}`),

  // Create a new remark
  create: (
    projectId: string,
    stageId: string,
    data: CreateStageRemarkRequest
  ): Promise<StageRemark> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/remarks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update a remark (author only)
  update: (
    projectId: string,
    remarkId: string,
    data: UpdateStageRemarkRequest
  ): Promise<StageRemark> =>
    apiFetch(`/projects/${projectId}/remarks/${remarkId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete a remark
  delete: (projectId: string, remarkId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/remarks/${remarkId}`, {
      method: "DELETE",
    }),

  // Get attachments for a remark
  getAttachments: (
    projectId: string,
    remarkId: string
  ): Promise<{ data: StageRemarkAttachment[] }> =>
    apiFetch(`/projects/${projectId}/remarks/${remarkId}/attachments`),

  // Upload attachment
  uploadAttachment: async (
    projectId: string,
    remarkId: string,
    file: File
  ): Promise<StageRemarkAttachment> => {
    const token = getAuthToken();
    const tenantUrl = getTenantUrl();

    const formData = new FormData();
    formData.append("file", file);

    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    if (tenantUrl) {
      (headers as Record<string, string>)["X-Tenant-ID"] = tenantUrl;
    }

    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/remarks/${remarkId}/attachments`,
      {
        method: "POST",
        headers,
        body: formData,
      }
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

  // Delete attachment
  deleteAttachment: (
    projectId: string,
    remarkId: string,
    attachmentId: string
  ): Promise<void> =>
    apiFetch(
      `/projects/${projectId}/remarks/${remarkId}/attachments/${attachmentId}`,
      {
        method: "DELETE",
      }
    ),

  // Get download URL for attachment
  getDownloadUrl: (projectId: string, remarkId: string, attachmentId: string): string => {
    return `${API_BASE_URL}/projects/${projectId}/remarks/${remarkId}/attachments/${attachmentId}/download`;
  },
};

// ============ Hooks ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useStageRemarks(
  projectId: string,
  stageId: string,
  params?: StageRemarksQueryParams
) {
  const [state, setState] = useState<UseApiState<StageRemark[]>>({
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

// Hook for remark attachments
export function useStageRemarkAttachments(
  projectId: string,
  remarkId: string,
  enabled: boolean = true
) {
  const [state, setState] = useState<UseApiState<StageRemarkAttachment[]>>({
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
