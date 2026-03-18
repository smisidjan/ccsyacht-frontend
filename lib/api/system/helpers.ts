// System Admin API Helpers

import type { ApiError } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// System token management
export function getSystemToken(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("systemToken");
  }
  return null;
}

export function setSystemToken(token: string | null) {
  if (typeof window !== "undefined") {
    if (token) {
      sessionStorage.setItem("systemToken", token);
    } else {
      sessionStorage.removeItem("systemToken");
    }
  }
}

export function clearSystemToken() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("systemToken");
  }
}

// Generic fetch helper for system admin endpoints
export async function apiFetchSystem<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSystemToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Handle various error response formats from the backend
    const errorMessage =
      errorData.message ||
      errorData.error ||
      errorData.detail ||
      errorData["hydra:description"] ||
      `HTTP error ${response.status}`;
    const error: ApiError = {
      message: errorMessage,
      code: errorData.code,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

// Fetch helper for tenant-specific system admin endpoints
export async function apiFetchSystemTenant<T>(
  tenantId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSystemToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  // Add X-Tenant-ID header for tenant-specific system endpoints
  (headers as Record<string, string>)["X-Tenant-ID"] = tenantId;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Handle various error response formats from the backend
    const errorMessage =
      errorData.message ||
      errorData.error ||
      errorData.detail ||
      errorData["hydra:description"] ||
      `HTTP error ${response.status}`;
    const error: ApiError = {
      message: errorMessage,
      code: errorData.code,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

export { API_BASE_URL };
