"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "@heroicons/react/24/outline";
import AreaCard from "@/app/components/ui/AreaCard";
import type { Area as AreaCardData } from "@/app/components/ui/AreaCard";
import SetupTaskCard from "@/app/components/ui/SetupTaskCard";
import type { SetupTask } from "@/app/components/ui/SetupTaskCard";
import type { ProjectStatus } from "@/app/components/ui/StatusBadge";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import CreateAreaModal from "@/app/components/modals/CreateAreaModal";
import { useAreas } from "@/lib/api";
import { useDocumentTypes } from "@/lib/api/document-types";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { Area } from "@/lib/api/types";

interface OverviewTabProps {
  projectId: string;
  projectStatus: ProjectStatus;
}

export default function OverviewTab({
  projectId,
  projectStatus,
}: OverviewTabProps) {
  const t = useTranslations("projectDetail");
  const { data: areas, loading, error, refetch } = useAreas(projectId);
  const { data: documentTypes, loading: docTypesLoading } = useDocumentTypes(projectId);
  const { hasPermission } = usePermission();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const canCreateAreas = hasPermission(PERMISSIONS.CREATE_AREAS);

  // Generate setup tasks dynamically based on project data
  const setupTasks = useMemo<SetupTask[]>(() => {
    if (!documentTypes) return [];

    const tasks: SetupTask[] = [];

    // Task 1: Upload Required Documents
    const requiredDocTypes = documentTypes.filter((type) => type.isRequired);
    const allRequiredDocsUploaded = requiredDocTypes.every((type) => type.documentCount > 0);

    // Build description based on completion status
    let uploadDocsDescription: string;
    if (allRequiredDocsUploaded) {
      // When completed: show all required document types
      const allDocTypesList = requiredDocTypes.map((type) => type.name).join(", ");
      uploadDocsDescription = requiredDocTypes.length > 0
        ? `Upload all required project documentation: ${allDocTypesList}`
        : t("setupTasks.uploadDocuments.description");
    } else {
      // When pending: show only missing document types
      const missingDocTypes = requiredDocTypes.filter((type) => type.documentCount === 0);
      const missingDocTypesList = missingDocTypes.map((type) => type.name).join(", ");
      uploadDocsDescription = missingDocTypes.length > 0
        ? `Upload the following required documents: ${missingDocTypesList}`
        : t("setupTasks.uploadDocuments.description");
    }

    tasks.push({
      id: "upload-documents",
      title: t("setupTasks.uploadDocuments.title"),
      description: uploadDocsDescription,
      status: allRequiredDocsUploaded ? "completed" : "pending",
      // Only show action button when not completed
      ...(allRequiredDocsUploaded ? {} : {
        actionLabel: t("setupTasks.uploadDocuments.action"),
        actionHref: `/dashboard/projects/${projectId}#documents`,
      }),
    });

    // Task 2: Add Project Members (backend endpoint not ready yet)
    // For now, always show as pending
    tasks.push({
      id: "add-members",
      title: t("setupTasks.addMembers.title"),
      description: t("setupTasks.addMembers.description"),
      status: "pending",
      actionLabel: t("setupTasks.addMembers.action"),
      actionHref: `/dashboard/projects/${projectId}#members`,
    });

    // Task 3: Add Default Signers (backend endpoint not ready yet)
    // For now, always show as pending
    tasks.push({
      id: "add-signers",
      title: t("setupTasks.addSigners.title"),
      description: t("setupTasks.addSigners.description"),
      status: "pending",
      actionLabel: t("setupTasks.addSigners.action"),
      actionHref: `/dashboard/projects/${projectId}#signers`,
    });

    return tasks;
  }, [documentTypes, projectId, t]);

  const pendingTasksCount = setupTasks.filter((task) => task.status === "pending").length;
  const allSetupTasksComplete = pendingTasksCount === 0;

  // Map API Area to AreaCard Area format
  const mapAreaToCardData = (area: Area): AreaCardData => ({
    id: area.identifier,
    name: area.name,
    description: area.description,
    areasCount: 0, // Not applicable for areas, will be removed from card
    stagesCount: area.stageCount,
    completedCount: 0, // TODO: Calculate from stages when available
    inProgressCount: 0, // TODO: Calculate from stages when available
    progress: 0, // TODO: Calculate from stages when available
  });

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    refetch();
  };

  return (
    <div className="space-y-8">
      {/* Setup Tasks Section (only shown for projects in setup status with pending tasks) */}
      {projectStatus === "setup" && setupTasks.length > 0 && !allSetupTasksComplete && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("setupTasks.title")}
            </h2>
            {pendingTasksCount > 0 && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                {t("setupTasks.pendingCount", { count: pendingTasksCount })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {setupTasks.map((task) => (
              <SetupTaskCard
                key={task.id}
                task={task}
              />
            ))}
          </div>
        </section>
      )}

      {/* Areas Section (hidden during setup until all tasks are complete) */}
      {(projectStatus !== "setup" || allSetupTasksComplete) && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("areasSection.title")}
            </h2>
            {canCreateAreas && (
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4" />
                {t("areasSection.createArea")}
              </Button>
            )}
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 animate-pulse"
                >
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-4" />
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <Alert
              type="error"
              message={error.message || t("areasSection.loadError")}
            />
          )}

          {!loading && !error && areas && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {areas.map((area) => (
                  <AreaCard
                    key={area.identifier}
                    area={mapAreaToCardData(area)}
                    projectId={projectId}
                  />
                ))}
              </div>
              {areas.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                  {t("areasSection.noAreas")}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Create Area Modal */}
      {isCreateModalOpen && (
        <CreateAreaModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          projectId={projectId}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
