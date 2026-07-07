"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Document,
  UploadDocumentRequest,
  ApiError,
} from "./types";
import { apiFetch, buildQueryString } from "./fetch";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Get WebSocket socket ID to prevent broadcasting back to sender (for custom fetch calls)
function getSocketId(): string | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Echo?: { socketId: () => string } }).Echo?.socketId() ?? null;
}

// Paginated response type
interface PaginatedResponse<T> {
  data: T[];
  links?: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
  meta?: {
    current_page?: number;
    from?: number;
    last_page?: number;
    path?: string;
    per_page?: number;
    to?: number;
    total?: number;
  };
}

// ============ Documents API ============
export const documentsApi = {
  getAll: (projectId: string, params?: {
    document_type_id?: string;
    per_page?: number;
    page?: number;
    include_acknowledgements?: boolean;
  }): Promise<PaginatedResponse<Document>> =>
    apiFetch(`/projects/${projectId}/documents${buildQueryString({
      document_type_id: params?.document_type_id,
      per_page: params?.per_page,
      page: params?.page,
      include_acknowledgements: params?.include_acknowledgements,
    })}`),

  getById: (projectId: string, docId: string, includeAcknowledgements?: boolean): Promise<Document> =>
    apiFetch(`/projects/${projectId}/documents/${docId}${buildQueryString({
      include_acknowledgements: includeAcknowledgements,
    })}`),

  getByType: (projectId: string, typeId: string, includeAcknowledgements?: boolean): Promise<{ data: Document[] }> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}/documents${buildQueryString({
      include_acknowledgements: includeAcknowledgements,
    })}`),

  upload: (projectId: string, typeId: string, data: UploadDocumentRequest): Promise<Document> => {
    const formData = new FormData();
    formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    formData.append("file", data.file);
    if (data.reviewer_ids?.length) {
      data.reviewer_ids.forEach((id) => formData.append("reviewer_ids[]", id));
    }

    return apiFetch(`/projects/${projectId}/document-types/${typeId}/documents`, {
      method: "POST",
      body: formData,
      skipContentType: true,
    });
  },

  approve: (projectId: string, docId: string): Promise<Document> =>
    apiFetch(`/projects/${projectId}/documents/${docId}/approve`, {
      method: "POST",
    }),

  decline: (projectId: string, docId: string, reason: string): Promise<Document> =>
    apiFetch(`/projects/${projectId}/documents/${docId}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  /** Plain URL builder for the auth-aware download endpoint —
   *  reused by `download()` and by the inline viewer modal which
   *  fetches the blob through its own pipeline. */
  getDownloadUrl: (projectId: string, docId: string): string =>
    `${API_BASE_URL}/projects/${projectId}/documents/${docId}/download`,

  download: async (projectId: string, docId: string): Promise<Blob> => {
    const token = getAuthToken();
    const tenantUrl = getTenantUrl();

    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    if (tenantUrl) {
      (headers as Record<string, string>)["X-Tenant-ID"] = tenantUrl;
    }

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/documents/${docId}/download`, {
      method: "GET",
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

    return response.blob();
  },

  delete: (projectId: string, docId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/documents/${docId}`, {
      method: "DELETE",
    }),

  downloadGeneralArrangement: async (projectId: string): Promise<Blob> => {
    const token = getAuthToken();
    const tenantUrl = getTenantUrl();

    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    if (tenantUrl) {
      (headers as Record<string, string>)["X-Tenant-ID"] = tenantUrl;
    }

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/general-arrangement`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.error || errorData.message || `HTTP error ${response.status}`,
        code: errorData.code,
        status: response.status,
      };
      throw error;
    }

    return response.blob();
  },
};

// ============ Documents Hook ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useDocuments(projectId: string, typeId?: string) {
  const [state, setState] = useState<UseApiState<Document[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchDocuments = useCallback(async () => {
    // Don't fetch if typeId is empty string (waiting for selection)
    if (typeId === "") {
      setState({ data: [], loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      let data: Document[];
      if (typeId) {
        // Use getAll with document_type_id filter instead of getByType to get proper pagination
        const response = await documentsApi.getAll(projectId, {
          document_type_id: typeId,
          per_page: 100, // Get up to 100 documents per type
          include_acknowledgements: true, // Include acknowledgement data
        });
        data = response.data || [];
      } else {
        const response = await documentsApi.getAll(projectId, {
          per_page: 100, // Get up to 100 documents total
          include_acknowledgements: true, // Include acknowledgement data
        });
        data = response.data || [];
      }
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, typeId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (typeId: string, data: UploadDocumentRequest) => {
    await documentsApi.upload(projectId, typeId, data);
    fetchDocuments();
  };

  const downloadDocument = async (docId: string, fileName: string) => {
    const blob = await documentsApi.download(projectId, docId);
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const deleteDocument = async (docId: string) => {
    await documentsApi.delete(projectId, docId);
    fetchDocuments();
  };

  return {
    ...state,
    refetch: fetchDocuments,
    uploadDocument,
    downloadDocument,
    deleteDocument,
  };
}
