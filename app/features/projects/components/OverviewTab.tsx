"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, MagnifyingGlassIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { AreaCard, DefineAreaModal, type Area as AreaCardData } from "@/app/features/areas";
import SetupTaskCard from "./SetupTaskCard";
import type { ProjectStatus } from "@/app/components/ui/StatusBadge";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import FilterPopover, { type FilterSection } from "@/app/components/ui/FilterPopover";
import { KickoffSchedulingModal, KickoffScheduledCard } from "@/app/features/kickoff";
import { CreateDeckModal, DeckCard } from "@/app/features/decks";
import { useAreas, setupTasksApi } from "@/lib/api";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { useProjectMembersFromContext } from "@/app/context/ProjectContext";
import { useDecks } from "@/lib/api/decks";
import { useProjectStages } from "@/lib/api/stages";
import { useDocumentTypes } from "@/lib/api/document-types";
import type { SetupTask } from "@/lib/api/types";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useGAImage } from "@/lib/hooks/useGAImage";
import { useRealtimeAreas, useRealtimeProject } from "@/lib/hooks/useRealtimeProject";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { projectsApi } from "@/lib/api/client";
import { useToast } from "@/app/context/ToastContext";
import type { Area, Deck, GeneralArrangement } from "@/lib/api/types";
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
  const { data: projectMembersList } = useProjectMembersFromContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isKickoffModalOpen, setIsKickoffModalOpen] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isDeckEditMode, setIsDeckEditMode] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
  const [selectedStageNames, setSelectedStageNames] = useState<string[]>([]);
  const [selectedProgressStatuses, setSelectedProgressStatuses] = useState<
    string[]
  >([]);
  const [areaSearchQuery, setAreaSearchQuery] = useState("");
  const [areasViewMode, setAreasViewMode] = useState<"area" | "deck">("area");
  const hasUpdatedStatusRef = useRef(false);

  const loading = useMinimumLoadingTime(rawLoading);
  const canCreateAreas = hasPermission(PERMISSIONS.CREATE_AREAS);
  const canEditProject = hasPermission(PERMISSIONS.EDIT_PROJECTS);

  // Fetch decks for edit mode
  const { data: decks, refetch: refetchDecks } = useDecks(projectId);

  // Real stage instances (not just aggregate counts) — the areas list
  // endpoint's `containsPlace` turned out to not reliably carry stages,
  // which silently emptied the "Stage" filter. This is the same
  // project-wide stages fetch the punchlist tab uses, each entry
  // carrying its owning area's id, so it doubles as a real source of
  // "which stages does this area have" for the filter below.
  const { data: projectStages } = useProjectStages(projectId);

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

  // Get unique decks from areas — feeds the "Deck" filter section below.
  const deckOptions = useMemo(() => {
    if (!areas) return [];

    const uniqueDecks = new Map<string, { id: string; name: string }>();
    areas.forEach((area) => {
      if (area.containedInPlace) {
        uniqueDecks.set(area.containedInPlace.identifier, {
          id: area.containedInPlace.identifier,
          name: area.containedInPlace.name,
        });
      }
    });

    return Array.from(uniqueDecks.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [areas]);

  // Every distinct stage name across the project — feeds the "Stage"
  // filter section. Names (not ids) because the same conceptual stage
  // ("Substrate preparation") exists as a separate record per area;
  // grouping by name is what lets the filter answer "which areas have
  // a Priming stage" across the whole project.
  const stageOptions = useMemo(() => {
    const names = new Set<string>();
    (projectStages ?? []).forEach((s) => names.add(s.name));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [projectStages]);

  // Area id → set of its stage names, derived from the same
  // project-wide stages fetch (`area.containsPlace` isn't reliably
  // populated on the areas list endpoint).
  const stageNamesByAreaId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (projectStages ?? []).forEach((s) => {
      const areaId = s.area?.identifier;
      if (!areaId) return;
      if (!map.has(areaId)) map.set(areaId, new Set());
      map.get(areaId)!.add(s.name);
    });
    return map;
  }, [projectStages]);

  type ProgressBucket = "not_started" | "in_progress" | "completed";
  const progressBucketOf = (area: Area): ProgressBucket => {
    const total = area.stageCount ?? 0;
    const completed = area.completedStageCount ?? 0;
    if (total === 0) return "not_started";
    if (completed >= total) return "completed";
    if (completed > 0 || (area.inProgressStageCount ?? 0) > 0) return "in_progress";
    return "not_started";
  };

  // Deck / stage / progress are the three non-text filter axes, shared
  // between both views — area view applies this plus the text search;
  // deck view applies this per-deck before layering its own
  // deck-name-aware search on top (see `decksForView`).
  const matchesAreaFilters = (area: Area) => {
    if (
      selectedDeckIds.length > 0 &&
      !selectedDeckIds.includes(area.containedInPlace?.identifier ?? "")
    )
      return false;
    if (selectedStageNames.length > 0) {
      const names = stageNamesByAreaId.get(area.identifier);
      if (!names || !selectedStageNames.some((n) => names.has(n))) return false;
    }
    if (
      selectedProgressStatuses.length > 0 &&
      !selectedProgressStatuses.includes(progressBucketOf(area))
    )
      return false;
    return true;
  };

  // Filter areas by name/description search + the shared filter axes
  // above. Independent of `deckFilterSections`'s own options (built
  // from the same data) so this stays a pure derivation of state.
  const filteredAreas = useMemo(() => {
    if (!areas) return [];
    const q = areaSearchQuery.trim().toLowerCase();
    return areas.filter((area) => {
      if (!matchesAreaFilters(area)) return false;
      if (
        q &&
        !area.name.toLowerCase().includes(q) &&
        !(area.description ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas, areaSearchQuery, selectedDeckIds, selectedStageNames, selectedProgressStatuses]);

  const deckFilterSections: FilterSection[] = useMemo(
    () => [
      {
        id: "deck",
        label: t("areasSection.deckFilterLabel"),
        options: deckOptions.map((d) => ({ value: d.id, label: d.name })),
        selected: selectedDeckIds,
        onChange: setSelectedDeckIds,
      },
      {
        id: "stage",
        label: t("areasSection.stageFilterLabel"),
        options: stageOptions.map((name) => ({ value: name, label: name })),
        selected: selectedStageNames,
        onChange: setSelectedStageNames,
        emptyLabel: t("areasSection.stageFilterEmpty"),
      },
      {
        id: "progress",
        label: t("areasSection.progressFilterLabel"),
        options: [
          { value: "not_started", label: t("areasSection.progressNotStarted") },
          { value: "in_progress", label: t("areasSection.progressInProgress") },
          { value: "completed", label: t("areasSection.progressCompleted") },
        ],
        selected: selectedProgressStatuses,
        onChange: setSelectedProgressStatuses,
      },
    ],
    [deckOptions, selectedDeckIds, stageOptions, selectedStageNames, selectedProgressStatuses, t]
  );

  // Deck-first grouping for the "Deck view" toggle. Independent of
  // `filteredAreas` (which only ever matches against area name/desc)
  // because "search in decks" needs to match the *deck* itself too —
  // a deck whose own name matches keeps all of its (filter-passing)
  // areas listed (the deck is what satisfied the search, not one
  // specific area); otherwise it's kept only when at least one area
  // matches, showing just those.
  //
  // Decks with zero matching areas only survive when *no* filter is
  // active at all (deck/stage/progress/text) — that's pure browsing,
  // where showing every deck (even empty ones) surfaces setup gaps.
  // The moment any filter is on, an empty result means "this deck
  // doesn't satisfy it", so it must disappear like it does in Area
  // view — otherwise e.g. filtering by a Stage name still shows decks
  // that have none of their areas in that stage.
  const decksForView = useMemo(() => {
    if (!decks) return [];
    const relevant =
      selectedDeckIds.length > 0
        ? decks.filter((d) => selectedDeckIds.includes(d.identifier))
        : decks;
    const q = areaSearchQuery.trim().toLowerCase();
    const hasActiveFilter =
      selectedDeckIds.length > 0 ||
      selectedStageNames.length > 0 ||
      selectedProgressStatuses.length > 0 ||
      q.length > 0;
    return relevant
      .map((deck) => {
        const deckAreas = (areas ?? []).filter(
          (a) =>
            a.containedInPlace?.identifier === deck.identifier &&
            matchesAreaFilters(a)
        );
        if (!hasActiveFilter) return { deck, areas: deckAreas };
        if (deckAreas.length === 0) return null;
        if (!q) return { deck, areas: deckAreas };
        const deckMatches =
          deck.name.toLowerCase().includes(q) ||
          (deck.description ?? "").toLowerCase().includes(q);
        if (deckMatches) return { deck, areas: deckAreas };
        const matchingAreas = deckAreas.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            (a.description ?? "").toLowerCase().includes(q)
        );
        return matchingAreas.length > 0 ? { deck, areas: matchingAreas } : null;
      })
      .filter((entry): entry is { deck: Deck; areas: Area[] } => entry !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    decks,
    areas,
    selectedDeckIds,
    selectedStageNames,
    selectedProgressStatuses,
    areaSearchQuery,
  ]);

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

    const sortedTasks = [...setupTasks].sort((a, b) => a.sortOrder - b.sortOrder);

    // Users with edit permission see all tasks
    if (canEditProject) return sortedTasks;

    // Other users only see tasks where they are assignees
    // For kickoff_meeting: only show after invitations are sent (actionStatus !== "pending")
    return sortedTasks.filter(task => {
      const isAssignee = task.assignees?.some(assignee => assignee.identifier === currentUser.identifier);
      if (!isAssignee) return false;

      // For kickoff meeting, only show after invitations are sent
      if (task.additionalType === "kickoff_meeting" && task.actionStatus === "pending") {
        return false;
      }

      return true;
    });
  }, [setupTasks, currentUser, canEditProject]);

  // Check if members have been added — scheduling the kickoff meeting only
  // needs people to invite as attendees, nothing to do with documents.
  // Matches either the standalone "add_members" task or the combined
  // "add_members_and_signers" task, whichever this project uses.
  const membersTask = visibleSetupTasks.find(
    t => t.additionalType === "add_members" || t.additionalType === "add_members_and_signers"
  );
  const membersAdded = membersTask ? (membersTask.isComplete || membersTask.actionStatus === "completed") : true;

  // A task is blocked when the backend says so (isLocked, e.g. define_areas_and_stages
  // before a deck exists) or via the kickoff-meeting-specific check below.
  const isTaskBlocked = (task: SetupTask, isCompleted: boolean) =>
    !isCompleted &&
    (task.isLocked ||
      (task.additionalType === "kickoff_meeting" && !membersAdded));

  // Count blocked tasks (kickoff meeting without members, or locked tasks)
  const blockedTasksCount = visibleSetupTasks.filter((task) => {
    const isCompleted = task.isComplete || task.actionStatus === "completed";
    return isTaskBlocked(task, isCompleted);
  }).length;

  const completedTasksCount = visibleSetupTasks.filter((task) => task.isComplete || task.actionStatus === "completed").length;
  const pendingTasksCount = visibleSetupTasks.filter((task) => {
    const isCompleted = task.isComplete || task.actionStatus === "completed";
    return !isCompleted && !isTaskBlocked(task, isCompleted);
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
    // The new area (+ its stages) may complete the "Define Areas & Stages"
    // setup task, so pull the latest task list to reflect that immediately.
    handleTaskUpdate();
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
              if (task.additionalType === "kickoff_meeting") {
                return (
                  <KickoffScheduledCard
                    key={task.identifier}
                    task={task}
                    projectId={projectId}
                    onOpen={handleViewTaskDetails}
                    allTasks={visibleSetupTasks}
                  />
                );
              }

              return (
                <SetupTaskCard
                  key={task.identifier}
                  task={task}
                  projectId={projectId}
                  documentTypes={documentTypes || undefined}
                  allTasks={visibleSetupTasks}
                  membersCount={projectMembersList?.length}
                  onDefineDecks={() => {
                    setIsDeckEditMode(false);
                    setIsDeckModalOpen(true);
                  }}
                  onViewDecks={() => {
                    setIsDeckEditMode(true);
                    setIsDeckModalOpen(true);
                  }}
                  onDefineAreas={() => setIsCreateModalOpen(true)}
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {areasViewMode === "deck"
                ? t("areasSection.decksTitle")
                : t("areasSection.title")}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {canEditProject && projectStatus !== "setup" && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsDeckEditMode(true);
                    setIsDeckModalOpen(true);
                  }}
                >
                  <Squares2X2Icon className="w-4 h-4" />
                  {t("areasSection.manageDecks")}
                </Button>
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

          {/* Search + deck filter — same compact pattern as the
              punchlist tab's toolbar, so search/filter reads the same
              way everywhere it appears. Left-aligned on its own row
              rather than bundled with the title/Create button, so it
              reads as a toolbar for the grid below it. Deck is now one
              of potentially several filter axes here rather than a
              single-select dropdown, so multiple decks can be compared
              at once. */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={areaSearchQuery}
                onChange={(e) => setAreaSearchQuery(e.target.value)}
                placeholder={
                  areasViewMode === "deck"
                    ? t("areasSection.searchDecksPlaceholder")
                    : t("areasSection.searchPlaceholder")
                }
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {deckOptions.length > 1 && (
              <FilterPopover
                sections={deckFilterSections}
                triggerLabel={t("areasSection.filterLabel")}
                onClearAll={() => setSelectedDeckIds([])}
              />
            )}
            {/* Area/Deck view toggle — a connected segmented control
                (not the spaced-out `FilterTabs` pills used elsewhere)
                since these two options are mutually exclusive views of
                the same data, not independent filters. Pushed to the
                far right of the toolbar via `ml-auto`. */}
            {decks && decks.length > 0 && (
              <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden ml-auto">
                <button
                  type="button"
                  onClick={() => setAreasViewMode("area")}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    areasViewMode === "area"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {t("areasSection.areaView")}
                </button>
                <button
                  type="button"
                  onClick={() => setAreasViewMode("deck")}
                  className={`px-3 py-1.5 text-sm font-medium border-l border-gray-300 dark:border-gray-600 transition-colors ${
                    areasViewMode === "deck"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {t("areasSection.deckView")}
                </button>
              </div>
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
            // Deck view checked first: it's about deck structure, not
            // areas specifically, so it renders its own grid (each
            // DeckCard showing "No areas on this deck yet" for empty
            // ones) even when the project has zero areas overall —
            // decks created via "Manage Decks" should stay visible.
            // The "create your first area" banner only replaces the
            // grid in Area view, where an empty project genuinely has
            // nothing else to show.
            areasViewMode === "deck" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {decksForView.map(({ deck, areas: deckAreas }) => (
                    <DeckCard
                      key={deck.identifier}
                      deck={deck}
                      areas={deckAreas}
                      projectId={projectId}
                    />
                  ))}
                </div>
                {decksForView.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                    {decks && decks.length === 0
                      ? t("areasSection.noDecksYet")
                      : t("areasSection.noMatchingAreas")}
                  </div>
                )}
              </>
            ) : areas.length === 0 ? (
              <Alert
                type="info"
                title={t("areasSection.noAreasBannerTitle")}
                message={t("areasSection.noAreasBannerMessage")}
                action={
                  canCreateAreas && projectStatus !== "archived" && projectStatus !== "completed"
                    ? { label: t("areasSection.createArea"), onClick: () => setIsCreateModalOpen(true) }
                    : undefined
                }
              />
            ) : (
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
                    {t("areasSection.noMatchingAreas")}
                  </div>
                )}
              </>
            )
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

      {/* Kickoff Meeting Modal - onOpen is only wired up for pending/awaiting-response tasks (see KickoffScheduledCard) */}
      {isKickoffModalOpen && selectedTaskId && (
        <KickoffSchedulingModal
          isOpen={isKickoffModalOpen}
          onClose={handleKickoffModalClose}
          projectId={projectId}
          taskId={selectedTaskId}
          onUpdate={handleTaskUpdate}
        />
      )}

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
