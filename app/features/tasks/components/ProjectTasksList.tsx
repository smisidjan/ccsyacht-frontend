"use client";

import { useTranslations } from "next-intl";
import {
  ClipboardDocumentListIcon,
  FolderIcon,
  CheckCircleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { FolderIcon as FolderIconSolid } from "@heroicons/react/24/solid";
import type { TaskItem } from "./TaskCard";

interface TaskCounts {
  pending: number;
  overdue: number;
  completed: number;
}

export interface ProjectGroup {
  projectId: string;
  projectName: string;
  tasks: TaskItem[];
  pendingCount: number;
  overdueCount: number;
  completedCount: number;
}

interface ProjectTasksListProps {
  projectGroups: ProjectGroup[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  taskCounts?: TaskCounts;
}

export default function ProjectTasksList({
  projectGroups,
  selectedProjectId,
  onSelectProject,
  taskCounts,
}: ProjectTasksListProps) {
  const t = useTranslations("myTasks");

  return (
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
        {taskCounts && (
          <div className="flex items-center gap-2">
            {taskCounts.overdue > 0 && (
              <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg px-2 sm:px-3 py-2 text-center">
                <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">
                  {taskCounts.overdue}
                </p>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-red-600/70 dark:text-red-400/70 font-medium">
                  {t("stats.overdue")}
                </p>
              </div>
            )}
            <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 sm:px-3 py-2 text-center">
              <p className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                {taskCounts.pending}
              </p>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 font-medium">
                {t("stats.pending")}
              </p>
            </div>
            <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg px-2 sm:px-3 py-2 text-center">
              <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                {taskCounts.completed}
              </p>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-green-600/70 dark:text-green-400/70 font-medium">
                {t("stats.completed")}
              </p>
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
                    onClick={() => onSelectProject(project.projectId)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {isSelected ? (
                        <FolderIconSolid className="w-5 h-5" />
                      ) : (
                        <FolderIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate text-sm sm:text-base ${
                          isSelected
                            ? "text-blue-700 dark:text-blue-400"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
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
                      {project.completedCount > 0 &&
                        project.overdueCount === 0 &&
                        project.pendingCount === 0 && (
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
}
