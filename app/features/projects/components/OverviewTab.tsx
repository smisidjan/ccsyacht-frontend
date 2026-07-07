"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { AreaCard, DefineAreaModal, type Area as AreaCardData } from "@/app/features/areas";
import SetupTaskCard from "./SetupTaskCard";
import type { ProjectStatus } from "@/app/components/ui/StatusBadge";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { KickoffMeetingModal, KickoffSchedulingModal, KickoffScheduledCard } from "@/app/features/kickoff";
import { CreateDeckModal } from "@/app/features/decks";
import { useAreas, setupTasksApi } from "@/lib/api";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { useDecks } from "@/lib/api/decks";
import { useDocumentTypes } from "@/lib/api/document-types";
import type { SetupTask } from "@/lib/api/types";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useGAImage } from "@/lib/hooks/useGAImage";
import { useRealtimeAreas, useRealtimeProject } from "@/lib/hooks/useRealtimeProject";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { projectsApi } from "@/lib/api/client";
import { useToast } from "@/app/context/ToastContext";
import type { Area, GeneralArrangement } from "@/lib/api/types";
import { handleError } from "@/lib/utils/errors";

interface OverviewTabProps {
  projectId: string;
  projectStatus: ProjectStatus;
  onProjectUpdate?: () => void;
  generalArrangement?: GeneralArrangement;
}

