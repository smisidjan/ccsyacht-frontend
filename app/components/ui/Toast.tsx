"use client";

import { useEffect, useState } from "react";
import { ExclamationCircleIcon, CheckCircleIcon, XMarkIcon, InformationCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
  onClose: () => void;
}

const styles: Record<ToastType, { container: string; icon: string }> = {
  success: {
    container: "bg-green-600 dark:bg-green-700",
    icon: "text-white",
  },
  error: {
    container: "bg-red-600 dark:bg-red-700",
    icon: "text-white",
  },
  warning: {
    container: "bg-amber-500 dark:bg-amber-600",
    icon: "text-white",
  },
  info: {
    container: "bg-blue-600 dark:bg-blue-700",
    icon: "text-white",
  },
};

const icons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

export default function Toast({
  type,
  message,
  duration = 5000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const style = styles[type];
  const Icon = icons[type];

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        text-white min-w-[300px] max-w-md
        transform transition-all duration-300 ease-out
        ${style.container}
        ${isVisible && !isLeaving ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${style.icon}`} />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={handleClose}
        className="p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
