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
   *  `data.stages` becomes the persisted sort_order. */
  bulkReplace: (
    tenantId: string,
    data: BulkReplaceStageTemplatesRequest
  ): Promise<{ data: StageTemplate[] }> =>
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
