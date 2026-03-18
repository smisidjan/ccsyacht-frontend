// System Admin Tenant Management API

import type {
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  CreateTenantUserRequest,
  PaginatedResponse,
} from "../types";
import { apiFetchSystem, apiFetchSystemTenant } from "./helpers";

export const systemTenantsApi = {
  getTenants: (): Promise<PaginatedResponse<Tenant>> =>
    apiFetchSystem("/system/tenants"),

  getTenant: (tenantId: string): Promise<Tenant> =>
    apiFetchSystem(`/system/tenants/${tenantId}`),

  createTenant: (data: CreateTenantRequest): Promise<Tenant> =>
    apiFetchSystem("/system/tenants", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTenant: (
    tenantId: string,
    data: UpdateTenantRequest
  ): Promise<Tenant> =>
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

  resetPassword: (data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> =>
    apiFetchSystem("/system/reset-password", {
      method: "POST",
      body: JSON.stringify({ ...data, email: data.email.trim().toLowerCase() }),
    }),

  // Tenant-specific stats
  getTenantStats: (
    tenantId: string
  ): Promise<{
    data: {
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;
      employees: number;
      guests: number;
      pendingInvitations: number;
      acceptedInvitations: number;
    };
  }> => apiFetchSystemTenant(tenantId, "/system/tenant/stats"),

  // Get selectable permissions for tenant creation
  getSelectablePermissions: (): Promise<{
    itemListElement: string[];
    numberOfItems: number;
    metadata: {
      alwaysRestricted: string[];
      description: string;
    };
  }> => apiFetchSystem("/system/selectable-permissions"),
};
