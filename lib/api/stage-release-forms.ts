"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  StageReleaseForm,
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

  /** Multipart create — at least one of `file` or `content` must be
   *  provided. Caller builds the FormData so the same shape works for
   *  TipTap-only, file-only, or both. */
  create: (
    projectId: string,
    stageId: string,
    formData: FormData
  ): Promise<StageReleaseForm> =>
    apiFetch(
      `/projects/${projectId}/stages/${stageId}/release-forms`,
      {
        method: "POST",
        body: formData,
        skipContentType: true,
      }
    ),

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
   *  stage. Returns 404 if the stage's template doesn't link to one. */
  getTemplate: (
    projectId: string,
    stageId: string
  ): Promise<{ data: ReleaseFormTemplate }> =>
    apiFetch(
      `/projects/${projectId}/stages/${stageId}/release-form-template`
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

  const createForm = async (formData: FormData) => {
    await stageReleaseFormsApi.create(projectId, stageId, formData);
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
