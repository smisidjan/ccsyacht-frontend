"use client";

import { useTranslations } from "next-intl";
import { ArrowRightIcon, CheckIcon, ClockIcon, CalendarIcon } from "@heroicons/react/24/outline";
import type { SetupTask, SetupTaskType } from "@/lib/api/types";
import { useCurrentUser } from "@/lib/api";

interface SetupTaskCardProps {
  task: SetupTask;
  onMarkComplete?: (taskId: string) => void;
  onViewDetails?: (taskId: string) => void;
  onDefineDecks?: () => void;
  onViewDecks?: () => void;
}

// Helper to convert snake_case task type to camelCase for translations
function taskTypeToCamelCase(taskType: SetupTaskType): string {
  switch (taskType) {
    case "upload_documents":
      return "uploadDocuments";
    case "add_members":
      return "addMembers";
    case "add_signers":
      return "addSigners";
    case "kickoff_meeting":
      return "kickoffMeeting";
    case "define_decks":
      return "defineDecks";
    default:
      return taskType;
  }
}

// Helper to determine action link based on task type
function getActionHref(taskType: SetupTaskType): string | undefined {
  switch (taskType) {
    case "upload_documents":
      return "#documents";
    case "add_members":
    case "add_signers":
      return "#settings";
    default:
      return undefined;
  }
}

export default function SetupTaskCard({ task, onMarkComplete, onViewDetails, onDefineDecks, onViewDecks }: SetupTaskCardProps) {
  const t = useTranslations("projectDetail.setupTasks");
  const { data: currentUser } = useCurrentUser();

  const isCompleted = task.isComplete || task.actionStatus === "completed";
  const isScheduled = task.actionStatus === "scheduled";
  const actionHref = getActionHref(task.additionalType);
  const translationKey = taskTypeToCamelCase(task.additionalType);

  // Check if current user is an assignee
  const isUserAssignee = currentUser && task.assignees?.some(
    (assignee) => assignee.identifier === currentUser.identifier
  );

  // Determine badge color and text based on status
  const getBadgeStyles = () => {
    if (isCompleted) {
      return {
        bg: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400",
        icon: <CheckIcon className="w-4 h-4" />,
        text: t("completed"),
      };
    }
    if (isScheduled) {
      return {
        bg: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
        icon: <CalendarIcon className="w-4 h-4" />,
        text: t("scheduled"),
      };
    }
    return {
      bg: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
      icon: <ClockIcon className="w-4 h-4" />,
      text: t("pending"),
    };
  };

  const badgeStyles = getBadgeStyles();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {task.name}
        </h3>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${badgeStyles.bg}`}>
          {badgeStyles.icon}
          {badgeStyles.text}
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {task.description}
      </p>

      <div className="flex items-center gap-3">
        {/* Action button for non-kickoff tasks */}
        {!isCompleted && actionHref && task.additionalType !== "kickoff_meeting" && (
          <a
            href={actionHref}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            <ArrowRightIcon className="w-4 h-4" />
            {t(`${translationKey}.action`)}
          </a>
        )}

        {/* View Details button for kickoff meeting */}
        {task.additionalType === "kickoff_meeting" && onViewDetails && (
          <button
            onClick={() => onViewDetails(task.identifier)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            <ArrowRightIcon className="w-4 h-4" />
            {isCompleted
              ? t("viewDetails")
              : isScheduled
                ? isUserAssignee
                  ? t("sign")
                  : t("view")
                : t(`${translationKey}.action`)
            }
          </button>
        )}

        {/* Define Decks button (when not completed) */}
        {!isCompleted && task.additionalType === "define_decks" && onDefineDecks && (
          <button
            onClick={onDefineDecks}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            <ArrowRightIcon className="w-4 h-4" />
            {t(`${translationKey}.action`)}
          </button>
        )}

        {/* View/Edit Decks button (when completed) */}
        {isCompleted && task.additionalType === "define_decks" && onViewDecks && (
          <button
            onClick={onViewDecks}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            <ArrowRightIcon className="w-4 h-4" />
            {t("viewDecks")}
          </button>
        )}

        {/* Mark complete button (if provided) */}
        {!isCompleted && onMarkComplete && task.additionalType !== "kickoff_meeting" && (
          <button
            onClick={() => onMarkComplete(task.identifier)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <CheckIcon className="w-4 h-4" />
            {t("markComplete")}
          </button>
        )}
      </div>
    </div>
  );
}
