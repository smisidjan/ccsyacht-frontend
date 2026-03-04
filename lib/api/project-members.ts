"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectMember, ProjectSigner, AddMemberRequest, AddSignerRequest, ApiError } from "./types";
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

// ============ Project Members API ============
export const projectMembersApi = {
  getAll: (projectId: string): Promise<{ data: ProjectMember[] }> =>
    apiFetch(`/projects/${projectId}/members`),

  add: (projectId: string, data: AddMemberRequest): Promise<ProjectMember> =>
    apiFetch(`/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  remove: (projectId: string, userId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    }),
};

// ============ Project Signers API ============
export const projectSignersApi = {
  getAll: (projectId: string): Promise<{ data: ProjectSigner[] }> =>
    apiFetch(`/projects/${projectId}/signers`),

  add: (projectId: string, data: AddSignerRequest): Promise<ProjectSigner> =>
    apiFetch(`/projects/${projectId}/signers`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  remove: (projectId: string, userId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/signers/${userId}`, {
      method: "DELETE",
    }),
};

// ============ Hooks ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useProjectMembers(projectId: string) {
  const [state, setState] = useState<UseApiState<ProjectMember[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchMembers = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await projectMembersApi.getAll(projectId);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async (data: AddMemberRequest) => {
    await projectMembersApi.add(projectId, data);
    fetchMembers();
  };

  const removeMember = async (userId: string) => {
    await projectMembersApi.remove(projectId, userId);
    fetchMembers();
  };

  return {
    ...state,
    refetch: fetchMembers,
    addMember,
    removeMember,
  };
}

export function useProjectSigners(projectId: string) {
  const [state, setState] = useState<UseApiState<ProjectSigner[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchSigners = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await projectSignersApi.getAll(projectId);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId]);

  useEffect(() => {
    fetchSigners();
  }, [fetchSigners]);

  const addSigner = async (data: AddSignerRequest) => {
    await projectSignersApi.add(projectId, data);
    fetchSigners();
  };

  const removeSigner = async (userId: string) => {
    await projectSignersApi.remove(projectId, userId);
    fetchSigners();
  };

  return {
    ...state,
    refetch: fetchSigners,
    addSigner,
    removeSigner,
  };
}
