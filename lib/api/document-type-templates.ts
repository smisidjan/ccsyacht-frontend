"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  DocumentTypeTemplate,
  CreateDocumentTypeTemplateRequest,
  UpdateDocumentTypeTemplateRequest,
  ReorderDocumentTypeTemplatesRequest,
  GetDocumentTypeTemplatesParams,
  ApiError,
} from "./types";
import { apiFetch, buildQueryString } from "./fetch";

// ============ Document Type Templates API ============
export const documentTypeTemplatesApi = {
  getAll: (params?: GetDocumentTypeTemplatesParams): Promise<{ data: DocumentTypeTemplate[] }> =>
    apiFetch(`/document-type-templates${buildQueryString({ active_only: params?.active_only || undefined })}`),

  getById: (id: string): Promise<{ data: DocumentTypeTemplate }> =>
    apiFetch(`/document-type-templates/${id}`),

  create: (data: CreateDocumentTypeTemplateRequest): Promise<{ data: DocumentTypeTemplate }> =>
    apiFetch(`/document-type-templates`, {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: UpdateDocumentTypeTemplateRequest): Promise<{ data: DocumentTypeTemplate }> =>
    apiFetch(`/document-type-templates/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: string): Promise<void> =>
    apiFetch(`/document-type-templates/${id}`, {
      method: "DELETE",
    }),

  reorder: (data: ReorderDocumentTypeTemplatesRequest): Promise<void> =>
    apiFetch(`/document-type-templates/reorder`, {
      method: "POST",
      body: data,
    }),
};

// ============ Document Type Templates Hook ============
interface UseDocumentTypeTemplatesState {
  data: DocumentTypeTemplate[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useDocumentTypeTemplates(params?: GetDocumentTypeTemplatesParams) {
  const [state, setState] = useState<UseDocumentTypeTemplatesState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchTemplates = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await documentTypeTemplatesApi.getAll(params);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [params?.active_only]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (data: CreateDocumentTypeTemplateRequest) => {
    await documentTypeTemplatesApi.create(data);
    fetchTemplates();
  };

  const updateTemplate = async (id: string, data: UpdateDocumentTypeTemplateRequest) => {
    await documentTypeTemplatesApi.update(id, data);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    await documentTypeTemplatesApi.delete(id);
    fetchTemplates();
  };

  const reorderTemplates = async (data: ReorderDocumentTypeTemplatesRequest) => {
    await documentTypeTemplatesApi.reorder(data);
    fetchTemplates();
  };

  return {
    ...state,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    reorderTemplates,
  };
}
