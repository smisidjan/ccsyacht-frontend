"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeftIcon,
  PencilIcon,
  PlusIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { CreateStagesModal, StageTimeline } from "@/app/features/stages";
import { OpenPunchlistBadge } from "@/app/features/punchlist";
import { AreaGAPreview } from "@/app/features/ga/components/shared";
import CreateAndDefineAreaModal from "@/app/features/areas/components/CreateAndDefineAreaModal";
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

  const statusBadgeColors = {
    not_started: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    in_progress: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    pending_signoff: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };

  const { data: project } = useProject(projectId);
  const { data: area, loading: areaLoading, error: areaError, refetch: refetchArea } = useArea(projectId, areaId);
  const { data: stages, loading: stagesLoading, error: stagesError, refetch: refetchStages, updateStage } = useStages(projectId, areaId);
  const { hasPermission } = usePermission();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditAreaOpen, setIsEditAreaOpen] = useState(false);

  const canCreateStages = hasPermission(PERMISSIONS.CREATE_STAGES);
  const canEditStages = hasPermission(PERMISSIONS.EDIT_STAGES);
  const canEditAreas = hasPermission(PERMISSIONS.EDIT_AREAS);

  const loading = areaLoading || stagesLoading;
  const error = areaError || stagesError;

  // Calculate progress
  const completedStages = stages?.filter(s => s.status.name === "completed").length || 0;
  const totalStages = stages?.length || 0;
  const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  // Active stage = first one the team is working on right now: in_progress
  // beats pending_signoff beats first not_started. The mini GA fills the
  // area polygon with this stage's color so the page-level color matches
  // what the GA tab shows.
  const activeStage =
    stages?.find((s) => s.status.name === "in_progress") ??
    stages?.find((s) => s.status.name === "pending_signoff") ??
    stages?.find((s) => s.status.name === "not_started") ??
    null;
  const activeStageColor = activeStage?.color ?? null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0 mt-0.5"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="min-w-0">
            {(project || area?.containedInPlace) && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5 flex-wrap">
                {project && <span className="break-words">{project.name}</span>}
                {project && area?.containedInPlace?.name && (
                  <span className="text-gray-400 dark:text-gray-600">/</span>
                )}
                {area?.containedInPlace?.name && (
                  <span className="break-words">{area.containedInPlace.name}</span>
                )}
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
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6 md:p-8">
          {canEditAreas && (
            <button
              type="button"
              onClick={() => setIsEditAreaOpen(true)}
              className="absolute top-3 right-3 p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              aria-label={t("editArea")}
              title={t("editArea")}
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8 items-center">
            <div className="md:col-span-2">
              <AreaGAPreview
                projectId={projectId}
                areaId={areaId}
                activeStageColor={activeStageColor}
                area={area}
              />
            </div>
            <div className="md:col-span-3 flex flex-col gap-4">
              {activeStage && (
                <div className="flex items-center gap-4 px-5 py-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                  <span
                    className="inline-block w-5 h-5 rounded flex-shrink-0 border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: activeStage.color || "#9ca3af" }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      {t("activeStage")}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {activeStage.name}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded text-xs font-medium flex-shrink-0 ${
                      statusBadgeColors[
                        activeStage.status.name as keyof typeof statusBadgeColors
                      ]
                    }`}
                  >
                    {t(`status.${activeStage.status.name}`)}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 px-5 py-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                  <ProgressCircle percentage={progress} size={88} strokeWidth={8} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      {t("progress")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                      {completedStages}/{totalStages}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t("completed")}
                    </p>
                  </div>
                </div>
                {activeStage && (
                  <OpenPunchlistBadge
                    projectId={projectId}
                    stageId={activeStage.identifier}
                  />
                )}
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
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                {t("stages")} ({stages.length})
              </h2>
              <StageTimeline
                stages={stages}
                projectId={projectId}
                areaId={areaId}
                canEdit={canEditStages}
                onUpdate={async (stageId, data) => {
                  await updateStage(stageId, data);
                  refetchStages();
                }}
                onRefetch={refetchStages}
              />
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

      {/* Edit Area Modal — reuses the create modal in edit mode. Only
          rendered when the user opens it so the leaflet bundle stays
          out of the critical path. */}
      {isEditAreaOpen && (
        <CreateAndDefineAreaModal
          isOpen={isEditAreaOpen}
          onClose={() => setIsEditAreaOpen(false)}
          projectId={projectId}
          generalArrangement={
            project && typeof project.generalArrangement === "object"
              ? project.generalArrangement
              : undefined
          }
          area={area}
          onSuccess={() => {
            refetchArea();
            refetchStages();
            setIsEditAreaOpen(false);
          }}
        />
      )}
    </div>
  );
}
