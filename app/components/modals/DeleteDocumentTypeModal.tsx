"use client";

import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";

interface DeleteDocumentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  documentTypeName: string;
  documentCount: number;
}

export default function DeleteDocumentTypeModal({
  isOpen,
  onClose,
  onConfirm,
  documentTypeName,
  documentCount,
}: DeleteDocumentTypeModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects.detail.documentTypes.deleteModal");

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="delete-document-type-form"
      onSubmit={onConfirm}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("confirm")}
      submitVariant="danger"
    >
      <p className="text-gray-600 dark:text-gray-400">
        {t("message", { name: documentTypeName })}
      </p>
      {documentCount > 0 && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
          {t("warning", { count: documentCount })}
        </p>
      )}
    </BaseModal>
  );
}
