"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import FormSelect from "@/app/components/ui/FormSelect";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { areasApi, useAreas, useDecks } from "@/lib/api";
import { stageTemplatesApi } from "@/lib/api/stageTemplates";
import { usePolygonHistory } from "./usePolygonHistory";
import { useGAImage } from "@/lib/hooks/useGAImage";
import { handleError } from "@/lib/utils/errors";
import { normalizeStageColor, pickFreshStageColor } from "@/lib/utils/colors";
import {
  XMarkIcon,
  PlusIcon,
  Bars3Icon,
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
import type {
  Area,
  AreaPolygonPoint,
  CreateAreaStageInput,
  GeneralArrangement,
  StageTemplate,
  ApiError,
} from "@/lib/api/types";

/** A single ordered list of stages combines template-derived rows (with an
 *  include checkbox) and custom rows (with a remove button), so the user can
 *  drag any row anywhere in the order. The list maps 1:1 to the backend
 *  `stages` array (a discriminated union of template/custom entries), so
 *  the visible order is exactly what gets persisted.
 *
 *  `color` is shown on every row so the user can see what's already taken;
 *  template rows display their inherited color read-only, custom rows let
 *  the user pick (with a fresh-color suggestion when added). */
type StageRow =
  | {
      id: string;
      kind: "template";
      templateId: string;
      name: string;
      color: string | null;
      included: boolean;
    }
  | { id: string; kind: "custom"; name: string; color: string };

function SortableStageRow({
  row,
  colorClash,
  onToggleInclude,
  onChangeColor,
  onRemove,
}: {
  row: StageRow;
  colorClash: boolean;
  onToggleInclude: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const muted = row.kind === "template" && !row.included;
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-1 text-sm ${
        muted ? "text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-200"
      }`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <Bars3Icon className="w-4 h-4" />
      </button>
      {row.kind === "template" ? (
        <input
          type="checkbox"
          checked={row.included}
          onChange={() => onToggleInclude(row.id)}
        />
      ) : (
        // Custom rows don't have an include toggle — they exist only when the
        // user added them, removing is the way to opt out. Spacer keeps row
        // alignment consistent with template rows.
        <span className="w-4" aria-hidden="true" />
      )}
      {/* Color swatch: read-only for template rows (inherits from template),
          editable native picker for custom rows. */}
      <span
        className={`inline-flex items-center gap-1 flex-shrink-0 ${
          colorClash ? "ring-2 ring-red-500 dark:ring-red-400 rounded p-0.5" : ""
        }`}
      >
        <span
          className="inline-block w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: row.color ?? "transparent" }}
          aria-hidden="true"
        />
        {row.kind === "custom" && (
          <input
            type="color"
            value={row.color}
            onChange={(e) => onChangeColor(row.id, e.target.value)}
            aria-label="Color"
            className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer"
          />
        )}
      </span>
      <span className="flex-1 truncate">{row.name}</span>
      {row.kind === "custom" && (
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="p-1 text-gray-400 hover:text-red-500"
          aria-label="Remove"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}

// Lazy: AreaPolygonDrawer pulls in the leaflet bundle. Keep it out of routes
// that don't open this modal.
const AreaPolygonDrawer = dynamic(() => import("./AreaPolygonDrawer"), {
  ssr: false,
});

interface CreateAndDefineAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  generalArrangement: GeneralArrangement | undefined;
  onSuccess?: () => void;
  /** When supplied the modal switches to edit mode: deck is locked,
   *  name / description / polygon are pre-filled and the stages
   *  configuration block is hidden (stages have their own editor). */
  area?: Area | null;
}

export default function CreateAndDefineAreaModal({
  isOpen,
  onClose,
  projectId,
  generalArrangement,
  onSuccess,
  area,
}: CreateAndDefineAreaModalProps) {
  const isEditing = !!area;
  const t = useTranslations("areas");
  const { data: decks, loading: decksLoading } = useDecks(projectId);

  // The GA image is auth-gated, so we fetch it through the same flow that
  // OverviewTab + the deck-define modal already use: rewrite the URL to a
  // proxy pathname, then resolve to a blob URL via useGAImage.
  const gaImageUrl = useMemo(() => {
    if (!generalArrangement?.imageUrl) return undefined;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";
    return apiBase.startsWith("/")
      ? new URL(generalArrangement.imageUrl).pathname
      : generalArrangement.imageUrl;
  }, [generalArrangement?.imageUrl]);
  const { imageBlobUrl: gaBlobUrl } = useGAImage(gaImageUrl);

  const [selectedDeckId, setSelectedDeckId] = useState("");
  // Polygon state lives in a history-aware reducer so the drawer's Undo /
  // Redo buttons (and the keyboard shortcuts) have a proper stack to step
  // through, not just a "drop the last vertex" stub.
  const {
    polygon,
    isClosed,
    set: setPolygonSnapshot,
    undo: undoPolygon,
    redo: redoPolygon,
    reset: resetPolygon,
    canUndo,
    canRedo,
  } = usePolygonHistory();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Stages config — host can either skip stages now (add later) or create a
  // selection from the project's stage template, optionally with custom
  // stages interleaved. Backend takes:
  //   create_stages: boolean (required)
  //   stages?: ({ type:"template", stage_template_id } | { type:"custom", name, ... })[]
  // Order of `stages` is honored end-to-end.
  const [createStages, setCreateStages] = useState(true);
  // Single ordered list of every stage row (template + custom). User can drag
  // any row anywhere; the row order maps 1:1 to the backend stages array.
  const [stageRows, setStageRows] = useState<StageRow[]>([]);
  const [newCustomStageName, setNewCustomStageName] = useState("");

  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load stage templates when the modal opens — same source the
  // existing CreateStagesModal uses. Default-select all templates so the
  // common case (use full template) is one click.
  useEffect(() => {
    if (!isOpen) return;
    stageTemplatesApi
      .getAll({ active_only: true })
      .then((response) => {
        const list = response.data ?? [];
        setStageRows(
          list.map((tpl) => ({
            // dnd id stays the template UUID — guaranteed unique within the
            // combined list because custom rows use freshly generated UUIDs.
            id: tpl.identifier,
            kind: "template" as const,
            templateId: tpl.identifier,
            name: tpl.name,
            color: tpl.color,
            included: true,
          }))
        );
      })
      .catch((err) =>
        handleError(err, {
          severity: "console",
          context: "Loading stage templates for area creation",
        })
      );
  }, [isOpen]);

  // Seed (or reset) form state when the modal opens. In edit mode we
  // pre-fill from the supplied area; in create mode we start blank.
  // Polygon reset on subsequent deck changes is handled by the
  // FormSelect's onChange so it doesn't fire on the initial mount and
  // wipe the just-loaded polygon.
  useEffect(() => {
    if (!isOpen) return;
    if (area) {
      setSelectedDeckId(area.containedInPlace?.identifier ?? "");
      if (area.polygon && area.polygon.length >= 3) {
        setPolygonSnapshot(area.polygon, true);
      } else {
        resetPolygon();
      }
      setName(area.name);
      setDescription(area.description ?? "");
    } else {
      setSelectedDeckId("");
      resetPolygon();
      setName("");
      setDescription("");
    }
    setError(null);
    setCreateStages(true);
    setStageRows([]);
    setNewCustomStageName("");
  }, [isOpen, area, resetPolygon, setPolygonSnapshot]);

  // Switching deck mid-create wipes the polygon — the user is moving to
  // a different region, the old polygon doesn't apply. Triggered only by
  // user action; the initialisation effect above sets the deck without
  // going through this path.
  const handleDeckChange = (deckId: string) => {
    if (deckId === selectedDeckId) return;
    setSelectedDeckId(deckId);
    resetPolygon();
  };

  const selectedDeck = useMemo(
    () => decks?.find((d) => d.identifier === selectedDeckId),
    [decks, selectedDeckId]
  );

  const { data: existingAreasInDeck } = useAreas(projectId, selectedDeckId);

  const deckOptions = useMemo(
    () => [
      { value: "", label: t("selectDeckPlaceholder") },
      ...(decks ?? []).map((d) => ({ value: d.identifier, label: d.name })),
    ],
    [decks, t]
  );

  // Map existing areas (with polygons) to the drawer format. In edit
  // mode skip the area currently being edited — the drawer treats
  // existing-area polygons as obstacles (rejects vertex drops inside
  // them) and the user's whole working region IS that area.
  const existingAreasForDrawer = useMemo(
    () =>
      (existingAreasInDeck ?? [])
        .filter(
          (a) =>
            Array.isArray(a.polygon) &&
            a.polygon.length >= 3 &&
            a.identifier !== area?.identifier
        )
        .map((a) => ({
          id: a.identifier,
          name: a.name,
          polygon: a.polygon!,
        })),
    [existingAreasInDeck, area?.identifier]
  );

  const deckBounds = useMemo(() => {
    const placement = selectedDeck?.deckPlacement;
    if (!placement) return null;
    return {
      x1: placement.bbox_x,
      y1: placement.bbox_y,
      x2: placement.bbox_x + placement.bbox_width,
      y2: placement.bbox_y + placement.bbox_height,
    };
  }, [selectedDeck]);

  /** Colors that collide between rows the user would actually create. Template
   *  rows count only when included (excluded ones don't go to the server).
   *  Custom rows always count. Detected case-insensitive. */
  const duplicateColors = useMemo(() => {
    if (!createStages) return new Set<string>();
    const seen = new Map<string, number>();
    const dups = new Set<string>();
    for (const row of stageRows) {
      if (row.kind === "template" && !row.included) continue;
      const key = normalizeStageColor(row.color);
      if (!key) continue;
      if (seen.has(key)) dups.add(key);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return dups;
  }, [stageRows, createStages]);
  const hasDuplicateColors = duplicateColors.size > 0;

  const canSave =
    !!selectedDeckId &&
    isClosed &&
    polygon.length >= 3 &&
    name.trim().length > 0 &&
    !hasDuplicateColors;

  const handleReset = () => {
    resetPolygon();
  };

  const handleSave = async () => {
    if (!canSave || !selectedDeckId) return;
    setError(null);
    setSubmitting(true);
    try {
      if (isEditing && area) {
        await areasApi.update(projectId, area.identifier, {
          name: name.trim(),
          description: description.trim() || undefined,
          polygon,
        });
      } else {
        // Walk the unified list in its current order. Each row maps to one
        // entry in the backend's discriminated `stages` array — interleaved
        // template/custom order is preserved end-to-end.
        const stagesPayload: CreateAreaStageInput[] = createStages
          ? stageRows.flatMap<CreateAreaStageInput>((row) => {
              if (row.kind === "template") {
                return row.included
                  ? [{ type: "template", stage_template_id: row.templateId }]
                  : [];
              }
              return [{ type: "custom", name: row.name, color: row.color }];
            })
          : [];
        await areasApi.create(projectId, selectedDeckId, {
          name: name.trim(),
          description: description.trim() || undefined,
          polygon,
          create_stages: createStages,
          ...(stagesPayload.length > 0 ? { stages: stagesPayload } : {}),
        });
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      const apiError = e as ApiError | undefined;
      setError(apiError?.message ?? t("areaCreatedError"));
    } finally {
      setSubmitting(false);
    }
  };

  const ga = generalArrangement;
  const hasGA = !!gaBlobUrl && !!ga?.imageWidth && !!ga?.imageHeight;

  // Drawing-state hint shown beneath the form fields.
  const drawingHint = (() => {
    if (!selectedDeckId) return t("hintSelectDeck");
    if (polygon.length === 0) return t("hintStartDrawing");
    if (polygon.length < 3) return t("hintAddMoreVertices");
    if (!isClosed) return t("hintClosePolygon");
    return t("hintPolygonReady");
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t("editAreaTitle") : t("createAndDefineAreaTitle")}
      size="2xl"
      disableBackdropClick
    >
      <div className="flex flex-col md:flex-row gap-0 md:gap-4 h-[70vh]">
        {/* Left: GA viewer */}
        <div className="relative flex-1 min-h-[300px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {hasGA && selectedDeckId ? (
            <AreaPolygonDrawer
              imageUrl={gaBlobUrl!}
              imageWidth={ga!.imageWidth!}
              imageHeight={ga!.imageHeight!}
              deckBounds={deckBounds ?? undefined}
              existingAreas={existingAreasForDrawer}
              polygon={polygon}
              isClosed={isClosed}
              onUndo={undoPolygon}
              onRedo={redoPolygon}
              canUndo={canUndo}
              canRedo={canRedo}
              onReset={handleReset}
              onChange={(p, c) => {
                setPolygonSnapshot(p, c);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-base font-medium text-gray-600 dark:text-gray-300 px-6 text-center">
              {!hasGA ? t("noGAUploaded") : t("selectDeckToStart")}
            </div>
          )}
        </div>

        {/* Right: form */}
        <div className="md:w-80 flex flex-col gap-4 md:border-l md:pl-4 md:border-gray-200 md:dark:border-gray-700 overflow-y-auto">
          {isEditing ? (
            // Deck is locked once an area exists — moving an area to a
            // different deck would also invalidate the polygon (coords
            // are relative to the GA, not the deck, but the user mental
            // model treats them as deck-scoped).
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("deck")}
              </label>
              <p className="text-gray-900 dark:text-gray-100 py-2">
                {selectedDeck?.name ?? "-"}
              </p>
            </div>
          ) : (
            <FormSelect
              id="area-deck"
              label={t("deck")}
              options={deckOptions}
              value={selectedDeckId}
              onChange={(e) => handleDeckChange(e.target.value)}
              required
              disabled={decksLoading}
            />
          )}

          <FormInput
            id="area-name"
            label={t("areaName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={!isClosed}
            placeholder={t("areaNamePlaceholder")}
          />

          <FormTextarea
            id="area-description"
            label={t("areaDescription")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={!isClosed}
            placeholder={t("areaDescriptionPlaceholder")}
          />

          {/* Stages config — hidden when editing an existing area;
              stages have their own editor on the area detail page. */}
          {!isEditing && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={createStages}
                onChange={(e) => setCreateStages(e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium text-gray-900 dark:text-white">
                  {t("createStagesNow")}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {t("createStagesHint")}
                </span>
              </span>
            </label>

            {createStages && (
              <div className="mt-3 space-y-3">
                {stageRows.length > 0 && (
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (!over || active.id === over.id) return;
                      setStageRows((prev) => {
                        const oldIndex = prev.findIndex((r) => r.id === active.id);
                        const newIndex = prev.findIndex((r) => r.id === over.id);
                        if (oldIndex < 0 || newIndex < 0) return prev;
                        return arrayMove(prev, oldIndex, newIndex);
                      });
                    }}
                  >
                    <SortableContext
                      items={stageRows.map((r) => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="space-y-0">
                        {stageRows.map((row) => {
                          const normalized = normalizeStageColor(row.color);
                          const colorClash =
                            normalized !== null &&
                            duplicateColors.has(normalized) &&
                            (row.kind === "custom" ||
                              (row.kind === "template" && row.included));
                          return (
                            <SortableStageRow
                              key={row.id}
                              row={row}
                              colorClash={colorClash}
                              onToggleInclude={(id) =>
                                setStageRows((prev) =>
                                  prev.map((r) =>
                                    r.id === id && r.kind === "template"
                                      ? { ...r, included: !r.included }
                                      : r
                                  )
                                )
                              }
                              onChangeColor={(id, color) =>
                                setStageRows((prev) =>
                                  prev.map((r) =>
                                    r.id === id && r.kind === "custom"
                                      ? { ...r, color }
                                      : r
                                  )
                                )
                              }
                              onRemove={(id) =>
                                setStageRows((prev) => prev.filter((r) => r.id !== id))
                              }
                            />
                          );
                        })}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}

                {/* Add a custom stage to the bottom of the list. User can
                    drag it elsewhere afterwards. */}
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("addCustomStage")}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCustomStageName}
                      onChange={(e) => setNewCustomStageName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCustomStageName.trim()) {
                          e.preventDefault();
                          setStageRows((prev) => [
                            ...prev,
                            {
                              id: crypto.randomUUID(),
                              kind: "custom",
                              name: newCustomStageName.trim(),
                              // Suggest a palette color not yet used by any
                              // template (included) or other custom row.
                              color: pickFreshStageColor(
                                prev
                                  .filter(
                                    (r) =>
                                      r.kind === "custom" ||
                                      (r.kind === "template" && r.included)
                                  )
                                  .map((r) => r.color)
                              ),
                            },
                          ]);
                          setNewCustomStageName("");
                        }
                      }}
                      placeholder={t("customStagePlaceholder")}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const v = newCustomStageName.trim();
                        if (!v) return;
                        setStageRows((prev) => [
                          ...prev,
                          {
                            id: crypto.randomUUID(),
                            kind: "custom",
                            name: v,
                            color: pickFreshStageColor(
                              prev
                                .filter(
                                  (r) =>
                                    r.kind === "custom" ||
                                    (r.kind === "template" && r.included)
                                )
                                .map((r) => r.color)
                            ),
                          },
                        ]);
                        setNewCustomStageName("");
                      }}
                      disabled={!newCustomStageName.trim()}
                      className="px-2 py-1.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                      aria-label={t("addCustomStage")}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">{drawingHint}</p>

          {hasDuplicateColors && (
            <Alert type="warning" message={t("duplicateColorsWarning")} />
          )}

          {error && <Alert type="error" message={error} />}

          <div className="mt-auto flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!canSave || submitting}
              loading={submitting}
            >
              {t("save")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
