"use client";

import { useTranslations } from "next-intl";
import {
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { PendingDocumentsProps } from "./types";

export default function PendingDocumentsSection({
  requiredPendingDocs,
  requestedPendingDocs,
}: PendingDocumentsProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");

  if (requiredPendingDocs.length === 0 && requestedPendingDocs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
        {t("pendingDocuments")}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("pendingDocumentsDescription")}
      </p>

      <div className="space-y-2">
        {/* Required documents (not assigned - blocking) */}
        {requiredPendingDocs.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
              {t("requiredBlocking")}
            </span>
            {requiredPendingDocs.map((doc) => (
              <div
                key={doc.identifier}
                className="flex items-center justify-between py-1.5 px-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded"
              >
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-xs text-gray-900 dark:text-white">
                    {doc.name}
                  </span>
                </div>
                <span className="text-xs text-red-600 dark:text-red-400">
                  {t("notUploaded")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Requested documents (assigned - not blocking) */}
        {requestedPendingDocs.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              {t("requestedPending")}
            </span>
            {requestedPendingDocs.map((doc) => (
              <div
                key={doc.identifier}
                className="flex items-center justify-between py-1.5 px-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ClockIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-xs text-gray-900 dark:text-white truncate">
                    {doc.name}
                    <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
                      · {doc.assignees?.[0]?.name || ""}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {doc.dueDate && (
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      {new Date(doc.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
