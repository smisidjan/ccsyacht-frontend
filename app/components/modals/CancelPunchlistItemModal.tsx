"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";

interface CancelPunchlistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  itemName: string;
}

export default function CancelPunchlistItemModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
}: CancelPunchlistItemModalProps) {
  const t = useTranslations("punchlist");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError(t("cancelReasonRequired"));
      return;
    }

    if (reason.length > 1000) {
      setError(t("cancelReasonTooLong"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(reason);
      setReason("");
      onClose();
    } catch (err: any) {
      setError(err.message || t("updateError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("cancelItem")}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("cancelItemConfirmation", { name: itemName })}
        </p>

        {error && <Alert type="error" message={error} />}

        <div>
          <label
            htmlFor="cancel-reason"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {t("cancelReason")} <span className="text-red-500">*</span>
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("cancelReasonPlaceholder")}
            rows={4}
            maxLength={1000}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {reason.length}/1000 {t("characters")}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? t("cancelling") : t("confirmCancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
