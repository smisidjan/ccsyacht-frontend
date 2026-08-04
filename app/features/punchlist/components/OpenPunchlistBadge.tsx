"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { usePunchlistItems } from "@/lib/api/punchlist-items";

interface OpenPunchlistBadgeProps {
  projectId: string;
  /** Stage to count punchlist items for. Typically the area's
   *  currently-active stage. */
  stageId: string;
  /** Bumped by ancestors when a punchlist item is created / updated /
   *  deleted somewhere down the tree, so the card can refetch its
   *  counts without remounting. */
  refreshTrigger?: number;
}

/** Stats card for the active stage's punchlist: open count alongside
 *  completed count so the user sees both the outstanding workload and
 *  the progress already booked. Rendered in the area detail's top
 *  strip next to the stage-progress card. Always shows — even with
 *  zero items the explicit "0 open" reads better than a blank slot. */
export default function OpenPunchlistBadge({
  projectId,
  stageId,
  refreshTrigger,
}: OpenPunchlistBadgeProps) {
  const t = useTranslations("areaDetail");

  // Two parallel queries — `per_page: 1` keeps the response tiny
  // since we only need `pagination.total` for each status.
  const openQuery = usePunchlistItems(projectId, stageId, {
    status: "open",
    per_page: 1,
  });
  const doneQuery = usePunchlistItems(projectId, stageId, {
    status: "done",
    per_page: 1,
  });

  // Re-fetch when an ancestor signals a change. Skip the first render
  // (the hooks already run on mount).
  useEffect(() => {
    if (refreshTrigger === undefined || refreshTrigger === 0) return;
    openQuery.refetch();
    doneQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const initialLoad =
    (openQuery.loading && openQuery.pagination === null) ||
    (doneQuery.loading && doneQuery.pagination === null);

  if (initialLoad) {
    return (
      <div className="h-[88px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    );
  }

  const openCount = openQuery.pagination?.total ?? 0;
  const doneCount = doneQuery.pagination?.total ?? 0;
  const hasOpen = openCount > 0;

  // Amber when there's outstanding work, neutral otherwise. Keeps the
  // colour signalling consistent with the rest of the punchlist UI.
  const tone = hasOpen
    ? {
        container:
          "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
        chip: "bg-amber-100 dark:bg-amber-900/40",
        icon: "text-amber-600 dark:text-amber-400",
        label: "text-amber-700/80 dark:text-amber-300/80",
        value: "text-amber-900 dark:text-amber-100",
      }
    : {
        container:
          "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700",
        chip: "bg-gray-100 dark:bg-gray-800",
        icon: "text-gray-500 dark:text-gray-400",
        label: "text-gray-400 dark:text-gray-500",
        value: "text-gray-900 dark:text-white",
      };

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-shadow hover:shadow-sm ${tone.container}`}
    >
      <span
        className={`inline-flex items-center justify-center w-11 h-11 rounded-full flex-shrink-0 ${tone.chip}`}
      >
        <ExclamationTriangleIcon className={`w-5 h-5 ${tone.icon}`} />
      </span>
      <div className="min-w-0">
        <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${tone.label}`}>
          {t("punchlistItems")}
        </p>
        <p className={`text-2xl font-bold leading-none ${tone.value}`}>
          {openCount}
        </p>
        <p className={`text-xs mt-1 ${tone.label}`}>
          {t("punchlistOpenCompleted", {
            open: openCount,
            done: doneCount,
          })}
        </p>
      </div>
    </div>
  );
}
