"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowUpTrayIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  DocumentCheckIcon,
  PencilSquareIcon,
  ClockIcon,
  FolderIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowTopRightOnSquareIcon,
  UserIcon,
  ComputerDesktopIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import type {
  MyTaskDocumentRequest,
  MyTaskPunchlistItem,
  MyTaskSetupTask,
  MyTaskDocumentAcknowledgement,
  MyTaskStageSignoff,
  PunchlistItemPriority,
} from "@/lib/api/types";

export type TaskItem =
  | MyTaskDocumentRequest
  | MyTaskPunchlistItem
  | MyTaskSetupTask
  | MyTaskDocumentAcknowledgement
  | MyTaskStageSignoff;

interface TaskRowProps {
  task: TaskItem;
  /** Render the row indented and visually attached to a parent row —
   *  used by review documents (acknowledgements) hanging under their
   *  kick-off meeting. */
  nested?: boolean;
  /** When the row owns child rows (e.g. a kick-off meeting that
   *  contains review documents), expose a chevron toggle on the far
   *  left. The page controls expansion state — passing an
   *  `onToggleExpand` is what makes the toggle render. */
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const TYPE_META = {
  document_request: {
    icon: ArrowUpTrayIcon,
    iconClass: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    typeKey: "documentRequest",
  },
  punchlist_item: {
    icon: WrenchScrewdriverIcon,
    iconClass: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
    typeKey: "punchlistItem",
  },
  setup_task: {
    icon: CalendarIcon,
    iconClass: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
    typeKey: "meeting",
  },
  document_acknowledgement: {
    icon: DocumentCheckIcon,
    iconClass: "text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30",
    typeKey: "documentAcknowledgement",
  },
  stage_signoff: {
    icon: PencilSquareIcon,
    iconClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30",
    typeKey: "stageSignoff",
  },
} as const;

const PRIORITY_CLASS: Record<PunchlistItemPriority, string> = {
  high: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  medium: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  low: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
};

function getTaskTitle(task: TaskItem, t: (k: string, p?: Record<string, string | number>) => string): string {
  switch (task.type) {
    case "document_request":
      return t("uploadDocument", { type: task.documentType.name });
    case "punchlist_item":
      return task.name;
    case "setup_task":
      return task.name;
    case "document_acknowledgement":
      return t("acknowledgeDocument", { title: task.document.title });
    case "stage_signoff":
      return t("signoffStage", { stage: task.stage.name });
  }
}

function getTaskLink(task: TaskItem): string {
  switch (task.type) {
    case "document_request":
      return `/dashboard/projects/${task.project.identifier}#documents`;
    case "punchlist_item":
      return `/dashboard/projects/${task.project.identifier}/areas/${task.area.identifier}?stage=${task.stage.identifier}`;
    case "stage_signoff":
      return `/dashboard/projects/${task.project.identifier}/areas/${task.area.identifier}`;
    case "document_acknowledgement":
    case "setup_task":
      return `/dashboard/projects/${task.project.identifier}#overview`;
  }
}

function getBreadcrumb(task: TaskItem): string | null {
  switch (task.type) {
    case "punchlist_item":
      return `${task.area.name} / ${task.stage.name}`;
    case "stage_signoff":
      return `${task.deck.name} / ${task.area.name} / ${task.stage.name}`;
    case "document_acknowledgement":
      return task.documentType.name;
    case "document_request":
      return task.documentType.name;
    case "setup_task":
      return null;
  }
}

function isTaskCompleted(task: TaskItem): boolean {
  if (task.type === "document_request") return task.isCompleted;
  if (task.type === "punchlist_item") return task.status === "done";
  if (task.type === "setup_task") return task.hasSigned;
  if (task.type === "document_acknowledgement") return task.isAcknowledged;
  if (task.type === "stage_signoff") return task.hasSigned;
  return false;
}

function isTaskOverdue(task: TaskItem): boolean {
  if (task.type === "document_request") return task.isOverdue && !task.isCompleted;
  if (task.type === "punchlist_item") return task.isOverdue && task.status !== "done";
  return false;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TaskRow({
  task,
  nested = false,
  expandable = false,
  expanded = false,
  onToggleExpand,
}: TaskRowProps) {
  const t = useTranslations("myTasks");
  const meta = TYPE_META[task.type];
  const Icon = meta.icon;

  const completed = isTaskCompleted(task);
  const overdue = isTaskOverdue(task);
  const title = getTaskTitle(task, t);
  const link = getTaskLink(task);
  const breadcrumb = getBreadcrumb(task);

  const statusBadge = completed
    ? { label: t("status.completed"), className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" }
    : overdue
    ? { label: t("status.overdue"), className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" }
    : { label: t("status.pending"), className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };

  return (
    <div
      className={`group flex items-center gap-3 py-2.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
        nested
          ? "pl-12 pr-2 bg-gray-50/60 dark:bg-gray-900/30"
          : "pl-2 pr-2 bg-white dark:bg-gray-800"
      }`}
    >
      {expandable ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className="w-6 h-6 flex items-center justify-center flex-shrink-0 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={expanded ? t("actions.collapse") : t("actions.expand")}
        >
          {expanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>
      ) : (
        <span className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
      )}

      <div className="relative flex-shrink-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.iconClass}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        {task.type === "stage_signoff" && task.stage.color && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800"
            style={{ backgroundColor: task.stage.color }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            completed
              ? "line-through text-gray-500 dark:text-gray-500"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {title}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          <span className="font-medium">{t(`types.${meta.typeKey}`)}</span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="flex items-center gap-1 truncate text-gray-700 dark:text-gray-300">
            <FolderIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{task.project.name}</span>
          </span>
          {breadcrumb && (
            <>
              <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">•</span>
              <span className="hidden sm:inline truncate">{breadcrumb}</span>
            </>
          )}
          {task.type === "document_request" && task.assignedBy && (
            <>
              <span className="text-gray-300 dark:text-gray-600 hidden md:inline">•</span>
              <span className="hidden md:inline truncate">
                {t("requestedBy", { name: task.assignedBy.name })}
              </span>
            </>
          )}
          {task.type === "document_acknowledgement" && (
            <>
              <span className="text-gray-300 dark:text-gray-600 hidden md:inline">•</span>
              <span className="hidden md:inline truncate">
                {t("forMeeting", { meeting: task.setupTask.name })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Punchlist priority chip */}
      {task.type === "punchlist_item" && !completed && (
        <span
          className={`hidden md:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-md flex-shrink-0 ${PRIORITY_CLASS[task.priority]}`}
        >
          {t(`priority.${task.priority}`)}
        </span>
      )}

      {/* Meeting format + join link */}
      {task.type === "setup_task" && task.meetingFormat && (
        <span
          className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md flex-shrink-0 ${
            task.meetingFormat === "live"
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
          }`}
        >
          {task.meetingFormat === "live" ? (
            <UserIcon className="w-3 h-3" />
          ) : (
            <ComputerDesktopIcon className="w-3 h-3" />
          )}
          {task.meetingFormat === "live"
            ? t("meetingFormat.inPerson")
            : t("meetingFormat.online")}
        </span>
      )}
      {task.type === "setup_task" &&
        task.meetingFormat === "online" &&
        task.meetingLink &&
        !completed && (
          <a
            href={task.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            title={t("meetingLink")}
          >
            <VideoCameraIcon className="w-3 h-3" />
            {t("meetingLink")}
          </a>
        )}

      {/* Right-side time/date block */}
      {task.type === "setup_task" && task.scheduledDate && !completed && (
        <span className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            {new Date(task.scheduledDate).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            {formatTime(task.scheduledDate)}
            {task.scheduledEndDate && (
              <>{" – "}{formatTime(task.scheduledEndDate)}</>
            )}
          </span>
        </span>
      )}
      {(task.type === "document_request" || task.type === "punchlist_item") &&
        task.dueDate &&
        !completed && (
          <span
            className={`hidden sm:inline-flex items-center gap-1 text-xs flex-shrink-0 ${
              overdue
                ? "text-red-600 dark:text-red-400 font-medium"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      {task.type === "stage_signoff" && task.requestedAt && !completed && (
        <span className="hidden sm:inline-flex items-center gap-1 text-xs flex-shrink-0 text-gray-500 dark:text-gray-400">
          <ClockIcon className="w-3.5 h-3.5" />
          {new Date(task.requestedAt).toLocaleDateString()}
        </span>
      )}

      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide rounded-md flex-shrink-0 ${statusBadge.className}`}
      >
        {completed && <CheckCircleIcon className="w-3 h-3" />}
        {overdue && <ExclamationCircleIcon className="w-3 h-3" />}
        {statusBadge.label}
      </span>

      <Link
        href={link}
        className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        aria-label={t("actions.view")}
        title={t("actions.view")}
      >
        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
      </Link>
    </div>
  );
}
