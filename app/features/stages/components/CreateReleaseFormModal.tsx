"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpTrayIcon, DocumentIcon, XMarkIcon } from "@heroicons/react/24/outline";
import BaseModal from "@/app/components/modals/BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import Button from "@/app/components/ui/Button";
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

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB — matches backend.

/** Modal for adding a new release form to a stage. Pulls the starting
 *  TipTap content from the stage's release-form template on open;
 *  accepts an optional file attachment. Backend requires at least one
 *  of content/file. */
export default function CreateReleaseFormModal({
  isOpen,
  onClose,
  projectId,
  stageId,
  onCreated,
}: CreateReleaseFormModalProps) {
  const t = useTranslations("areaDetail");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [file, setFile] = useState<File | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch the template content when the modal opens; reset all
  // workspace state on close so the next open starts fresh from the
  // template instead of carrying a stale draft over. The shared
  // `<RichTextEditor>` handles its own sanitise + setContent on
  // content prop changes — we just keep the JSON in state.
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setContent({});
      setFile(null);
      setTemplateError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    let cancelled = false;
    const load = async () => {
      setTemplateLoading(true);
      setTemplateError(null);
      try {
        const response = await stageReleaseFormsApi.getTemplate(
          projectId,
          stageId
        );
        if (cancelled) return;
        // Backend wraps `{ data: ... }` per spec, but some sibling
        // endpoints return the resource directly. Accept both shapes.
        const template = ((response as { data?: ReleaseFormTemplate })?.data ??
          (response as unknown as ReleaseFormTemplate)) as
          | ReleaseFormTemplate
          | undefined;
        setContent(template?.content ?? {});
      } catch (err) {
        if (cancelled) return;
        const msg =
          (err as { message?: string })?.message ??
          t("releaseFormsTemplateLoadError");
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_FILE_SIZE) {
      alert("Max 20MB");
      e.target.value = "";
      return;
    }
    setFile(selected);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasContent = Object.keys(content).length > 0;
  const canSubmit = (hasContent || !!file) && !templateLoading;

  const handleSubmit = async () => {
    const formData = new FormData();
    if (title.trim()) formData.append("title", title.trim());
    if (description.trim()) formData.append("description", description.trim());
    if (hasContent) {
      formData.append("content", JSON.stringify(content));
    }
    if (file) {
      formData.append("file", file);
    }
    try {
      await stageReleaseFormsApi.create(projectId, stageId, formData);
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

  const formatSize = (bytes: number) =>
    bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

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
        <FormInput
          id="release-form-title"
          label={t("releaseFormsTitle")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("releaseFormsTitlePlaceholder")}
        />

        <FormTextarea
          id="release-form-description"
          label={t("releaseFormsDescription")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        {/* TipTap editor — pre-filled with template content once the
            backend responds. We deliberately leave any {punchlistitems}
            marker as literal text in the editor; the read-only view
            substitutes it at render time. */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("releaseFormsContent")}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t("releaseFormsContentHint")}
          </p>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("releaseFormsFile")}
          </label>
          {file ? (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <DocumentIcon className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                aria-label={t("releaseFormsRemoveFile")}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="release-form-file-input"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
                {t("releaseFormsUploadFile")}
              </Button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("releaseFormsFileHint")}
              </span>
            </div>
          )}
        </div>

        {!canSubmit && !templateLoading && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("releaseFormsAtLeastOneRequired")}
          </p>
        )}
      </div>
    </BaseModal>
  );
}
