"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  DocumentType,
  DocumentTypeAssignee,
  CreateDocumentTypeRequest,
  UpdateDocumentTypeRequest,
  AddDocumentTypeAssigneeRequest,
  ApiError,
} from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Base fetch function for document types
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

// ============ Document Types API ============
export const documentTypesApi = {
  getAll: (projectId: string, includeAssignees = false): Promise<{ data: DocumentType[] }> =>
    apiFetch(`/projects/${projectId}/document-types${includeAssignees ? "?include_assignees=true" : ""}`),

  getById: (projectId: string, typeId: string): Promise<DocumentType> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}`),

  create: (projectId: string, data: CreateDocumentTypeRequest): Promise<DocumentType> =>
    apiFetch(`/projects/${projectId}/document-types`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (projectId: string, typeId: string, data: UpdateDocumentTypeRequest): Promise<DocumentType> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (projectId: string, typeId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}`, {
      method: "DELETE",
    }),

  // Assignee methods
  addAssignee: (
    projectId: string,
    typeId: string,
    data: AddDocumentTypeAssigneeRequest
  ): Promise<DocumentTypeAssignee> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}/assignees`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  removeAssignee: (projectId: string, typeId: string, userId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}/assignees/${userId}`, {
      method: "DELETE",
    }),

  notifyAssignee: (projectId: string, typeId: string, userId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}/assignees/${userId}/notify`, {
      method: "POST",
    }),
};

// ============ Document Types Hook ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseDocumentTypesOptions {
  includeAssignees?: boolean;
}

export function useDocumentTypes(projectId: string, options: UseDocumentTypesOptions = {}) {
  const { includeAssignees = false } = options;
  const [state, setState] = useState<UseApiState<DocumentType[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchDocumentTypes = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await documentTypesApi.getAll(projectId, includeAssignees);
      const data = response.data || [];
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, includeAssignees]);

  useEffect(() => {
    fetchDocumentTypes();
  }, [fetchDocumentTypes]);

  const createDocumentType = async (data: CreateDocumentTypeRequest) => {
    await documentTypesApi.create(projectId, data);
    fetchDocumentTypes();
  };

  const updateDocumentType = async (typeId: string, data: UpdateDocumentTypeRequest) => {
    await documentTypesApi.update(projectId, typeId, data);
    fetchDocumentTypes();
  };

  const deleteDocumentType = async (typeId: string) => {
    await documentTypesApi.delete(projectId, typeId);
    fetchDocumentTypes();
  };

  const addAssignee = async (typeId: string, data: AddDocumentTypeAssigneeRequest) => {
    await documentTypesApi.addAssignee(projectId, typeId, data);
    fetchDocumentTypes();
  };

  const removeAssignee = async (typeId: string, userId: string) => {
    await documentTypesApi.removeAssignee(projectId, typeId, userId);
    fetchDocumentTypes();
  };

  const notifyAssignee = async (typeId: string, userId: string) => {
    await documentTypesApi.notifyAssignee(projectId, typeId, userId);
    fetchDocumentTypes();
  };

  return {
    ...state,
    refetch: fetchDocumentTypes,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
    addAssignee,
    removeAssignee,
    notifyAssignee,
  };
}
