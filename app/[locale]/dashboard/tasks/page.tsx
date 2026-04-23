"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMyTasks } from "@/lib/api";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import {
  ProjectTasksList,
  TaskDetailsPanel,
  type TaskItem,
  type ProjectGroup,
} from "@/app/features/tasks/components";

export default function MyTasksPage() {
  const t = useTranslations("myTasks");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
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
        <ProjectTasksList
          projectGroups={projectGroups}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          taskCounts={tasks?.counts}
        />
      </div>

      {/* Right Panel - Task Details */}
      <div className={`
        flex-1 min-w-0
        ${selectedProjectId ? "flex" : "hidden lg:flex"}
        flex-col
      `}>
        <TaskDetailsPanel
          selectedProject={selectedProject}
          onBackToProjects={handleBackToProjects}
        />
      </div>
    </div>
  );
}
