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
import { apiFetch, buildQueryString } from "./fetch";

// ============ Document Types API ============
export const documentTypesApi = {
  getAll: (projectId: string, includeAssignees = false): Promise<{ data: DocumentType[] }> =>
    apiFetch(`/projects/${projectId}/document-types${buildQueryString({ include_assignees: includeAssignees || undefined })}`),

  getById: (projectId: string, typeId: string): Promise<DocumentType> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}`),

  create: (projectId: string, data: CreateDocumentTypeRequest): Promise<DocumentType> =>
    apiFetch(`/projects/${projectId}/document-types`, {
      method: "POST",
      body: data,
    }),

  update: (projectId: string, typeId: string, data: UpdateDocumentTypeRequest): Promise<DocumentType> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}`, {
      method: "PUT",
      body: data,
    }),

  delete: (projectId: string, typeId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}`, {
      method: "DELETE",
    }),

  // Assignee methods
  addAssignee: (projectId: string, typeId: string, data: AddDocumentTypeAssigneeRequest): Promise<DocumentTypeAssignee> =>
    apiFetch(`/projects/${projectId}/document-types/${typeId}/assignees`, {
      method: "POST",
      body: data,
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
interface UseDocumentTypesState {
  data: DocumentType[] | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseDocumentTypesOptions {
  includeAssignees?: boolean;
}

export function useDocumentTypes(projectId: string, options: UseDocumentTypesOptions = {}) {
  const { includeAssignees = false } = options;
  const [state, setState] = useState<UseDocumentTypesState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchDocumentTypes = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await documentTypesApi.getAll(projectId, includeAssignees);
      setState({ data: response.data || [], loading: false, error: null });
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
