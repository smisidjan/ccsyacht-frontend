// System Admin Template Management API

import type {
  StageTemplate,
  CreateStageTemplateRequest,
  UpdateStageTemplateRequest,
  ReorderStageTemplatesRequest,
  DocumentTypeTemplate,
  CreateDocumentTypeTemplateRequest,
  UpdateDocumentTypeTemplateRequest,
  ReorderDocumentTypeTemplatesRequest,
  GetDocumentTypeTemplatesParams,
  AreaTemplate,
  CreateAreaTemplateRequest,
  UpdateAreaTemplateRequest,
  ReorderAreaTemplatesRequest,
  GetAreaTemplatesParams,
  ChecklistTemplate,
  CreateChecklistTemplateRequest,
  UpdateChecklistTemplateRequest,
  ReorderChecklistTemplatesRequest,
  GetChecklistTemplatesParams,
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

// ============ Area Templates ============
export const systemAreaTemplatesApi = {
  getAll: (
    tenantId: string,
    params?: GetAreaTemplatesParams
  ): Promise<{ data: AreaTemplate[] }> => {
    const queryParams = params?.active_only ? `?active_only=${params.active_only}` : "";
    return apiFetchSystemTenant(tenantId, `/system/tenant/area-templates${queryParams}`);
  },

  getById: (tenantId: string, id: string): Promise<AreaTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/area-templates/${id}`),

  create: (
    tenantId: string,
    data: CreateAreaTemplateRequest
  ): Promise<AreaTemplate> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/area-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    tenantId: string,
    id: string,
    data: UpdateAreaTemplateRequest
  ): Promise<AreaTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/area-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (tenantId: string, id: string): Promise<void> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/area-templates/${id}`, {
      method: "DELETE",
    }),

  reorder: (
    tenantId: string,
    data: ReorderAreaTemplatesRequest
  ): Promise<void> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/area-templates/reorder", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============ Checklist Templates ============
export const systemChecklistTemplatesApi = {
  getAll: (
    tenantId: string,
    params?: GetChecklistTemplatesParams
  ): Promise<{ data: ChecklistTemplate[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append("type", params.type);
    if (params?.active_only) queryParams.append("active_only", "true");
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return apiFetchSystemTenant(tenantId, `/system/tenant/checklist-templates${queryString}`);
  },

  getById: (tenantId: string, id: string): Promise<ChecklistTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/checklist-templates/${id}`),

  create: (
    tenantId: string,
    data: CreateChecklistTemplateRequest
  ): Promise<ChecklistTemplate> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/checklist-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    tenantId: string,
    id: string,
    data: UpdateChecklistTemplateRequest
  ): Promise<ChecklistTemplate> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/checklist-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (tenantId: string, id: string): Promise<void> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/checklist-templates/${id}`, {
      method: "DELETE",
    }),

  reorder: (
    tenantId: string,
    data: ReorderChecklistTemplatesRequest
  ): Promise<void> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/checklist-templates/reorder", {
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
