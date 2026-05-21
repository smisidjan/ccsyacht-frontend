"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircleIcon,
  ClockIcon,
  LockClosedIcon,
  TrashIcon,
  PlusIcon,
  Bars3Icon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { pickFreshStageColor } from "@/lib/utils/colors";
import type { StageStatus } from "@/lib/api/types";

/** A stage as the user is editing it in the modal. Mirrors the backend
 *  `Stage` shape but adds a stable React key (so brand-new entries can
 *  live in the same list as existing ones) plus two intent flags the
 *  parent uses on save: `isNew` triggers a create, `isExcluded` (only
 *  ever true for existing stages) triggers a delete. */
export interface LocalStage {
  /** Stable key for React + dnd-kit. Existing stages reuse the backend
   *  identifier; brand-new entries get a synthetic `new-<n>`. */
  key: string;
  /** Backend identifier; null until the row is persisted on save. */
  identifier: string | null;
  name: string;
  color: string | null;
  position: number;
  /** Backend status — undefined for new stages (treated as not_started). */
  status?: { name: StageStatus };
  /** Dependent-record counts from the backend. Any non-zero count
   *  means the DELETE endpoint will 422, so the row is locked. Undefined
   *  for brand-new (unsaved) entries — nothing can be attached yet. */
  punchlistItemsCount?: number;
  remarksCount?: number;
  releaseFormsCount?: number;
  isNew: boolean;
  /** User toggled this existing stage off — render it struck-through
   *  and apply a delete on save. Brand-new entries skip this flag and
   *  use the trash button to disappear from the list outright. */
  isExcluded: boolean;
}

interface StageEditListProps {
  stages: LocalStage[];
  loading: boolean;
  /** Replace the working list. The parent applies the diff against the
   *  server snapshot when the modal's Save button is hit. */
  onChange: (stages: LocalStage[]) => void;
}

/** Stages with these statuses are locked outright: the team has already
 *  signed them off (or is awaiting sign-off). */
const LOCKED_STATUSES: StageStatus[] = ["pending_signoff", "completed"];

/** Any stage carrying attached records (punchlist items / remarks /
 *  release forms) is also locked — the backend's DELETE returns 422 for
 *  those, so the UI shouldn't pretend otherwise. */
const hasDependents = (s: LocalStage) =>
  (s.punchlistItemsCount ?? 0) +
    (s.remarksCount ?? 0) +
    (s.releaseFormsCount ?? 0) >
  0;

const isLocked = (s: LocalStage) =>
  (s.status ? LOCKED_STATUSES.includes(s.status.name) : false) ||
  hasDependents(s);

