import type { ApiError } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// CSRF initialization flag
let csrfInitialized = false;

// Initialize CSRF protection for public endpoints
async function initializeCSRF(): Promise<void> {
  if (csrfInitialized) return;

  try {
    // Fetch CSRF cookie from backend - use the API subdomain directly
    const csrfUrl = 'https://api.papertrail.ccsyacht.com/sanctum/csrf-cookie';
    const response = await fetch(csrfUrl, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      csrfInitialized = true;
    }
  } catch (error) {
    console.error('Failed to initialize CSRF:', error);
  }
}

// Get XSRF token from cookie
function getXSRFToken(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(/XSRF-TOKEN=([^;]*)/);
  if (!match) return null;

  // The cookie is URL encoded, so decode it
  return decodeURIComponent(match[1]);
}

/**
 * Fetch function for public API endpoints (no authentication required)
 * Does not include Authorization but includes CSRF protection
 */
export async function publicFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure CSRF is initialized for state-changing requests
  if (options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)) {
    await initializeCSRF();
  }

  const xsrfToken = getXSRFToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...options.headers,
  };

  if (xsrfToken) {
    (headers as Record<string, string>)["X-XSRF-TOKEN"] = xsrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Important for CSRF cookies
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
  // Ensure CSRF is initialized for state-changing requests
  if (options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)) {
    await initializeCSRF();
  }

  const xsrfToken = getXSRFToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...options.headers,
  };

  if (xsrfToken) {
    (headers as Record<string, string>)["X-XSRF-TOKEN"] = xsrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Important for CSRF cookies
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
