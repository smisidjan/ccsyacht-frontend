"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectMember, ProjectSigner, AddMemberRequest, AddSignerRequest, ApiError } from "./types";
import { apiFetch } from "./fetch";

// ============ Project Members API ============
export const projectMembersApi = {
  getAll: (projectId: string): Promise<{ data: ProjectMember[] }> =>
    apiFetch(`/projects/${projectId}/members`),

  add: (projectId: string, data: AddMemberRequest): Promise<ProjectMember> =>
    apiFetch(`/projects/${projectId}/members`, {
      method: "POST",
      body: data,
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
      body: data,
    }),

  remove: (projectId: string, userId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/signers/${userId}`, {
      method: "DELETE",
    }),
};

// ============ Hooks ============
interface UseProjectMembersState {
  data: ProjectMember[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useProjectMembers(projectId: string) {
  const [state, setState] = useState<UseProjectMembersState>({
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

interface UseProjectSignersState {
  data: ProjectSigner[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useProjectSigners(projectId: string) {
  const [state, setState] = useState<UseProjectSignersState>({
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
