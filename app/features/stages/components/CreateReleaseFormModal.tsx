"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "@/app/components/modals/BaseModal";
import FormTextarea from "@/app/components/ui/FormTextarea";
import FormSelect from "@/app/components/ui/FormSelect";
import { RichTextEditor } from "@/app/components/ui/RichTextEditor";
import { stageReleaseFormsApi } from "@/lib/api";
import { handleError } from "@/lib/utils/errors";
import type { ReleaseFormTemplate } from "@/lib/api/types";

interface CreateReleaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  stageId: string;
  /** Called after a successful POST so the parent list can refetch. */
  onCreated: () => void;
}

/** Modal for adding a new release form to a stage.
 *
 *  Backend owns the side-channel bits:
 *   - title is auto-generated from project / deck / area / stage names
 *   - the persisted PDF is rendered server-side from the TipTap
 *     content; no file upload
 *   - markers like `{project.*}`, `{stage.*}`, `{date}` and
 *     `{punchlistitems}` are already resolved in the template content
 *     we fetch, so what the user sees is what gets saved.
 */
export default function CreateReleaseFormModal({
  isOpen,
  onClose,
  projectId,
  stageId,
  onCreated,
}: CreateReleaseFormModalProps) {
  const t = useTranslations("areaDetail");

  const [description, setDescription] = useState("");
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [templates, setTemplates] = useState<ReleaseFormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Fetch all release form templates for this stage on open. The
  // backend already resolves `{project.*}`, `{stage.*}`, `{date}` and
  // `{punchlistitems}` against the stage context, so we get fully-
  // rendered TipTap content per template back in one call — no extra
  // fetch needed when the user switches between them.
  useEffect(() => {
    if (!isOpen) {
      setDescription("");
      setContent({});
      setTemplates([]);
      setSelectedTemplateId("");
      setTemplateError(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setTemplateLoading(true);
      setTemplateError(null);
      try {
        const response = await stageReleaseFormsApi.getTemplates(
          projectId,
          stageId
        );
        if (cancelled) return;
        // Accept both `{ data: [...] }` and bare-array shapes — sibling
        // endpoints in this codebase are inconsistent.
        const list = ((response as { data?: ReleaseFormTemplate[] })?.data ??
          (response as unknown as ReleaseFormTemplate[])) as
          | ReleaseFormTemplate[]
          | undefined;
        const items = Array.isArray(list) ? list : [];
        setTemplates(items);
        const defaultTpl =
          items.find((tpl) => tpl.isDefaultForStage) ?? items[0];
        if (defaultTpl) {
          setSelectedTemplateId(defaultTpl.identifier);
          setContent(defaultTpl.content ?? {});
        }
      } catch (err) {
        if (cancelled) return;
        const msg =
          (err as { message?: string })?.message ??
          t("releaseFormsTemplatesLoadError");
        setTemplateError(msg);
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId, stageId, t]);

  // Switching template — swap the editor content to the chosen
  // template's pre-resolved content. We deliberately don't warn for
  // unsaved edits: the user picked another template, that's the
  // intent. If preservation becomes important we can add a confirm
  // later.
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const next = templates.find((tpl) => tpl.identifier === templateId);
    setContent(next?.content ?? {});
  };

  const templateOptions = useMemo(
    () =>
      templates.map((tpl) => ({
        value: tpl.identifier,
        label: tpl.isDefaultForStage
          ? `${tpl.name} ${t("releaseFormsTemplateDefaultSuffix")}`
          : tpl.name,
      })),
    [templates, t]
  );

  const hasContent = Object.keys(content).length > 0;
  const canSubmit = hasContent && !templateLoading;

  const handleSubmit = async () => {
    try {
      await stageReleaseFormsApi.create(projectId, stageId, {
        content,
        description: description.trim() || undefined,
        release_form_template_id: selectedTemplateId || undefined,
      });
      onCreated();
    } catch (err) {
      // Re-throw so BaseModal surfaces the message inline.
      handleError(err, {
        severity: "console",
        context: "Creating stage release form",
      });
      throw err;
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("releaseFormsCreateModalTitle")}
      onSubmit={handleSubmit}
      successMessage={t("releaseFormsCreateSuccess")}
      errorFallbackMessage={t("releaseFormsCreateError")}
      submitDisabled={!canSubmit}
      size="lg"
    >
      <div className="space-y-4">
        <FormTextarea
          id="release-form-description"
          label={t("releaseFormsDescription")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        {/* Template picker — hidden when there's only one option since
            it's noise in that case. Switching just swaps the editor's
            content from in-memory state. */}
        {templateOptions.length > 1 && (
          <FormSelect
            id="release-form-template"
            label={t("releaseFormsTemplatePicker")}
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            options={templateOptions}
            disabled={templateLoading}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("releaseFormsContent")}
          </label>
          {templateLoading && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t("releaseFormsLoadingTemplate")}
            </p>
          )}
          {templateError && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
              {templateError}
            </p>
          )}
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder={t("releaseFormsContent")}
          />
        </div>
      </div>
    </BaseModal>
  );
}
