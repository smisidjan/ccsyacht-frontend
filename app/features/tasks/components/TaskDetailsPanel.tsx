"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ClipboardDocumentListIcon,
  FolderIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { FolderIcon as FolderIconSolid } from "@heroicons/react/24/solid";
import TaskCard, { type TaskItem } from "./TaskCard";
import TaskCardGroup from "./TaskCardGroup";
import type { ProjectGroup } from "./ProjectTasksList";
import type { MyTaskSetupTask, MyTaskDocumentAcknowledgement, MyTaskDocumentRequest } from "@/lib/api/types";

type FilterType = "all" | "documents" | "punchlist" | "meetings" | "acknowledgements" | "signoffs";
type FilterStatus = "all" | "pending" | "overdue" | "completed";

interface TaskDetailsPanelProps {
  selectedProject: ProjectGroup | undefined;
  onBackToProjects: () => void;
}

export default function TaskDetailsPanel({
  selectedProject,
  onBackToProjects,
}: TaskDetailsPanelProps) {
  const t = useTranslations("myTasks");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filter tasks for selected project
  const filteredTasks = selectedProject
    ? selectedProject.tasks.filter((task) => {
        // Type filter
        if (filterType === "documents" && task.type !== "document_request")
          return false;
        if (filterType === "punchlist" && task.type !== "punchlist_item")
          return false;
        if (filterType === "meetings" && task.type !== "setup_task") return false;
        if (
          filterType === "acknowledgements" &&
          task.type !== "document_acknowledgement"
        )
          return false;
        if (filterType === "signoffs" && task.type !== "stage_signoff")
          return false;

        // Status filter
        if (filterStatus === "pending") {
          if (
            task.type === "document_request" &&
            (task.isCompleted || task.isOverdue)
          )
            return false;
          if (
            task.type === "punchlist_item" &&
            (task.status === "done" || task.isOverdue)
          )
            return false;
          if (task.type === "setup_task" && task.hasSigned) return false;
          if (task.type === "document_acknowledgement" && task.isAcknowledged)
            return false;
          if (task.type === "stage_signoff" && task.hasSigned) return false;
        }
        if (filterStatus === "overdue") {
          if (task.type === "document_request" && !task.isOverdue) return false;
          if (task.type === "punchlist_item" && !task.isOverdue) return false;
          if (task.type === "setup_task") return false;
          if (task.type === "document_acknowledgement") return false; // No overdue for acknowledgements
          if (task.type === "stage_signoff") return false; // No overdue for signoffs
        }
        if (filterStatus === "completed") {
          if (task.type === "document_request" && !task.isCompleted) return false;
          if (task.type === "punchlist_item" && task.status !== "done")
            return false;
          if (task.type === "setup_task" && !task.hasSigned) return false;
          if (task.type === "document_acknowledgement" && !task.isAcknowledged)
            return false;
          if (task.type === "stage_signoff" && !task.hasSigned) return false;
        }

        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (task.type === "document_request") {
            return task.documentType.name.toLowerCase().includes(query);
          }
          if (task.type === "punchlist_item") {
            return (
              task.name.toLowerCase().includes(query) ||
              task.description?.toLowerCase().includes(query)
            );
          }
          if (task.type === "setup_task") {
            return task.name.toLowerCase().includes(query);
          }
          if (task.type === "document_acknowledgement") {
            return (
              task.document.title.toLowerCase().includes(query) ||
              task.documentType.name.toLowerCase().includes(query)
            );
          }
          if (task.type === "stage_signoff") {
            return (
              task.stage.name.toLowerCase().includes(query) ||
              task.area.name.toLowerCase().includes(query) ||
              task.deck.name.toLowerCase().includes(query)
            );
          }
        }

        return true;
      })
    : [];

  // Group tasks: meetings with their related acknowledgements and document requests
  const groupedTasks = useMemo(() => {
    // Separate tasks by type
    const meetings: MyTaskSetupTask[] = [];
    const acknowledgements: MyTaskDocumentAcknowledgement[] = [];
    const documentRequests: MyTaskDocumentRequest[] = [];
    const otherTasks: TaskItem[] = [];

    filteredTasks.forEach((task) => {
      if (task.type === "setup_task") {
        meetings.push(task);
      } else if (task.type === "document_acknowledgement") {
        acknowledgements.push(task);
      } else if (task.type === "document_request") {
        documentRequests.push(task);
      } else {
        otherTasks.push(task);
      }
    });

    // Create a map of meeting identifier -> acknowledgements
    const meetingAcknowledgements = new Map<string, MyTaskDocumentAcknowledgement[]>();
    const orphanAcknowledgements: MyTaskDocumentAcknowledgement[] = [];

    acknowledgements.forEach((ack) => {
      const meetingId = ack.setupTask.identifier;
      // Check if this meeting exists in our filtered meetings
      const meetingExists = meetings.some((m) => m.identifier === meetingId);

      if (meetingExists) {
        if (!meetingAcknowledgements.has(meetingId)) {
          meetingAcknowledgements.set(meetingId, []);
        }
        meetingAcknowledgements.get(meetingId)!.push(ack);
      } else {
        // This acknowledgement's meeting is not in the filtered list (e.g., filtered by type)
        orphanAcknowledgements.push(ack);
      }
    });

    // Create a map of meeting identifier -> document requests (only for open meetings)
    const meetingDocumentRequests = new Map<string, MyTaskDocumentRequest[]>();
    const standaloneDocumentRequests: MyTaskDocumentRequest[] = [];

    documentRequests.forEach((doc) => {
      const projectId = doc.project.identifier;
      // Find an open (not completed) kickoff meeting for this project
      const openMeeting = meetings.find(
        (m) => m.project.identifier === projectId && !m.hasSigned
      );

      if (openMeeting) {
        if (!meetingDocumentRequests.has(openMeeting.identifier)) {
          meetingDocumentRequests.set(openMeeting.identifier, []);
        }
        meetingDocumentRequests.get(openMeeting.identifier)!.push(doc);
      } else {
        // No open meeting for this project, show as standalone
        standaloneDocumentRequests.push(doc);
      }
    });

    return {
      meetings,
      meetingAcknowledgements,
      meetingDocumentRequests,
      orphanAcknowledgements,
      standaloneDocumentRequests,
      otherTasks,
    };
  }, [filteredTasks]);

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
              onClick={onBackToProjects}
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
          <div
            className={`${
              showFilters ? "flex" : "hidden"
            } sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1`}
          >
            {(
              [
                "all",
                "documents",
                "punchlist",
                "meetings",
                "acknowledgements",
                "signoffs",
              ] as FilterType[]
            ).map((type) => (
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
          <div
            className={`${showFilters ? "flex" : "hidden"} sm:flex items-center gap-2`}
          >
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
            {/* Render meetings with their grouped acknowledgements and document requests */}
            {groupedTasks.meetings.map((meeting) => {
              const relatedAcks = groupedTasks.meetingAcknowledgements.get(meeting.identifier) || [];
              const relatedDocs = groupedTasks.meetingDocumentRequests.get(meeting.identifier) || [];
              return (
                <TaskCardGroup
                  key={`meeting-${meeting.identifier}`}
                  meeting={meeting}
                  acknowledgements={relatedAcks}
                  documentRequests={relatedDocs}
                />
              );
            })}

            {/* Render orphan acknowledgements (when meeting is filtered out) */}
            {groupedTasks.orphanAcknowledgements.map((task) => (
              <TaskCard key={`${task.type}-${task.identifier}`} task={task} />
            ))}

            {/* Render standalone document requests (meeting completed or no meeting) */}
            {groupedTasks.standaloneDocumentRequests.map((task) => (
              <TaskCard key={`${task.type}-${task.identifier}`} task={task} />
            ))}

            {/* Render other tasks (punchlist items) */}
            {groupedTasks.otherTasks.map((task) => (
              <TaskCard key={`${task.type}-${task.identifier}`} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
