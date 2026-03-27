"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  PunchlistItem,
  CreatePunchlistItemRequest,
  UpdatePunchlistItemRequest,
  UpdatePunchlistItemStatusRequest,
  AddAssigneesRequest,
  PunchlistItemAttachment,
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
    ...options.headers,
  };

  // Only add Content-Type if not multipart/form-data
  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

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

// Query parameters for project-level punchlist items
export interface PunchlistItemsQueryParams {
  status?: "open" | "in_progress" | "done" | "cancelled";
  priority?: "low" | "medium" | "high";
  incomplete?: boolean;
  overdue?: boolean;
  assignee_id?: string;
  page?: number;
  per_page?: number;
}

// Pagination metadata
export interface PaginationMeta {
  currentPage: number;
  from: number;
  lastPage: number;
  perPage: number;
  to: number;
  total: number;
}

// Pagination links
export interface PaginationLinks {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
}

// API response with pagination
export interface PaginatedResponse<T> {
  data: T[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

// Simplified pagination state for components
export interface SimplePagination {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  hasPrev: boolean;
  hasNext: boolean;
}

// ============ Punchlist Items API ============
export const punchlistItemsApi = {
  // Get all punchlist items for a project (with optional filters and pagination)
  getAllForProject: (
    projectId: string,
    params?: PunchlistItemsQueryParams
  ): Promise<PaginatedResponse<PunchlistItem>> => {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.status) queryParams.append("status", params.status);
      if (params.priority) queryParams.append("priority", params.priority);
      if (params.incomplete !== undefined) queryParams.append("incomplete", String(params.incomplete));
      if (params.overdue !== undefined) queryParams.append("overdue", String(params.overdue));
      if (params.assignee_id) queryParams.append("assignee_id", params.assignee_id);
      if (params.page) queryParams.append("page", String(params.page));
      if (params.per_page) queryParams.append("per_page", String(params.per_page));
    }
    const queryString = queryParams.toString();
    const url = `/projects/${projectId}/punchlist-items${queryString ? `?${queryString}` : ""}`;
    return apiFetch(url);
  },

  getAll: (
    projectId: string,
    stageId: string,
    params?: { page?: number; per_page?: number; status?: "open" | "in_progress" | "done" | "cancelled" }
  ): Promise<PaginatedResponse<PunchlistItem>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.per_page) queryParams.append("per_page", String(params.per_page));
    if (params?.status) queryParams.append("status", params.status);
    const queryString = queryParams.toString();
    const url = `/projects/${projectId}/stages/${stageId}/punchlist-items${queryString ? `?${queryString}` : ""}`;
    return apiFetch(url);
  },

  getById: (projectId: string, itemId: string): Promise<PunchlistItem> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}`),

  create: (
    projectId: string,
    stageId: string,
    data: CreatePunchlistItemRequest
  ): Promise<PunchlistItem> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/punchlist-items`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    projectId: string,
    itemId: string,
    data: UpdatePunchlistItemRequest
  ): Promise<PunchlistItem> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateStatus: (
    projectId: string,
    itemId: string,
    data: UpdatePunchlistItemStatusRequest
  ): Promise<PunchlistItem> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (projectId: string, itemId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}`, {
      method: "DELETE",
    }),

  addAssignees: (
    projectId: string,
    itemId: string,
    data: AddAssigneesRequest
  ): Promise<PunchlistItem> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}/assignees`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  removeAssignee: (projectId: string, itemId: string, userId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}/assignees/${userId}`, {
      method: "DELETE",
    }),

  // Attachments
  getAttachments: (
    projectId: string,
    itemId: string
  ): Promise<{ data: PunchlistItemAttachment[] }> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}/attachments`),

  uploadAttachment: (
    projectId: string,
    itemId: string,
    file: File
  ): Promise<PunchlistItemAttachment> => {
    const formData = new FormData();
    formData.append("file", file);

    return apiFetch(`/projects/${projectId}/punchlist-items/${itemId}/attachments`, {
      method: "POST",
      body: formData,
    });
  },

  getDownloadUrl: (projectId: string, itemId: string, attachmentId: string): string =>
    `${API_BASE_URL}/projects/${projectId}/punchlist-items/${itemId}/attachments/${attachmentId}/download`,

  deleteAttachment: (
    projectId: string,
    itemId: string,
    attachmentId: string
  ): Promise<void> =>
    apiFetch(
      `/projects/${projectId}/punchlist-items/${itemId}/attachments/${attachmentId}`,
      {
        method: "DELETE",
      }
    ),
};

