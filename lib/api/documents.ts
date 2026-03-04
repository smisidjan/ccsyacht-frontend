"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Document,
  UploadDocumentRequest,
  ApiError,
} from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

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

// Base fetch function for documents
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

// ============ Documents API ============
export const documentsApi = {
  getAll: (projectId: string, params?: {
    document_type_id?: string;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Document>> => {
    const query = new URLSearchParams();
    if (params?.document_type_id) query.append("document_type_id", params.document_type_id);
    if (params?.per_page) query.append("per_page", String(params.per_page));
    if (params?.page) query.append("page", String(params.page));
    const queryString = query.toString();
    return apiFetch(`/projects/${projectId}/documents${queryString ? `?${queryString}` : ""}`);
  },

  getById: (projectId: string, docId: string): Promise<Document> =>
    apiFetch(`/projects/${projectId}/documents/${docId}`),

  getByType: (projectId: string, typeId: string): Promise<{ data: Document[] }> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}/documents`),

  upload: async (projectId: string, typeId: string, data: UploadDocumentRequest): Promise<Document> => {
    const formData = new FormData();
    formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    formData.append("file", data.file);

    const token = getAuthToken();
    const tenantUrl = getTenantUrl();

    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    if (tenantUrl) {
      (headers as Record<string, string>)["X-Tenant-ID"] = tenantUrl;
    }

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/document-types/${typeId}/documents`, {
      method: "POST",
      headers,
      body: formData,
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

    return response.json();
  },

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
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      let data: Document[];
      if (typeId) {
        const response = await documentsApi.getByType(projectId, typeId);
        data = response.data || [];
      } else {
        const response = await documentsApi.getAll(projectId);
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
