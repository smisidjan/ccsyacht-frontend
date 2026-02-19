"use client";

import { ExclamationCircleIcon, CheckCircleIcon, XMarkIcon, InformationCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationBannerProps {
  type: NotificationType;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const styles: Record<NotificationType, { container: string; icon: string; text: string; button: string }> = {
  success: {
    container: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
    text: "text-green-800 dark:text-green-200",
    button: "text-green-600 dark:text-green-400 hover:bg-green-600",
  },
  error: {
    container: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    text: "text-red-800 dark:text-red-200",
    button: "text-red-600 dark:text-red-400 hover:bg-red-600",
  },
  warning: {
    container: "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    text: "text-amber-800 dark:text-amber-200",
    button: "text-amber-600 dark:text-amber-400 hover:bg-amber-600",
  },
  info: {
    container: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    text: "text-blue-800 dark:text-blue-200",
    button: "text-blue-600 dark:text-blue-400 hover:bg-blue-600",
  },
};

const icons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

export default function NotificationBanner({
  type,
  message,
  onDismiss,
  className = "",
}: NotificationBannerProps) {
  const style = styles[type];
  const Icon = icons[type];

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg ${style.container} ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${style.icon}`} />
        <p className={`text-sm ${style.text}`}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`p-1 rounded-full hover:bg-opacity-20 ${style.button}`}
          aria-label="Dismiss"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
