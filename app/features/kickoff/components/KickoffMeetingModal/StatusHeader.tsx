"use client";

import { useTranslations } from "next-intl";
import { CalendarIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { StatusHeaderProps } from "./types";

export default function StatusHeader({
  task,
  selectedTimeSlotInfo,
}: StatusHeaderProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");

  return (
    <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
          task.actionStatus === "completed"
            ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
            : task.actionStatus === "scheduled"
            ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
            : "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
        }`}
      >
        {task.actionStatus === "completed" && <CheckIcon className="w-4 h-4" />}
        {task.actionStatus === "completed"
          ? t("statusCompleted")
          : task.actionStatus === "scheduled"
          ? t("statusScheduled")
          : t("statusPending")}
      </span>
      {selectedTimeSlotInfo && (
        <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <CalendarIcon className="w-4 h-4" />
          {new Date(selectedTimeSlotInfo.date).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
          , {selectedTimeSlotInfo.startTime} - {selectedTimeSlotInfo.endTime}
        </span>
      )}
    </div>
  );
}
