import { apiFetch } from "./client";
import type {
  AreaTemplate,
  CreateAreaTemplateRequest,
  UpdateAreaTemplateRequest,
  ReorderAreaTemplatesRequest,
  GetAreaTemplatesParams,
} from "./types";

/**
 * Area Templates API
 * Base URL: /api/area-templates
 */
export const areaTemplatesApi = {
  /**
   * GET /api/area-templates
   * Get all area templates
   */
  getAll: async (params?: GetAreaTemplatesParams): Promise<{ data: AreaTemplate[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.active_only) {
      queryParams.append("active_only", "true");
    }

    const url = `/area-templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return apiFetch(url);
  },

  /**
   * GET /api/area-templates/{id}
   * Get single area template
   */
  getById: async (id: string): Promise<AreaTemplate> => {
    return apiFetch(`/area-templates/${id}`);
  },

  /**
   * POST /api/area-templates
   * Create new area template
   */
  create: async (data: CreateAreaTemplateRequest): Promise<AreaTemplate> => {
    return apiFetch("/area-templates", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT /api/area-templates/{id}
   * Update area template
   */
  update: async (
    id: string,
    data: UpdateAreaTemplateRequest
  ): Promise<AreaTemplate> => {
    return apiFetch(`/area-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /api/area-templates/{id}
   * Delete area template
   */
  delete: async (id: string): Promise<void> => {
    return apiFetch(`/area-templates/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * POST /api/area-templates/reorder
   * Reorder area templates
   */
  reorder: async (data: ReorderAreaTemplatesRequest): Promise<void> => {
    return apiFetch("/area-templates/reorder", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
