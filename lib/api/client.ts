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
  Role,
  TenantRole,
  CreateTenantRoleRequest,
  UpdateTenantRoleRequest,
  Invitation,
  CreateInvitationRequest,
  AcceptInvitationRequest,
  DeclineInvitationRequest,
  RegistrationRequest,
  CreateRegistrationRequest,
  ProcessRegistrationRequest,
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  CreateTenantUserRequest,
  TenantRegistrationInfo,
  RegisterAdminRequest,
  RegisterAdminResponse,
  GuestRolePermissions,
  Shipyard,
  CreateShipyardRequest,
  UpdateShipyardRequest,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
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
let tenantUrl: string | null = null;

export function setTenantId(id: string | null) {
  tenantId = id;
  if (id) {
    localStorage.setItem("tenantId", id);
  } else {
    localStorage.removeItem("tenantId");
  }
}

export function setTenant(id: string, name: string, url: string) {
  tenantId = id;
  tenantName = name;
  tenantUrl = url;
  localStorage.setItem("tenantId", id);
  localStorage.setItem("tenantName", name);
  localStorage.setItem("tenantUrl", url);
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

export function getTenantUrl(): string | null {
  if (tenantUrl) return tenantUrl;
  if (typeof window !== "undefined") {
    tenantUrl = localStorage.getItem("tenantUrl");
  }
  return tenantUrl;
}

export function clearTenant() {
  tenantId = null;
  tenantName = null;
  tenantUrl = null;
  localStorage.removeItem("tenantId");
  localStorage.removeItem("tenantName");
  localStorage.removeItem("tenantUrl");
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
  const tenantUrl = getTenantUrl();

  // Get socket ID to prevent broadcasting back to the sender
  const socketId = typeof window !== 'undefined' ? (window as any).Echo?.socketId() : null;

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

  if (socketId) {
    (headers as Record<string, string>)["X-Socket-ID"] = socketId;
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
      errorData.error || errorData.message || `HTTP error ${response.status}`;

    const error: ApiError = {
      message: errorMessage,
      code: errorData.code,
      status: response.status,
    };

    throw error;
  }

  return response.json();
}

// Base fetch function for tenant-specific system endpoints
// Uses system token AND tenant ID header
async function apiFetchSystemTenant<T>(
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
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    }),

  login: (tenantSlug: string, data: LoginRequest): Promise<LoginResponse> =>
    apiFetch("/auth/login", {
      method: "POST",
      headers: { "X-Tenant-ID": tenantSlug },
      body: JSON.stringify({ ...data, email: data.email.trim().toLowerCase() }),
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
      body: JSON.stringify({
        current_password: data.oldPassword,
        password: data.newPassword,
        password_confirmation: data.newPassword,
      }),
    }),

  forgotPassword: (email: string): Promise<void> =>
    apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    }),

  resetPassword: (
    data: { token: string; email: string; password: string; password_confirmation: string },
    tenantUrl: string
  ): Promise<void> =>
    apiFetch("/auth/reset-password", {
      method: "POST",
      headers: { "X-Tenant-ID": tenantUrl },
      body: JSON.stringify({ ...data, email: data.email.trim().toLowerCase() }),
    }),

  registerAdmin: (data: RegisterAdminRequest): Promise<RegisterAdminResponse> =>
    apiFetch("/register-admin", {
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

// ============ Roles API ============
export const rolesApi = {
  getAll: (type?: "employee" | "guest"): Promise<Role[]> => {
    const params = type ? `?type=${type}` : "";
    return apiFetch(`/roles${params}`);
  },
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

  // Get guest role permissions
  getGuestRolePermissions: (): Promise<GuestRolePermissions> =>
    apiFetch("/guest-role-permissions"),
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

  getTenant: (tenantId: string): Promise<Tenant> =>
    apiFetchSystem(`/system/tenants/${tenantId}`),

  createTenant: (data: CreateTenantRequest): Promise<Tenant> =>
    apiFetchSystem("/system/tenants", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTenant: (tenantId: string, data: UpdateTenantRequest): Promise<Tenant> =>
    apiFetchSystem(`/system/tenants/${tenantId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  createTenantUser: (data: CreateTenantUserRequest): Promise<void> =>
    apiFetchSystem("/system/tenants/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  forgotPassword: (email: string): Promise<void> =>
    apiFetchSystem("/system/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    }),

  resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }): Promise<void> =>
    apiFetchSystem("/system/reset-password", {
      method: "POST",
      body: JSON.stringify({ ...data, email: data.email.trim().toLowerCase() }),
    }),

  // Tenant-specific system endpoints (require X-Tenant-ID header)
  getTenantStats: (tenantId: string): Promise<{ data: { totalUsers: number; activeUsers: number; inactiveUsers: number; employees: number; guests: number; pendingInvitations: number; acceptedInvitations: number } }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/stats"),

  getTenantUsers: (tenantId: string, params?: { employment_type?: string; active?: boolean; per_page?: number; page?: number }): Promise<{ itemListElement: User[]; numberOfItems: number; pagination: { currentPage: number; lastPage: number; perPage: number } }> => {
    const query = new URLSearchParams();
    if (params?.employment_type) query.append("employment_type", params.employment_type);
    if (params?.active !== undefined) query.append("active", String(params.active));
    if (params?.per_page) query.append("per_page", String(params.per_page));
    if (params?.page) query.append("page", String(params.page));
    const queryString = query.toString();
    return apiFetchSystemTenant(tenantId, `/system/tenant/users${queryString ? `?${queryString}` : ""}`);
  },

  getTenantUser: (tenantId: string, userId: string): Promise<User> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/users/${userId}`),

  impersonateUser: (tenantId: string, userId: string): Promise<{ result: { token: string; expires: string; user: User; tenant: string } }> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/impersonate/${userId}`, {
      method: "POST",
    }),

  endImpersonation: (tenantId: string, userId: string): Promise<{ description: string }> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/impersonate/${userId}`, {
      method: "DELETE",
    }),

  getTenantInvitations: (tenantId: string, params?: { status?: string; per_page?: number; page?: number }): Promise<{ itemListElement: Invitation[]; numberOfItems: number; pagination: { currentPage: number; lastPage: number; perPage: number } }> => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.per_page) query.append("per_page", String(params.per_page));
    if (params?.page) query.append("page", String(params.page));
    const queryString = query.toString();
    return apiFetchSystemTenant(tenantId, `/system/tenant/invitations${queryString ? `?${queryString}` : ""}`);
  },

  // Tenant Role Management
  getTenantRoles: (tenantId: string): Promise<{ itemListElement: TenantRole[]; numberOfItems: number }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/roles"),

  getTenantRole: (tenantId: string, roleId: string): Promise<TenantRole> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/roles/${roleId}`),

  createTenantRole: (tenantId: string, data: CreateTenantRoleRequest): Promise<{ result: TenantRole }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/roles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTenantRole: (tenantId: string, roleId: string, data: UpdateTenantRoleRequest): Promise<{ result: TenantRole }> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/roles/${roleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTenantRole: (tenantId: string, roleId: string): Promise<{ description: string }> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/roles/${roleId}`, {
      method: "DELETE",
    }),

  getTenantPermissions: (tenantId: string): Promise<{ itemListElement: string[]; numberOfItems: number }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/permissions"),

  getTenantRoleTypes: (tenantId: string): Promise<{ itemListElement: string[]; numberOfItems: number }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/role-types"),
};

