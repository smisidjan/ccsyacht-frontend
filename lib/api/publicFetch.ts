import type { ApiError } from "./types";

const API_BASE_URL = "https://api.papertrail.ccsyacht.com/api";

/**
 * Fetch function for public API endpoints (no authentication required)
 */
export async function publicFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Accept": "application/json",
    ...options.headers,
  };

  // Only add Content-Type for requests with body
  if (options.body) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  // Always include X-Tenant-ID for public endpoints
  (headers as Record<string, string>)["X-Tenant-ID"] = "ccs-yacht";

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
    mode: 'cors',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = {
      message:
        errorData.message ||
        errorData.error ||
        errorData.detail ||
        `HTTP error ${response.status}`,
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
 * Fetch function for public API endpoints that returns void
 * Useful for endpoints like accept/decline that don't return data
 */
export async function publicFetchVoid(
  endpoint: string,
  options: RequestInit = {}
): Promise<void> {
  const headers: HeadersInit = {
    "Accept": "application/json",
    ...options.headers,
  };

  // Only add Content-Type for requests with body
  if (options.body) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  // Always include X-Tenant-ID for public endpoints
  (headers as Record<string, string>)["X-Tenant-ID"] = "ccs-yacht";

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
    mode: 'cors',
  });

  if (!response.ok) {
    const text = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { message: text || `HTTP error ${response.status}` };
    }
    const error: ApiError = {
      message:
        errorData.message ||
        errorData.error ||
        `HTTP error ${response.status}`,
      code: errorData.code,
      status: response.status,
    };
    throw error;
  }
}
