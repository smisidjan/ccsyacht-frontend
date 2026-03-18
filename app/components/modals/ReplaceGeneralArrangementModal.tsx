"use client";

import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";

interface ReplaceGeneralArrangementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function ReplaceGeneralArrangementModal({
  isOpen,
  onClose,
  onConfirm,
}: ReplaceGeneralArrangementModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects.detail.ga.replaceModal");

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="replace-ga-form"
      onSubmit={onConfirm}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("confirm")}
      submitVariant="primary"
    >
      <p className="text-gray-600 dark:text-gray-400">
        {t("message")}
      </p>
      <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
        {t("warning")}
      </p>
    </BaseModal>
  );
}
