/**
 * Shared API Fetch Utility
 * Centralized fetch function with authentication and tenant headers
 */

import type { ApiError } from "./types";
import { getAuthToken, getTenantUrl } from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: object | FormData | string;
  skipContentType?: boolean;
}

/**
 * Get WebSocket socket ID to prevent broadcasting back to sender
 */
function getSocketId(): string | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Echo?: { socketId: () => string } }).Echo?.socketId() ?? null;
}

/**
 * Centralized API fetch function with automatic auth and tenant headers
 * Use this instead of duplicating fetch logic in each API file
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const token = getAuthToken();
  const tenantUrl = getTenantUrl();
  const socketId = getSocketId();
  const { body, skipContentType, ...restOptions } = options;

  const headers: HeadersInit = {
    ...(skipContentType ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  if (tenantUrl) {
    (headers as Record<string, string>)["X-Tenant-ID"] = tenantUrl;
  }
  if (socketId) {
    (headers as Record<string, string>)["X-Socket-ID"] = socketId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
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

/**
 * Build query string from params object
 * Handles undefined/null values and arrays
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, String(v)));
    } else {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}
