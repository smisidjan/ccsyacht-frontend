// System Admin Template Management API

import type {
  StageTemplate,
  CreateStageTemplateRequest,
  UpdateStageTemplateRequest,
  ReorderStageTemplatesRequest,
  BulkReplaceStageTemplatesRequest,
  DocumentTypeTemplate,
  CreateDocumentTypeTemplateRequest,
  UpdateDocumentTypeTemplateRequest,
  ReorderDocumentTypeTemplatesRequest,
  GetDocumentTypeTemplatesParams,
  KickoffDocumentTemplate,
  CreateKickoffDocumentTemplateRequest,
  UpdateKickoffDocumentTemplateRequest,
  ReorderKickoffDocumentTemplatesRequest,
  ReleaseFormTemplate,
  CreateReleaseFormTemplateRequest,
  UpdateReleaseFormTemplateRequest,
  ReorderReleaseFormTemplatesRequest,
} from "../types";
import { apiFetchSystemTenant, apiFetchSystemTenantWithFile } from "./helpers";

// ============ Stage Templates ============
export const systemStageTemplatesApi = {
  getAll: (
    tenantId: string,
    params?: { active_only?: boolean }
  ): Promise<{ data: StageTemplate[] }> => {
    const queryParams = params?.active_only ? `?active_only=${params.active_only}` : "";
    return apiFetchSystemTenant(tenantId, `/system/tenant/stage-templates${queryParams}`);
  },

  getById: (tenantId: string, id: string): Promise<StageTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/stage-templates/${id}`),

  create: (
    tenantId: string,
    data: CreateStageTemplateRequest
  ): Promise<StageTemplate> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/stage-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    tenantId: string,
    id: string,
    data: UpdateStageTemplateRequest
  ): Promise<StageTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/stage-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (tenantId: string, id: string): Promise<void> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/stage-templates/${id}`, {
      method: "DELETE",
    }),

  reorder: (
    tenantId: string,
    data: ReorderStageTemplatesRequest
  ): Promise<void> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/stage-templates/reorder", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Replace the whole template list in one transactional call. Order of
   *  `data.stages` becomes the persisted sort_order. Returns the fresh
   *  list as a bare array (no `{ data: ... }` wrapper). */
  bulkReplace: (
    tenantId: string,
    data: BulkReplaceStageTemplatesRequest
  ): Promise<StageTemplate[]> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/stage-templates/bulk", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ============ Document Type Templates ============
export const systemDocumentTypeTemplatesApi = {
  getAll: (
    tenantId: string,
    params?: GetDocumentTypeTemplatesParams
  ): Promise<{ data: DocumentTypeTemplate[] }> => {
    const queryParams = params?.active_only ? `?active_only=${params.active_only}` : "";
    return apiFetchSystemTenant(tenantId, `/system/tenant/document-type-templates${queryParams}`);
  },

  getById: (tenantId: string, id: string): Promise<DocumentTypeTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/document-type-templates/${id}`),

  create: (
    tenantId: string,
    data: CreateDocumentTypeTemplateRequest
  ): Promise<DocumentTypeTemplate> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/document-type-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    tenantId: string,
    id: string,
    data: UpdateDocumentTypeTemplateRequest
  ): Promise<DocumentTypeTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/document-type-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (tenantId: string, id: string): Promise<void> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/document-type-templates/${id}`, {
      method: "DELETE",
    }),

  reorder: (
    tenantId: string,
    data: ReorderDocumentTypeTemplatesRequest
  ): Promise<void> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/document-type-templates/reorder", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============ Kickoff Document Templates ============
export const systemKickoffDocumentTemplatesApi = {
  getAll: (
    tenantId: string,
    params?: { active_only?: boolean }
  ): Promise<{ data: KickoffDocumentTemplate[] }> => {
    const queryParams = params?.active_only ? `?active_only=${params.active_only}` : "";
    return apiFetchSystemTenant(tenantId, `/system/tenant/kickoff-document-templates${queryParams}`);
  },

  getById: (tenantId: string, id: string): Promise<KickoffDocumentTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/kickoff-document-templates/${id}`),

  create: (
    tenantId: string,
    data: CreateKickoffDocumentTemplateRequest
  ): Promise<KickoffDocumentTemplate> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/kickoff-document-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    tenantId: string,
    id: string,
    data: UpdateKickoffDocumentTemplateRequest
  ): Promise<KickoffDocumentTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/kickoff-document-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (tenantId: string, id: string): Promise<void> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/kickoff-document-templates/${id}`, {
      method: "DELETE",
    }),

  reorder: (
    tenantId: string,
    data: ReorderKickoffDocumentTemplatesRequest
  ): Promise<void> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/kickoff-document-templates/reorder", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createWithFile: (
    tenantId: string,
    formData: FormData
  ): Promise<KickoffDocumentTemplate> =>
    apiFetchSystemTenantWithFile(
      tenantId,
      "/system/tenant/kickoff-document-templates",
      formData,
      "POST"
    ),

  updateWithFile: (
    tenantId: string,
    id: string,
    formData: FormData
  ): Promise<KickoffDocumentTemplate> =>
    apiFetchSystemTenantWithFile(
      tenantId,
      `/system/tenant/kickoff-document-templates/${id}`,
      formData,
      "PUT"
    ),
};

// ============ Release Form Templates ============
// Mirrors the kickoff-document-templates surface: same JSON + multipart
// CRUD, plus reorder. Stage templates carry a required FK to one of
// these so the stage knows which form the user signs off with.
export const systemReleaseFormTemplatesApi = {
  getAll: (
    tenantId: string,
    params?: { active_only?: boolean }
  ): Promise<{ data: ReleaseFormTemplate[] }> => {
    const queryParams = params?.active_only ? `?active_only=${params.active_only}` : "";
    return apiFetchSystemTenant(tenantId, `/system/tenant/release-form-templates${queryParams}`);
  },

  getById: (tenantId: string, id: string): Promise<ReleaseFormTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/release-form-templates/${id}`),

  create: (
    tenantId: string,
    data: CreateReleaseFormTemplateRequest
  ): Promise<ReleaseFormTemplate> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/release-form-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    tenantId: string,
    id: string,
    data: UpdateReleaseFormTemplateRequest
  ): Promise<ReleaseFormTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/release-form-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (tenantId: string, id: string): Promise<void> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/release-form-templates/${id}`, {
      method: "DELETE",
    }),

  reorder: (
    tenantId: string,
    data: ReorderReleaseFormTemplatesRequest
  ): Promise<void> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/release-form-templates/reorder", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createWithFile: (
    tenantId: string,
    formData: FormData
  ): Promise<ReleaseFormTemplate> =>
    apiFetchSystemTenantWithFile(
      tenantId,
      "/system/tenant/release-form-templates",
      formData,
      "POST"
    ),

  updateWithFile: (
    tenantId: string,
    id: string,
    formData: FormData
  ): Promise<ReleaseFormTemplate> =>
    apiFetchSystemTenantWithFile(
      tenantId,
      `/system/tenant/release-form-templates/${id}`,
      formData,
      "PUT"
    ),
};
