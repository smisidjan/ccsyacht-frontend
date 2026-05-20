"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import StageDetailPanel from "./StageDetailPanel";
import type { Stage } from "@/lib/api/types";

export type TimelineMode = "completed" | "active" | "upcoming";

interface StageTimelineItemProps {
  stage: Stage;
  mode: TimelineMode;
  isLast?: boolean;
  // Props forwarded to StageDetailPanel when the row is expanded
  projectId: string;
  areaId: string;
  canEdit: boolean;
  onRefetch: () => Promise<void>;
  onPunchlistChange?: () => void;
}

const statusBadgeColors = {
  not_started: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  in_progress: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  pending_signoff: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function StageTimelineItem({
  stage,
  mode,
  isLast,
  projectId,
  areaId,
  canEdit,
  onRefetch,
  onPunchlistChange,
}: StageTimelineItemProps) {
  const t = useTranslations("areaDetail");
  const [isExpanded, setIsExpanded] = useState(false);

  const color = stage.color || "#9ca3af";
  const isCompletedMode = mode === "completed";
  const isActiveMode = mode === "active";
  const isUpcomingMode = mode === "upcoming";
  // Only completed steps can be opened for history review. Upcoming is
  // intentionally non-interactive — the user has nothing to do there yet.
  const canToggle = isCompletedMode;
  const detailProps = {
    stage,
    projectId,
    areaId,
    canEdit,
    onRefetch,
    onPunchlistChange,
  };

  const compactHeader = (
    <button
      type="button"
      onClick={canToggle ? () => setIsExpanded((x) => !x) : undefined}
      disabled={!canToggle}
      aria-expanded={canToggle ? isExpanded : undefined}
      className={`w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${
        canToggle
          ? "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer shadow-sm"
          : "cursor-default opacity-75"
      }`}
    >
      <span
        className="inline-block w-3 h-3 rounded-sm flex-shrink-0 border border-gray-200 dark:border-gray-600"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <h3
        className={`flex-1 text-sm font-semibold truncate ${
          isUpcomingMode
            ? "text-gray-500 dark:text-gray-400"
            : "text-gray-900 dark:text-white"
        }`}
      >
        {stage.name}
      </h3>
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
          statusBadgeColors[stage.status.name as keyof typeof statusBadgeColors]
        }`}
      >
        {t(`status.${stage.status.name}`)}
      </span>
      {canToggle && (
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      )}
    </button>
  );

  return (
    <div className="flex gap-4">
      {/* Rail: marker + connector to the next item */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div
          className={`flex items-center justify-center rounded-full mt-3 ${
            isActiveMode ? "w-9 h-9" : "w-7 h-7"
          } ${
            isUpcomingMode
              ? "border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              : ""
          }`}
          style={
            isUpcomingMode
              ? undefined
              : {
                  backgroundColor: color,
                  boxShadow: isActiveMode ? `0 0 0 4px ${color}33` : undefined,
                }
          }
          aria-hidden="true"
        >
          {isCompletedMode && (
            <CheckIcon className="w-4 h-4 text-white" strokeWidth={3} />
          )}
        </div>
        {!isLast && (
          <div className="flex-1 w-0.5 bg-gray-200 dark:bg-gray-700 my-2 min-h-[16px]" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isLast ? "" : "pb-6"}`}>
        {isActiveMode ? (
          <StageDetailPanel {...detailProps} />
        ) : (
          <div className="space-y-3">
            {compactHeader}
            {isCompletedMode && isExpanded && <StageDetailPanel {...detailProps} />}
          </div>
        )}
      </div>
    </div>
  );
}
