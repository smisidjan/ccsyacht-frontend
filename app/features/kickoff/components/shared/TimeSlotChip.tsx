"use client";

import { ClockIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { formatTimeRange } from "../../utils";

interface TimeSlotChipProps {
  startTime: string;
  endTime: string;
  onRemove?: () => void;
  variant?: "blue" | "green" | "purple";
  size?: "sm" | "md";
}

const variantStyles = {
  blue: {
    container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    text: "text-blue-700 dark:text-blue-300",
    remove: "text-blue-400 hover:text-red-600 dark:hover:text-red-400",
  },
  green: {
    container: "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700",
    icon: "text-green-600 dark:text-green-400",
    text: "text-green-700 dark:text-green-300",
    remove: "text-green-400 hover:text-red-600 dark:hover:text-red-400",
  },
  purple: {
    container: "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700",
    icon: "text-purple-600 dark:text-purple-400",
    text: "text-purple-700 dark:text-purple-300",
    remove: "text-purple-400 hover:text-red-600 dark:hover:text-red-400",
  },
};

const sizeStyles = {
  sm: {
    container: "px-2.5 py-1 gap-1.5",
    icon: "w-3.5 h-3.5",
    text: "text-xs",
    remove: "w-3 h-3",
  },
  md: {
    container: "px-3 py-1.5 gap-2",
    icon: "w-4 h-4",
    text: "text-sm",
    remove: "w-3.5 h-3.5",
  },
};

export default function TimeSlotChip({
  startTime,
  endTime,
  onRemove,
  variant = "blue",
  size = "md",
}: TimeSlotChipProps) {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  return (
    <div
      className={`inline-flex items-center border rounded-full group ${styles.container} ${sizes.container}`}
    >
      <ClockIcon className={`${sizes.icon} ${styles.icon}`} />
      <span className={`font-medium ${sizes.text} ${styles.text}`}>
        {formatTimeRange(startTime, endTime)}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          className={`p-0.5 transition-colors ${styles.remove}`}
        >
          <XMarkIcon className={sizes.remove} />
        </button>
      )}
    </div>
  );
}
