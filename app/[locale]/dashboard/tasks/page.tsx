"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useMyTasks } from "@/lib/api";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import TaskRow, { type TaskItem } from "@/app/features/tasks/components/TaskRow";

type FilterType =
  | "all"
  | "documents"
  | "punchlist"
  | "meetings"
  | "acknowledgements"
  | "signoffs";

const FILTER_TYPES: FilterType[] = [
  "all",
  "documents",
  "punchlist",
  "meetings",
  "acknowledgements",
  "signoffs",
];

function matchesType(task: TaskItem, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (filter === "documents") return task.type === "document_request";
  if (filter === "punchlist") return task.type === "punchlist_item";
  if (filter === "meetings") return task.type === "setup_task";
  if (filter === "acknowledgements") return task.type === "document_acknowledgement";
  if (filter === "signoffs") return task.type === "stage_signoff";
  return true;
}

function matchesSearch(task: TaskItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack: string[] = [task.project.name];
  if (task.type === "document_request") haystack.push(task.documentType.name);
  if (task.type === "punchlist_item") {
    haystack.push(task.name, task.description || "", task.area.name, task.stage.name);
  }
  if (task.type === "setup_task") haystack.push(task.name);
  if (task.type === "document_acknowledgement") {
    haystack.push(task.document.title, task.documentType.name);
  }
  if (task.type === "stage_signoff") {
    haystack.push(task.stage.name, task.area.name, task.deck.name);
  }
  return haystack.some((s) => s.toLowerCase().includes(q));
}

function taskBucket(task: TaskItem): "overdue" | "pending" | "completed" {
  if (task.type === "document_request") {
    if (task.isCompleted) return "completed";
    if (task.isOverdue) return "overdue";
    return "pending";
  }
  if (task.type === "punchlist_item") {
    if (task.status === "done") return "completed";
    if (task.isOverdue) return "overdue";
    return "pending";
  }
  if (task.type === "setup_task") return task.hasSigned ? "completed" : "pending";
  if (task.type === "document_acknowledgement") {
    return task.isAcknowledged ? "completed" : "pending";
  }
  if (task.type === "stage_signoff") return task.hasSigned ? "completed" : "pending";
  return "pending";
}

