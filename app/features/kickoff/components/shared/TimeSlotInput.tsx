"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import Button from "@/app/components/ui/Button";

interface TimeSlotInputProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onAdd: () => void;
  disabled?: boolean;
  variant?: "default" | "purple";
}

const variantStyles = {
  default: "focus:ring-blue-500",
  purple: "focus:ring-purple-500",
};

export default function TimeSlotInput({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onAdd,
  disabled = false,
  variant = "default",
}: TimeSlotInputProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffScheduling.dates");
  const focusStyle = variantStyles[variant];
  const isAddDisabled = !startTime || !endTime || disabled;

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">
          {t("from")}
        </span>
        <input
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          disabled={disabled}
          className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed ${focusStyle}`}
        />
      </div>
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">
          {t("to")}
        </span>
        <input
          type="time"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          disabled={disabled}
          className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed ${focusStyle}`}
        />
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onAdd}
        disabled={isAddDisabled}
      >
        <PlusIcon className="w-4 h-4" />
        {t("addTime")}
      </Button>
    </div>
  );
}
