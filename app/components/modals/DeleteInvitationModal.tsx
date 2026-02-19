"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
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
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isDeleting}
      >
        {t("cancel")}
      </Button>
      <Button
        type="button"
        variant="danger"
        onClick={handleConfirm}
        loading={isDeleting}
      >
        {isDeleting ? t("deleting") : t("delete")}
      </Button>
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
