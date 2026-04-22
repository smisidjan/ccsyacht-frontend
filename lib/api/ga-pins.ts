"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  GAPin,
  CreateGAPinRequest,
  UpdateGAPinRequest,
  BulkSyncGAPinsRequest,
  ApiError,
} from "./types";
import { apiFetch } from "./fetch";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// ============ GA Pins API ============
export const gaPinsApi = {
  getAll: (projectId: string): Promise<{ data: GAPin[] }> =>
    apiFetch(`/projects/${projectId}/ga-pins`),

  // Create a new pin (with punchlist item and attachments) - uses FormData
  create: async (projectId: string, data: CreateGAPinRequest, files?: File[]): Promise<GAPin> => {
    const token = getAuthToken();
    const tenantUrl = getTenantUrl();

    const formData = new FormData();
    formData.append("stage_id", data.stage_id);
    formData.append("label", data.label);
    formData.append("x", data.x.toString());
    formData.append("y", data.y.toString());
    if (data.color) formData.append("color", data.color);
    if (data.description) formData.append("description", data.description);
    if (data.priority) formData.append("priority", data.priority);
    if (data.due_date) formData.append("due_date", data.due_date);
    if (data.assignee_ids?.length) {
      data.assignee_ids.forEach((id) => formData.append("assignee_ids[]", id));
    }
    if (files?.length) {
      files.forEach((file) => formData.append("attachments[]", file));
    }

    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (tenantUrl) headers["X-Tenant-ID"] = tenantUrl;

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/ga-pins`, {
      method: "POST",
      headers,
      body: formData,
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

    return response.json();
  },

  update: (projectId: string, pinId: string, data: UpdateGAPinRequest): Promise<GAPin> =>
    apiFetch(`/projects/${projectId}/ga-pins/${pinId}`, {
      method: "PUT",
      body: data,
    }),

  delete: (projectId: string, pinId: string): Promise<void> =>
    apiFetch(`/projects/${projectId}/ga-pins/${pinId}`, {
      method: "DELETE",
    }),

  bulkSync: (projectId: string, data: BulkSyncGAPinsRequest): Promise<{ data: GAPin[] }> =>
    apiFetch(`/projects/${projectId}/ga-pins/sync`, {
      method: "POST",
      body: data,
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
    async (pinData: CreateGAPinRequest, files?: File[]) => {
      const newPin = await gaPinsApi.create(projectId, pinData, files);
      setData((prev) => [...prev, newPin]);
      return newPin;
    },
    [projectId]
  );

  const updatePin = useCallback(
    async (pinId: string, pinData: UpdateGAPinRequest) => {
      const updatedPin = await gaPinsApi.update(projectId, pinId, pinData);
      setData((prev) => prev.map((pin) => (pin.identifier === pinId ? updatedPin : pin)));
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