// ============ Shipyards API ============
export const shipyardsApi = {
  getAll: (params?: { search?: string; per_page?: number; page?: number }): Promise<PaginatedResponse<Shipyard>> => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.per_page) query.append("per_page", String(params.per_page));
    if (params?.page) query.append("page", String(params.page));
    const queryString = query.toString();
    return apiFetch(`/shipyards${queryString ? `?${queryString}` : ""}`);
  },

  getById: (id: string): Promise<Shipyard> =>
    apiFetch(`/shipyards/${id}`),

  create: (data: CreateShipyardRequest): Promise<Shipyard> =>
    apiFetch("/shipyards", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateShipyardRequest): Promise<Shipyard> =>
    apiFetch(`/shipyards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<void> =>
    apiFetch(`/shipyards/${id}`, {
      method: "DELETE",
    }),
};

// ============ Projects API ============
export const projectsApi = {
  getAll: (params?: {
    status?: string;
    project_type?: string;
    search?: string;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Project>> => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.project_type) query.append("project_type", params.project_type);
    if (params?.search) query.append("search", params.search);
    if (params?.per_page) query.append("per_page", String(params.per_page));
    if (params?.page) query.append("page", String(params.page));
    const queryString = query.toString();
    return apiFetch(`/projects${queryString ? `?${queryString}` : ""}`);
  },

  getById: (id: string): Promise<Project> =>
    apiFetch(`/projects/${id}`),

  create: (data: CreateProjectRequest): Promise<Project> =>
    apiFetch("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateProjectRequest): Promise<Project> =>
    apiFetch(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<void> =>
    apiFetch(`/projects/${id}`, {
      method: "DELETE",
    }),

  uploadGeneralArrangement: async (id: string, file: File): Promise<Project> => {
    const formData = new FormData();
    formData.append("file", file);

    const token = getAuthToken();
    const tenantUrl = getTenantUrl();
    const socketId = typeof window !== 'undefined' ? (window as any).Echo?.socketId() : null;

    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    if (tenantUrl) {
      (headers as Record<string, string>)["X-Tenant-ID"] = tenantUrl;
    }
    if (socketId) {
      (headers as Record<string, string>)["X-Socket-ID"] = socketId;
    }

    const response = await fetch(`${API_BASE_URL}/projects/${id}/general-arrangement`, {
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
};

// Export all APIs
export const api = {
  auth: authApi,
  users: usersApi,
  invitations: invitationsApi,
  registrationRequests: registrationRequestsApi,
  tenants: tenantsApi,
  system: systemApi,
  shipyards: shipyardsApi,
  projects: projectsApi,
};

export default api;
