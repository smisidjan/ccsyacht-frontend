"use client";

import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";

interface DeleteDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  documentName: string;
}

export default function DeleteDocumentModal({
  isOpen,
  onClose,
  onConfirm,
  documentName,
}: DeleteDocumentModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects.detail.documents.deleteModal");

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="delete-document-form"
      onSubmit={onConfirm}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("confirm")}
      submitVariant="danger"
    >
      <p className="text-gray-600 dark:text-gray-400">
        {t("message", { name: documentName })}
      </p>
      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
        {t("warning")}
      </p>
    </BaseModal>
  );
}
