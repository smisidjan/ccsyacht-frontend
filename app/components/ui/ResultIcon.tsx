"use client";

import {
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface ResultIconProps {
  type: "success" | "error" | "warning" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const containerStyles = {
  success: "bg-green-100 dark:bg-green-900/30",
  error: "bg-red-100 dark:bg-red-900/30",
  warning: "bg-yellow-100 dark:bg-yellow-900/30",
  info: "bg-gray-100 dark:bg-gray-800",
};

const iconStyles = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-gray-600 dark:text-gray-400",
};

const sizeStyles = {
  sm: { container: "w-10 h-10", icon: "w-5 h-5" },
  md: { container: "w-16 h-16", icon: "w-8 h-8" },
  lg: { container: "w-20 h-20", icon: "w-10 h-10" },
};

const icons = {
  success: CheckIcon,
  error: XMarkIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

export default function ResultIcon({
  type,
  size = "md",
  className = "",
}: ResultIconProps) {
  const Icon = icons[type];

  return (
    <div
      className={`rounded-full flex items-center justify-center ${containerStyles[type]} ${sizeStyles[size].container} ${className}`}
    >
      <Icon className={`${iconStyles[type]} ${sizeStyles[size].icon}`} />
    </div>
  );
}
