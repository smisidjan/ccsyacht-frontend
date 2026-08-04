"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useStageReleaseForms } from "@/lib/api";

interface ReleaseFormsBadgeProps {
  projectId: string;
  /** Active stage to count release forms for. */
  stageId: string;
  /** Bumped by ancestors when a release form is created / deleted so
   *  the badge can refetch without remounting. */
  refreshTrigger?: number;
}

/** Stats card for the active stage's release forms: how many have
 *  been generated so far. Rendered next to the punchlist card. Always
 *  shows — explicit "0 uploaded" reads better than a missing slot. */
export default function ReleaseFormsBadge({
  projectId,
  stageId,
  refreshTrigger,
}: ReleaseFormsBadgeProps) {
  const t = useTranslations("areaDetail");
  const { data, loading, refetch } = useStageReleaseForms(projectId, stageId);

  useEffect(() => {
    if (refreshTrigger === undefined || refreshTrigger === 0) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  if (loading && data === null) {
    return (
      <div className="h-[88px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    );
  }

  const count = data?.length ?? 0;

  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-xl border bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-sm">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-full flex-shrink-0 bg-blue-100 dark:bg-blue-900/40">
        <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide mb-0.5 text-gray-400 dark:text-gray-500">
          {t("releaseForms")}
        </p>
        <p className="text-2xl font-bold leading-none text-gray-900 dark:text-white">
          {count}
        </p>
        <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">
          {t("releaseFormsUploadedCount", { count })}
        </p>
      </div>
    </div>
  );
}
