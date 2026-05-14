"use client";

import { useState, useEffect, useMemo } from "react";
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
import BaseModal from "@/app/components/modals/BaseModal";
import Alert from "@/app/components/ui/Alert";
import { stageTemplatesApi } from "@/lib/api/stageTemplates";
import { stagesApi } from "@/lib/api/stages";
import { handleError } from "@/lib/utils/errors";
import { normalizeStageColor, pickFreshStageColor } from "@/lib/utils/colors";
import { Bars3Icon, TrashIcon } from "@heroicons/react/24/outline";

interface CreateStagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  areaId: string;
  onSuccess?: () => void;
}

interface StageRow {
  id: string; // temp UUID for drag & drop
  name: string;
  /** Hex color sent to the backend. Seeded from the template's color when the
   *  row comes from a template, or a fresh palette pick when the user adds a
   *  custom row. */
  color: string;
  /** True for rows loaded from a tenant stage template — their color is
   *  managed centrally by a system admin, so the picker is hidden here
   *  (swatch stays visible). Custom rows added on-the-fly are editable. */
  isFromTemplate: boolean;
}

// Sortable row component
function SortableStageRow({
  stage,
  colorClash,
  onChangeColor,
  onDelete,
}: {
  stage: StageRow;
  colorClash: boolean;
  onChangeColor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("stages");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-200 dark:border-gray-700">
      <td className="px-2 py-3 w-10">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          {...attributes}
          {...listeners}
          aria-label={t("dragToReorder")}
        >
          <Bars3Icon className="w-5 h-5" />
        </button>
      </td>
      <td className="px-4 py-3 w-24">
        <div
          className={`flex items-center gap-2 ${
            colorClash ? "ring-2 ring-red-500 dark:ring-red-400 rounded p-0.5" : ""
          }`}
        >
          <span
            className="inline-block w-5 h-5 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
            style={{ backgroundColor: stage.color }}
            aria-hidden="true"
          />
          {stage.isFromTemplate ? (
            // Template colors are owned by a system admin; show the value but
            // don't let the host change it here.
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {stage.color}
            </span>
          ) : (
            <input
              type="color"
              value={stage.color}
              onChange={(e) => onChangeColor(stage.id, e.target.value)}
              aria-label={t("color")}
              className="w-7 h-6 p-0 border-0 bg-transparent cursor-pointer"
            />
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-900 dark:text-gray-100">{stage.name}</span>
      </td>
      <td className="px-4 py-3 w-16 text-center">
        <button
          type="button"
          onClick={() => onDelete(stage.id)}
          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
          aria-label={`${t("deleteStage")} - ${stage.name}`}
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </td>
    </tr>
  );
}

export default function CreateStagesModal({
  isOpen,
  onClose,
  projectId,
  areaId,
  onSuccess,
}: CreateStagesModalProps) {
  const t = useTranslations("stages");
  const [stages, setStages] = useState<StageRow[]>([]);
  const [customStageName, setCustomStageName] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  /** Colors duplicated between rows (case-insensitive). Block Save until
   *  fixed — mirrors the bulk-template editor and the area-create modal. */
  const duplicateColors = useMemo(() => {
    const seen = new Map<string, number>();
    const dups = new Set<string>();
    for (const row of stages) {
      const key = normalizeStageColor(row.color);
      if (!key) continue;
      if (seen.has(key)) dups.add(key);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return dups;
  }, [stages]);
  const hasDuplicateColors = duplicateColors.size > 0;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch stage templates on mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await stageTemplatesApi.getAll({ active_only: true });
      const templates = response.data || [];

      // Convert templates to stage rows. Templates without a color (legacy
      // data) fall back to a fresh palette pick computed against the rows
      // already assigned — keeps the list duplicate-free out of the box.
      const stageRows: StageRow[] = [];
      for (const template of templates) {
        const color =
          template.color ?? pickFreshStageColor(stageRows.map((r) => r.color));
        stageRows.push({
          id: crypto.randomUUID(),
          name: template.name,
          color,
          isFromTemplate: true,
        });
      }

      setStages(stageRows);
    } catch (error) {
      handleError(error, { severity: "console", context: "Failed to load stage templates" });
      setStages([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setStages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddCustomStage = () => {
    const trimmedName = customStageName.trim();
    if (!trimmedName) return;

    setStages((prev) => {
      const freshColor = pickFreshStageColor(prev.map((r) => r.color));
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: trimmedName,
          color: freshColor,
          isFromTemplate: false,
        },
      ];
    });
    setCustomStageName("");
  };

  const handleChangeColor = (id: string, color: string) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, color } : s)));
  };

  const handleDeleteStage = (id: string) => {
    setStages((prev) => prev.filter((stage) => stage.id !== id));
  };

  const handleSubmit = async () => {
    // Transform stages to API format with sort_order
    const bulkCreateRequest = {
      stages: stages.map((stage, index) => ({
        name: stage.name,
        color: stage.color,
        sort_order: index,
      })),
    };

    await stagesApi.bulkCreate(projectId, areaId, bulkCreateRequest);

    // Call onSuccess callback if provided
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleClose = () => {
    setStages([]);
    setCustomStageName("");
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("bulkCreate")}
      size="lg"
      formId="create-stages-form"
      onSubmit={handleSubmit}
      successMessage={t("bulkCreateSuccess")}
      errorFallbackMessage={t("bulkCreateError")}
      submitDisabled={stages.length === 0 || hasDuplicateColors}
    >
      <div className="space-y-4">
        {hasDuplicateColors && (
          <Alert type="warning" message={t("duplicateColorsWarning")} />
        )}

        {/* Add custom stage input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customStageName}
            onChange={(e) => setCustomStageName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomStage();
              }
            }}
            placeholder={t("addCustomStage")}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAddCustomStage}
            disabled={!customStageName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            + {t("addStage")}
          </button>
        </div>

        {/* Loading state */}
        {isLoadingTemplates && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t("loading")}...
          </div>
        )}

        {/* No templates message */}
        {!isLoadingTemplates && stages.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t("noTemplatesFound")}
          </div>
        )}

        {/* Stages table */}
        {!isLoadingTemplates && stages.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-2 py-3 w-10"></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">
                      {t("color")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {t("name")}
                    </th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  <SortableContext items={stages} strategy={verticalListSortingStrategy}>
                    {stages.map((stage) => {
                      const normalized = normalizeStageColor(stage.color);
                      const colorClash = normalized
                        ? duplicateColors.has(normalized)
                        : false;
                      return (
                        <SortableStageRow
                          key={stage.id}
                          stage={stage}
                          colorClash={colorClash}
                          onChangeColor={handleChangeColor}
                          onDelete={handleDeleteStage}
                        />
                      );
                    })}
                  </SortableContext>
                </tbody>
              </table>
            </div>
          </DndContext>
        )}

        {/* Footer count */}
        {stages.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {t("stagesConfigured", { count: stages.length })}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
