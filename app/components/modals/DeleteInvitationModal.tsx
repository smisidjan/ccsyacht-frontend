"use client";

import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface DeleteInvitationModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteInvitationModal({
  isOpen,
  email,
  onClose,
  onConfirm,
}: DeleteInvitationModalProps) {
  const t = useTranslations("usersPage.deleteInvitationModal");

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      onSubmit={onConfirm}
      successMessage={t("success")}
      submitLabel={t("delete")}
      submitVariant="danger"
      size="sm"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          {t("message")}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-white">{email}</span>
        </p>
      </div>
    </BaseModal>
  );
}