// ============ Hooks ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function usePunchlistItems(
  projectId: string,
  stageId: string,
  params?: { page?: number; per_page?: number }
) {
  const [state, setState] = useState<UseApiState<PunchlistItem[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const [pagination, setPagination] = useState<SimplePagination | null>(null);

  const paramsString = JSON.stringify(params);

  const fetchItems = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const parsedParams = paramsString ? JSON.parse(paramsString) : undefined;
      const response = await punchlistItemsApi.getAll(projectId, stageId, parsedParams);
      setState({ data: response.data || [], loading: false, error: null });

      // Set pagination data - backend returns snake_case, map to camelCase
      if (response.meta) {
        const meta = response.meta as any;
        setPagination({
          currentPage: meta.current_page || meta.currentPage,
          lastPage: meta.last_page || meta.lastPage,
          total: meta.total,
          perPage: meta.per_page || meta.perPage,
          hasPrev: response.links.prev !== null,
          hasNext: response.links.next !== null,
        });
      }
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
      setPagination(null);
    }
  }, [projectId, stageId, paramsString]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (data: CreatePunchlistItemRequest) => {
    await punchlistItemsApi.create(projectId, stageId, data);
    fetchItems();
  };

  const updateItem = async (itemId: string, data: UpdatePunchlistItemRequest) => {
    await punchlistItemsApi.update(projectId, itemId, data);
    fetchItems();
  };

  const updateItemStatus = async (
    itemId: string,
    data: UpdatePunchlistItemStatusRequest
  ) => {
    await punchlistItemsApi.updateStatus(projectId, itemId, data);
    fetchItems();
  };

  const deleteItem = async (itemId: string) => {
    await punchlistItemsApi.delete(projectId, itemId);
    fetchItems();
  };

  const addAssignees = async (itemId: string, data: AddAssigneesRequest) => {
    await punchlistItemsApi.addAssignees(projectId, itemId, data);
    fetchItems();
  };

  const removeAssignee = async (itemId: string, userId: string) => {
    await punchlistItemsApi.removeAssignee(projectId, itemId, userId);
    fetchItems();
  };

  return {
    ...state,
    pagination,
    refetch: fetchItems,
    createItem,
    updateItem,
    updateItemStatus,
    deleteItem,
    addAssignees,
    removeAssignee,
  };
}

// Hook for fetching all punchlist items for a project with pagination
export function useProjectPunchlistItems(
  projectId: string,
  params?: PunchlistItemsQueryParams
) {
  const [state, setState] = useState<UseApiState<PunchlistItem[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const [pagination, setPagination] = useState<SimplePagination | null>(null);

  const paramsString = JSON.stringify(params);

  const fetchItems = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const parsedParams = paramsString ? JSON.parse(paramsString) : undefined;
      const response = await punchlistItemsApi.getAllForProject(projectId, parsedParams);
      setState({ data: response.data || [], loading: false, error: null });

      // Set pagination data - backend returns snake_case, map to camelCase
      if (response.meta) {
        const meta = response.meta as any;
        setPagination({
          currentPage: meta.current_page || meta.currentPage,
          lastPage: meta.last_page || meta.lastPage,
          total: meta.total,
          perPage: meta.per_page || meta.perPage,
          hasPrev: response.links.prev !== null,
          hasNext: response.links.next !== null,
        });
      }
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
      setPagination(null);
    }
  }, [projectId, paramsString]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    ...state,
    pagination,
    refetch: fetchItems,
  };
}

export function usePunchlistItemAttachments(projectId: string, itemId: string, enabled = true) {
  const [state, setState] = useState<UseApiState<PunchlistItemAttachment[]>>({
    data: null,
    loading: enabled,
    error: null,
  });

  const fetchAttachments = useCallback(async () => {
    if (!enabled) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await punchlistItemsApi.getAttachments(projectId, itemId);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, itemId, enabled]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const uploadAttachment = async (file: File) => {
    await punchlistItemsApi.uploadAttachment(projectId, itemId, file);
    fetchAttachments();
  };

  const deleteAttachment = async (attachmentId: string) => {
    await punchlistItemsApi.deleteAttachment(projectId, itemId, attachmentId);
    fetchAttachments();
  };

  return {
    ...state,
    refetch: fetchAttachments,
    uploadAttachment,
    deleteAttachment,
  };
}
