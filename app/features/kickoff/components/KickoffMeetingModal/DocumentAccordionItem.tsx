"use client";

import { useTranslations } from "next-intl";
import {
  CheckIcon,
  ClockIcon,
  XMarkIcon,
  DocumentIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import type { DocumentAccordionItemProps } from "./types";

export default function DocumentAccordionItem({
  doc,
  task,
  projectId,
  isExpanded,
  onToggle,
  acknowledgingDocId,
  isAttendee,
  onAcknowledge,
  onDisagreeClick,
  userHasResponded,
  hasDisagreement,
  isResubmission,
}: DocumentAccordionItemProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");

  // Calculate effective totals
  const effectiveTotalAssignees = task?.assignees?.length || doc.totalAssignees || 0;
  const actualAckCount = doc.acknowledgements.filter(
    (ack) => ack.hasAgreed === true || ack.hasAgreed === false
  ).length;
  const effectiveAllAcknowledged =
    effectiveTotalAssignees > 0 &&
    actualAckCount === effectiveTotalAssignees &&
    !hasDisagreement;

  const getDocumentUrl = () => {
    const token = localStorage.getItem("token") || "";
    const tenantUrl = localStorage.getItem("tenantUrl") || "";
    return `${process.env.NEXT_PUBLIC_API_URL || "/api"}/projects/${projectId}/documents/${doc.identifier}/download?token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(tenantUrl)}&inline=true`;
  };

  const getStatusClasses = () => {
    if (hasDisagreement) return "bg-red-50/50 dark:bg-red-900/10";
    if (effectiveAllAcknowledged) return "bg-green-50/50 dark:bg-green-900/10";
    if (isResubmission) return "bg-purple-50/50 dark:bg-purple-900/10";
    return "";
  };

  const getBadgeClasses = () => {
    if (hasDisagreement)
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    if (effectiveAllAcknowledged)
      return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    if (isResubmission)
      return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400";
    return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
  };

  const StatusIcon = () => {
    if (hasDisagreement) return <XMarkIcon className="w-4 h-4 text-red-600" />;
    if (effectiveAllAcknowledged) return <CheckIcon className="w-4 h-4 text-green-600" />;
    if (isResubmission) return <ArrowPathIcon className="w-4 h-4 text-purple-600" />;
    return <DocumentIcon className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${getStatusClasses()}`}
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        )}
        <StatusIcon />
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
          {doc.category?.name ? `${doc.category.name} - ${doc.name}` : doc.name}
        </span>
        {isResubmission && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            <ArrowPathIcon className="w-3 h-3 inline mr-1" />
            {t("resubmitted")}
          </span>
        )}
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getBadgeClasses()}`}>
          {hasDisagreement ? (
            <XMarkIcon className="w-3 h-3 inline mr-1" />
          ) : effectiveAllAcknowledged ? (
            <CheckIcon className="w-3 h-3 inline mr-1" />
          ) : null}
          {actualAckCount}/{effectiveTotalAssignees}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 bg-gray-50 dark:bg-gray-800/30 space-y-3">
          <a
            href={getDocumentUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <EyeIcon className="w-4 h-4" />
            {t("viewDocument")}
          </a>

          {/* Acknowledgement status */}
          <div className="space-y-2">
            {/* Agreed */}
            {doc.acknowledgements
              .filter((ack) => ack.hasAgreed === true)
              .map((ack, idx) => (
                <div key={ack.identifier || idx} className="flex items-center gap-2 text-xs">
                  <CheckIcon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {ack.name || "Unknown"}
                  </span>
                </div>
              ))}
            {/* Disagreed */}
            {doc.acknowledgements
              .filter((ack) => ack.hasAgreed === false)
              .map((ack, idx) => (
                <div key={ack.identifier || idx} className="flex items-start gap-2 text-xs">
                  <XMarkIcon className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-red-700 dark:text-red-400">
                      {ack.name || "Unknown"}
                    </span>
                    {ack.disagreementReason && (
                      <p className="text-red-600 dark:text-red-400">
                        {t("disagreementReason")}: {ack.disagreementReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            {/* Pending */}
            {task?.assignees
              ?.filter((assignee) => {
                const hasResponded = doc.acknowledgements.some(
                  (ack) =>
                    (ack.hasAgreed === true || ack.hasAgreed === false) &&
                    (ack.identifier === assignee.identifier || ack.name === assignee.name)
                );
                return !hasResponded;
              })
              .map((user) => (
                <div key={user.identifier} className="flex items-center gap-2 text-xs">
                  <ClockIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400">{user.name}</span>
                </div>
              ))}
          </div>

          {isAttendee && !userHasResponded && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAcknowledge(doc.identifier, true)}
                loading={acknowledgingDocId === doc.identifier}
                disabled={acknowledgingDocId === doc.identifier}
              >
                <CheckIcon className="w-4 h-4" />
                {t("agreeDocument")}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDisagreeClick(doc.identifier)}
                disabled={acknowledgingDocId === doc.identifier}
              >
                <XMarkIcon className="w-4 h-4" />
                {t("disagreeDocument")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
