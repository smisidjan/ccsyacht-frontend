"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";

interface CreateDocumentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; is_required: boolean }) => Promise<void>;
}

export default function CreateDocumentTypeModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateDocumentTypeModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects.detail.documentTypes.createModal");

  const [name, setName] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const handleSubmit = async () => {
    await onSubmit({ name, is_required: isRequired });
    setName("");
    setIsRequired(false);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setName("");
        setIsRequired(false);
      }}
      title={t("title")}
      formId="create-document-type-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("create")}
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