const statusBadgeColors: Record<StageStatus, string> = {
  not_started: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  in_progress:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  pending_signoff:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  completed:
    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function StageEditList({
  stages,
  loading,
  onChange,
}: StageEditListProps) {
  const t = useTranslations("areas");
  const tStatus = useTranslations("areaDetail");

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>("");
  const [addError, setAddError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const ordered = [...stages].sort((a, b) => a.position - b.position);
  const usedColors = ordered.map((s) => s.color);

  const lockedStages = ordered.filter(isLocked);
  const unlockedStages = ordered.filter((s) => !isLocked(s));
  const sortableIds = unlockedStages.map((s) => s.key);

  const startAdding = () => {
    setNewName("");
    setNewColor(pickFreshStageColor(usedColors));
    setAddError(null);
    setIsAdding(true);
  };

  const submitAdd = () => {
    const name = newName.trim();
    if (!name) {
      setAddError(t("addStageNameRequired"));
      return;
    }
    const nextSort =
      ordered.length === 0
        ? 0
        : Math.max(...ordered.map((s) => s.position)) + 1;
    // Synthetic key — counts new rows so multiple unsaved additions
    // don't collide. Numeric suffix matches the count of existing news.
    const newCount = stages.filter((s) => s.isNew).length;
    const newStage: LocalStage = {
      key: `new-${newCount + 1}`,
      identifier: null,
      name,
      color: newColor || null,
      position: nextSort,
      isNew: true,
      isExcluded: false,
    };
    onChange([...stages, newStage]);
    setIsAdding(false);
  };

  /** Pop a brand-new (unsaved) stage out of the list. No confirmation —
   *  there's nothing on the server to lose yet. */
  const handleRemoveNew = (target: LocalStage) => {
    onChange(stages.filter((s) => s.key !== target.key));
  };

  /** Flip an existing stage's exclude flag. The row stays in the list
   *  so the user can undo, but the parent will dispatch a delete on
   *  save if it's still excluded by then. */
  const toggleExisting = (target: LocalStage) => {
    onChange(
      stages.map((s) =>
        s.key === target.key ? { ...s, isExcluded: !s.isExcluded } : s
      )
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortableIds.indexOf(active.id as string);
    const newIndex = sortableIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(unlockedStages, oldIndex, newIndex);

    // Renumber the unlocked group starting right after the last locked
    // position. Locked stages keep their own positions untouched so
    // they stay frozen at the top.
    const baseSort =
      lockedStages.length === 0
        ? 0
        : Math.max(...lockedStages.map((s) => s.position)) + 1;
    const repositionedUnlocked = reordered.map((s, i) => ({
      ...s,
      position: baseSort + i,
    }));
    onChange([...lockedStages, ...repositionedUnlocked]);
  };

  return (
    <div className="space-y-3">
      {ordered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("noStagesYet")}
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("stagesCount", { count: ordered.length })}
          </p>

          {lockedStages.length > 0 && (
            <ul className="space-y-2">
              {lockedStages.map((stage) => (
                <LockedRow
                  key={stage.key}
                  stage={stage}
                  statusBadgeClass={
                    stage.status
                      ? statusBadgeColors[stage.status.name]
                      : statusBadgeColors.not_started
                  }
                  statusLabel={
                    stage.status
                      ? tStatus(`status.${stage.status.name}`)
                      : tStatus("status.not_started")
                  }
                  lockedTitle={
                    hasDependents(stage)
                      ? t("stageLockedByDependents")
                      : t("stageLocked")
                  }
                />
              ))}
            </ul>
          )}

          {unlockedStages.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortableIds}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {unlockedStages.map((stage) => (
                    <SortableUnlockedRow
                      key={stage.key}
                      stage={stage}
                      statusBadgeClass={
                        stage.status
                          ? statusBadgeColors[stage.status.name]
                          : statusBadgeColors.not_started
                      }
                      statusLabel={
                        stage.status
                          ? tStatus(`status.${stage.status.name}`)
                          : tStatus("status.not_started")
                      }
                      onRemoveNew={() => handleRemoveNew(stage)}
                      onToggleExclude={() => toggleExisting(stage)}
                      excludeLabel={t("excludeStage")}
                      restoreLabel={t("restoreStage")}
                      removeLabel={t("removeNewStage")}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {isAdding ? (
        <div className="space-y-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor || "#6B7280"}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer flex-shrink-0"
              title={t("stageColor")}
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitAdd();
                }
              }}
              placeholder={t("newStagePlaceholder")}
              autoFocus
              className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {addError && (
            <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={submitAdd}
              disabled={!newName.trim()}
              className="px-3 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {t("add")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startAdding}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          {t("addStage")}
        </button>
      )}
    </div>
  );
}

interface LockedRowProps {
  stage: LocalStage;
  statusBadgeClass: string;
  statusLabel: string;
  lockedTitle: string;
}

function LockedRow({
  stage,
  statusBadgeClass,
  statusLabel,
  lockedTitle,
}: LockedRowProps) {
  const isCompleted = stage.status?.name === "completed";
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 opacity-80">
      {isCompleted ? (
        <CheckCircleIcon
          className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0"
          aria-hidden="true"
        />
      ) : (
        <ClockIcon
          className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0"
          aria-hidden="true"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-gray-600 dark:text-gray-400">
          {stage.name}
        </p>
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadgeClass}`}
        >
          {statusLabel}
        </span>
      </div>
      <LockClosedIcon
        className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
        aria-hidden="true"
        title={lockedTitle}
      />
    </li>
  );
}

interface SortableUnlockedRowProps {
  stage: LocalStage;
  statusBadgeClass: string;
  statusLabel: string;
  /** Hard-remove an unsaved (brand-new) stage from the list. */
  onRemoveNew: () => void;
  /** Toggle the `isExcluded` flag on an existing stage. */
  onToggleExclude: () => void;
  excludeLabel: string;
  restoreLabel: string;
  removeLabel: string;
}

function SortableUnlockedRow({
  stage,
  statusBadgeClass,
  statusLabel,
  onRemoveNew,
  onToggleExclude,
  excludeLabel,
  restoreLabel,
  removeLabel,
}: SortableUnlockedRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.key });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
        stage.isExcluded
          ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 opacity-60"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 touch-none"
        aria-label="Drag to reorder"
      >
        <Bars3Icon className="w-4 h-4" />
      </button>
      <span
        className="inline-block w-3 h-3 rounded-sm flex-shrink-0 border border-gray-200 dark:border-gray-600"
        style={{ backgroundColor: stage.color ?? "#6B7280" }}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            stage.isExcluded
              ? "text-gray-500 dark:text-gray-500 line-through"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {stage.name}
        </p>
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadgeClass}`}
        >
          {statusLabel}
        </span>
      </div>
      {stage.isNew ? (
        // Unsaved row — hard-remove from the working list, no
        // confirmation needed (nothing on the server to lose).
        <button
          type="button"
          onClick={onRemoveNew}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
          aria-label={removeLabel}
          title={removeLabel}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      ) : (
        // Existing row — toggle between included (trash icon) and
        // excluded (restore icon). The actual delete happens on save.
        <button
          type="button"
          onClick={onToggleExclude}
          className={`p-1 flex-shrink-0 ${
            stage.isExcluded
              ? "text-blue-600 hover:text-blue-700 dark:text-blue-400"
              : "text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          }`}
          aria-label={stage.isExcluded ? restoreLabel : excludeLabel}
          title={stage.isExcluded ? restoreLabel : excludeLabel}
        >
          {stage.isExcluded ? (
            <ArrowUturnLeftIcon className="w-4 h-4" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </button>
      )}
    </li>
  );
}
