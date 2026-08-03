"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Button from "./Button";
import Alert from "./Alert";

interface ModalAction {
  label: string;
  onClick?: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  /** Native title attribute — shown as a browser tooltip on hover.
   *  Mainly useful to explain *why* an action is disabled. */
  title?: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";

  // Footer options
  footer?: React.ReactNode; // Custom footer (overrides actions)
  actions?: ModalAction[]; // Button configuration

  // Form mode
  isForm?: boolean;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  formId?: string;

  // Error handling
  error?: string | null;

  // Disable backdrop click to close
  disableBackdropClick?: boolean;
  /** Suppress the Escape-to-close shortcut. Pair with
   *  `disableBackdropClick` to force the user to dismiss via an
   *  explicit footer action — useful when the modal contains
   *  hard-won draft state that an accidental click would lose. */
  disableEscClose?: boolean;
}

const sizeClasses = {
  sm: "max-w-[calc(100%-2rem)] sm:max-w-md",
  md: "max-w-[calc(100%-2rem)] sm:max-w-lg",
  lg: "max-w-[calc(100%-2rem)] md:max-w-2xl",
  xl: "max-w-[calc(100%-2rem)] md:max-w-4xl",
  "2xl": "max-w-[calc(100%-2rem)] md:max-w-6xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  actions,
  size = "md",
  isForm = false,
  onSubmit,
  formId,
  error,
  disableBackdropClick = false,
  disableEscClose = false,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Track client mount so the portal isn't created during SSR (where
   *  `document` is undefined). One render with `mounted=false` is fine
   *  — the modal is only meaningful client-side anyway. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (disableEscClose) return;
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, disableEscClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (disableBackdropClick) return;
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleActionClick = async (action: ModalAction) => {
    if (!action.onClick) return;

    setIsSubmitting(true);
    try {
      await action.onClick();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Build footer from actions if no custom footer provided
  const footerContent = footer ? (
    footer
  ) : actions ? (
    <div className="flex justify-end gap-3">
      {actions.map((action, index) => (
        <Button
          key={index}
          type={action.type || "button"}
          variant={action.variant || "secondary"}
          onClick={action.onClick ? () => handleActionClick(action) : undefined}
          disabled={action.disabled || isSubmitting}
          loading={action.loading || (action.type === "submit" && isSubmitting)}
          form={action.type === "submit" && formId ? formId : undefined}
          title={action.title}
        >
          {action.label}
        </Button>
      ))}
    </div>
  ) : null;

  // The error banner is rendered outside the scrollable body so it
  // stays visible even when the user has scrolled far down — a stale
  // error tucked away above the fold is the main reason failures
  // feel invisible.
  const content = isForm && onSubmit ? (
    <form id={formId} onSubmit={handleFormSubmit} className="space-y-4">
      {children}
    </form>
  ) : (
    children
  );

  // Portal to `document.body` so the modal escapes any ancestor's
  // stacking context. Without this, sibling elements with even a
  // modest `z-index` (like the sticky `<Header>`) sit above the modal
  // because their parent's stacking context outranks `<main>`'s
  // (which has no z-index of its own).
  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`w-full ${sizeClasses[size]} bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/50 max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-6 py-5 md:px-8 md:py-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Sticky error banner — sits between header and body, so it
            stays put even when the user has scrolled deep into the
            content. */}
        {error && (
          <div className="px-6 py-3 md:px-8 border-b border-red-200 dark:border-red-900/50">
            <Alert type="error" message={error} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 md:px-8 md:py-6">
          {content}
        </div>

        {footerContent && (
          <div className="px-6 py-5 md:px-8 md:py-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
            {footerContent}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
