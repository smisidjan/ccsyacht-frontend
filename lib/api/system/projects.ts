// System Admin Project Management API

import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  DocumentType,
  CreateDocumentTypeRequest,
  UpdateDocumentTypeRequest,
  Document,
  UploadDocumentRequest,
  Shipyard,
  CreateShipyardRequest,
  ApiError,
  PaginatedResponse,
} from "../types";
import {
  apiFetchSystemTenant,
  getSystemToken,
  API_BASE_URL,
} from "./helpers";

export const systemProjectsApi = {
  // Project CRUD
  getProjects: (
    tenantId: string,
    params?: {
      status?: string;
      project_type?: string;
      search?: string;
      per_page?: number;
      page?: number;
    }
  ): Promise<PaginatedResponse<Project>> => {
    const queryParts: string[] = [];
    if (params?.status) queryParts.push(`status=${params.status}`);
    if (params?.project_type) queryParts.push(`project_type=${params.project_type}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.per_page) queryParts.push(`per_page=${params.per_page}`);
    if (params?.page) queryParts.push(`page=${params.page}`);
    const queryString = queryParts.join("&");
    return apiFetchSystemTenant(
      tenantId,
      `/system/tenant/projects${queryString ? `?${queryString}` : ""}`
    );
  },

  getProject: (tenantId: string, projectId: string): Promise<Project> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/projects/${projectId}`),

  createProject: (
    tenantId: string,
    data: CreateProjectRequest
  ): Promise<{ result: Project }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProject: (
    tenantId: string,
    projectId: string,
    data: UpdateProjectRequest
  ): Promise<{ result: Project }> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProject: (
    tenantId: string,
    projectId: string
  ): Promise<{ description: string }> =>
    apiFetchSystemTenant(tenantId, `/system/tenant/projects/${projectId}`, {
      method: "DELETE",
    }),

  // General Arrangement
  uploadGeneralArrangement: async (
    tenantId: string,
    projectId: string,
    file: File
  ): Promise<{ result: Project }> => {
    const formData = new FormData();
    formData.append("file", file);

    const token = getSystemToken();
    if (!token) throw new Error("No system token");

    const response = await fetch(
      `${API_BASE_URL}/system/tenant/projects/${projectId}/general-arrangement`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.message || `HTTP error ${response.status}`,
        code: errorData.code,
        status: response.status,
      };
      throw error;
    }

    return response.json();
  },

  downloadGeneralArrangement: async (
    tenantId: string,
    projectId: string
  ): Promise<Blob> => {
    const token = getSystemToken();
    if (!token) throw new Error("No system token");

    const response = await fetch(
      `${API_BASE_URL}/system/tenant/projects/${projectId}/general-arrangement`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.message || `HTTP error ${response.status}`,
        code: errorData.code,
        status: response.status,
      };
      throw error;
    }

    return response.blob();
  },

  deleteGeneralArrangement: (
    tenantId: string,
    projectId: string
  ): Promise<{ description: string }> =>
    apiFetchSystemTenant(
      tenantId,
      `/system/tenant/projects/${projectId}/general-arrangement`,
      {
        method: "DELETE",
      }
    ),

  // Document Types
  getDocumentTypes: (
    tenantId: string,
    projectId: string
  ): Promise<{ data: DocumentType[] }> =>
    apiFetchSystemTenant(
      tenantId,
      `/system/tenant/projects/${projectId}/document-types`
    ),

  createDocumentType: (
    tenantId: string,
    projectId: string,
    data: CreateDocumentTypeRequest
  ): Promise<{ result: DocumentType }> =>
    apiFetchSystemTenant(
      tenantId,
      `/system/tenant/projects/${projectId}/document-types`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  updateDocumentType: (
    tenantId: string,
    projectId: string,
    typeId: string,
    data: UpdateDocumentTypeRequest
  ): Promise<{ result: DocumentType }> =>
    apiFetchSystemTenant(
      tenantId,
      `/system/tenant/projects/${projectId}/document-types/${typeId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    ),

  deleteDocumentType: (
    tenantId: string,
    projectId: string,
    typeId: string
  ): Promise<{ description: string }> =>
    apiFetchSystemTenant(
      tenantId,
      `/system/tenant/projects/${projectId}/document-types/${typeId}`,
      {
        method: "DELETE",
      }
    ),

  // Documents
  getDocuments: (
    tenantId: string,
    projectId: string,
    params?: { document_type_id?: string }
  ): Promise<{ data: Document[] }> => {
    const query = new URLSearchParams();
    if (params?.document_type_id)
      query.append("document_type_id", params.document_type_id);
    const queryString = query.toString();
    return apiFetchSystemTenant(
      tenantId,
      `/system/tenant/projects/${projectId}/documents${queryString ? `?${queryString}` : ""}`
    );
  },

  uploadDocument: async (
    tenantId: string,
    projectId: string,
    typeId: string,
    data: UploadDocumentRequest
  ): Promise<{ result: Document }> => {
    const formData = new FormData();
    formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    formData.append("file", data.file);

    const token = getSystemToken();
    if (!token) throw new Error("No system token");

    const response = await fetch(
      `${API_BASE_URL}/system/tenant/projects/${projectId}/document-types/${typeId}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.message || `HTTP error ${response.status}`,
        code: errorData.code,
        status: response.status,
      };
      throw error;
    }

    return response.json();
  },

  downloadDocument: async (
    tenantId: string,
    projectId: string,
    docId: string
  ): Promise<Blob> => {
    const token = getSystemToken();
    if (!token) throw new Error("No system token");

    const response = await fetch(
      `${API_BASE_URL}/system/tenant/projects/${projectId}/documents/${docId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.message || `HTTP error ${response.status}`,
        code: errorData.code,
        status: response.status,
      };
      throw error;
    }

    return response.blob();
  },

  deleteDocument: (
    tenantId: string,
    projectId: string,
    docId: string
  ): Promise<{ description: string }> =>
    apiFetchSystemTenant(
      tenantId,
      `/system/tenant/projects/${projectId}/documents/${docId}`,
      {
        method: "DELETE",
      }
    ),

  // Shipyards (for dropdown)
  getShipyards: (
    tenantId: string
  ): Promise<{ itemListElement: Shipyard[]; numberOfItems: number }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/shipyards"),

  createShipyard: (
    tenantId: string,
    data: CreateShipyardRequest
  ): Promise<{ result: Shipyard }> =>
    apiFetchSystemTenant(tenantId, "/system/tenant/shipyards", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
