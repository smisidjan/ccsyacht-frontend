// System Admin User Management API

import type { User } from "../types";
import { apiFetchSystemTenant } from "./helpers";

export const systemUsersApi = {
  getTenantUsers: (
    tenantId: string,
    params?: {
      employment_type?: string;
      active?: boolean;
      per_page?: number;
      page?: number;
    }
  ): Promise<{
    itemListElement: User[];
    numberOfItems: number;
    pagination: { currentPage: number; lastPage: number; perPage: number };
  }> => {
    const query = new URLSearchParams();
    if (params?.employment_type) query.append("employment_type", params.employment_type);
    if (params?.active !== undefined) query.append("active", String(params.active));
    if (params?.per_page) query.append("per_page", String(params.per_page));
    if (params?.page) query.append("page", String(params.page));
    const queryString = query.toString();
    return apiFetchSystemTenant(
      tenantId,
      `/system/tenant/users${queryString ? `?${queryString}` : ""}`
    );
  },

  getTenantUser: (tenantId: string, userId: string): Promise<User> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/users/${userId}`),

  impersonateUser: (
    tenantId: string,
    userId: string
  ): Promise<{
    result: { token: string; expires: string; user: User; tenant: string };
  }> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/impersonate/${userId}`, {
      method: "POST",
    }),

  endImpersonation: (
    tenantId: string,
    userId: string
  ): Promise<{ description: string }> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/impersonate/${userId}`, {
      method: "DELETE",
    }),
};
