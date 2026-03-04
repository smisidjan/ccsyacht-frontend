"use client";

import { useState } from "react";
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
import { useArea, useStages } from "@/lib/api";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";

export default function AreaDetailPage() {
  const t = useTranslations("areaDetail");
  const params = useParams();
  const projectId = params.id as string;
  const areaId = params.areaId as string;

  const { data: area, loading: areaLoading, error: areaError } = useArea(projectId, areaId);
  const { data: stages, loading: stagesLoading, error: stagesError } = useStages(projectId, areaId);
  const { hasPermission } = usePermission();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const canCreateStages = hasPermission(PERMISSIONS.CREATE_STAGES);
  const canEditStages = hasPermission(PERMISSIONS.EDIT_STAGES);

  const loading = areaLoading || stagesLoading;
  const error = areaError || stagesError;

  // Group stages by status
  const stagesByStatus = stages?.reduce((acc, stage) => {
    const status = stage.status.name;
    if (!acc[status]) acc[status] = [];
    acc[status].push(stage);
    return acc;
  }, {} as Record<string, typeof stages>) || {};

  return (
    <div className="space-y-6">
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
        {canCreateStages && !loading && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusIcon className="w-4 h-4" />
            {t("createStage")}
          </Button>
        )}
      </div>

      {/* Area Info Card */}
      {area && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-start gap-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MapPinIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("position")}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {area.position}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("totalStages")}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {area.stageCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("deck")}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {area.containedInPlace?.name || "-"}
                </p>
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

      {/* Stages Grid */}
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
            <div className="space-y-6">
              {/* Not Started */}
              {stagesByStatus.not_started && stagesByStatus.not_started.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t("notStarted")} ({stagesByStatus.not_started.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stagesByStatus.not_started.map((stage) => (
                      <StageCard
                        key={stage.identifier}
                        stage={stage}
                        canEdit={canEditStages}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* In Progress */}
              {stagesByStatus.in_progress && stagesByStatus.in_progress.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t("inProgress")} ({stagesByStatus.in_progress.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stagesByStatus.in_progress.map((stage) => (
                      <StageCard
                        key={stage.identifier}
                        stage={stage}
                        canEdit={canEditStages}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed */}
              {stagesByStatus.completed && stagesByStatus.completed.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t("completed")} ({stagesByStatus.completed.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stagesByStatus.completed.map((stage) => (
                      <StageCard
                        key={stage.identifier}
                        stage={stage}
                        canEdit={canEditStages}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Stage Card Component (temporary - can be moved to separate file later)
function StageCard({ stage, canEdit }: { stage: any; canEdit: boolean }) {
  const t = useTranslations("areaDetail");

  const statusColors = {
    not_started: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    in_progress: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {stage.name}
        </h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[stage.status.name as keyof typeof statusColors]}`}>
          {t(`status.${stage.status.name}`)}
        </span>
      </div>

      {stage.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {stage.description}
        </p>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">{t("position")}</span>
          <span className="font-medium text-gray-900 dark:text-white">{stage.position}</span>
        </div>
        {stage.requiresReleaseForm && (
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
              {t("requiresReleaseForm")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
