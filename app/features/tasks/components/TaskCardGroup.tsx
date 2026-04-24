"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  DocumentCheckIcon,
  ArrowUpTrayIcon,
  ComputerDesktopIcon,
  UserIcon,
  LinkIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import type {
  MyTaskSetupTask,
  MyTaskDocumentAcknowledgement,
  MyTaskDocumentRequest,
} from "@/lib/api/types";

interface TaskCardGroupProps {
  meeting: MyTaskSetupTask;
  acknowledgements: MyTaskDocumentAcknowledgement[];
  documentRequests: MyTaskDocumentRequest[];
}

export default function TaskCardGroup({
  meeting,
  acknowledgements,
  documentRequests,
}: TaskCardGroupProps) {
  const t = useTranslations("myTasks");
  const [isExpanded, setIsExpanded] = useState(false);

  const isCompleted = meeting.hasSigned;
  const pendingAcknowledgements = acknowledgements.filter(
    (ack) => !ack.isAcknowledged
  );
  const pendingDocumentRequests = documentRequests.filter(
    (doc) => !doc.isCompleted
  );
  const overdueDocumentRequests = documentRequests.filter(
    (doc) => doc.isOverdue && !doc.isCompleted
  );

  // Total nested tasks
  const totalNestedTasks = acknowledgements.length + documentRequests.length;
  const totalPendingTasks = pendingAcknowledgements.length + pendingDocumentRequests.length;

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

  const taskLink = `/dashboard/projects/${meeting.project.identifier}#overview`;

  return (
    <div className="space-y-0">
      {/* Main meeting card */}
      <div
        className={`group relative bg-white dark:bg-gray-800 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${
          isCompleted
            ? "border-l-green-500 bg-green-50/50 dark:bg-green-900/10"
            : "border-l-purple-500"
        } ${totalNestedTasks > 0 ? "rounded-b-none" : ""}`}
      >
        <div className="p-3 sm:p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Type badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                <CalendarIcon className="w-3 h-3" />
                <span className="hidden sm:inline">{t("types.meeting")}</span>
              </span>

              {/* Status badge */}
              {isCompleted && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <CheckCircleIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {t("status.completed")}
                  </span>
                </span>
              )}

              {/* Pending documents badge */}
              {pendingDocumentRequests.length > 0 && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md ${
                  overdueDocumentRequests.length > 0
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                }`}>
                  <ArrowUpTrayIcon className="w-3 h-3" />
                  {t("pendingDocuments", {
                    count: pendingDocumentRequests.length,
                  })}
                </span>
              )}

              {/* Pending reviews badge */}
              {pendingAcknowledgements.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                  <DocumentCheckIcon className="w-3 h-3" />
                  {t("pendingReviews", {
                    count: pendingAcknowledgements.length,
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Task title */}
          <h3
            className={`font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base ${
              isCompleted ? "line-through text-gray-500" : ""
            }`}
          >
            {meeting.name}
          </h3>

          {/* Footer row */}
          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              {/* Scheduled date and time */}
              {meeting.scheduledDate && (
                <>
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {formatDate(meeting.scheduledDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {new Date(meeting.scheduledDate).toLocaleTimeString(
                      undefined,
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                    {meeting.scheduledEndDate && (
                      <>
                        {" - "}
                        {new Date(meeting.scheduledEndDate).toLocaleTimeString(
                          undefined,
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </>
                    )}
                  </span>
                </>
              )}

              {/* Meeting format badge */}
              {meeting.meetingFormat && (
                <span
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium ${
                    meeting.meetingFormat === "live"
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  }`}
                >
                  {meeting.meetingFormat === "live" ? (
                    <UserIcon className="w-3 h-3" />
                  ) : (
                    <ComputerDesktopIcon className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">
                    {meeting.meetingFormat === "live"
                      ? t("meetingFormat.inPerson")
                      : t("meetingFormat.online")}
                  </span>
                </span>
              )}

              {/* Meeting link */}
              {meeting.meetingFormat === "online" && meeting.meetingLink && (
                <a
                  href={meeting.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">{t("meetingLink")}</span>
                </a>
              )}
            </div>

            {/* Action button */}
            <Link
              href={taskLink}
              className={`inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-colors ${
                isCompleted
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              {isCompleted ? t("actions.view") : t("actions.attend")}
              <ChevronRightIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Nested tasks (document requests and acknowledgements) */}
      {totalNestedTasks > 0 && (
        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

          {/* Expand/collapse header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="relative z-10 w-full flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-600 dark:text-gray-400 border-x border-gray-200 dark:border-gray-700"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
            <span>
              {t("relatedTasks", { count: totalNestedTasks })}
            </span>
            {totalPendingTasks > 0 && (
              <span className={`ml-auto px-2 py-0.5 text-xs font-semibold rounded-full ${
                overdueDocumentRequests.length > 0
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
              }`}>
                {totalPendingTasks} {t("pending")}
              </span>
            )}
          </button>

          {/* Nested task cards */}
          {isExpanded && (
            <div className="pl-6 border-x border-b border-gray-200 dark:border-gray-700 rounded-b-xl bg-gray-50/50 dark:bg-gray-800/50">
              {/* Document requests first */}
              {documentRequests.map((doc) => (
                <NestedDocumentRequestCard key={doc.identifier} task={doc} />
              ))}
              {/* Then acknowledgements */}
              {acknowledgements.map((ack) => (
                <NestedAcknowledgementCard key={ack.identifier} task={ack} />
              ))}
            </div>
          )}

          {/* Bottom border when collapsed */}
          {!isExpanded && (
            <div className="h-2 bg-gray-100 dark:bg-gray-700/50 border-x border-b border-gray-200 dark:border-gray-700 rounded-b-xl" />
          )}
        </div>
      )}
    </div>
  );
}

// Nested acknowledgement card component
function NestedAcknowledgementCard({
  task,
}: {
  task: MyTaskDocumentAcknowledgement;
}) {
  const t = useTranslations("myTasks");
  const isCompleted = task.isAcknowledged;

  const taskLink = `/dashboard/projects/${task.project.identifier}#overview`;

  return (
    <div
      className={`relative py-3 px-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      {/* Connector dot */}
      <div className="absolute left-[-14px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-teal-500 border-2 border-white dark:border-gray-800" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
              <DocumentCheckIcon className="w-3 h-3" />
              <span className="hidden sm:inline">{t("types.documentAcknowledgement")}</span>
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <CheckCircleIcon className="w-3 h-3" />
              </span>
            )}
          </div>
          <h4
            className={`text-sm font-medium text-gray-900 dark:text-white truncate ${
              isCompleted ? "line-through text-gray-500" : ""
            }`}
          >
            {task.document.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {task.documentType.name}
          </p>
        </div>

        <Link
          href={taskLink}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-colors ${
            isCompleted
              ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              : "bg-teal-600 hover:bg-teal-700 text-white"
          }`}
        >
          {isCompleted ? t("actions.view") : t("actions.acknowledge")}
          <ChevronRightIcon className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// Nested document request card component
function NestedDocumentRequestCard({
  task,
}: {
  task: MyTaskDocumentRequest;
}) {
  const t = useTranslations("myTasks");
  const isCompleted = task.isCompleted;
  const isOverdue = task.isOverdue && !task.isCompleted;

  const taskLink = `/dashboard/projects/${task.project.identifier}#documents`;

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

  return (
    <div
      className={`relative py-3 px-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      {/* Connector dot */}
      <div className={`absolute left-[-14px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white dark:border-gray-800 ${
        isOverdue ? "bg-red-500" : "bg-blue-500"
      }`} />

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md ${
              isOverdue
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
            }`}>
              <ArrowUpTrayIcon className="w-3 h-3" />
              <span className="hidden sm:inline">{t("types.documentRequest")}</span>
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <CheckCircleIcon className="w-3 h-3" />
              </span>
            )}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                <ExclamationCircleIcon className="w-3 h-3" />
              </span>
            )}
          </div>
          <h4
            className={`text-sm font-medium text-gray-900 dark:text-white truncate ${
              isCompleted ? "line-through text-gray-500" : ""
            }`}
          >
            {t("uploadDocument", { type: task.documentType.name })}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {task.dueDate && (
              <span className={isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                {formatDate(task.dueDate)}
              </span>
            )}
            <span>• {t("requestedBy", { name: task.assignedBy.name })}</span>
          </div>
        </div>

        <Link
          href={taskLink}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-colors ${
            isCompleted
              ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isCompleted ? t("actions.view") : t("actions.upload")}
          <ChevronRightIcon className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
