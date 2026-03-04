"use client";

import { useTranslations } from "next-intl";
import { ArrowRightIcon, CheckIcon, ClockIcon } from "@heroicons/react/24/outline";

export type TaskStatus = "pending" | "completed";

export interface SetupTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  actionLabel?: string;
  actionHref?: string;
}

interface SetupTaskCardProps {
  task: SetupTask;
  onMarkComplete?: (taskId: string) => void;
}

export default function SetupTaskCard({ task, onMarkComplete }: SetupTaskCardProps) {
  const t = useTranslations("projectDetail.setupTasks");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {task.title}
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
            task.status === "completed"
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {task.status === "completed" ? (
            <CheckIcon className="w-4 h-4" />
          ) : (
            <ClockIcon className="w-4 h-4" />
          )}
          {task.status === "completed" ? t("completed") : t("pending")}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {task.description}
      </p>

      {(task.actionLabel || onMarkComplete) && (
        <div className="flex items-center gap-3">
          {task.actionLabel && task.actionHref && (
            <a
              href={task.actionHref}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              <ArrowRightIcon className="w-4 h-4" />
              {task.actionLabel}
            </a>
          )}
          {task.status === "pending" && onMarkComplete && (
            <button
              onClick={() => onMarkComplete(task.id)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
              {t("markComplete")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
