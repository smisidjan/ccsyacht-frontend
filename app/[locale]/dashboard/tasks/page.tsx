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
import FilterPopover from "@/app/components/ui/FilterPopover";
import TaskRow, { type TaskItem } from "@/app/features/tasks/components/TaskRow";

/** Task buckets the user can multi-select in the Filter popover.
 *  Maps 1:1 onto `TaskItem.type` so the predicate stays trivial. */
const TASK_TYPE_OPTIONS = [
  { value: "document_request", labelKey: "documents" },
  { value: "punchlist_item", labelKey: "punchlist" },
  { value: "setup_task", labelKey: "meetings" },
  { value: "document_acknowledgement", labelKey: "acknowledgements" },
  { value: "stage_signoff", labelKey: "signoffs" },
] as const;

type TaskType = (typeof TASK_TYPE_OPTIONS)[number]["value"];

function matchesTypes(task: TaskItem, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.includes(task.type);
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
  // Empty selection on either axis = no constraint (matches all). The
  // popover lets the user multi-pick across types and projects — same
  // Jira-style semantics as the punchlist filter.
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<TaskType[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
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

  // Project options derived from the loaded tasks — only offering
  // projects that actually have a task in scope keeps the filter
  // tight to the user's current data.
  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const task of allTasks) {
      seen.set(task.project.identifier, task.project.name);
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allTasks]);

  const filtered = useMemo(
    () =>
      allTasks.filter(
        (task) =>
          matchesTypes(task, selectedTaskTypes) &&
          (selectedProjectIds.length === 0 ||
            selectedProjectIds.includes(task.project.identifier)) &&
          matchesSearch(task, searchQuery)
      ),
    [allTasks, selectedTaskTypes, selectedProjectIds, searchQuery]
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

        {/* Search + filter — same visual language as the punchlist:
            search box on the left, multi-select Filter popover on the
            right. The popover's `Type` section replaces the old
            single-select tab strip and keeps multi-pick semantics
            (empty = all). */}
        <div className="flex items-center flex-wrap gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <FilterPopover
            triggerLabel={t("filterLabel")}
            sections={[
              {
                id: "type",
                label: t("filterCategoryType"),
                searchPlaceholder: t("filterSearchType"),
                options: TASK_TYPE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: t(`filters.${opt.labelKey}`),
                })),
                selected: selectedTaskTypes,
                onChange: (next) =>
                  setSelectedTaskTypes(next as TaskType[]),
              },
              {
                id: "project",
                label: t("filterCategoryProject"),
                searchPlaceholder: t("filterSearchProject"),
                emptyLabel: t("filterNoProjects"),
                options: projectOptions.map((p) => ({
                  value: p.id,
                  label: p.name,
                })),
                selected: selectedProjectIds,
                onChange: setSelectedProjectIds,
              },
            ]}
            onClearAll={
              selectedTaskTypes.length + selectedProjectIds.length > 0
                ? () => {
                    setSelectedTaskTypes([]);
                    setSelectedProjectIds([]);
                  }
                : undefined
            }
            activeCountLabel={(count) =>
              t("filterActiveCount", { count })
            }
            clearAllLabel={t("filterClear")}
          />
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
