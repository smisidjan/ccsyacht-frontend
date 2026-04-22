"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowUpTrayIcon,
  FolderIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  BellIcon,
  EyeIcon,
  XMarkIcon,
  DocumentCheckIcon,
} from "@heroicons/react/24/outline";
import {
  FolderIcon as FolderIconSolid,
} from "@heroicons/react/24/solid";
import { useMyTasks } from "@/lib/api";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import type { MyTaskDocumentRequest, MyTaskPunchlistItem, MyTaskSetupTask, MyTaskDocumentAcknowledgement, PunchlistItemPriority } from "@/lib/api/types";

type TaskItem = MyTaskDocumentRequest | MyTaskPunchlistItem | MyTaskSetupTask | MyTaskDocumentAcknowledgement;
type FilterType = "all" | "documents" | "punchlist" | "meetings" | "acknowledgements";
type FilterStatus = "all" | "pending" | "overdue" | "completed";

interface ProjectGroup {
  projectId: string;
  projectName: string;
  tasks: TaskItem[];
  pendingCount: number;
  overdueCount: number;
  completedCount: number;
}

export default function MyTasksPage() {
  const t = useTranslations("myTasks");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: tasks, loading: rawLoading, error } = useMyTasks();
  const loading = useMinimumLoadingTime(rawLoading);

  // Group tasks by project
  const projectGroups = useMemo(() => {
    if (!tasks) return [];

    const groupMap = new Map<string, ProjectGroup>();

    const addToGroup = (task: TaskItem) => {
      const projectId = task.project.identifier;
      if (!groupMap.has(projectId)) {
        groupMap.set(projectId, {
          projectId,
          projectName: task.project.name,
          tasks: [],
          pendingCount: 0,
          overdueCount: 0,
          completedCount: 0,
        });
      }
      const group = groupMap.get(projectId)!;
      group.tasks.push(task);

      // Count statuses
      if (task.type === "document_request") {
        if (task.isCompleted) group.completedCount++;
        else if (task.isOverdue) group.overdueCount++;
        else group.pendingCount++;
      } else if (task.type === "punchlist_item") {
        if (task.status === "done") group.completedCount++;
        else if (task.isOverdue) group.overdueCount++;
        else group.pendingCount++;
      } else if (task.type === "setup_task") {
        if (task.hasSigned) group.completedCount++;
        else group.pendingCount++;
      } else if (task.type === "document_acknowledgement") {
        if (task.isAcknowledged) group.completedCount++;
        else group.pendingCount++;
      }
    };

    tasks.documentRequests.forEach(addToGroup);
    tasks.punchlistItems.forEach(addToGroup);
    tasks.setupTasks.forEach(addToGroup);
    tasks.documentAcknowledgements?.forEach(addToGroup);

    // Sort groups by overdue count, then pending count
    return Array.from(groupMap.values()).sort((a, b) => {
      if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
      return b.pendingCount - a.pendingCount;
    });
  }, [tasks]);

  // Auto-select first project on desktop only
  useEffect(() => {
    if (projectGroups.length > 0 && !selectedProjectId && typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSelectedProjectId(projectGroups[0].projectId);
    }
  }, [projectGroups, selectedProjectId]);

  // Get selected project
  const selectedProject = projectGroups.find(p => p.projectId === selectedProjectId);

  // Filter tasks for selected project
  const filteredTasks = useMemo(() => {
    if (!selectedProject) return [];

    return selectedProject.tasks.filter(task => {
      // Type filter
      if (filterType === "documents" && task.type !== "document_request") return false;
      if (filterType === "punchlist" && task.type !== "punchlist_item") return false;
      if (filterType === "meetings" && task.type !== "setup_task") return false;
      if (filterType === "acknowledgements" && task.type !== "document_acknowledgement") return false;

      // Status filter
      if (filterStatus === "pending") {
        if (task.type === "document_request" && (task.isCompleted || task.isOverdue)) return false;
        if (task.type === "punchlist_item" && (task.status === "done" || task.isOverdue)) return false;
        if (task.type === "setup_task" && task.hasSigned) return false;
        if (task.type === "document_acknowledgement" && task.isAcknowledged) return false;
      }
      if (filterStatus === "overdue") {
        if (task.type === "document_request" && !task.isOverdue) return false;
        if (task.type === "punchlist_item" && !task.isOverdue) return false;
        if (task.type === "setup_task") return false;
        if (task.type === "document_acknowledgement") return false; // No overdue for acknowledgements
      }
      if (filterStatus === "completed") {
        if (task.type === "document_request" && !task.isCompleted) return false;
        if (task.type === "punchlist_item" && task.status !== "done") return false;
        if (task.type === "setup_task" && !task.hasSigned) return false;
        if (task.type === "document_acknowledgement" && !task.isAcknowledged) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (task.type === "document_request") {
          return task.documentType.name.toLowerCase().includes(query);
        }
        if (task.type === "punchlist_item") {
          return task.name.toLowerCase().includes(query) ||
                 task.description?.toLowerCase().includes(query);
        }
        if (task.type === "setup_task") {
          return task.name.toLowerCase().includes(query);
        }
        if (task.type === "document_acknowledgement") {
          return task.document.title.toLowerCase().includes(query) ||
                 task.documentType.name.toLowerCase().includes(query);
        }
      }

      return true;
    });
  }, [selectedProject, filterType, filterStatus, searchQuery]);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    // Reset filters when changing project
    setFilterType("all");
    setFilterStatus("all");
    setSearchQuery("");
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
  };

  const getPriorityColor = (priority: PunchlistItemPriority) => {
    switch (priority) {
      case "high":
        return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "medium":
        return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
      case "low":
        return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t("dates.today");
    if (diffDays === 1) return t("dates.tomorrow");
    if (diffDays === -1) return t("dates.yesterday");
    if (diffDays < -1) return t("dates.daysAgo", { days: Math.abs(diffDays) });
    if (diffDays <= 7) return t("dates.inDays", { days: diffDays });

    return date.toLocaleDateString();
  };

  const getTaskLink = (task: TaskItem): string => {
    if (task.type === "document_request") {
      return `/dashboard/projects/${task.project.identifier}#documents`;
    }
    if (task.type === "punchlist_item") {
      return `/dashboard/projects/${task.project.identifier}/areas/${task.area.identifier}?stage=${task.stage.identifier}`;
    }
    if (task.type === "document_acknowledgement") {
      return `/dashboard/projects/${task.project.identifier}#overview`;
    }
    return `/dashboard/projects/${task.project.identifier}#overview`;
  };

  const renderTaskCard = (task: TaskItem) => {
    const isCompleted =
      (task.type === "document_request" && task.isCompleted) ||
      (task.type === "punchlist_item" && task.status === "done") ||
      (task.type === "setup_task" && task.hasSigned) ||
      (task.type === "document_acknowledgement" && task.isAcknowledged);

    const isOverdue =
      (task.type === "document_request" && task.isOverdue && !task.isCompleted) ||
      (task.type === "punchlist_item" && task.isOverdue && task.status !== "done");

    return (
      <div
        key={`${task.type}-${task.identifier}`}
        className={`group relative bg-white dark:bg-gray-800 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${
          isCompleted
            ? "border-l-green-500 bg-green-50/50 dark:bg-green-900/10"
            : isOverdue
            ? "border-l-red-500 bg-red-50/50 dark:bg-red-900/10"
            : task.type === "document_request"
            ? "border-l-blue-500"
            : task.type === "punchlist_item"
            ? "border-l-amber-500"
            : task.type === "document_acknowledgement"
            ? "border-l-teal-500"
            : "border-l-purple-500"
        }`}
      >
        <div className="p-3 sm:p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* Type badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-md ${
                task.type === "document_request"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : task.type === "punchlist_item"
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : task.type === "document_acknowledgement"
                  ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
              }`}>
                {task.type === "document_request" && <ArrowUpTrayIcon className="w-3 h-3" />}
                {task.type === "punchlist_item" && <WrenchScrewdriverIcon className="w-3 h-3" />}
                {task.type === "setup_task" && <CalendarIcon className="w-3 h-3" />}
                {task.type === "document_acknowledgement" && <DocumentCheckIcon className="w-3 h-3" />}
                <span className="hidden sm:inline">
                  {t(`types.${
                    task.type === "document_request" ? "documentRequest"
                    : task.type === "punchlist_item" ? "punchlistItem"
                    : task.type === "document_acknowledgement" ? "documentAcknowledgement"
                    : "meeting"
                  }`)}
                </span>
              </span>

              {/* Priority badge for punchlist */}
              {task.type === "punchlist_item" && (
                <span className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md border ${getPriorityColor(task.priority)}`}>
                  {t(`priority.${task.priority}`)}
                </span>
              )}

              {/* Status badge */}
              {isCompleted && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <CheckCircleIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">{t("status.completed")}</span>
                </span>
              )}
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  <ExclamationCircleIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">{t("status.overdue")}</span>
                </span>
              )}
            </div>

            {/* Quick actions - visible on hover (desktop) or always (mobile) */}
            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <Link
                href={getTaskLink(task)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title={t("actions.view")}
              >
                <EyeIcon className="w-4 h-4" />
              </Link>
              {!isCompleted && (
                <button
                  className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors hidden sm:block"
                  title={t("actions.remind")}
                >
                  <BellIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Task title */}
          <h3 className={`font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 text-sm sm:text-base ${isCompleted ? "line-through text-gray-500" : ""}`}>
            {task.type === "document_request" && t("uploadDocument", { type: task.documentType.name })}
            {task.type === "punchlist_item" && task.name}
            {task.type === "setup_task" && task.name}
            {task.type === "document_acknowledgement" && t("acknowledgeDocument", { title: task.document.title })}
          </h3>

          {/* Description/Message - hidden on small mobile */}
          {task.type === "document_request" && task.message && (
            <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 italic">
              &quot;{task.message}&quot;
            </p>
          )}
          {task.type === "punchlist_item" && task.description && (
            <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}
          {task.type === "document_acknowledgement" && (
            <div className="hidden sm:flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs font-medium">
                {task.documentType.name}
              </span>
              <span className="text-gray-400">•</span>
              <span>{t("forMeeting", { meeting: task.setupTask.name })}</span>
            </div>
          )}

          {/* Location/Context row */}
          {task.type === "punchlist_item" && (
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-xs sm:text-sm">
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs font-medium truncate max-w-[80px] sm:max-w-none">
                {task.area.name}
              </span>
              <ChevronRightIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs font-medium truncate max-w-[80px] sm:max-w-none">
                {task.stage.name}
              </span>
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              {/* Due date */}
              {task.type === "document_request" && task.dueDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}>
                  <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {formatDate(task.dueDate)}
                </span>
              )}
              {task.type === "punchlist_item" && task.dueDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}>
                  <ClockIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {formatDate(task.dueDate)}
                </span>
              )}
              {task.type === "setup_task" && task.scheduledDate && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {formatDate(task.scheduledDate)}
                </span>
              )}

              {/* Requested by - hidden on mobile */}
              {task.type === "document_request" && (
                <span className="text-gray-400 hidden sm:inline">
                  {t("requestedBy", { name: task.assignedBy.name })}
                </span>
              )}
            </div>

            {/* Action button */}
            <Link
              href={getTaskLink(task)}
              className={`inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition-colors ${
                isCompleted
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  : task.type === "document_request"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : task.type === "punchlist_item"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : task.type === "document_acknowledgement"
                  ? "bg-teal-600 hover:bg-teal-700 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              {task.type === "document_request" && (isCompleted ? t("actions.view") : t("actions.upload"))}
              {task.type === "punchlist_item" && (isCompleted ? t("actions.view") : t("actions.resolve"))}
              {task.type === "setup_task" && (isCompleted ? t("actions.view") : t("actions.attend"))}
              {task.type === "document_acknowledgement" && (isCompleted ? t("actions.view") : t("actions.acknowledge"))}
              <ChevronRightIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // Render Projects List (for mobile full-screen or desktop sidebar)
  const renderProjectsList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ClipboardDocumentListIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("title")}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("projectCount", { count: projectGroups.length })}
            </p>
          </div>
        </div>

        {/* Stats row */}
        {tasks && (
          <div className="flex items-center gap-2">
            {tasks.counts.overdue > 0 && (
              <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg px-2 sm:px-3 py-2 text-center">
                <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">{tasks.counts.overdue}</p>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-red-600/70 dark:text-red-400/70 font-medium">{t("stats.overdue")}</p>
              </div>
            )}
            <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 sm:px-3 py-2 text-center">
              <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">{tasks.counts.pending}</p>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 font-medium">{t("stats.pending")}</p>
            </div>
            <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg px-2 sm:px-3 py-2 text-center">
              <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">{tasks.counts.completed}</p>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-green-600/70 dark:text-green-400/70 font-medium">{t("stats.completed")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Projects list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <p className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t("projectsLabel")}
          </p>
          {projectGroups.length === 0 ? (
            <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
              <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("empty.noProjects")}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {projectGroups.map((project) => {
                const isSelected = selectedProjectId === project.projectId;
                const totalTasks = project.tasks.length;

                return (
                  <button
                    key={project.projectId}
                    onClick={() => handleSelectProject(project.projectId)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}>
                      {isSelected ? (
                        <FolderIconSolid className="w-5 h-5" />
                      ) : (
                        <FolderIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate text-sm sm:text-base ${
                        isSelected
                          ? "text-blue-700 dark:text-blue-400"
                          : "text-gray-900 dark:text-white"
                      }`}>
                        {project.projectName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("taskCount", { count: totalTasks })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {project.overdueCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center justify-center">
                          {project.overdueCount}
                        </span>
                      )}
                      {project.pendingCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center">
                          {project.pendingCount}
                        </span>
                      )}
                      {project.completedCount > 0 && project.overdueCount === 0 && project.pendingCount === 0 && (
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      )}
                      {/* Arrow for mobile */}
                      <ChevronRightIcon className="w-4 h-4 text-gray-400 lg:hidden" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Task Details Panel
  const renderTaskDetails = () => {
    if (!selectedProject) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <FolderIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("empty.selectProject")}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t("empty.selectProjectHint")}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Project header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-3">
              {/* Back button for mobile */}
              <button
                onClick={handleBackToProjects}
                className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <FolderIconSolid className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none">
                  {selectedProject.projectName}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {t("filteredCount", { count: filteredTasks.length })}
                </p>
              </div>
            </div>
            <Link
              href={`/dashboard/projects/${selectedProject.projectId}`}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              {t("actions.openProject")}
            </Link>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[120px] sm:min-w-[200px] max-w-sm">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter toggle button for mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`sm:hidden p-2 rounded-lg border transition-colors ${
                showFilters || filterType !== "all" || filterStatus !== "all"
                  ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                  : "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
            </button>

            {/* Type filter - desktop or when expanded on mobile */}
            <div className={`${showFilters ? "flex" : "hidden"} sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1`}>
              {(["all", "documents", "punchlist", "meetings", "acknowledgements"] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-colors ${
                    filterType === type
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {t(`filters.${type}`)}
                </button>
              ))}
            </div>

            {/* Status filter - desktop or when expanded on mobile */}
            <div className={`${showFilters ? "flex" : "hidden"} sm:flex items-center gap-2`}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t("filters.allStatus")}</option>
                <option value="pending">{t("filters.pending")}</option>
                <option value="overdue">{t("filters.overdue")}</option>
                <option value="completed">{t("filters.completed")}</option>
              </select>

              {/* Clear filters */}
              {(filterType !== "all" || filterStatus !== "all") && (
                <button
                  onClick={() => {
                    setFilterType("all");
                    setFilterStatus("all");
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <ClipboardDocumentListIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {t("empty.noTasksFiltered")}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("empty.tryDifferentFilter")}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {filteredTasks.map(renderTaskCard)}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col lg:flex-row">
        <div className="lg:w-80 bg-white dark:bg-gray-800 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-4">
          <LoadingSkeleton type="list" rows={6} />
        </div>
        <div className="flex-1 p-4 sm:p-6">
          <LoadingSkeleton type="list" rows={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Alert type="error" message={error.message || t("loadError")} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900">
      {/* Mobile: Show either projects list OR task details */}
      {/* Desktop: Show both side by side */}

      {/* Left Panel - Projects List */}
      <div className={`
        lg:w-80 lg:flex-shrink-0 lg:block
        ${selectedProjectId ? "hidden lg:flex" : "flex"}
        flex-col bg-white dark:bg-gray-800 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700
        h-full
      `}>
        {renderProjectsList()}
      </div>

      {/* Right Panel - Task Details */}
      <div className={`
        flex-1 min-w-0
        ${selectedProjectId ? "flex" : "hidden lg:flex"}
        flex-col
      `}>
        {renderTaskDetails()}
      </div>
    </div>
  );
}
