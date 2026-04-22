"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import Alert from "@/app/components/ui/Alert";
import Tooltip from "@/app/components/ui/Tooltip";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import CreatePunchlistItemModal from "@/app/components/modals/CreatePunchlistItemModal";
import PunchlistItemCard from "./PunchlistItemCard";
import { usePunchlistItems } from "@/lib/api/punchlist-items";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { PunchlistItemStatus, StageStatus } from "@/lib/api/types";

interface PunchlistListProps {
  projectId: string;
  stageId: string;
  stageStatus: StageStatus;
}

export default function PunchlistList({ projectId, stageId, stageStatus }: PunchlistListProps) {
  const t = useTranslations("punchlist");
  const { hasPermission } = usePermission();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | PunchlistItemStatus>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: items, loading, error, pagination, refetch } = usePunchlistItems(
    projectId,
    stageId,
    {
      page: currentPage,
      per_page: 5,
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    }
  );

  const canCreate = hasPermission(PERMISSIONS.CREATE_PUNCHLIST_ITEMS);
  const canView = hasPermission(PERMISSIONS.VIEW_PUNCHLIST_ITEMS);
  const isStageInProgress = stageStatus === "in_progress";

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  if (!canView) {
    return (
      <Alert
        type="info"
        message="You don't have permission to view punchlist items."
      />
    );
  }

  // Show loading skeleton for entire section when loading
  if (loading) {
    return <LoadingSkeleton type="list" rows={5} />;
  }

  // Note: Counts are calculated from current page only when filter is active
  // This is a limitation of the current pagination implementation
  const openCount = items?.filter((i) => i.status === "open").length || 0;
  const inProgressCount = items?.filter((i) => i.status === "in_progress").length || 0;
  const doneCount = items?.filter((i) => i.status === "done").length || 0;
  const cancelledCount = items?.filter((i) => i.status === "cancelled").length || 0;

  return (
    <div className="space-y-8">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h3>
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ClockIcon className="w-4 h-4" />
              {t("openItems", { count: openCount })}
            </span>
            <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {inProgressCount} {t("statusInProgress").toLowerCase()}
            </span>
            <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircleIcon className="w-4 h-4" />
              {t("completedItems", { count: doneCount })}
            </span>
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <XCircleIcon className="w-4 h-4" />
              {t("cancelledItems", { count: cancelledCount })}
            </span>
          </div>
        </div>
        {canCreate && isStageInProgress && (
          <Tooltip content={t("createItem")} position="left">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-8">
        {[
          { key: "all" as const, label: t("filterAll") },
          { key: "open" as const, label: t("filterOpen") },
          { key: "in_progress" as const, label: t("filterInProgress") },
          { key: "done" as const, label: t("filterDone") },
          { key: "cancelled" as const, label: t("filterCancelled") },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === filter.key
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <Alert
          type="error"
          message={error.message || "Failed to load punchlist items"}
        />
      )}

      {/* Items List */}
      {!error && items && (
        <>
          {items.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                {statusFilter === "all"
                  ? t("noPunchlistItems")
                  : `No ${statusFilter.replace("_", " ")} items`}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((item) => (
                <PunchlistItemCard
                  key={item.identifier}
                  item={item}
                  projectId={projectId}
                  stageStatus={stageStatus}
                  onUpdate={refetch}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.lastPage > 1 && (
            <div className="flex items-center justify-between mt-6 px-5 py-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("pagination", {
                  current: pagination.currentPage,
                  total: pagination.lastPage,
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("previousPage")}
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("nextPage")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <CreatePunchlistItemModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          projectId={projectId}
          stageId={stageId}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