export default function MyTasksPage() {
  const t = useTranslations("myTasks");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: tasks, loading: rawLoading, error } = useMyTasks();
  const loading = useMinimumLoadingTime(rawLoading);

  const allTasks = useMemo<TaskItem[]>(() => {
    if (!tasks) return [];
    return [
      ...tasks.documentRequests,
      ...tasks.punchlistItems,
      ...tasks.setupTasks,
      ...(tasks.documentAcknowledgements || []),
      ...(tasks.stageSignoffs || []),
    ];
  }, [tasks]);

  const filtered = useMemo(
    () => allTasks.filter((task) => matchesType(task, filterType) && matchesSearch(task, searchQuery)),
    [allTasks, filterType, searchQuery]
  );

  // Review documents (document_acknowledgement) are always tied to a
  // kick-off meeting (setup_task). When both are in scope, render the
  // ack rows nested under their parent meeting so the relationship is
  // visually explicit. Acks whose meeting isn't in scope render
  // standalone in their own bucket.
  const { buckets, ackChildren } = useMemo(() => {
    const meetingsInScope = new Set<string>();
    filtered.forEach((task) => {
      if (task.type === "setup_task") meetingsInScope.add(task.identifier);
    });

    const children = new Map<string, TaskItem[]>();
    const childAckIds = new Set<string>();
    filtered.forEach((task) => {
      if (task.type !== "document_acknowledgement") return;
      const meetingId = task.setupTask.identifier;
      if (!meetingsInScope.has(meetingId)) return;
      if (!children.has(meetingId)) children.set(meetingId, []);
      children.get(meetingId)!.push(task);
      childAckIds.add(task.identifier);
    });

    const overdue: TaskItem[] = [];
    const pending: TaskItem[] = [];
    const completed: TaskItem[] = [];
    filtered.forEach((task) => {
      if (task.type === "document_acknowledgement" && childAckIds.has(task.identifier)) {
        return;
      }
      const bucket = taskBucket(task);
      if (bucket === "overdue") overdue.push(task);
      else if (bucket === "pending") pending.push(task);
      else completed.push(task);
    });

    return { buckets: { overdue, pending, completed }, ackChildren: children };
  }, [filtered]);

  if (loading) {
    return <LoadingSkeleton type="list" rows={8} />;
  }

  if (error) {
    return <Alert type="error" message={error.message || t("loadError")} />;
  }

  const counts = tasks?.counts;
  const hasAnyTasks = allTasks.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ClipboardDocumentListIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {t("title")}
              </h1>
              {counts && hasAnyTasks ? (
                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true" />
                    <span className="font-semibold text-gray-900 dark:text-white">{counts.overdue}</span>
                    <span>{t("stats.overdue").toLowerCase()}</span>
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                    <span className="font-semibold text-gray-900 dark:text-white">{counts.pending}</span>
                    <span>{t("stats.pending").toLowerCase()}</span>
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
                    <span className="font-semibold text-gray-900 dark:text-white">{counts.completed}</span>
                    <span>{t("stats.completed").toLowerCase()}</span>
                  </span>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {t("subtitle")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 overflow-x-auto">
            {FILTER_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filterType === type
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {t(`filters.${type}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {!hasAnyTasks && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <ClipboardDocumentListIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {t("empty.title")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("empty.description")}
            </p>
          </div>
        )}

        {hasAnyTasks && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {t("empty.noTasksFiltered")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("empty.tryDifferentFilter")}
            </p>
          </div>
        )}

        {/* Buckets */}
        {hasAnyTasks && filtered.length > 0 && (
          <div className="space-y-6">
            {buckets.overdue.length > 0 && (
              <TaskBucket
                label={t("groups.overdue")}
                count={buckets.overdue.length}
                accent="red"
                tasks={buckets.overdue}
                ackChildren={ackChildren}
              />
            )}
            {buckets.pending.length > 0 && (
              <TaskBucket
                label={t("groups.pending")}
                count={buckets.pending.length}
                accent="amber"
                tasks={buckets.pending}
                ackChildren={ackChildren}
              />
            )}
            {buckets.completed.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform ${showCompleted ? "" : "-rotate-90"}`}
                  />
                  <span>{t("groups.completed")}</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    {buckets.completed.length}
                  </span>
                </button>
                {showCompleted && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md dark:shadow-lg dark:shadow-black/20">
                    {buckets.completed.map((task) => (
                      <TaskGroup
                        key={`${task.type}-${task.identifier}`}
                        task={task}
                        nestedItems={ackChildren.get(task.identifier)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
}

interface TaskBucketProps {
  label: string;
  count: number;
  accent: "red" | "amber";
  tasks: TaskItem[];
  ackChildren: Map<string, TaskItem[]>;
}

function TaskBucket({ label, count, accent, tasks, ackChildren }: TaskBucketProps) {
  const accentClass =
    accent === "red"
      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {label}
        </h2>
        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${accentClass}`}>
          {count}
        </span>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md dark:shadow-lg dark:shadow-black/20">
        {tasks.map((task) => (
          <TaskGroup
            key={`${task.type}-${task.identifier}`}
            task={task}
            nestedItems={ackChildren.get(task.identifier)}
          />
        ))}
      </div>
    </div>
  );
}

interface TaskGroupProps {
  task: TaskItem;
  nestedItems?: TaskItem[];
}

function TaskGroup({ task, nestedItems }: TaskGroupProps) {
  const hasChildren = !!nestedItems && nestedItems.length > 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TaskRow
        task={task}
        expandable={hasChildren}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
      />
      {hasChildren && expanded && nestedItems!.map((child) => (
        <TaskRow key={`${child.type}-${child.identifier}`} task={child} nested />
      ))}
    </>
  );
}
