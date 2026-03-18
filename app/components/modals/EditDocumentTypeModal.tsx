"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import type { DocumentType } from "@/lib/api/types";

interface EditDocumentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; is_required: boolean }) => Promise<void>;
  documentType: DocumentType | null;
}

export default function EditDocumentTypeModal({
  isOpen,
  onClose,
  onSubmit,
  documentType,
}: EditDocumentTypeModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects.detail.documentTypes.editModal");

  const [name, setName] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    if (documentType) {
      setName(documentType.name);
      setIsRequired(documentType.isRequired);
    }
  }, [documentType]);

  const handleSubmit = async () => {
    await onSubmit({ name, is_required: isRequired });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="edit-document-type-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("save")}
    >
      <div className="space-y-4">
        <FormInput
          id="name"
          label={t("name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          required
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_required"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="is_required"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            {t("required")}
          </label>
        </div>
      </div>
    </BaseModal>
  );
}
