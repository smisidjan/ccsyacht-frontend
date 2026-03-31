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
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Base fetch function for document type templates
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

// ============ Document Type Templates API ============
export const documentTypeTemplatesApi = {
  // List all templates (with optional active_only filter)
  getAll: (params?: GetDocumentTypeTemplatesParams): Promise<{ data: DocumentTypeTemplate[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.active_only) {
      queryParams.append("active_only", "true");
    }
    const queryString = queryParams.toString();
    return apiFetch(`/document-type-templates${queryString ? `?${queryString}` : ""}`);
  },

  // Get a single template by ID
  getById: (id: string): Promise<{ data: DocumentTypeTemplate }> =>
    apiFetch(`/document-type-templates/${id}`),

  // Create a new template
  create: (data: CreateDocumentTypeTemplateRequest): Promise<{ data: DocumentTypeTemplate }> =>
    apiFetch(`/document-type-templates`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update a template
  update: (id: string, data: UpdateDocumentTypeTemplateRequest): Promise<{ data: DocumentTypeTemplate }> =>
    apiFetch(`/document-type-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete a template
  delete: (id: string): Promise<void> =>
    apiFetch(`/document-type-templates/${id}`, {
      method: "DELETE",
    }),

  // Reorder templates
  reorder: (data: ReorderDocumentTypeTemplatesRequest): Promise<void> =>
    apiFetch(`/document-type-templates/reorder`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============ Document Type Templates Hook ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useDocumentTypeTemplates(params?: GetDocumentTypeTemplatesParams) {
  const [state, setState] = useState<UseApiState<DocumentTypeTemplate[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchTemplates = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await documentTypeTemplatesApi.getAll(params);
      const data = response.data || [];
      setState({ data, loading: false, error: null });
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
