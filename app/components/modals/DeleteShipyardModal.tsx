"use client";

import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";

interface DeleteShipyardModalProps {
  isOpen: boolean;
  shipyardName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteShipyardModal({
  isOpen,
  shipyardName,
  onClose,
  onConfirm,
}: DeleteShipyardModalProps) {
  const t = useTranslations("shipyards.delete");

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="delete-shipyard-form"
      onSubmit={onConfirm}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("confirm")}
      submitVariant="danger"
    >
      <p className="text-gray-600 dark:text-gray-400">
        {t("message", { name: shipyardName })}
      </p>
      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
        {t("warning")}
      </p>
    </BaseModal>
  );
}
