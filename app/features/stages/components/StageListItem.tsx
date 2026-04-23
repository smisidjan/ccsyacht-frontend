"use client";

import { useTranslations } from "next-intl";
import type { Stage } from "@/lib/api/types";

interface StageListItemProps {
  stage: Stage;
  isSelected: boolean;
  onClick: () => void;
}

const statusColors = {
  not_started: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  in_progress: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  pending_signoff: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function StageListItem({
  stage,
  isSelected,
  onClick,
}: StageListItemProps) {
  const t = useTranslations("areaDetail");

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-5 transition-colors ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600"
          : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3
            className={`text-sm font-semibold truncate ${
              isSelected
                ? "text-blue-900 dark:text-blue-100"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {stage.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                statusColors[stage.status.name as keyof typeof statusColors]
              }`}
            >
              {t(`status.${stage.status.name}`)}
            </span>
            {stage.requiresReleaseForm && (
              <span className="text-xs text-blue-600 dark:text-blue-400">
                📋
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
