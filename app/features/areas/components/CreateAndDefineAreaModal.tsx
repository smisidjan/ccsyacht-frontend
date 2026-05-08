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
import { useGAImage } from "@/lib/hooks/useGAImage";
import { handleError } from "@/lib/utils/errors";
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
 *  the visible order is exactly what gets persisted. */
type StageRow =
  | { id: string; kind: "template"; templateId: string; name: string; included: boolean }
  | { id: string; kind: "custom"; name: string };

function SortableStageRow({
  row,
  onToggleInclude,
  onRemove,
}: {
  row: StageRow;
  onToggleInclude: (id: string) => void;
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
}

export default function CreateAndDefineAreaModal({
  isOpen,
  onClose,
  projectId,
  generalArrangement,
  onSuccess,
}: CreateAndDefineAreaModalProps) {
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
  const [polygon, setPolygon] = useState<AreaPolygonPoint[]>([]);
  const [isClosed, setIsClosed] = useState(false);
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

  // Reset everything when the modal opens. Avoids leftover state from a
  // previous create.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedDeckId("");
    setPolygon([]);
    setIsClosed(false);
    setName("");
    setDescription("");
    setError(null);
    setCreateStages(true);
    setStageRows([]);
    setNewCustomStageName("");
  }, [isOpen]);

  // Picking a different deck clears any in-progress polygon — the user is
  // starting over for that region.
  useEffect(() => {
    setPolygon([]);
    setIsClosed(false);
  }, [selectedDeckId]);

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

  // Map existing areas (with polygons) to the drawer format.
  const existingAreasForDrawer = useMemo(
    () =>
      (existingAreasInDeck ?? [])
        .filter((a) => Array.isArray(a.polygon) && a.polygon.length >= 3)
        .map((a) => ({
          id: a.identifier,
          name: a.name,
          polygon: a.polygon!,
        })),
    [existingAreasInDeck]
  );

  const deckBounds = useMemo(() => {
    const bb = selectedDeck?.boundingBox;
    if (!bb) return null;
    return {
      x1: bb.x,
      y1: bb.y,
      x2: bb.x + bb.width,
      y2: bb.y + bb.height,
    };
  }, [selectedDeck]);

  const canSave =
    !!selectedDeckId && isClosed && polygon.length >= 3 && name.trim().length > 0;

  const handleReset = () => {
    setPolygon([]);
    setIsClosed(false);
  };

  const handleSave = async () => {
    if (!canSave || !selectedDeckId) return;
    setError(null);
    setSubmitting(true);
    try {
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
            return [{ type: "custom", name: row.name }];
          })
        : [];
      await areasApi.create(projectId, selectedDeckId, {
        name: name.trim(),
        description: description.trim() || undefined,
        polygon,
        create_stages: createStages,
        ...(stagesPayload.length > 0 ? { stages: stagesPayload } : {}),
      });
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
      title={t("createAndDefineAreaTitle")}
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
              onChange={(p, c) => {
                setPolygon(p);
                setIsClosed(c);
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
          <FormSelect
            id="area-deck"
            label={t("deck")}
            options={deckOptions}
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            required
            disabled={decksLoading}
          />

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

          {/* Stages config */}
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
                        {stageRows.map((row) => (
                          <SortableStageRow
                            key={row.id}
                            row={row}
                            onToggleInclude={(id) =>
                              setStageRows((prev) =>
                                prev.map((r) =>
                                  r.id === id && r.kind === "template"
                                    ? { ...r, included: !r.included }
                                    : r
                                )
                              )
                            }
                            onRemove={(id) =>
                              setStageRows((prev) => prev.filter((r) => r.id !== id))
                            }
                          />
                        ))}
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
                          { id: crypto.randomUUID(), kind: "custom", name: v },
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

          <p className="text-xs text-gray-500 dark:text-gray-400">{drawingHint}</p>

          {polygon.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              {t("resetPolygon")}
            </Button>
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
