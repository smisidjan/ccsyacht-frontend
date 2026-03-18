"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import type { UploadDocumentRequest } from "@/lib/api/types";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UploadDocumentRequest) => Promise<void>;
  documentTypeName: string;
}

export default function UploadDocumentModal({
  isOpen,
  onClose,
  onSubmit,
  documentTypeName,
}: UploadDocumentModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects.detail.documents.uploadModal");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!file) {
      throw new Error(t("fileRequired"));
    }

    await onSubmit({
      title: title || file.name,
      description: description || undefined,
      file,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    // Auto-fill title with filename if empty
    if (selectedFile && !title) {
      setTitle(selectedFile.name);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title", { type: documentTypeName })}
      formId="upload-document-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("upload")}
    >
      <div className="space-y-4">
        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("file")}
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            required
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-gray-600 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-500 transition-all"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t("selectedFile")}: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Title Input */}
        <FormInput
          id="document-title"
          label={t("titleOptional")}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          hint={t("titleHint")}
        />

        {/* Description Input */}
        <FormTextarea
          id="document-description"
          label={t("descriptionOptional")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
        />
      </div>
    </BaseModal>
  );
}
