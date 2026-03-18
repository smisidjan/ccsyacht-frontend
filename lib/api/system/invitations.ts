// System Admin Invitation Management API

import type { Invitation } from "../types";
import { apiFetchSystemTenant } from "./helpers";

export const systemInvitationsApi = {
  getTenantInvitations: (
    tenantId: string,
    params?: { status?: string; per_page?: number; page?: number }
  ): Promise<{
    itemListElement: Invitation[];
    numberOfItems: number;
    pagination: { currentPage: number; lastPage: number; perPage: number };
  }> => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.per_page) query.append("per_page", String(params.per_page));
    if (params?.page) query.append("page", String(params.page));
    const queryString = query.toString();
    return apiFetchSystemTenant(
      tenantId,
      `/system/tenant/invitations${queryString ? `?${queryString}` : ""}`
    );
  },
};
