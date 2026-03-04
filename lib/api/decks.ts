"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Deck,
  CreateDeckRequest,
  UpdateDeckRequest,
  ApiError,
} from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Base fetch function for decks
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

// ============ Decks API ============
export const decksApi = {
  getAll: (projectId: string): Promise<{ data: Deck[] }> =>
    apiFetch(`/projects/${projectId}/decks`),

  getById: (projectId: string, deckId: string): Promise<Deck> =>
    apiFetch(`/projects/${projectId}/decks/${deckId}`),

  create: (projectId: string, data: CreateDeckRequest): Promise<Deck> =>
    apiFetch(`/projects/${projectId}/decks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (projectId: string, deckId: string, data: UpdateDeckRequest): Promise<Deck> =>
    apiFetch(`/projects/${projectId}/decks/${deckId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (projectId: string, deckId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/decks/${deckId}`, {
      method: "DELETE",
    }),
};

// ============ Decks Hook ============
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useDecks(projectId: string) {
  const [state, setState] = useState<UseApiState<Deck[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchDecks = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await decksApi.getAll(projectId);
      const data = response.data || [];
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const createDeck = async (data: CreateDeckRequest) => {
    await decksApi.create(projectId, data);
    fetchDecks();
  };

  const updateDeck = async (deckId: string, data: UpdateDeckRequest) => {
    await decksApi.update(projectId, deckId, data);
    fetchDecks();
  };

  const deleteDeck = async (deckId: string) => {
    await decksApi.delete(projectId, deckId);
    fetchDecks();
  };

  return {
    ...state,
    refetch: fetchDecks,
    createDeck,
    updateDeck,
    deleteDeck,
  };
}
