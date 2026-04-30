"use client";

import { useTranslations } from "next-intl";
import {
  CheckIcon,
  ClockIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { DocumentStatsProps } from "./types";

export default function DocumentStatsSection({
  documentStats,
  progress,
  pendingDocuments,
  requiredPendingDocs,
  requestedPendingDocs,
  taskStatus,
  hasRequiredDocuments,
}: DocumentStatsProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");

  const shouldShow =
    (documentStats || progress || pendingDocuments.length > 0) &&
    (taskStatus === "scheduled" || hasRequiredDocuments || pendingDocuments.length > 0);

  if (!shouldShow) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
      {/* Pending Uploads */}
      {pendingDocuments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("pendingUploads")}
            </span>
            <span className="text-xs text-gray-500">
              {pendingDocuments.length} {t("documentsTotal")}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {requiredPendingDocs.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                {requiredPendingDocs.length} {t("requiredMissing")}
              </span>
            )}
            {requestedPendingDocs.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <ClockIcon className="w-3.5 h-3.5" />
                {requestedPendingDocs.length} {t("requestedPendingShort")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Document Acknowledgement Status */}
      {documentStats && documentStats.total > 0 && (
        <div
          className={`space-y-2 ${
            pendingDocuments.length > 0
              ? "pt-2 border-t border-gray-200 dark:border-gray-700"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("documentStatus")}
            </span>
            <span className="text-xs text-gray-500">
              {documentStats.total} {t("documentsTotal")}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {documentStats.needsUserAction > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <ClockIcon className="w-3.5 h-3.5" />
                {documentStats.needsUserAction} {t("needsYourAction")}
              </span>
            )}
            {documentStats.disputed > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                <XMarkIcon className="w-3.5 h-3.5" />
                {documentStats.disputed} {t("disputed")}
              </span>
            )}
            {documentStats.pendingOthers > 0 &&
              documentStats.pendingOthers !== documentStats.needsUserAction && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <ClockIcon className="w-3.5 h-3.5" />
                  {documentStats.pendingOthers} {t("pendingOthers")}
                </span>
              )}
            {documentStats.completed > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                <CheckIcon className="w-3.5 h-3.5" />
                {documentStats.completed} {t("completed")}
              </span>
            )}
            {documentStats.completed === documentStats.total &&
              documentStats.disputed === 0 && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium ml-1">
                  ✓ {t("allDocumentsAcknowledged")}
                </span>
              )}
          </div>
        </div>
      )}

      {/* Meeting Document Sign-off Progress */}
      {progress && taskStatus === "scheduled" && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("meetingDocumentSignoff")}
            </span>
          </div>
          <span
            className={`text-sm font-semibold ${
              progress.signatures.count === progress.signatures.total
                ? "text-green-600"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {progress.signatures.count}/{progress.signatures.total}
          </span>
        </div>
      )}
    </div>
  );
}
