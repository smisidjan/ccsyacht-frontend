"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import CreateRemarkModal from "@/app/components/modals/CreateRemarkModal";
import RemarkCard from "./RemarkCard";
import { useStageRemarks } from "@/lib/api/stage-remarks";
import type { StageStatus } from "@/lib/api/types";

interface RemarksListProps {
  projectId: string;
  stageId: string;
  stageStatus: StageStatus;
}

export default function RemarksList({ projectId, stageId, stageStatus }: RemarksListProps) {
  const t = useTranslations("stageRemarks");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: remarks, loading, error, refetch } = useStageRemarks(
    projectId,
    stageId,
    {
      include_replies: true,
    }
  );

  const isStageInProgress = stageStatus === "in_progress";

  // Only show top-level remarks (those without a parent)
  const topLevelRemarks = remarks?.filter((r) => !r.parentComment) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h3>
          {remarks && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({remarks.length})
            </span>
          )}
        </div>
        {isStageInProgress && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusIcon className="w-4 h-4" />
            {t("createRemark")}
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert
          type="error"
          message={error.message || t("loadError")}
        />
      )}

      {/* Remarks List */}
      {!loading && !error && remarks && (
        <>
          {topLevelRemarks.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {t("noRemarks")}
              </p>
              {isStageInProgress && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {t("noRemarksHint")}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {topLevelRemarks.map((remark) => (
                <RemarkCard
                  key={remark.identifier}
                  remark={remark}
                  projectId={projectId}
                  onUpdate={refetch}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <CreateRemarkModal
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
