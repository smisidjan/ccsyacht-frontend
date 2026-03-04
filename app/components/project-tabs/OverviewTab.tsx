"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import AreaCard from "@/app/components/ui/AreaCard";
import type { Area as AreaCardData } from "@/app/components/ui/AreaCard";
import SetupTaskCard from "@/app/components/ui/SetupTaskCard";
import type { SetupTask } from "@/app/components/ui/SetupTaskCard";
import type { ProjectStatus } from "@/app/components/ui/StatusBadge";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import CreateAreaModal from "@/app/components/modals/CreateAreaModal";
import { useAreas, useProjectMembers, useProjectSigners } from "@/lib/api";
import { useDocumentTypes } from "@/lib/api/document-types";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useRealtimeAreas, useRealtimeMembers, useRealtimeProject } from "@/lib/hooks/useRealtimeProject";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { projectsApi } from "@/lib/api/client";
import { useToast } from "@/app/context/ToastContext";
import type { Area } from "@/lib/api/types";

interface OverviewTabProps {
  projectId: string;
  projectStatus: ProjectStatus;
  onProjectUpdate?: () => void;
}

export default function OverviewTab({
  projectId,
  projectStatus,
  onProjectUpdate,
}: OverviewTabProps) {
  const t = useTranslations("projectDetail");
  const { data: areas, loading: rawLoading, error, refetch } = useAreas(projectId);
  const { data: documentTypes, loading: rawDocTypesLoading } = useDocumentTypes(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: signers } = useProjectSigners(projectId);
  const { hasPermission } = usePermission();
  const { showToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("all");
  const [isDeckFilterOpen, setIsDeckFilterOpen] = useState(false);
  const hasUpdatedStatusRef = useRef(false);
  const deckFilterRef = useRef<HTMLDivElement>(null);

  const loading = useMinimumLoadingTime(rawLoading || rawDocTypesLoading);
  const canCreateAreas = hasPermission(PERMISSIONS.CREATE_AREAS);
  const canEditProject = hasPermission(PERMISSIONS.EDIT_PROJECTS);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deckFilterRef.current && !deckFilterRef.current.contains(event.target as Node)) {
        setIsDeckFilterOpen(false);
      }
    };

    if (isDeckFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDeckFilterOpen]);

  // Get unique decks from areas
  const deckOptions = useMemo(() => {
    if (!areas) return [];

    const uniqueDecks = new Map<string, { id: string; name: string }>();
    uniqueDecks.set("all", { id: "all", name: t("areasSection.allDecks") });

    areas.forEach((area) => {
      if (area.containedInPlace) {
        uniqueDecks.set(area.containedInPlace.identifier, {
          id: area.containedInPlace.identifier,
          name: area.containedInPlace.name,
        });
      }
    });

    return Array.from(uniqueDecks.values());
  }, [areas, t]);

  // Filter areas by selected deck
  const filteredAreas = useMemo(() => {
    if (!areas) return [];
    if (selectedDeckId === "all") return areas;

    return areas.filter((area) => area.containedInPlace?.identifier === selectedDeckId);
  }, [areas, selectedDeckId]);

  // Real-time updates
  useRealtimeProject(projectId, onProjectUpdate);
  useRealtimeAreas(projectId, refetch);
  useRealtimeMembers(projectId, () => {
    // Refetch project data when members change (affects setup tasks)
    if (onProjectUpdate) onProjectUpdate();
  });

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
        actionHref: "#documents",
      }),
    });

    // Task 2: Add Project Members
    // Project creator is automatically added, so check for more than 1 member
    const hasMembersAdded = members && members.length > 1;
    tasks.push({
      id: "add-members",
      title: t("setupTasks.addMembers.title"),
      description: t("setupTasks.addMembers.description"),
      status: hasMembersAdded ? "completed" : "pending",
      ...(hasMembersAdded ? {} : {
        actionLabel: t("setupTasks.addMembers.action"),
        actionHref: "#settings",
      }),
    });

    // Task 3: Add Default Signers
    const hasSignersAdded = signers && signers.length > 0;
    tasks.push({
      id: "add-signers",
      title: t("setupTasks.addSigners.title"),
      description: t("setupTasks.addSigners.description"),
      status: hasSignersAdded ? "completed" : "pending",
      ...(hasSignersAdded ? {} : {
        actionLabel: t("setupTasks.addSigners.action"),
        actionHref: "#settings",
      }),
    });

    return tasks;
  }, [documentTypes, members, signers, projectId, t]);

  const pendingTasksCount = setupTasks.filter((task) => task.status === "pending").length;
  const allSetupTasksComplete = pendingTasksCount === 0;

  // Automatically update project status to "active" when all setup tasks are complete
  useEffect(() => {
    async function updateProjectStatus() {
      // Only update if:
      // 1. User has permission to edit projects
      // 2. Project is in setup status
      // 3. All setup tasks are complete
      // 4. We have setup tasks to check
      // 5. We haven't already updated the status (prevent multiple calls)
      if (
        canEditProject &&
        projectStatus === "setup" &&
        allSetupTasksComplete &&
        setupTasks.length > 0 &&
        !hasUpdatedStatusRef.current
      ) {
        try {
          hasUpdatedStatusRef.current = true;
          await projectsApi.update(projectId, { status: "active" });
          showToast("success", t("setupTasks.statusUpdated"));
          // Notify parent component to refetch project data
          if (onProjectUpdate) {
            onProjectUpdate();
          }
        } catch (error: any) {
          console.error("Failed to update project status:", error);
          hasUpdatedStatusRef.current = false;
          showToast("error", error.message || t("setupTasks.statusUpdateFailed"));
        }
      }
    }

    updateProjectStatus();
  }, [canEditProject, projectStatus, allSetupTasksComplete, setupTasks.length, projectId, onProjectUpdate, showToast, t]);

  // Map API Area to AreaCard Area format
  const mapAreaToCardData = (area: Area): AreaCardData => ({
    id: area.identifier,
    name: area.name,
    description: area.description,
    deckName: area.containedInPlace?.name, // Add deck name
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
      {/* Setup Tasks Section (only shown for users with edit permission in setup status with pending tasks) */}
      {projectStatus === "setup" && canEditProject && setupTasks.length > 0 && !allSetupTasksComplete && (
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

      {/* Info message for users without edit permission when project is in setup */}
      {projectStatus === "setup" && !canEditProject ? (
        <Alert
          type="info"
          message={t("setupTasks.setupPhaseInfo")}
        />
      ) : (
        (projectStatus !== "setup" || allSetupTasksComplete) && (
          <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("areasSection.title")}
            </h2>
            <div className="flex items-center gap-3">
              {/* Deck Filter */}
              {deckOptions.length > 1 && (
                <div ref={deckFilterRef} className="relative">
                  <button
                    onClick={() => setIsDeckFilterOpen(!isDeckFilterOpen)}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex items-center gap-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-w-[160px]"
                  >
                    <span className="flex-1 text-left">
                      {deckOptions.find((d) => d.id === selectedDeckId)?.name}
                    </span>
                    <ChevronDownIcon
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        isDeckFilterOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isDeckFilterOpen && (
                    <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-96 overflow-auto right-0">
                      {deckOptions.map((deck) => (
                        <button
                          key={deck.id}
                          onClick={() => {
                            setSelectedDeckId(deck.id);
                            setIsDeckFilterOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            selectedDeckId === deck.id
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {selectedDeckId === deck.id && (
                            <span className="mr-2">✓</span>
                          )}
                          {deck.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                {filteredAreas.map((area) => (
                  <AreaCard
                    key={area.identifier}
                    area={mapAreaToCardData(area)}
                    projectId={projectId}
                  />
                ))}
              </div>
              {filteredAreas.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                  {selectedDeckId === "all"
                    ? t("areasSection.noAreas")
                    : t("areasSection.noAreasInDeck")
                  }
                </div>
              )}
            </>
          )}
        </section>
        )
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
