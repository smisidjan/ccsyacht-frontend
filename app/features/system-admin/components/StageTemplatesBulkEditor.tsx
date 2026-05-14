"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { Bars3Icon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Spinner from "@/app/components/ui/Spinner";
import Alert from "@/app/components/ui/Alert";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
import { systemStageTemplatesApi } from "@/lib/api/system";
import { useToast } from "@/app/context/ToastContext";
import {
  isValidStageColor,
  normalizeStageColor,
  pickFreshStageColor,
} from "@/lib/utils/colors";
import type { ApiError, StageTemplate } from "@/lib/api/types";

interface StageTemplatesBulkEditorProps {
  tenantId: string;
}

interface StageRow {
  /** UI-only key for React + dnd; never sent to the server. */
  rowId: string;
  /** Persisted id; null means "create on next save". */
  identifier: string | null;
  name: string;
  description: string;
  /** Hex color (`#RRGGBB`) or null for "no color set" (legacy data). New rows
   *  always default to a fresh palette color. */
  color: string | null;
  isActive: boolean;
}

/** Snapshot the rows for a dirty check (rowId excluded since it's UI-only). */
function snapshot(rows: StageRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      id: r.identifier,
      name: r.name,
      description: r.description,
      color: r.color,
      isActive: r.isActive,
    }))
  );
}

function rowsFromTemplates(templates: StageTemplate[]): StageRow[] {
  return templates.map((t) => ({
    rowId: crypto.randomUUID(),
    identifier: t.identifier,
    name: t.name,
    description: t.description ?? "",
    color: t.color,
    isActive: t.isActive,
  }));
}

