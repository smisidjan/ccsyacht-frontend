import { apiFetch } from "./client";
import type {
  StageTemplate,
  CreateStageTemplateRequest,
  UpdateStageTemplateRequest,
  ReorderStageTemplatesRequest,
} from "./types";

/**
 * Stage Templates API
 * Base URL: /api/stage-templates
 */
export const stageTemplatesApi = {
  /**
   * GET /api/stage-templates
   * Get all stage templates
   */
  getAll: async (params?: {
    active_only?: boolean;
  }): Promise<{ data: StageTemplate[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.active_only) {
      queryParams.append("active_only", "true");
    }

    const url = `/stage-templates${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return apiFetch(url);
  },

  /**
   * GET /api/stage-templates/{id}
   * Get single stage template
   */
  getById: async (id: string): Promise<StageTemplate> => {
    return apiFetch(`/stage-templates/${id}`);
  },

  /**
   * POST /api/stage-templates
   * Create new stage template
   */
  create: async (data: CreateStageTemplateRequest): Promise<StageTemplate> => {
    return apiFetch("/stage-templates", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT /api/stage-templates/{id}
   * Update stage template
   */
  update: async (
    id: string,
    data: UpdateStageTemplateRequest
  ): Promise<StageTemplate> => {
    return apiFetch(`/stage-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /api/stage-templates/{id}
   * Delete stage template
   */
  delete: async (id: string): Promise<void> => {
    return apiFetch(`/stage-templates/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * POST /api/stage-templates/reorder
   * Reorder stage templates
   */
  reorder: async (data: ReorderStageTemplatesRequest): Promise<void> => {
    return apiFetch("/stage-templates/reorder", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
