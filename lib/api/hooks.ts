"use client";

import { useState, useEffect, useCallback } from "react";
import {
  usersApi,
  invitationsApi,
  registrationRequestsApi,
  authApi,
  shipyardsApi,
  projectsApi,
} from "./client";
import type {
  User,
  Invitation,
  RegistrationRequest,
  CreateInvitationRequest,
  UpdateUserRequest,
  Shipyard,
  CreateShipyardRequest,
  UpdateShipyardRequest,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ApiError,
  CurrentUser,
} from "./types";
import { mapApiUserToUser } from "./types";

// ============ Generic Hook State ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

// ============ Auth Hooks ============
export function useCurrentUser() {
  const [state, setState] = useState<UseApiState<CurrentUser>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await authApi.me();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { ...state, refetch: fetchUser };
}

// Helper to extract array from API response
function extractArray<T>(response: unknown, key: string): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>;
    // Check for specific key
    if (Array.isArray(obj[key])) {
      return obj[key] as T[];
    }
    // Check for JSON-LD hydra:member (API Platform)
    if (Array.isArray(obj["hydra:member"])) {
      return obj["hydra:member"] as T[];
    }
    // Check for generic data key
    if (Array.isArray(obj.data)) {
      return obj.data as T[];
    }
  }
  return [];
}

// ============ Users Hooks ============
export function useUsers() {
  const [state, setState] = useState<UseApiState<User[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchUsers = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await usersApi.getAll();
      console.log("API Response for users:", response);
      console.log("First user raw:", response.data[0]);
      const data = response.data.map(mapApiUserToUser);
      console.log("Mapped users:", data);
      console.log("First user mapped:", data[0]);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (id: string, data: UpdateUserRequest) => {
    await usersApi.update(id, data);
    fetchUsers();
  };

  const deleteUser = async (id: string) => {
    await usersApi.delete(id);
    fetchUsers();
  };

  return { ...state, refetch: fetchUsers, updateUser, deleteUser };
}

// ============ Invitations Hooks ============
export function useInvitations() {
  const [state, setState] = useState<UseApiState<Invitation[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchInvitations = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
    }
    try {
      const response = await invitationsApi.getAll();
      const data = extractArray<Invitation>(response, "invitations");
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err as ApiError }));
    }
  }, []);

  useEffect(() => {
    fetchInvitations(true);
  }, [fetchInvitations]);

  const createInvitation = async (data: CreateInvitationRequest) => {
    await invitationsApi.create(data);
    await fetchInvitations(false);
  };

  const resendInvitation = async (id: string) => {
    await invitationsApi.resend(id);
    await fetchInvitations(false);
  };

  const deleteInvitation = async (token: string) => {
    await invitationsApi.delete(token);
    await fetchInvitations(false);
  };

  return {
    ...state,
    refetch: fetchInvitations,
    createInvitation,
    resendInvitation,
    deleteInvitation,
  };
}

// ============ Registration Requests Hooks ============
export function useRegistrationRequests() {
  const [state, setState] = useState<UseApiState<RegistrationRequest[]> & { lastUpdated: Date | null }>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchRequests = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await registrationRequestsApi.getAll();
      const data = extractArray<RegistrationRequest>(response, "registrationRequests");
      setState({ data, loading: false, error: null, lastUpdated: new Date() });
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err as ApiError }));
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const approveRequest = async (id: string, role: string) => {
    await registrationRequestsApi.process(id, { action: "approve", role });
    fetchRequests();
  };

  const rejectRequest = async (id: string) => {
    await registrationRequestsApi.process(id, { action: "reject" });
    fetchRequests();
  };

  return {
    ...state,
    refetch: fetchRequests,
    approveRequest,
    rejectRequest,
  };
}

// ============ Shipyards Hooks ============
export function useShipyards(params?: { search?: string; per_page?: number }) {
  const [state, setState] = useState<UseApiState<Shipyard[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchShipyards = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await shipyardsApi.getAll(params);
      const data = response.data || [];
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [params?.search, params?.per_page]);

  useEffect(() => {
    fetchShipyards();
  }, [fetchShipyards]);

  const createShipyard = async (data: CreateShipyardRequest) => {
    await shipyardsApi.create(data);
    fetchShipyards();
  };

  const updateShipyard = async (id: string, data: UpdateShipyardRequest) => {
    await shipyardsApi.update(id, data);
    fetchShipyards();
  };

  const deleteShipyard = async (id: string) => {
    await shipyardsApi.delete(id);
    fetchShipyards();
  };

  return {
    ...state,
    refetch: fetchShipyards,
    createShipyard,
    updateShipyard,
    deleteShipyard,
  };
}

// ============ Projects Hooks ============
export function useProjects(params?: {
  status?: string;
  project_type?: string;
  search?: string;
  per_page?: number;
}) {
  const [state, setState] = useState<UseApiState<Project[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchProjects = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await projectsApi.getAll(params);
      const data = response.data || [];
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [params?.status, params?.project_type, params?.search, params?.per_page]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (data: CreateProjectRequest) => {
    await projectsApi.create(data);
    fetchProjects();
  };

  const updateProject = async (id: string, data: UpdateProjectRequest) => {
    await projectsApi.update(id, data);
    fetchProjects();
  };

  const deleteProject = async (id: string) => {
    await projectsApi.delete(id);
    fetchProjects();
  };

  const uploadGeneralArrangement = async (id: string, file: File) => {
    await projectsApi.uploadGeneralArrangement(id, file);
    fetchProjects();
  };

  return {
    ...state,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    uploadGeneralArrangement,
  };
}
