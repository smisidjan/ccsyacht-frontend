"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeftIcon,
  PlusIcon,
  Square3Stack3DIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { CreateStagesModal, StageListItem, StageDetailPanel } from "@/app/features/stages";
import ProgressCircle from "@/app/components/ui/ProgressCircle";
import { useArea, useStages, useProject } from "@/lib/api";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";

export default function AreaDetailPage() {
  const t = useTranslations("areaDetail");
  const tStages = useTranslations("stages");
  const params = useParams();
  const projectId = params.id as string;
  const areaId = params.areaId as string;

  // Get query params for pre-selecting stage
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const stageIdFromQuery = searchParams?.get('stage');

  const { data: project } = useProject(projectId);
  const { data: area, loading: areaLoading, error: areaError } = useArea(projectId, areaId);
  const { data: stages, loading: stagesLoading, error: stagesError, refetch: refetchStages, updateStage, updateStageStatus } = useStages(projectId, areaId);
  const { hasPermission } = usePermission();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const canCreateStages = hasPermission(PERMISSIONS.CREATE_STAGES);
  const canEditStages = hasPermission(PERMISSIONS.EDIT_STAGES);

  const loading = areaLoading || stagesLoading;
  const error = areaError || stagesError;

  // Calculate progress
  const completedStages = stages?.filter(s => s.status.name === "completed").length || 0;
  const totalStages = stages?.length || 0;
  const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  // Auto-select stage from query param or first stage when stages load
  useEffect(() => {
    if (stages && stages.length > 0 && !selectedStageId) {
      // If stage ID is in query params, try to select it
      if (stageIdFromQuery) {
        const stageExists = stages.find(s => s.identifier === stageIdFromQuery);
        if (stageExists) {
          setSelectedStageId(stageIdFromQuery);
          return;
        }
      }
      // Otherwise select first stage
      setSelectedStageId(stages[0].identifier);
    }
  }, [stages, selectedStageId, stageIdFromQuery]);

  // Get selected stage
  const selectedStage = stages?.find(s => s.identifier === selectedStageId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            {project && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {project.name}
              </p>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {area?.name || t("loading")}
            </h1>
            {area?.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {area.description}
              </p>
            )}
          </div>
        </div>
        {canCreateStages && !loading && stages?.length === 0 && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusIcon className="w-4 h-4" />
            {tStages("bulkCreate")}
          </Button>
        )}
      </div>

      {/* Area Info Card */}
      {area && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
          <div className="flex items-center gap-8">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MapPinIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("deck")}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {area.containedInPlace?.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("totalStages")}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {area.stageCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("progress")}</p>
                <div className="flex items-center gap-3">
                  <ProgressCircle percentage={progress} size={64} strokeWidth={6} />
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {completedStages}/{totalStages}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("completed")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert
          type="error"
          message={error.message || t("loadError")}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Stages Master-Detail Layout */}
      {!loading && !error && stages && (
        <>
          {stages.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <Square3Stack3DIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t("noStages")}
              </p>
              {canCreateStages && (
                <Button
                  variant="primary"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4"
                >
                  <PlusIcon className="w-4 h-4" />
                  {t("createFirstStage")}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Stages List */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("stages")} ({stages.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stages.map((stage) => (
                      <StageListItem
                        key={stage.identifier}
                        stage={stage}
                        isSelected={selectedStageId === stage.identifier}
                        onClick={() => setSelectedStageId(stage.identifier)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Stage Detail Panel */}
              <div className="lg:col-span-2">
                {selectedStage ? (
                  <StageDetailPanel
                    stage={selectedStage}
                    projectId={projectId}
                    canEdit={canEditStages}
                    onUpdate={async (data) => {
                      await updateStage(selectedStage.identifier, data);
                      refetchStages();
                    }}
                    onUpdateStatus={async (status) => {
                      await updateStageStatus(selectedStage.identifier, { status });
                      await refetchStages();
                    }}
                    onRefetch={refetchStages}
                  />
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t("selectStage")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Stages Modal */}
      <CreateStagesModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId}
        areaId={areaId}
        onSuccess={() => {
          refetchStages();
        }}
      />
    </div>
  );
}
