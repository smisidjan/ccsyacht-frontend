"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowUpTrayIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  BellIcon,
  EyeIcon,
  DocumentCheckIcon,
  ComputerDesktopIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import type {
  MyTaskDocumentRequest,
  MyTaskPunchlistItem,
  MyTaskSetupTask,
  MyTaskDocumentAcknowledgement,
  PunchlistItemPriority,
} from "@/lib/api/types";

export type TaskItem =
  | MyTaskDocumentRequest
  | MyTaskPunchlistItem
  | MyTaskSetupTask
  | MyTaskDocumentAcknowledgement;

interface TaskCardProps {
  task: TaskItem;
}

export default function TaskCard({ task }: TaskCardProps) {
  const t = useTranslations("myTasks");

  const isCompleted =
    (task.type === "document_request" && task.isCompleted) ||
    (task.type === "punchlist_item" && task.status === "done") ||
    (task.type === "setup_task" && task.hasSigned) ||
    (task.type === "document_acknowledgement" && task.isAcknowledged);

  const isOverdue =
    (task.type === "document_request" && task.isOverdue && !task.isCompleted) ||
    (task.type === "punchlist_item" && task.isOverdue && task.status !== "done");

  const getPriorityColor = (priority: PunchlistItemPriority) => {
    switch (priority) {
      case "high":
        return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "medium":
        return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
      case "low":
        return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return t("dates.today");
    if (diffDays === 1) return t("dates.tomorrow");
    if (diffDays === -1) return t("dates.yesterday");
    if (diffDays < -1) return t("dates.daysAgo", { days: Math.abs(diffDays) });
    if (diffDays <= 7) return t("dates.inDays", { days: diffDays });

    return date.toLocaleDateString();
  };

  const getTaskLink = (): string => {
    if (task.type === "document_request") {
      return `/dashboard/projects/${task.project.identifier}#documents`;
    }
    if (task.type === "punchlist_item") {
      return `/dashboard/projects/${task.project.identifier}/areas/${task.area.identifier}?stage=${task.stage.identifier}`;
    }
    if (task.type === "document_acknowledgement") {
      return `/dashboard/projects/${task.project.identifier}#overview`;
    }
    return `/dashboard/projects/${task.project.identifier}#overview`;
  };

  const taskLink = getTaskLink();

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${
        isCompleted
          ? "border-l-green-500 bg-green-50/50 dark:bg-green-900/10"
          : isOverdue
          ? "border-l-red-500 bg-red-50/50 dark:bg-red-900/10"
          : task.type === "document_request"
          ? "border-l-blue-500"
          : task.type === "punchlist_item"
          ? "border-l-amber-500"
          : task.type === "document_acknowledgement"
          ? "border-l-teal-500"
          : "border-l-purple-500"
      }`}
    >
      <div className="p-3 sm:p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Type badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-md ${
                task.type === "document_request"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : task.type === "punchlist_item"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : task.type === "document_acknowledgement"
                  ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
              }`}
            >
              {task.type === "document_request" && (
                <ArrowUpTrayIcon className="w-3 h-3" />
              )}
              {task.type === "punchlist_item" && (
                <WrenchScrewdriverIcon className="w-3 h-3" />
              )}
              {task.type === "setup_task" && (
                <CalendarIcon className="w-3 h-3" />
              )}
              {task.type === "document_acknowledgement" && (
                <DocumentCheckIcon className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">
                {t(
                  `types.${
                    task.type === "document_request"
                      ? "documentRequest"
                      : task.type === "punchlist_item"
                      ? "punchlistItem"
                      : task.type === "document_acknowledgement"
                      ? "documentAcknowledgement"
                      : "meeting"
                  }`
                )}
              </span>
            </span>

            {/* Priority badge for punchlist */}
            {task.type === "punchlist_item" && (
              <span
                className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md border ${getPriorityColor(
                  task.priority
                )}`}
              >
                {t(`priority.${task.priority}`)}
              </span>
            )}

            {/* Status badge */}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <CheckCircleIcon className="w-3 h-3" />
                <span className="hidden sm:inline">{t("status.completed")}</span>
              </span>
            )}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                <ExclamationCircleIcon className="w-3 h-3" />
                <span className="hidden sm:inline">{t("status.overdue")}</span>
              </span>
            )}
          </div>

          {/* Quick actions - visible on hover (desktop) or always (mobile) */}
          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Link
              href={taskLink}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title={t("actions.view")}
            >
              <EyeIcon className="w-4 h-4" />
            </Link>
            {!isCompleted && (
              <button
                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors hidden sm:block"
                title={t("actions.remind")}
              >
                <BellIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Task title */}
        <h3
          className={`font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base ${
            isCompleted ? "line-through text-gray-500" : ""
          }`}
        >
          {task.type === "document_request" &&
            t("uploadDocument", { type: task.documentType.name })}
          {task.type === "punchlist_item" && task.name}
          {task.type === "setup_task" && task.name}
          {task.type === "document_acknowledgement" &&
            t("acknowledgeDocument", { title: task.document.title })}
        </h3>

        {/* Description/Message - hidden on small mobile */}
        {task.type === "document_request" && task.message && (
          <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 italic">
            &quot;{task.message}&quot;
          </p>
        )}
        {task.type === "punchlist_item" && task.description && (
          <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {task.description}
          </p>
        )}
        {task.type === "document_acknowledgement" && (
          <div className="hidden sm:flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs font-medium">
              {task.documentType.name}
            </span>
            <span className="text-gray-400">•</span>
            <span>{t("forMeeting", { meeting: task.setupTask.name })}</span>
          </div>
        )}

        {/* Location/Context row */}
        {task.type === "punchlist_item" && (
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-xs sm:text-sm">
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs font-medium truncate max-w-[80px] sm:max-w-none">
              {task.area.name}
            </span>
            <ChevronRightIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs font-medium truncate max-w-[80px] sm:max-w-none">
              {task.stage.name}
            </span>
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            {/* Due date */}
            {task.type === "document_request" && task.dueDate && (
              <span
                className={`flex items-center gap-1 ${
                  isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""
                }`}
              >
                <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {task.type === "punchlist_item" && task.dueDate && (
              <span
                className={`flex items-center gap-1 ${
                  isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""
                }`}
              >
                <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {task.type === "setup_task" && task.scheduledDate && (
              <>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {formatDate(task.scheduledDate)}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {new Date(task.scheduledDate).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {task.scheduledEndDate && (
                    <>
                      {" - "}
                      {new Date(task.scheduledEndDate).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </span>
              </>
            )}
            {task.type === "setup_task" && task.meetingFormat && (
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium ${
                  task.meetingFormat === "live"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                }`}
              >
                {task.meetingFormat === "live" ? (
                  <UserIcon className="w-3 h-3" />
                ) : (
                  <ComputerDesktopIcon className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">
                  {task.meetingFormat === "live" ? t("meetingFormat.inPerson") : t("meetingFormat.online")}
                </span>
              </span>
            )}

            {/* Requested by - hidden on mobile */}
            {task.type === "document_request" && (
              <span className="text-gray-400 hidden sm:inline">
                {t("requestedBy", { name: task.assignedBy.name })}
              </span>
            )}
          </div>

          {/* Action button */}
          <Link
            href={taskLink}
            className={`inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-colors ${
              isCompleted
                ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                : task.type === "document_request"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : task.type === "punchlist_item"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : task.type === "document_acknowledgement"
                ? "bg-teal-600 hover:bg-teal-700 text-white"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
          >
            {task.type === "document_request" &&
              (isCompleted ? t("actions.view") : t("actions.upload"))}
            {task.type === "punchlist_item" &&
              (isCompleted ? t("actions.view") : t("actions.resolve"))}
            {task.type === "setup_task" &&
              (isCompleted ? t("actions.view") : t("actions.attend"))}
            {task.type === "document_acknowledgement" &&
              (isCompleted ? t("actions.view") : t("actions.acknowledge"))}
            <ChevronRightIcon className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