function SortableRow({
  row,
  rowError,
  colorError,
  isEditing,
  onChange,
  onDelete,
  t,
}: {
  row: StageRow;
  rowError?: string;
  colorError?: boolean;
  isEditing: boolean;
  onChange: (patch: Partial<StageRow>) => void;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.rowId, disabled: !isEditing });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // In view-mode the inputs look like labels (transparent border/bg), in
  // edit-mode they look like proper form fields. Keeps row heights stable
  // across the toggle.
  const inputBase = "w-full px-2 py-1.5 text-sm border rounded";
  const inputMode = isEditing
    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
    : "bg-transparent border-transparent text-gray-900 dark:text-white cursor-default";
  const nameBorder = isEditing
    ? rowError
      ? "border-red-500 dark:border-red-400"
      : "border-gray-300 dark:border-gray-600"
    : "";
  const descBorder = isEditing ? "border-gray-300 dark:border-gray-600" : "";

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-gray-200 dark:border-gray-700"
    >
      <td className="px-2 py-2 w-10">
        {isEditing && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={t("dragHandle")}
            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
        )}
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={row.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={t("namePlaceholder")}
          maxLength={255}
          readOnly={!isEditing}
          tabIndex={isEditing ? 0 : -1}
          className={`${inputBase} ${inputMode} ${nameBorder}`}
        />
        {isEditing && rowError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{rowError}</p>
        )}
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={row.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={isEditing ? t("descriptionPlaceholder") : "-"}
          maxLength={1000}
          readOnly={!isEditing}
          tabIndex={isEditing ? 0 : -1}
          className={`${inputBase} ${inputMode} ${descBorder}`}
        />
      </td>
      <td className="px-3 py-2 w-24">
        <div
          className={`flex items-center gap-2 ${
            colorError ? "ring-2 ring-red-500 dark:ring-red-400 rounded p-0.5" : ""
          }`}
        >
          <span
            className="inline-block w-6 h-6 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
            style={{ backgroundColor: row.color ?? "transparent" }}
            aria-hidden="true"
          />
          {isEditing ? (
            <input
              type="color"
              value={row.color ?? "#000000"}
              onChange={(e) => onChange({ color: e.target.value })}
              aria-label={t("color")}
              className="w-8 h-6 p-0 border-0 bg-transparent cursor-pointer"
            />
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {row.color ?? "—"}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-center w-20">
        <input
          type="checkbox"
          checked={row.isActive}
          onChange={(e) => onChange({ isActive: e.target.checked })}
          disabled={!isEditing}
          aria-label={t("active")}
        />
      </td>
      <td className="px-3 py-2 w-16 text-center">
        {isEditing && (
          <button
            type="button"
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 p-1"
            aria-label={t("removeRow")}
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        )}
      </td>
    </tr>
  );
}

export default function StageTemplatesBulkEditor({
  tenantId,
}: StageTemplatesBulkEditorProps) {
  const t = useTranslations("systemSettings.templates.stagesEditor");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<StageRow[]>([]);
  /** Snapshot of the last server-known state; used for dirty check + revert. */
  const [baselineSnapshot, setBaselineSnapshot] = useState<string>("");
  /** Per-row error map keyed by rowId. Cleared as the user edits. */
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  /** Banner-level error (top-of-form), e.g. duplicate names. */
  const [topError, setTopError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmEmptySave, setConfirmEmptySave] = useState(false);
  /** View vs edit mode. View shows the list as read-only with an Edit button;
   *  edit unlocks drag, inputs, add/remove, and reveals Save + Cancel. */
  const [isEditing, setIsEditing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await systemStageTemplatesApi.getAll(tenantId);
        if (cancelled) return;
        const initialRows = rowsFromTemplates(response.data);
        setRows(initialRows);
        setBaselineSnapshot(snapshot(initialRows));
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load stage templates";
        setLoadError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const isDirty = useMemo(() => snapshot(rows) !== baselineSnapshot, [rows, baselineSnapshot]);

  /** Names that collide within the current rows (case-insensitive, trimmed).
   *  Surfaced as a top-level error so the user fixes it before hitting the
   *  server-side check. */
  const duplicateNames = useMemo(() => {
    const seen = new Map<string, number>();
    const dups = new Set<string>();
    for (const r of rows) {
      const key = r.name.trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) dups.add(key);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return dups;
  }, [rows]);

  const hasDuplicateNames = duplicateNames.size > 0;
  const hasEmptyName = rows.some((r) => !r.name.trim());

  /** Hex colors that collide within the current rows (case-insensitive).
   *  Mirrors the bulk endpoint's server-side uniqueness rule. */
  const duplicateColors = useMemo(() => {
    const seen = new Map<string, number>();
    const dups = new Set<string>();
    for (const r of rows) {
      const key = normalizeStageColor(r.color);
      if (!key) continue;
      if (seen.has(key)) dups.add(key);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return dups;
  }, [rows]);

  const hasDuplicateColors = duplicateColors.size > 0;
  const hasInvalidColor = rows.some(
    (r) => r.color !== null && !isValidStageColor(r.color)
  );
  const canSave =
    isDirty &&
    !hasDuplicateNames &&
    !hasDuplicateColors &&
    !hasEmptyName &&
    !hasInvalidColor &&
    !saving;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRows((prev) => {
        const oldIndex = prev.findIndex((r) => r.rowId === active.id);
        const newIndex = prev.findIndex((r) => r.rowId === over.id);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleAddRow = () => {
    setRows((prev) => {
      // Suggest the first palette color not already used by another row in
      // the current list, so the user rarely has to think about uniqueness.
      const freshColor = pickFreshStageColor(prev.map((r) => r.color));
      return [
        ...prev,
        {
          rowId: crypto.randomUUID(),
          identifier: null,
          name: "",
          description: "",
          color: freshColor,
          isActive: true,
        },
      ];
    });
  };

  const handleRowChange = (rowId: string, patch: Partial<StageRow>) => {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
    // Clear stale per-row error as soon as the user types.
    if (rowErrors[rowId]) {
      setRowErrors((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
    }
  };

  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const handleRevert = () => {
    // Re-derive from baseline: snapshot is JSON of the persisted fields.
    const parsed = JSON.parse(baselineSnapshot) as Array<{
      id: string | null;
      name: string;
      description: string;
      color: string | null;
      isActive: boolean;
    }>;
    setRows(
      parsed.map((p) => ({
        rowId: crypto.randomUUID(),
        identifier: p.id,
        name: p.name,
        description: p.description,
        color: p.color,
        isActive: p.isActive,
      }))
    );
    setRowErrors({});
    setTopError(null);
    setIsEditing(false);
  };

  /** Perform the actual save. Split from the click handler so the empty-list
   *  confirm dialog can call this after the user agrees. */
  const persistSave = async () => {
    setSaving(true);
    setTopError(null);
    setRowErrors({});
    try {
      const payload = {
        stages: rows.map((r) => ({
          identifier: r.identifier,
          name: r.name.trim(),
          description: r.description.trim() || undefined,
          color: r.color ?? null,
          is_active: r.isActive,
        })),
      };
      const response = await systemStageTemplatesApi.bulkReplace(tenantId, payload);
      const nextRows = rowsFromTemplates(response.data);
      setRows(nextRows);
      setBaselineSnapshot(snapshot(nextRows));
      setIsEditing(false);
      showToast("success", t("saveSuccess"));
    } catch (err) {
      const apiErr = err as ApiError | undefined;
      if (apiErr?.errors) {
        // Laravel-style: keys like "stages.0.name". Map index → rowId via the
        // row order at submit time (rows array hasn't been replaced yet on
        // failure).
        const perRow: Record<string, string> = {};
        let banner: string | null = null;
        for (const [field, messages] of Object.entries(apiErr.errors)) {
          const msg = Array.isArray(messages) ? messages[0] : String(messages);
          const match = field.match(/^stages\.(\d+)\.(\w+)$/);
          if (match) {
            const idx = Number(match[1]);
            const row = rows[idx];
            if (row) perRow[row.rowId] = msg;
          } else {
            // Non-row-scoped error (e.g. duplicate-name summary) — surface up top.
            banner = msg;
          }
        }
        setRowErrors(perRow);
        setTopError(banner ?? apiErr.message ?? null);
      } else {
        setTopError(apiErr?.message ?? t("saveError"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (rows.length === 0) {
      setConfirmEmptySave(true);
      return;
    }
    void persistSave();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (loadError) {
    return <Alert type="error" message={loadError} />;
  }

  return (
    <div className="space-y-4">
      {topError && <Alert type="error" message={topError} />}
      {isEditing && hasDuplicateNames && (
        <Alert type="warning" message={t("duplicateNamesWarning")} />
      )}
      {isEditing && hasDuplicateColors && (
        <Alert type="warning" message={t("duplicateColorsWarning")} />
      )}

      {!isEditing && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
            <PencilIcon className="w-4 h-4" />
            {t("edit")}
          </Button>
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-2 py-3 w-10" />
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t("name")}
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  {t("description")}
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">
                  {t("color")}
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-20">
                  {t("active")}
                </th>
                <th className="px-3 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                <SortableContext
                  items={rows.map((r) => r.rowId)}
                  strategy={verticalListSortingStrategy}
                >
                  {rows.map((row) => {
                    const normalized = normalizeStageColor(row.color);
                    const colorError = normalized
                      ? duplicateColors.has(normalized)
                      : false;
                    return (
                      <SortableRow
                        key={row.rowId}
                        row={row}
                        rowError={rowErrors[row.rowId]}
                        colorError={colorError}
                        isEditing={isEditing}
                        onChange={(patch) => handleRowChange(row.rowId, patch)}
                        onDelete={() => handleDeleteRow(row.rowId)}
                        t={t}
                      />
                    );
                  })}
                </SortableContext>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>

      {isEditing && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={handleAddRow}>
            <PlusIcon className="w-4 h-4" />
            {t("addStage")}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleRevert} disabled={saving}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              loading={saving}
            >
              {t("save")}
            </Button>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={confirmEmptySave}
        onClose={() => setConfirmEmptySave(false)}
        onConfirm={async () => {
          setConfirmEmptySave(false);
          await persistSave();
        }}
        title={t("emptySaveTitle")}
        message={t("emptySaveMessage")}
        successMessage={t("saveSuccess")}
        confirmLabel={t("emptySaveConfirm")}
        showIcon
      />
    </div>
  );
}
