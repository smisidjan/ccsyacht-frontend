"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "@/app/components/modals/BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import type { DocumentType, CreateDocumentTypeRequest } from "@/lib/api/types";

interface DocumentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDocumentTypeRequest) => Promise<void>;
  documentType?: DocumentType; // For edit mode
  projectId: string;
}

export default function DocumentTypeModal({
  isOpen,
  onClose,
  onSubmit,
  documentType,
  projectId,
}: DocumentTypeModalProps) {
  const t = useTranslations("documentTypes");

  const [name, setName] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const isEditMode = !!documentType;

  // Reset form when modal opens/closes or documentType changes
  useEffect(() => {
    if (isOpen && documentType) {
      setName(documentType.name);
      setIsRequired(documentType.isRequired);
    } else if (!isOpen) {
      setName("");
      setIsRequired(false);
    }
  }, [isOpen, documentType]);

  const handleSubmit = async () => {
    const data: CreateDocumentTypeRequest = {
      name,
      is_required: isRequired,
    };

    await onSubmit(data);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t("editModal.title") : t("createModal.title")}
      formId="document-type-form"
      onSubmit={handleSubmit}
      successMessage={isEditMode ? t("editModal.success") : t("createModal.success")}
      errorFallbackMessage={isEditMode ? t("editModal.error") : t("createModal.error")}
      submitLabel={isEditMode ? t("editModal.save") : t("createModal.create")}
    >
      <div className="space-y-4">
        <FormInput
          id="document-type-name"
          label={t("fields.name")}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("fields.namePlaceholder")}
          required
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="document-type-required"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="document-type-required"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("fields.required")}
          </label>
        </div>
      </div>
    </BaseModal>
  );
}
