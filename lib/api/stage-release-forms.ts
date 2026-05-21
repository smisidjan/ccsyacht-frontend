"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  StageReleaseForm,
  CreateStageReleaseFormRequest,
  ReleaseFormTemplate,
  ApiError,
} from "./types";
import { apiFetch } from "./fetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// ============ Stage Release Forms API ============
export const stageReleaseFormsApi = {
  getAll: (
    projectId: string,
    stageId: string
  ): Promise<{ data: StageReleaseForm[] }> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/release-forms`),

  getById: (
    projectId: string,
    stageId: string,
    formId: string
  ): Promise<{ data: StageReleaseForm }> =>
    apiFetch(
      `/projects/${projectId}/stages/${stageId}/release-forms/${formId}`
    ),

  /** JSON create. Backend generates the title (from project / deck /
   *  area / stage names) and renders the persisted PDF from the
   *  TipTap content itself — no file upload involved. */
  create: (
    projectId: string,
    stageId: string,
    data: CreateStageReleaseFormRequest
  ): Promise<StageReleaseForm> =>
    apiFetch(`/projects/${projectId}/stages/${stageId}/release-forms`, {
      method: "POST",
      body: data,
    }),

  delete: (
    projectId: string,
    stageId: string,
    formId: string
  ): Promise<void> =>
    apiFetch(
      `/projects/${projectId}/stages/${stageId}/release-forms/${formId}`,
      { method: "DELETE" }
    ),

  /** Tenant-side fetch of the release form template content for this
   *  stage. Without `templateId`, returns the stage's default
   *  template; with one, returns the given template resolved against
   *  this stage's context. Returns 404 if the stage has no default
   *  and no `templateId` was supplied. */
  getTemplate: (
    projectId: string,
    stageId: string,
    templateId?: string
  ): Promise<{ data: ReleaseFormTemplate }> =>
    apiFetch(
      `/projects/${projectId}/stages/${stageId}/release-form-template${
        templateId ? `?template_id=${encodeURIComponent(templateId)}` : ""
      }`
    ),

  /** All active release form templates available for this stage, each
   *  rendered against the stage's context (project/area/deck/date
   *  markers + `{punchlistitems}` resolved). The entry the stage
   *  template currently points at is marked with
   *  `isDefaultForStage: true`. */
  getTemplates: (
    projectId: string,
    stageId: string
  ): Promise<{ data: ReleaseFormTemplate[] }> =>
    apiFetch(
      `/projects/${projectId}/stages/${stageId}/release-form-templates`
    ),

  /** Plain URL constructor — caller handles auth-aware blob fetch. */
  getDownloadUrl: (
    projectId: string,
    stageId: string,
    formId: string
  ): string =>
    `${API_BASE_URL}/projects/${projectId}/stages/${stageId}/release-forms/${formId}/download`,
};

// ============ Hook ============
interface UseStageReleaseFormsState {
  data: StageReleaseForm[] | null;
  loading: boolean;
  error: ApiError | null;
}

export function useStageReleaseForms(projectId: string, stageId: string) {
  const [state, setState] = useState<UseStageReleaseFormsState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchForms = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await stageReleaseFormsApi.getAll(projectId, stageId);
      setState({ data: response.data || [], loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err as ApiError });
    }
  }, [projectId, stageId]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const createForm = async (data: CreateStageReleaseFormRequest) => {
    await stageReleaseFormsApi.create(projectId, stageId, data);
    await fetchForms();
  };

  const deleteForm = async (formId: string) => {
    await stageReleaseFormsApi.delete(projectId, stageId, formId);
    await fetchForms();
  };

  return {
    ...state,
    refetch: fetchForms,
    createForm,
    deleteForm,
  };
}
