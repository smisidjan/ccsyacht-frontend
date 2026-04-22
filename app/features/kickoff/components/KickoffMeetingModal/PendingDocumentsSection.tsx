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
          <div className="space-y-2">
            <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
              {t("requiredBlocking")}
            </span>
            {requiredPendingDocs.map((doc) => (
              <div
                key={doc.identifier}
                className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {doc.name}
                  </span>
                </div>
                <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">
                  {t("notUploaded")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Requested documents (assigned - not blocking) */}
        {requestedPendingDocs.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              {t("requestedPending")}
            </span>
            {requestedPendingDocs.map((doc) => (
              <div
                key={doc.identifier}
                className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ClockIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                      {doc.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t("assignedTo", { name: doc.assignees?.[0]?.name || "" })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                    {t("requested")}
                  </span>
                  {doc.dueDate && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      {t("dueBy", {
                        date: new Date(doc.dueDate).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" }
                        ),
                      })}
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
