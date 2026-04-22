"use client";

import { useState, useEffect, useCallback } from "react";
import type { Deck, CreateDeckRequest, UpdateDeckRequest, ApiError } from "./types";
import { apiFetch } from "./fetch";

// ============ Decks API ============
export const decksApi = {
  getAll: (projectId: string): Promise<{ data: Deck[] }> =>
    apiFetch(`/projects/${projectId}/decks`),

  getById: (projectId: string, deckId: string): Promise<Deck> =>
    apiFetch(`/projects/${projectId}/decks/${deckId}`),

  create: (projectId: string, data: CreateDeckRequest): Promise<Deck> =>
    apiFetch(`/projects/${projectId}/decks`, {
      method: "POST",
      body: data,
    }),

  update: (projectId: string, deckId: string, data: UpdateDeckRequest): Promise<Deck> =>
    apiFetch(`/projects/${projectId}/decks/${deckId}`, {
      method: "PUT",
      body: data,
    }),

  delete: (projectId: string, deckId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/decks/${deckId}`, {
      method: "DELETE",
    }),
};

// ============ Decks Hook ============
interface UseDecksState {
  data: Deck[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useDecks(projectId: string) {
  const [state, setState] = useState<UseDecksState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchDecks = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await decksApi.getAll(projectId);
      setState({ data: response.data || [], loading: false, error: null });
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
