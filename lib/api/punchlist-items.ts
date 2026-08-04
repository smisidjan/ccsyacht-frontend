"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  PunchlistItem,
  PunchlistItemStatus,
  CreatePunchlistItemRequest,
  UpdatePunchlistItemRequest,
  UpdatePunchlistItemStatusRequest,
  AddAssigneesRequest,
  PunchlistItemAttachment,
  PunchlistItemNote,
  ApiError,
} from "./types";
import { apiFetch, buildQueryString } from "./fetch";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Query parameters for project-level punchlist items
export interface PunchlistItemsQueryParams {
  status?: PunchlistItemStatus;
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
  ): Promise<PaginatedResponse<PunchlistItem>> =>
    apiFetch(`/projects/${projectId}/punchlist-items${buildQueryString({
      status: params?.status,
      priority: params?.priority,
      incomplete: params?.incomplete,
      overdue: params?.overdue,
      assignee_id: params?.assignee_id,
      page: params?.page,
      per_page: params?.per_page,
    })}`),

  getAll: (
    projectId: string,
    stageId: string,
    params?: { page?: number; per_page?: number; status?: "open" | "in_progress" | "done" | "cancelled" }
  ): Promise<PaginatedResponse<PunchlistItem>> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/punchlist-items${buildQueryString({
      page: params?.page,
      per_page: params?.per_page,
      status: params?.status,
    })}`),

  getById: (projectId: string, itemId: string): Promise<PunchlistItem> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}`),

  create: (
    projectId: string,
    stageId: string,
    data: CreatePunchlistItemRequest
  ): Promise<PunchlistItem> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/punchlist-items`, {
      method: "POST",
      body: data,
    }),

  /** Same endpoint as `create`, but accepts pins (`pins[]`) and
   *  file attachments (`attachments[]`) via FormData so they land
   *  in one atomic round-trip. Backend mirrors the pin shape from
   *  the JSON contract: `pins[i][x]`, `pins[i][y]`, optional
   *  `pins[i][label]`, `pins[i][color]`. */
  createWithPins: async (
    projectId: string,
    stageId: string,
    data: CreatePunchlistItemRequest,
    files?: File[]
  ): Promise<PunchlistItem> => {
    const token = getAuthToken();
    const tenantUrl = getTenantUrl();

    const formData = new FormData();
    formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    if (data.priority) formData.append("priority", data.priority);
    if (data.due_date) formData.append("due_date", data.due_date);
    if (data.assignee_ids?.length) {
      data.assignee_ids.forEach((id) => formData.append("assignee_ids[]", id));
    }
    if (data.pins?.length) {
      data.pins.forEach((pin, i) => {
        formData.append(`pins[${i}][x]`, pin.x.toString());
        formData.append(`pins[${i}][y]`, pin.y.toString());
        if (pin.label) formData.append(`pins[${i}][label]`, pin.label);
        if (pin.color) formData.append(`pins[${i}][color]`, pin.color);
      });
    }
    if (data.children?.length) {
      // Children are flat dot-path FormData rather than nested JSON
      // so the backend's standard array-bracket parser picks them
      // up the same way as `pins[i][...]`. One level deep — children
      // can carry their own pins but not their own children.
      data.children.forEach((child, i) => {
        formData.append(`children[${i}][title]`, child.title);
        if (child.description)
          formData.append(`children[${i}][description]`, child.description);
        if (child.priority)
          formData.append(`children[${i}][priority]`, child.priority);
        if (child.due_date)
          formData.append(`children[${i}][due_date]`, child.due_date);
        child.assignee_ids?.forEach((id) =>
          formData.append(`children[${i}][assignee_ids][]`, id)
        );
        child.pins?.forEach((pin, j) => {
          formData.append(`children[${i}][pins][${j}][x]`, pin.x.toString());
          formData.append(`children[${i}][pins][${j}][y]`, pin.y.toString());
          if (pin.label)
            formData.append(`children[${i}][pins][${j}][label]`, pin.label);
          if (pin.color)
            formData.append(`children[${i}][pins][${j}][color]`, pin.color);
        });
      });
    }
    if (files?.length) {
      files.forEach((file) => formData.append("attachments[]", file));
    }

    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (tenantUrl) headers["X-Tenant-ID"] = tenantUrl;

    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/stages/${stageId}/punchlist-items`,
      {
        method: "POST",
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message:
          errorData.message ||
          errorData.error ||
          `HTTP error ${response.status}`,
        code: errorData.code,
        status: response.status,
      };
      throw error;
    }

    return response.json();
  },

  update: (
    projectId: string,
    itemId: string,
    data: UpdatePunchlistItemRequest
  ): Promise<PunchlistItem> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}`, {
      method: "PUT",
      body: data,
    }),

  updateStatus: (
    projectId: string,
    itemId: string,
    data: UpdatePunchlistItemStatusRequest
  ): Promise<PunchlistItem> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}/status`, {
      method: "PUT",
      body: data,
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
      body: data,
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
      skipContentType: true,
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

  // Comments ("notes"). No standalone list endpoint — they only ever
  // arrive inlined on `getById`'s response, so callers refetch the
  // item detail to pick up changes (see `usePunchlistItemNotes`).
  // `mentionIds` are project-member user UUIDs tagged via `@name` in
  // the text; only newly-added ones (vs. the note's previous mentions)
  // get an email notification server-side.
  createNote: (
    projectId: string,
    itemId: string,
    content: string,
    mentionIds: string[] = []
  ): Promise<PunchlistItemNote> =>
    apiFetch(`/projects/${projectId}/punchlist-items/${itemId}/notes`, {
      method: "POST",
      body: { content, mention_ids: mentionIds },
    }),

  updateNote: (
    projectId: string,
    itemId: string,
    noteId: string,
    content: string,
    mentionIds: string[] = []
  ): Promise<PunchlistItemNote> =>
    apiFetch(
      `/projects/${projectId}/punchlist-items/${itemId}/notes/${noteId}`,
      {
        method: "PATCH",
        body: { content, mention_ids: mentionIds },
      }
    ),

  deleteNote: (
    projectId: string,
    itemId: string,
    noteId: string
  ): Promise<void> =>
    apiFetch(
      `/projects/${projectId}/punchlist-items/${itemId}/notes/${noteId}`,
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
  params?: {
    page?: number;
    per_page?: number;
    status?: PunchlistItemStatus;
  }
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

/** Comments live only on the item detail payload — there's no
 *  standalone list endpoint — so this hook re-fetches the whole item
 *  via `getById` and exposes just its `notes`. Mutations optimistically
 *  refetch the same way so the list always reflects the server's sort
 *  order (`dateCreated` ascending) instead of a client-guessed one. */
export function usePunchlistItemNotes(
  projectId: string,
  itemId: string,
  enabled = true
) {
  const [state, setState] = useState<UseApiState<PunchlistItemNote[]>>({
    data: null,
    loading: enabled,
    error: null,
  });

  const fetchNotes = useCallback(async () => {
    if (!enabled) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const item = await punchlistItemsApi.getById(projectId, itemId);
      setState({ data: item.notes ?? [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, itemId, enabled]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = async (content: string, mentionIds: string[] = []) => {
    await punchlistItemsApi.createNote(projectId, itemId, content, mentionIds);
    await fetchNotes();
  };

  const editNote = async (
    noteId: string,
    content: string,
    mentionIds: string[] = []
  ) => {
    await punchlistItemsApi.updateNote(
      projectId,
      itemId,
      noteId,
      content,
      mentionIds
    );
    await fetchNotes();
  };

  const removeNote = async (noteId: string) => {
    await punchlistItemsApi.deleteNote(projectId, itemId, noteId);
    await fetchNotes();
  };

  return {
    ...state,
    refetch: fetchNotes,
    addNote,
    editNote,
    removeNote,
  };
}
