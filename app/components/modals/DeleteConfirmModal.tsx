"use client";

import { ReactNode } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import BaseModal from "./BaseModal";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  warning?: string;
  successMessage: string;
  errorMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Show centered layout with warning icon */
  showIcon?: boolean;
  /** Additional content below the message */
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warning,
  successMessage,
  errorMessage,
  confirmLabel = "Delete",
  cancelLabel,
  showIcon = false,
  children,
  size = "sm",
}: DeleteConfirmModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onSubmit={onConfirm}
      successMessage={successMessage}
      errorFallbackMessage={errorMessage}
      submitLabel={confirmLabel}
      submitVariant="danger"
      cancelLabel={cancelLabel}
      size={size}
    >
      {showIcon ? (
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-2">{message}</p>
          {children}
        </div>
      ) : (
        <>
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
          {warning && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              {warning}
            </p>
          )}
          {children}
        </>
      )}
    </BaseModal>
  );
}
