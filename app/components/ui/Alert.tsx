"use client";

import {
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface AlertProps {
  type: "error" | "success" | "info" | "warning";
  message: string;
  title?: string;
  icon?: boolean;
  className?: string;
}

const alertStyles = {
  error: {
    container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
    title: "text-red-800 dark:text-red-300",
    icon: "text-red-600 dark:text-red-400",
  },
  success: {
    container: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    text: "text-green-800 dark:text-green-200",
    title: "text-green-800 dark:text-green-300",
    icon: "text-green-600 dark:text-green-400",
  },
  info: {
    container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-200",
    title: "text-blue-800 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
  },
  warning: {
    container: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-800 dark:text-yellow-200",
    title: "text-yellow-800 dark:text-yellow-300",
    icon: "text-yellow-600 dark:text-yellow-400",
  },
};

const icons = {
  error: ExclamationCircleIcon,
  success: CheckCircleIcon,
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
};

export default function Alert({
  type,
  message,
  title,
  icon = true,
  className = "",
}: AlertProps) {
  const styles = alertStyles[type];
  const Icon = icons[type];

  return (
    <div
      className={`p-4 rounded-lg border ${styles.container} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {icon && (
          <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
        )}
        <div>
          {title && (
            <h3 className={`text-sm font-medium ${styles.title}`}>{title}</h3>
          )}
          <p className={`text-sm ${styles.text} ${title ? "mt-1" : ""}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}