export default function OverviewTab({
  projectId,
  projectStatus,
  onProjectUpdate,
  generalArrangement,
}: OverviewTabProps) {
  const t = useTranslations("projectDetail");
  const { data: areas, loading: rawLoading, error, refetch } = useAreas(projectId);
  const { hasPermission } = usePermission();
  const { showToast } = useToast();
  const { currentUser } = useCurrentUserContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isKickoffModalOpen, setIsKickoffModalOpen] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isDeckEditMode, setIsDeckEditMode] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [selectedDeckId, setSelectedDeckId] = useState<string>("all");
  const [isDeckFilterOpen, setIsDeckFilterOpen] = useState(false);
  const hasUpdatedStatusRef = useRef(false);
  const deckFilterRef = useRef<HTMLDivElement>(null);

  const loading = useMinimumLoadingTime(rawLoading);
  const canCreateAreas = hasPermission(PERMISSIONS.CREATE_AREAS);
  const canEditProject = hasPermission(PERMISSIONS.EDIT_PROJECTS);

  // Fetch decks for edit mode
  const { data: decks, refetch: refetchDecks } = useDecks(projectId);

  // Fetch document types for setup task description (include assignees for blocking logic)
  const { data: documentTypes } = useDocumentTypes(projectId, { includeAssignees: true });

  // GA Image for deck modal
  const gaImageUrl = generalArrangement?.imageUrl
    ? (process.env.NEXT_PUBLIC_API_URL || "/api").startsWith("/")
      ? new URL(generalArrangement.imageUrl).pathname
      : generalArrangement.imageUrl
    : undefined;
  const { imageBlobUrl: gaBlobUrl } = useGAImage(gaImageUrl);

  // Setup tasks state
  const [setupTasks, setSetupTasks] = useState<SetupTask[]>([]);

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

  // Fetch setup tasks from backend
  useEffect(() => {
    async function fetchSetupTasks() {
      try {
        const response = await setupTasksApi.getAll(projectId);
        setSetupTasks(response.data || []);
      } catch (error) {
        handleError(error, { severity: "console", context: "Loading setup tasks" });
        setSetupTasks([]);
      }
    }

    if (projectStatus === "setup") {
      fetchSetupTasks();
    }
  }, [projectId, projectStatus]);

  // Filter tasks based on user permission
  const visibleSetupTasks = useMemo(() => {
    if (!currentUser) return [];

    // Users with edit permission see all tasks
    if (canEditProject) return setupTasks;

    // Other users only see tasks where they are assignees
    // For kickoff_meeting: only show after invitations are sent (actionStatus !== "pending")
    return setupTasks.filter(task => {
      const isAssignee = task.assignees?.some(assignee => assignee.identifier === currentUser.identifier);
      if (!isAssignee) return false;

      // For kickoff meeting, only show after invitations are sent
      if (task.additionalType === "kickoff_meeting" && task.actionStatus === "pending") {
        return false;
      }

      return true;
    });
  }, [setupTasks, currentUser, canEditProject]);

  // Check if all required documents are uploaded (for kickoff meeting blocking)
  // Only documents that are required AND not assigned to anyone block the kickoff
  const requiredDocs = documentTypes?.filter(dt => dt.isRequired) || [];
  const requiredNotAssignedDocs = requiredDocs.filter(doc => !doc.assignees || doc.assignees.length === 0);
  const allRequiredDocsUploaded = requiredNotAssignedDocs.length === 0 || requiredNotAssignedDocs.every(doc => doc.documentCount > 0);

  // Check if members have been added
  const addMembersTask = visibleSetupTasks.find(t => t.additionalType === "add_members");
  const membersAdded = addMembersTask ? (addMembersTask.isComplete || addMembersTask.actionStatus === "completed") : true;

  // Count blocked tasks (kickoff meetings without required docs OR without members)
  const blockedTasksCount = visibleSetupTasks.filter((task) => {
    const isCompleted = task.isComplete || task.actionStatus === "completed";
    return task.additionalType === "kickoff_meeting" && !isCompleted && (!allRequiredDocsUploaded || !membersAdded);
  }).length;

  const completedTasksCount = visibleSetupTasks.filter((task) => task.isComplete || task.actionStatus === "completed").length;
  const pendingTasksCount = visibleSetupTasks.filter((task) => {
    const isCompleted = task.isComplete || task.actionStatus === "completed";
    const isBlocked = task.additionalType === "kickoff_meeting" && !isCompleted && (!allRequiredDocsUploaded || !membersAdded);
    return !isCompleted && !isBlocked;
  }).length;
  const allSetupTasksComplete = (pendingTasksCount + blockedTasksCount) === 0 && visibleSetupTasks.length > 0;

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
          await projectsApi.activate(projectId);
          showToast("success", t("setupTasks.statusUpdated"));
          // Notify parent component to refetch project data
          if (onProjectUpdate) {
            onProjectUpdate();
          }
        } catch (error) {
          hasUpdatedStatusRef.current = false;
          handleError(error, { showToast, fallbackMessage: t("setupTasks.statusUpdateFailed") });
        }
      }
    }

    updateProjectStatus();
  }, [canEditProject, projectStatus, allSetupTasksComplete, setupTasks.length, projectId, onProjectUpdate, showToast, t]);

  // Map API Area to AreaCard Area format
  const mapAreaToCardData = (area: Area): AreaCardData => {
    // Use aggregate counts from backend if available, otherwise calculate from stages data
    let completedCount = 0;
    let inProgressCount = 0;
    let progress = 0;

    if (area.completedStageCount !== undefined || area.inProgressStageCount !== undefined) {
      // Backend provides aggregate counts - use them directly
      completedCount = area.completedStageCount || 0;
      inProgressCount = area.inProgressStageCount || 0;
      progress = area.stageCount > 0
        ? Math.round((completedCount / area.stageCount) * 100)
        : 0;
    } else if (area.containsPlace && area.containsPlace.length > 0) {
      // Fall back to calculating from embedded stage data
      const stages = area.containsPlace;
      completedCount = stages.filter(s => s.status.name === "completed").length;
      inProgressCount = stages.filter(s =>
        s.status.name === "in_progress" || s.status.name === "pending_signoff"
      ).length;
      progress = stages.length > 0
        ? Math.round((completedCount / stages.length) * 100)
        : 0;
    }

    return {
      id: area.identifier,
      name: area.name,
      description: area.description,
      deckName: area.containedInPlace?.name,
      areasCount: 0, // Not applicable for areas
      stagesCount: area.stageCount,
      completedCount,
      inProgressCount,
      progress,
    };
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleViewTaskDetails = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsKickoffModalOpen(true);
  };

  const handleKickoffModalClose = () => {
    setIsKickoffModalOpen(false);
    setSelectedTaskId("");
    // Refetch setup tasks to get latest status (e.g., completed)
    handleTaskUpdate();
  };

  const handleTaskUpdate = async () => {
    // Refetch setup tasks when kickoff meeting is updated
    if (projectStatus === "setup") {
      try {
        const response = await setupTasksApi.getAll(projectId);
        setSetupTasks(response.data || []);
      } catch (error) {
        handleError(error, { severity: "console", context: "Reloading setup tasks" });
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Setup Tasks Section (shown to users with edit permission OR users assigned to tasks) */}
      {projectStatus === "setup" && visibleSetupTasks.length > 0 && !allSetupTasksComplete && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("setupTasks.title")}
            </h2>
            <div className="flex items-center gap-3 text-sm">
              {completedTasksCount > 0 && (
                <span className="text-green-600 dark:text-green-400">
                  {t("setupTasks.completedCount", { count: completedTasksCount })}
                </span>
              )}
              {pendingTasksCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {t("setupTasks.pendingCount", { count: pendingTasksCount })}
                </span>
              )}
              {blockedTasksCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {t("setupTasks.blockedCount", { count: blockedTasksCount })}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleSetupTasks.map((task) => {
              const isScheduledKickoff =
                task.additionalType === "kickoff_meeting" &&
                (task.actionStatus === "scheduled" || task.actionStatus === "completed");

              if (isScheduledKickoff) {
                return (
                  <KickoffScheduledCard
                    key={task.identifier}
                    task={task}
                    projectId={projectId}
                    onOpen={handleViewTaskDetails}
                  />
                );
              }

              return (
                <SetupTaskCard
                  key={task.identifier}
                  task={task}
                  documentTypes={documentTypes || undefined}
                  allTasks={visibleSetupTasks}
                  onViewDetails={handleViewTaskDetails}
                  onDefineDecks={() => {
                    setIsDeckEditMode(false);
                    setIsDeckModalOpen(true);
                  }}
                  onViewDecks={() => {
                    setIsDeckEditMode(true);
                    setIsDeckModalOpen(true);
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Info message for users without edit permission while the project is
          still in setup. Shown both when they have no visible tasks at all and
          when they've finished their own tasks but the project hasn't been
          activated yet (e.g. Define decks is still open elsewhere). */}
      {projectStatus === "setup" && !canEditProject &&
        (visibleSetupTasks.length === 0 || allSetupTasksComplete) ? (
        <Alert
          type="info"
          message={t("setupTasks.setupPhaseInfo")}
        />
      ) : (
        // Project content (areas/decks) is gated on the backend-driven status,
        // not the locally-derived allSetupTasksComplete. The local flag only
        // counts *visible* setup tasks, so a guest assignee whose own task is
        // done would see content even when Define decks is still open.
        (projectStatus !== "setup" || (allSetupTasksComplete && canEditProject)) && (
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
              {canCreateAreas && projectStatus !== "archived" && projectStatus !== "completed" && (
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

      {/* Create + Define Area Modal — split-view with GA polygon drawing. */}
      {isCreateModalOpen && (
        <DefineAreaModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          projectId={projectId}
          generalArrangement={generalArrangement}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Kickoff Meeting Modal - Use scheduling modal for pending/awaiting, meeting modal for scheduled/completed */}
      {isKickoffModalOpen && selectedTaskId && (() => {
        const selectedTask = visibleSetupTasks.find(t => t.identifier === selectedTaskId);
        const useSchedulingModal = selectedTask?.actionStatus === "pending" || selectedTask?.actionStatus === "awaiting_responses";

        return useSchedulingModal ? (
          <KickoffSchedulingModal
            isOpen={isKickoffModalOpen}
            onClose={handleKickoffModalClose}
            projectId={projectId}
            taskId={selectedTaskId}
            onUpdate={handleTaskUpdate}
          />
        ) : (
          <KickoffMeetingModal
            isOpen={isKickoffModalOpen}
            onClose={handleKickoffModalClose}
            projectId={projectId}
            taskId={selectedTaskId}
            onUpdate={handleTaskUpdate}
          />
        );
      })()}

      {/* Create/Edit Deck Modal */}
      {isDeckModalOpen && (
        <CreateDeckModal
          isOpen={isDeckModalOpen}
          onClose={() => {
            setIsDeckModalOpen(false);
            setIsDeckEditMode(false);
          }}
          projectId={projectId}
          onSuccess={() => {
            setIsDeckModalOpen(false);
            setIsDeckEditMode(false);
            handleTaskUpdate();
            refetchDecks();
          }}
          gaImageUrl={gaBlobUrl || undefined}
          gaImageWidth={generalArrangement?.imageWidth}
          gaImageHeight={generalArrangement?.imageHeight}
          existingDecks={isDeckEditMode ? (decks || []) : undefined}
          editMode={isDeckEditMode}
        />
      )}
    </div>
  );
}
