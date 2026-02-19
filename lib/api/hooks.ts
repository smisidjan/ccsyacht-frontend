"use client";

import { useState, useEffect, useCallback } from "react";
import { usersApi, invitationsApi, registrationRequestsApi, authApi } from "./client";
import type {
  User,
  Invitation,
  RegistrationRequest,
  CreateInvitationRequest,
  UpdateUserRequest,
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
  const [state, setState] = useState<UseApiState<CurrentUser & { role?: string }>>({
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
      const data = response.data.map(mapApiUserToUser);
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
