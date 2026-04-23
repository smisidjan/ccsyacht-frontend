"use client";

import { useTranslations } from "next-intl";
import { CalendarIcon, CheckIcon, ClockIcon, ComputerDesktopIcon, UserIcon } from "@heroicons/react/24/outline";
import type { StatusHeaderProps } from "./types";

export default function StatusHeader({
  task,
}: StatusHeaderProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");

  const scheduledDateTime = task.scheduledDate ? new Date(task.scheduledDate) : null;
  const scheduledEndDateTime = task.scheduledEndDate ? new Date(task.scheduledEndDate) : null;
  const meetingFormat = task.meetingFormat;

  return (
    <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
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
        {meetingFormat && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              meetingFormat === "live"
                ? "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
            }`}
          >
            {meetingFormat === "live" ? (
              <>
                <UserIcon className="w-4 h-4" />
                {t("formatInPerson")}
              </>
            ) : (
              <>
                <ComputerDesktopIcon className="w-4 h-4" />
                {t("formatOnline")}
              </>
            )}
          </span>
        )}
      </div>

      {/* Date and time display */}
      {scheduledDateTime && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">
              {scheduledDateTime.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300">
            <ClockIcon className="w-4 h-4 flex-shrink-0" />
            <span>
              {scheduledDateTime.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {scheduledEndDateTime && (
                <>
                  {" - "}
                  {scheduledEndDateTime.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
