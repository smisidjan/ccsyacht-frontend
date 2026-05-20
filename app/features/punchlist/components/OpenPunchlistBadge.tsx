"use client";

import { useTranslations } from "next-intl";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { usePunchlistItems } from "@/lib/api/punchlist-items";

interface OpenPunchlistBadgeProps {
  projectId: string;
  /** Stage to count open punchlist items for. Typically the area's
   *  currently-active stage. */
  stageId: string;
}

/** Tiny stat badge showing how many "open" punchlist items the active
 *  stage has. Rendered in the area detail's top strip so the user sees
 *  the outstanding workload without expanding the stage. Hidden when
 *  the count is zero — no badge is better than a "0" badge. */
export default function OpenPunchlistBadge({
  projectId,
  stageId,
}: OpenPunchlistBadgeProps) {
  const t = useTranslations("areaDetail");
  const { pagination, loading } = usePunchlistItems(projectId, stageId, {
    status: "open",
    per_page: 1,
  });

  if (loading) {
    return (
      <div className="h-16 w-32 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
    );
  }

  const count = pagination?.total ?? 0;
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <div>
        <p className="text-lg font-semibold text-amber-900 dark:text-amber-100 leading-none">
          {count}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          {t("openPunchlist")}
        </p>
      </div>
    </div>
  );
}
