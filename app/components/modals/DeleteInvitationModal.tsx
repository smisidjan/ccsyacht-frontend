"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
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
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to delete invitation:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={isDeleting}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
      >
        {t("cancel")}
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isDeleting}
        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDeleting ? t("deleting") : t("delete")}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("title")} footer={footer} size="sm">
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
        {/* TODO: When email system is implemented, deleting an invitation should also
            invalidate/deactivate any invitation links that were sent via email.
            The backend should handle this by marking the invitation token as invalid. */}
      </div>
    </Modal>
  );
}
