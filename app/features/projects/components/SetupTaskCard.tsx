"use client";

import { useTranslations } from "next-intl";
import { ArrowRightIcon, CheckIcon, ClockIcon, CalendarIcon, LockClosedIcon, ComputerDesktopIcon, UserIcon } from "@heroicons/react/24/outline";
import type { SetupTask, SetupTaskType, DocumentType } from "@/lib/api/types";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import Tooltip from "@/app/components/ui/Tooltip";

interface SetupTaskCardProps {
  task: SetupTask;
  documentTypes?: DocumentType[];
  allTasks?: SetupTask[];
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

export default function SetupTaskCard({ task, documentTypes, allTasks, onMarkComplete, onViewDetails, onDefineDecks, onViewDecks }: SetupTaskCardProps) {
  const t = useTranslations("projectDetail.setupTasks");
  const { currentUser } = useCurrentUserContext();

  const isCompleted = task.isComplete || task.actionStatus === "completed";
  const isScheduled = task.actionStatus === "scheduled";
  const actionHref = getActionHref(task.additionalType);
  const translationKey = taskTypeToCamelCase(task.additionalType);

  // Helper to render description with strikethrough for uploaded documents
  const renderDescription = () => {
    if (task.additionalType !== "upload_documents" || !documentTypes) {
      return task.description;
    }

    // Separate required docs into:
    // 1. Required (not assigned) - these block the kickoff
    // 2. Requested (assigned to someone) - these don't block
    const requiredDocs = documentTypes.filter(dt => dt.isRequired);
    const requiredNotAssigned = requiredDocs.filter(doc => !doc.assignees || doc.assignees.length === 0);
    const requestedDocs = requiredDocs.filter(doc => doc.assignees && doc.assignees.length > 0);

    if (requiredNotAssigned.length === 0 && requestedDocs.length === 0) {
      return task.description;
    }

    return (
      <>
        {/* Required documents (blocking) */}
        {requiredNotAssigned.length > 0 && (
          <>
            <span>{t("uploadDocuments.descriptionIntro")}</span>
            <ul className="mt-2 space-y-1">
              {requiredNotAssigned.map(doc => (
                <li key={doc.identifier} className="flex items-center gap-2">
                  {doc.documentCount > 0 ? (
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">•</span>
                  )}
                  <span className={doc.documentCount > 0 ? "line-through text-gray-400" : ""}>
                    {doc.name}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Requested documents (not blocking) */}
        {requestedDocs.length > 0 && (
          <>
            <span className={requiredNotAssigned.length > 0 ? "mt-3 block" : ""}>
              {t("uploadDocuments.requestedIntro")}
            </span>
            <ul className="mt-2 space-y-1">
              {requestedDocs.map(doc => (
                <li key={doc.identifier} className="flex items-center gap-2">
                  {doc.documentCount > 0 ? (
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <ClockIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <span className={doc.documentCount > 0 ? "line-through text-gray-400" : "text-amber-600 dark:text-amber-400"}>
                    {doc.name}
                  </span>
                  {doc.documentCount === 0 && (
                    <span className="text-xs text-gray-400">
                      ({t("uploadDocuments.assignedTo", { name: doc.assignees?.[0]?.name || "" })})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </>
    );
  };

  // Check if current user is an assignee
  const isUserAssignee = currentUser && task.assignees?.some(
    (assignee) => assignee.identifier === currentUser.identifier
  );

  // Check if all required documents are uploaded (for kickoff meeting blocking)
  // Only documents that are required AND not assigned to anyone block the kickoff
  const requiredDocs = documentTypes?.filter(dt => dt.isRequired) || [];
  const requiredNotAssignedDocs = requiredDocs.filter(doc => !doc.assignees || doc.assignees.length === 0);
  const allRequiredDocsUploaded = requiredNotAssignedDocs.length === 0 || requiredNotAssignedDocs.every(doc => doc.documentCount > 0);
  const missingDocsCount = requiredNotAssignedDocs.filter(doc => doc.documentCount === 0).length;

  // Check if members have been added (add_members task is complete)
  const addMembersTask = allTasks?.find(t => t.additionalType === "add_members");
  const membersAdded = addMembersTask ? (addMembersTask.isComplete || addMembersTask.actionStatus === "completed") : true;

  // Kickoff is blocked if documents are missing OR members haven't been added
  const isKickoffBlocked = task.additionalType === "kickoff_meeting" && !isCompleted && (!allRequiredDocsUploaded || !membersAdded);

  // Build tooltip message for blocked reasons
  const getBlockedReasons = (): string[] => {
    const reasons: string[] = [];
    if (!membersAdded) {
      reasons.push(t("kickoffBlocked.membersRequired"));
    }
    if (missingDocsCount > 0) {
      reasons.push(t("kickoffBlocked.documentsRequired", { count: missingDocsCount }));
    }
    return reasons;
  };
  const blockedReasons = isKickoffBlocked ? getBlockedReasons() : [];

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
    if (isKickoffBlocked) {
      return {
        bg: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
        icon: <LockClosedIcon className="w-4 h-4" />,
        text: t("blocked"),
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6 flex flex-col h-full">
      <div className="flex items-start justify-between mb-3 min-h-[4rem]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {task.name}
        </h3>
        {isKickoffBlocked ? (
          <Tooltip content={blockedReasons.join("\n")} position="bottom" maxWidth="320px" multiline>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium shrink-0 cursor-help ${badgeStyles.bg}`}>
              {badgeStyles.icon}
              {badgeStyles.text}
            </span>
          </Tooltip>
        ) : (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium shrink-0 ${badgeStyles.bg}`}>
            {badgeStyles.icon}
            {badgeStyles.text}
          </span>
        )}
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow">
        {renderDescription()}
      </div>

      {/* Scheduled meeting details */}
      {isScheduled && task.scheduledDate && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4 space-y-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">
              {new Date(task.scheduledDate).toLocaleDateString(undefined, {
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
              {new Date(task.scheduledDate).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {task.meetingFormat && (
            <div className="flex items-center gap-2">
              {task.meetingFormat === "live" ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-medium">
                  <UserIcon className="w-3 h-3" />
                  {t("meetingFormat.inPerson")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                  <ComputerDesktopIcon className="w-3 h-3" />
                  {t("meetingFormat.online")}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-auto">
      <div className="flex items-center justify-end gap-3">
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
          <>
            {isKickoffBlocked ? (
              <button
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
              >
                <LockClosedIcon className="w-4 h-4" />
                {t(`${translationKey}.action`)}
              </button>
            ) : (
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
          </>
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
    </div>
  );
}
