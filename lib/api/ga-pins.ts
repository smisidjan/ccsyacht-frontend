"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  GAPin,
  CreateGAPinRequest,
  UpdateGAPinRequest,
  BulkSyncGAPinsRequest,
  ApiError,
} from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Base fetch function for GA pins
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

// ============ GA Pins API ============
export const gaPinsApi = {
  // List all pins for a project
  getAll: (projectId: string): Promise<{ data: GAPin[] }> =>
    apiFetch(`/projects/${projectId}/ga-pins`),

  // Create a new pin
  create: (projectId: string, data: CreateGAPinRequest): Promise<GAPin> =>
    apiFetch(`/projects/${projectId}/ga-pins`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update a pin
  update: (projectId: string, pinId: string, data: UpdateGAPinRequest): Promise<GAPin> =>
    apiFetch(`/projects/${projectId}/ga-pins/${pinId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete a pin
  delete: (projectId: string, pinId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/ga-pins/${pinId}`, {
      method: "DELETE",
    }),

  // Bulk sync pins
  bulkSync: (projectId: string, data: BulkSyncGAPinsRequest): Promise<{ data: GAPin[] }> =>
    apiFetch(`/projects/${projectId}/ga-pins/sync`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============ React Hook ============
export function useGAPins(projectId: string) {
  const [data, setData] = useState<GAPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchPins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await gaPinsApi.getAll(projectId);
      setData(response.data);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const createPin = useCallback(
    async (pinData: CreateGAPinRequest) => {
      const newPin = await gaPinsApi.create(projectId, pinData);
      setData((prev) => [...prev, newPin]);
      return newPin;
    },
    [projectId]
  );

  const updatePin = useCallback(
    async (pinId: string, pinData: UpdateGAPinRequest) => {
      const updatedPin = await gaPinsApi.update(projectId, pinId, pinData);
      setData((prev) =>
        prev.map((pin) => (pin.identifier === pinId ? updatedPin : pin))
      );
      return updatedPin;
    },
    [projectId]
  );

  const deletePin = useCallback(
    async (pinId: string) => {
      await gaPinsApi.delete(projectId, pinId);
      setData((prev) => prev.filter((pin) => pin.identifier !== pinId));
    },
    [projectId]
  );

  const bulkSync = useCallback(
    async (syncData: BulkSyncGAPinsRequest) => {
      const response = await gaPinsApi.bulkSync(projectId, syncData);
      setData(response.data);
      return response.data;
    },
    [projectId]
  );

  return {
    data,
    loading,
    error,
    refetch: fetchPins,
    createPin,
    updatePin,
    deletePin,
    bulkSync,
  };
}
