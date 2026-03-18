"use client";

import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-gray-700 dark:text-gray-300">{message}</p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
