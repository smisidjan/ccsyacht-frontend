"use client";

import { useState, useCallback, useEffect, type FormEvent, type ReactNode } from "react";
import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { useToast } from "@/app/context/ToastContext";
import { useTranslations } from "next-intl";

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  // Form handling (optional - omit formId for non-form modals like confirmations)
  formId?: string;
  onSubmit: () => Promise<void>;
  successMessage: string;
  // Button customization
  submitLabel?: string;
  submitVariant?: ButtonVariant;
  submitDisabled?: boolean;
  cancelLabel?: string;
  // Error handling
  errorFallbackMessage?: string;
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  size = "sm",
  children,
  formId,
  onSubmit,
  successMessage,
  submitLabel,
  submitVariant = "primary",
  submitDisabled = false,
  cancelLabel,
  errorFallbackMessage,
}: BaseModalProps) {
  const t = useTranslations("common");
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        await onSubmit();
        onClose();
        showToast("success", successMessage);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : (err as { message?: string })?.message ||
              errorFallbackMessage ||
              t("error");
        setError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, onClose, showToast, successMessage, errorFallbackMessage, t]
  );

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const footer = (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
        {cancelLabel || t("cancel")}
      </Button>
      <Button
        type={formId ? "submit" : "button"}
        form={formId}
        variant={submitVariant}
        loading={isSubmitting}
        disabled={submitDisabled || isSubmitting}
        onClick={formId ? undefined : () => handleSubmit()}
      >
        {submitLabel || t("save")}
      </Button>
    </div>
  );

  // Form mode: wrap children in a form element
  // Non-form mode: render children directly (for confirmation modals)
  const content = formId ? (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert type="error" message={error} />}
      {children}
    </form>
  ) : (
    <>
      {error && <Alert type="error" message={error} className="mb-4" />}
      {children}
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      footer={footer}
      size={size}
    >
      {content}
    </Modal>
  );
}
