"use client";

import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";

interface DeleteGeneralArrangementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteGeneralArrangementModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteGeneralArrangementModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects.detail.ga.deleteModal");

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="delete-ga-form"
      onSubmit={onConfirm}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("confirm")}
      submitVariant="danger"
    >
      <p className="text-gray-600 dark:text-gray-400">
        {t("message")}
      </p>
      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
        {t("warning")}
      </p>
    </BaseModal>
  );
}
