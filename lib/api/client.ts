// API Client based on OpenAPI specification

import type {
  LoginRequest,
  LoginResponse,
  SystemLoginResponse,
  LookupResponse,
  ChangePasswordRequest,
  CurrentUser,
  User,
  ApiUser,
  UpdateUserRequest,
  Invitation,
  CreateInvitationRequest,
  AcceptInvitationRequest,
  DeclineInvitationRequest,
  RegistrationRequest,
  CreateRegistrationRequest,
  ProcessRegistrationRequest,
  Tenant,
  CreateTenantRequest,
  CreateTenantUserRequest,
  TenantRegistrationInfo,
  ApiError,
} from "./types";
import { publicFetch, publicFetchVoid } from "./publicFetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// Token management
let authToken: string | null = null;

// System token management (separate from regular auth)
let systemToken: string | null = null;

export function setSystemToken(token: string | null) {
  systemToken = token;
  if (token) {
    sessionStorage.setItem("systemToken", token);
  } else {
    sessionStorage.removeItem("systemToken");
  }
}

export function getSystemToken(): string | null {
  if (systemToken) return systemToken;
  if (typeof window !== "undefined") {
    systemToken = sessionStorage.getItem("systemToken");
  }
  return systemToken;
}

export function clearSystemToken() {
  systemToken = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("systemToken");
  }
}

// Tenant management
let tenantId: string | null = null;
let tenantName: string | null = null;

export function setTenantId(id: string | null) {
  tenantId = id;
  if (id) {
    localStorage.setItem("tenantId", id);
  } else {
    localStorage.removeItem("tenantId");
  }
}

export function setTenant(id: string | null, name: string | null) {
  tenantId = id;
  tenantName = name;
  if (id && name) {
    localStorage.setItem("tenantId", id);
    localStorage.setItem("tenantName", name);
  } else {
    localStorage.removeItem("tenantId");
    localStorage.removeItem("tenantName");
  }
}

export function getTenantId(): string | null {
  if (tenantId) return tenantId;
  if (typeof window !== "undefined") {
    tenantId = localStorage.getItem("tenantId");
  }
  return tenantId;
}

export function getTenantName(): string | null {
  if (tenantName) return tenantName;
  if (typeof window !== "undefined") {
    tenantName = localStorage.getItem("tenantName");
  }
  return tenantName;
}

export function clearTenant() {
  tenantId = null;
  tenantName = null;
  localStorage.removeItem("tenantId");
  localStorage.removeItem("tenantName");
}

export function clearTenantId() {
  clearTenant();
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("token");
  }
  return authToken;
}

// Base fetch function with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const tenant = getTenantId();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  if (tenant) {
    (headers as Record<string, string>)["X-Tenant-ID"] = tenant;
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

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Base fetch function WITHOUT tenant header (for system endpoints)
// Uses system token instead of regular auth token
async function apiFetchSystem<T>(
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

  // Note: No X-Tenant-ID header for system endpoints

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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============ Authentication API ============
export const authApi = {
  lookup: (email: string): Promise<LookupResponse> =>
    apiFetch("/auth/lookup", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  login: (data: LoginRequest): Promise<LoginResponse> =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: (): Promise<void> =>
    apiFetch("/auth/logout", {
      method: "POST",
    }),

  me: (): Promise<CurrentUser> =>
    apiFetch("/auth/me"),

  changePassword: (data: ChangePasswordRequest): Promise<void> =>
    apiFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  forgotPassword: (email: string): Promise<void> =>
    apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }): Promise<void> =>
    apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Paginated API response
interface PaginatedResponse<T> {
  data: T[];
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta?: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

// ============ Users API ============
export const usersApi = {
  getAll: (): Promise<PaginatedResponse<ApiUser>> =>
    apiFetch("/users"),

  getById: (id: string): Promise<User> =>
    apiFetch(`/users/${id}`),

  update: (id: string, data: UpdateUserRequest): Promise<User> =>
    apiFetch(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<void> =>
    apiFetch(`/users/${id}`, {
      method: "DELETE",
    }),
};

// ============ Invitations API ============
export const invitationsApi = {
  getAll: (): Promise<Invitation[]> =>
    apiFetch("/invitations"),

  getByToken: (token: string): Promise<Invitation> =>
    apiFetch(`/invitations/${token}`),

  create: (data: CreateInvitationRequest): Promise<Invitation> =>
    apiFetch("/invitations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (token: string): Promise<void> =>
    apiFetch(`/invitations/${token}`, {
      method: "DELETE",
    }),

  // Public endpoint - no auth required
  accept: (data: AcceptInvitationRequest): Promise<void> =>
    publicFetchVoid("/invitations/accept", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Public endpoint - no auth required
  decline: (data: DeclineInvitationRequest): Promise<void> =>
    publicFetchVoid("/invitations/decline", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Public endpoint - no auth required
  getByTokenPublic: (token: string): Promise<Invitation> =>
    publicFetch(`/invitations/${token}`),

  resend: (invitationId: string): Promise<void> =>
    apiFetch(`/invitations/${invitationId}/resend`, {
      method: "POST",
    }),
};

// ============ Registration Requests API ============
export const registrationRequestsApi = {
  getAll: (): Promise<RegistrationRequest[]> =>
    apiFetch("/registration-requests"),

  getById: (id: string): Promise<RegistrationRequest> =>
    apiFetch(`/registration-requests/${id}`),

  create: (data: CreateRegistrationRequest): Promise<RegistrationRequest> =>
    apiFetch("/registration-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  process: (id: string, data: ProcessRegistrationRequest): Promise<void> =>
    apiFetch(`/registration-requests/${id}/process`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============ Tenants API (public, no auth required) ============
export const tenantsApi = {
  getRegistrationInfo: (slug: string): Promise<TenantRegistrationInfo> =>
    publicFetch(`/tenants/${slug}/registration-info`),
};

// ============ System API (no tenant header) ============
export const systemApi = {
  // Login doesn't require token - it returns the token
  // The API returns { result: { admin: {...}, token: "..." } }
  // We extract the token and return it in a simple LoginResponse format
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/system/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.message || `HTTP error ${response.status}`,
        code: errorData.code,
        status: response.status,
      };
      throw error;
    }

    const responseData: SystemLoginResponse = await response.json();
    // Extract token from nested result object
    return { token: responseData.result.token };
  },

  getTenants: (): Promise<PaginatedResponse<Tenant>> =>
    apiFetchSystem("/system/tenants"),

  createTenant: (data: CreateTenantRequest): Promise<Tenant> =>
    apiFetchSystem("/system/tenants", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createTenantUser: (data: CreateTenantUserRequest): Promise<void> =>
    apiFetchSystem("/system/tenants/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Export all APIs
export const api = {
  auth: authApi,
  users: usersApi,
  invitations: invitationsApi,
  registrationRequests: registrationRequestsApi,
  tenants: tenantsApi,
  system: systemApi,
};

export default api;
