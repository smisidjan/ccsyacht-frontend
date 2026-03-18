// System Admin Role Management API

import type {
  TenantRole,
  CreateTenantRoleRequest,
  UpdateTenantRoleRequest,
} from "../types";
import { apiFetchSystemTenant } from "./helpers";

export const systemRolesApi = {
  getTenantRoles: (
    tenantId: string
  ): Promise<{ itemListElement: TenantRole[]; numberOfItems: number }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/roles"),

  getTenantRole: (tenantId: string, roleId: string): Promise<TenantRole> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/roles/${roleId}`),

  createTenantRole: (
    tenantId: string,
    data: CreateTenantRoleRequest
  ): Promise<{ result: TenantRole }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/roles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTenantRole: (
    tenantId: string,
    roleId: string,
    data: UpdateTenantRoleRequest
  ): Promise<{ result: TenantRole }> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/roles/${roleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTenantRole: (
    tenantId: string,
    roleId: string
  ): Promise<{ description: string }> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/roles/${roleId}`, {
      method: "DELETE",
    }),

  getTenantPermissions: (
    tenantId: string
  ): Promise<{
    itemListElement: string[];
    numberOfItems: number;
    metadata?: {
      alwaysRestricted: string[];
      description: string;
    };
  }> => apiFetchSystemTenant(tenantId, "/system/tenant/permissions"),

  getTenantRoleTypes: (
    tenantId: string
  ): Promise<{ itemListElement: string[]; numberOfItems: number }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/role-types"),
};
