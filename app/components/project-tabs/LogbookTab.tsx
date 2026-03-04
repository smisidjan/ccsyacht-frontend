"use client";

import { useTranslations } from "next-intl";
import { UserCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useLogbook } from "@/lib/api";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";

interface LogbookTabProps {
  projectId: string;
}

export default function LogbookTab({ projectId }: LogbookTabProps) {
  const t = useTranslations("projectDetail.logbook");
  const { data: entries, loading, error } = useLogbook(projectId, { per_page: 50 });

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Format action name to readable text
  const formatActionName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (loading) {
    return <LoadingSkeleton type="list" rows={5} />;
  }

  if (error) {
    return <Alert type="error" message={error.message || t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle", { count: entries?.length || 0 })}
          </p>
        </div>
      </div>

      {/* Log Entries Timeline */}
      {entries && entries.length > 0 ? (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.identifier}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <UserCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {formatActionName(entry.name)}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <ClockIcon className="w-3 h-3" />
                      {formatDate(entry.startTime)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {entry.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                    <span className="font-medium">{entry.agent.name}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <ClockIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t("noEntries")}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            {t("noEntriesDescription")}
          </p>
        </div>
      )}
    </div>
  );
}
