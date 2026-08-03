"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { PencilIcon } from "@heroicons/react/24/outline";
import BaseModal from "@/app/components/modals/BaseModal";
import Alert from "@/app/components/ui/Alert";
import FormInput from "@/app/components/ui/FormInput";
import PunchlistItemForm from "@/app/features/punchlist/components/PunchlistItemForm";
import GAPreview from "@/app/features/ga/components/shared/GAPreview";
import { gaPinsApi, useGAPins } from "@/lib/api/ga-pins";
import { punchlistItemsApi } from "@/lib/api/punchlist-items";
import { TrashIcon, PlusIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { isInsidePolygon, polygonCentroid, polygonBbox } from "@/lib/utils/geometry";
import { getAreaPolygonForDeck } from "@/app/features/ga/utils/helpers";
import { useDecks } from "@/lib/api/decks";
import { useAreas } from "@/lib/api/areas";
import { useStages } from "@/lib/api/stages";
import { useProjectMembersFromContext } from "@/app/context/ProjectContext";
import { MAX_GA_FILE_SIZE, FILE_SIZE_LABELS } from "@/lib/constants/fileUpload";
import type { GAPin, UpdateGAPinRequest, PunchlistItemPriority, Deck, Area, Stage } from "@/lib/api/types";

interface CreateGAPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  initialPosition: { x: number; y: number } | null;
  initialData?: GAPin | null;
  onSuccess?: () => void;
  // GA Image props for preview (optional - only shown when provided)
  gaImageUrl?: string;
  gaImageWidth?: number;
  gaImageHeight?: number;
  // Optional: deck that was clicked to add pin (for zoom-to-deck feature)
  initialDeck?: Deck | null;
  /** Pre-selects the area when the user clicked inside an area polygon on
   *  the GA. Independent from `initialDeck` — the area's own
   *  `containedInPlace` already implies the deck. */
  initialArea?: Area | null;
  /** Pre-selects the stage. Used by the area-detail page where the
   *  active stage is already known when the user clicks "Add punchlist
   *  item". The whole object (not just the id) lets the modal display
   *  the stage name immediately without waiting for the stages fetch. */
  initialStage?: Stage | null;
  /** When set, the marker can only be dropped inside the supplied
   *  area's polygon, and the deck/area/stage selectors collapse into
   *  a compact read-only summary line (caller already knows all three
   *  — no point repeating the labelled blocks). */
  constrainToArea?: boolean;
}

const DEFAULT_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];

export default function CreateGAPinModal({
  isOpen,
  onClose,
  projectId,
  initialPosition,
  initialData,
  onSuccess,
  gaImageUrl,
  gaImageWidth,
  gaImageHeight,
  initialDeck,
  initialArea,
  initialStage,
  constrainToArea = false,
}: CreateGAPinModalProps) {
  const t = useTranslations("gaViewer");
  const isEditing = !!initialData;

  const [label, setLabel] = useState("");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);

  /** Multi-pin draft state — create mode only. Edit mode keeps using
   *  the single `x` / `y` / `label` triple above so the existing
   *  single-pin API stays untouched. In create mode the `label` field
   *  doubles as the punchlist item title; each pin can override its
   *  own per-pin label inline. */
  interface PendingPin {
    id: string;
    x: number;
    y: number;
    label: string;
  }
  const [pins, setPins] = useState<PendingPin[]>([]);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  // Expand/collapse for the parent+sub-pins tree shown once there are
  // 2+ pins — mirrors PunchlistTreeList's parent/child visual so this
  // draft preview matches what it becomes after saving.
  const [pinsExpanded, setPinsExpanded] = useState(true);
  const activePin = pins.find((p) => p.id === activePinId) ?? null;

  // Cascading selection state
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");

  // Edit mode: track which fields have been opened for editing
  const [editingFields, setEditingFields] = useState<Set<"deck" | "area" | "stage">>(new Set());

  // Punchlist item fields (only for create mode)
  const [punchlistDescription, setPunchlistDescription] = useState("");
  // Empty string = no choice yet. The user picks one explicitly before
  // submit; the backend would default to "medium" if omitted but we
  // want the choice surfaced.
  const [punchlistPriority, setPunchlistPriority] = useState<PunchlistItemPriority | "">("");
  const [punchlistDueDate, setPunchlistDueDate] = useState("");
  const [punchlistAssignees, setPunchlistAssignees] = useState<string[]>([]);
  const [punchlistFiles, setPunchlistFiles] = useState<File[]>([]);

  // Fetch decks, areas, and stages
  const { data: decks } = useDecks(projectId);
  const { data: areas } = useAreas(projectId, selectedDeckId || undefined);
  const { data: stages } = useStages(projectId, selectedAreaId);
  const { data: projectMembers } = useProjectMembersFromContext();
  // Existing pins shown as read-only reference markers on the preview.
  // Drop the pin we're editing so the live draggable marker isn't
  // duplicated by its own stored coordinates.
  const { data: allPins } = useGAPins(projectId);
  const existingPins = allPins.filter(
    (p) => !initialData || p.identifier !== initialData.identifier
  );

  // Best-effort resolution of the area record we're constraining /
  // zooming to. Sources, in priority order:
  //   1. the entry in `areas` (loaded by the modal's own `useAreas`)
  //      that matches the selected area id — this is the freshest
  //      record and usually carries `polygons[]`
  //   2. the `initialArea` prop the caller passed in — covers the
  //      window before the modal's own list resolves, and fills in
  //      when nothing is selected yet
  // Either source is fine for polygon lookups; the helpers downstream
  // pick the right per-placement entry from whichever one provides it.
  const activeArea =
    areas?.find((a) => a.identifier === selectedAreaId) ??
    initialArea ??
    null;
  const constrainPolygonPoints = constrainToArea
    ? getAreaPolygonForDeck(activeArea, initialDeck) ?? undefined
    : initialDeck?.deckPolygon?.points;

  // Initialize form with data
  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label || "");
      setX(initialData.x);
      setY(initialData.y);
      // Color is derived from the selected stage now — no setter needed.
      setSelectedDeckId(initialData.deck.identifier);
      setSelectedAreaId(initialData.area.identifier);
      setSelectedStageId(initialData.stage.identifier);
    } else if (initialPosition) {
      setX(initialPosition.x);
      setY(initialPosition.y);
      setLabel("");
      // Pre-select deck if provided (from clicking on deck bounding box).
      // Prefer the area's own deck when an area was clicked — keeps the
      // two selectors consistent even if the caller forgot to pass both.
      setSelectedDeckId(
        initialArea?.containedInPlace?.identifier ||
          initialDeck?.identifier ||
          ""
      );
      setSelectedAreaId(initialArea?.identifier || "");
      setSelectedStageId(initialStage?.identifier || "");
      // Seed the multi-pin draft with one pin at the click location.
      // Users start with this and can add more via the "Add another
      // location" button in the Pins section.
      const firstId = crypto.randomUUID();
      setPins([
        {
          id: firstId,
          x: initialPosition.x,
          y: initialPosition.y,
          label: "",
        },
      ]);
      setActivePinId(firstId);
      // Reset punchlist fields
      setPunchlistDescription("");
      setPunchlistPriority("");
      setPunchlistDueDate("");
      setPunchlistAssignees([]);
      setPunchlistFiles([]);
    } else {
      setLabel("");
      setSelectedDeckId("");
      setSelectedAreaId("");
      setSelectedStageId("");
      setPins([]);
      setActivePinId(null);
    }
  }, [initialData, initialPosition, initialDeck, initialArea, initialStage, constrainToArea]);

  // Auto-select if only one deck available
  useEffect(() => {
    if (!isEditing && decks && decks.length === 1 && !selectedDeckId) {
      setSelectedDeckId(decks[0].identifier);
    }
  }, [decks, isEditing, selectedDeckId]);

  /** Once the user has dragged the pin, suppress the "auto-select if
   *  only one area / stage" effects. Otherwise dragging outside every
   *  area clears the selection, the effect spots `!selectedAreaId` and
   *  immediately rubber-bands the only available area back in — the
   *  user sees no change in the breadcrumb even though the marker is
   *  visibly outside. Reset when the modal opens fresh. */
  const userDraggedRef = useRef(false);
  useEffect(() => {
    if (isOpen) userDraggedRef.current = false;
  }, [isOpen]);

  // Initial / fallback area selection. Order of preference:
  //   1. Position-based detection — if a pin already sits on the GA
  //      (typical when the user clicked a deck), the area that
  //      contains it wins. Empty when the click landed outside every
  //      area, so the breadcrumb shows "-" until the user drags into
  //      one.
  //   2. Auto-select the only available area — convenience for the
  //      no-position flow (e.g. opening from a button).
  // Either branch latches via `userDraggedRef` so subsequent renders
  // (incl. the post-drag clears) don't rubber-band the selection.
  useEffect(() => {
    if (userDraggedRef.current) return;
    if (isEditing) return;
    if (!selectedDeckId || !areas || areas.length === 0) return;
    if (selectedAreaId) return;

    const firstPin = pins[0];
    if (firstPin) {
      const point = { x: firstPin.x / 100, y: firstPin.y / 100 };
      const primaryPolygonId = initialDeck?.deckPolygon?.identifier;
      const hit = areas.find((a) => {
        const perPlacement = primaryPolygonId
          ? a.polygons?.find((p) => p.parentPolygonId === primaryPolygonId)
              ?.points
          : undefined;
        const points =
          perPlacement && perPlacement.length >= 3
            ? perPlacement
            : Array.isArray(a.polygon) && a.polygon.length >= 3
            ? a.polygon
            : null;
        return !!points && isInsidePolygon(point, points);
      });
      if (hit) setSelectedAreaId(hit.identifier);
      // Either way, the position has had its say — lock the ref so
      // the "auto-pick the only area" branch below doesn't override
      // an intentionally-empty selection.
      userDraggedRef.current = true;
      return;
    }

    if (areas.length === 1) {
      setSelectedAreaId(areas[0].identifier);
    }
  }, [
    areas,
    isEditing,
    selectedDeckId,
    selectedAreaId,
    pins,
    initialDeck,
  ]);

  // Auto-select if only one stage available
  useEffect(() => {
    if (userDraggedRef.current) return;
    if (!isEditing && selectedAreaId && stages && stages.length === 1 && !selectedStageId) {
      setSelectedStageId(stages[0].identifier);
    }
  }, [stages, isEditing, selectedAreaId, selectedStageId]);

  // Check if selected stage is completed
  const selectedStage = stages?.find((s) => s.identifier === selectedStageId);
  // Pin color is derived from the selected stage so the marker on the
  // GA always matches the stage swatch in the breadcrumb — no separate
  // color picker. Falls back to the default palette when no stage is
  // picked yet (e.g. pin sits outside every area).
  const color = selectedStage?.color ?? DEFAULT_COLORS[0];
  const isStageCompleted = selectedStage?.status.name === "completed";

  // Handle deck selection change
  const handleDeckChange = (deckId: string) => {
    setSelectedDeckId(deckId);
    setSelectedAreaId(""); // Reset area selection
    setSelectedStageId(""); // Reset stage selection
    // In edit mode, auto-open area selection after deck change
    if (isEditing && editingFields.has("deck")) {
      setEditingFields((prev) => new Set([...prev, "area"]));
    }
  };

  // Handle area selection change
  const handleAreaChange = (areaId: string) => {
    setSelectedAreaId(areaId);
    setSelectedStageId(""); // Reset stage selection
    // In edit mode, auto-open stage selection after area change
    if (isEditing && editingFields.has("area")) {
      setEditingFields((prev) => new Set([...prev, "stage"]));
    }
  };

  // File handling for punchlist items
  const handlePunchlistFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > MAX_GA_FILE_SIZE) {
        alert(`${file.name}: Max ${FILE_SIZE_LABELS.ga}`);
        continue;
      }
      validFiles.push(file);
    }

    setPunchlistFiles((prev) => [...prev, ...validFiles]);
  };

  const removePunchlistFile = (index: number) => {
    setPunchlistFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle assignee selection
  const toggleAssignee = (userId: string) => {
    setPunchlistAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (isEditing && initialData) {
      // Update existing pin
      const updateData: UpdateGAPinRequest = {
        stage_id: selectedStageId !== initialData.stage.identifier ? selectedStageId : undefined,
        label: label.trim() || undefined,
        x,
        y,
        color,
      };
      await gaPinsApi.update(projectId, initialData.identifier, updateData);
    } else {
      // Map the multi-pin draft onto the punchlist-item tree:
      //   - 1 pin  → simple item with one pin, no children.
      //   - N pins → parent item with N children, each carrying one
      //              pin. The pin's label becomes the child title so
      //              the user can drive #N.1, #N.2 ... etc. via the
      //              same row UI used for top-level items.
      const trimmedPins = pins.map((p) => ({
        x: p.x,
        y: p.y,
        label: p.label.trim(),
      }));
      const basePayload = {
        title: label.trim(),
        description: punchlistDescription.trim() || undefined,
        priority: punchlistPriority || undefined,
        due_date: punchlistDueDate || undefined,
        assignee_ids:
          punchlistAssignees.length > 0 ? punchlistAssignees : undefined,
      } as const;

      if (trimmedPins.length <= 1) {
        await punchlistItemsApi.createWithPins(
          projectId,
          selectedStageId,
          {
            ...basePayload,
            pins: trimmedPins.map((p) => ({
              x: p.x,
              y: p.y,
              label: p.label || undefined,
              color,
            })),
          },
          punchlistFiles
        );
      } else {
        await punchlistItemsApi.createWithPins(
          projectId,
          selectedStageId,
          {
            ...basePayload,
            children: trimmedPins.map((p, i) => ({
              title: p.label || `${t("location") || "Location"} ${i + 1}`,
              pins: [{ x: p.x, y: p.y, color }],
            })),
          },
          punchlistFiles
        );
      }
    }
  };

  // Check if we should show the GA preview
  const showGAPreview = !!(gaImageUrl && gaImageWidth && gaImageHeight);

  // Handle position change from dragging marker in preview. Edit mode
  // keeps the single x/y state; create mode routes the new coords to
  // the active pin in the multi-pin draft and — if the drop lands
  // inside one of the deck's area polygons — switches the area
  // selector to that area so the form stays in sync with the marker.
  const handlePositionChange = (newX: number, newY: number) => {
    if (isEditing) {
      setX(newX);
      setY(newY);
      return;
    }
    if (!activePinId) return;
    // Flag the user has interacted via drag — disables the
    // "auto-select if only one" rubber-band so drag-clears stick.
    userDraggedRef.current = true;
    setPins((prev) =>
      prev.map((p) =>
        p.id === activePinId ? { ...p, x: newX, y: newY } : p
      )
    );
    detectAreaForPosition(newX, newY);
  };

  // Auto-pick the area's active stage when create mode + the area
  // changes + stages have arrived. Mirrors the "active stage per area"
  // priority used by the GA tab's overlay so the form fills with the
  // stage the team is currently progressing through.
  useEffect(() => {
    if (isEditing) return;
    if (!selectedAreaId || !stages || stages.length === 0) return;
    if (selectedStageId) return;
    const sorted = [...stages].sort((a, b) => a.position - b.position);
    const active =
      sorted.find((s) => s.status.name === "in_progress") ??
      sorted.find((s) => s.status.name === "pending_signoff") ??
      sorted.find((s) => s.status.name === "not_started") ??
      sorted[0];
    if (active) setSelectedStageId(active.identifier);
  }, [isEditing, selectedAreaId, stages, selectedStageId]);

  /** Position-based area / stage selection. Looks up which area
   *  polygon the (xPct, yPct) point lands in and updates the
   *  breadcrumb to match — area changes drop the stage so the
   *  auto-pick-active-stage effect repopulates it. Outside every
   *  area, both clear to "-". */
  const detectAreaForPosition = (xPct: number, yPct: number) => {
    if (!areas || areas.length === 0) return;
    const point = { x: xPct / 100, y: yPct / 100 };
    const primaryPolygonId = initialDeck?.deckPolygon?.identifier;
    const hit = areas.find((a) => {
      const perPlacement = primaryPolygonId
        ? a.polygons?.find((p) => p.parentPolygonId === primaryPolygonId)
            ?.points
        : undefined;
      const points =
        perPlacement && perPlacement.length >= 3
          ? perPlacement
          : Array.isArray(a.polygon) && a.polygon.length >= 3
          ? a.polygon
          : null;
      return !!points && isInsidePolygon(point, points);
    });
    if (hit) {
      if (hit.identifier !== selectedAreaId) {
        setSelectedAreaId(hit.identifier);
        setSelectedStageId("");
      }
    } else if (selectedAreaId || selectedStageId) {
      setSelectedAreaId("");
      setSelectedStageId("");
    }
  };

  // Multi-pin handlers — create mode only.
  const handleAddPin = () => {
    const id = crypto.randomUUID();
    // Drop new pins inside the active constraint so the marker lands
    // somewhere the user can immediately see and the drag-snap doesn't
    // jump it back to the polygon edge on first interaction. In
    // constrain-to-area mode that's the area polygon (stage-level
    // create flow); otherwise the deck polygon (GA tab). Falls back to
    // image centre when no polygon is available.
    let nextX = 50;
    let nextY = 50;
    // Re-use the resolved constrain polygon so a brand-new pin shares
    // the same boundary as the active marker; falling back to the deck
    // when the resolver couldn't land on an area polygon (legacy data,
    // free-roam mode).
    const points = constrainPolygonPoints ?? initialDeck?.deckPolygon?.points;
    if (points && points.length >= 3) {
      const c = polygonCentroid(points);
      if (c) {
        nextX = c.x * 100;
        nextY = c.y * 100;
      } else {
        const bbox = polygonBbox(points);
        if (bbox) {
          nextX = (bbox.bbox_x + bbox.bbox_width / 2) * 100;
          nextY = (bbox.bbox_y + bbox.bbox_height / 2) * 100;
        }
      }
    }
    setPins((prev) => [...prev, { id, x: nextX, y: nextY, label: "" }]);
    setActivePinId(id);
    // Re-evaluate the breadcrumb for the new pin's position. Without
    // this the area/stage stay pinned to the previously-active pin
    // even though the marker the user is now editing sits elsewhere.
    userDraggedRef.current = true;
    detectAreaForPosition(nextX, nextY);
  };
  const handleRemovePin = (id: string) => {
    setPins((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (id === activePinId) {
        setActivePinId(next[0]?.id ?? null);
      }
      return next;
    });
  };
  const handleSelectPin = (id: string) => setActivePinId(id);
  const handlePinLabelChange = (id: string, value: string) => {
    setPins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, label: value } : p))
    );
  };

  // Edit mode collapses the whole right-column form into a compact
  // location breadcrumb and gives the full body to the GA viewer.
  // The pin can be dragged inside the area polygon. Deck / area /
  // stage stay read-only — those identities are part of what the
  // pin IS; moving it across decks is "create a new pin", not edit.
  const editAreaPolygon =
    initialData?.area && areas
      ? areas.find((a) => a.identifier === initialData.area.identifier)?.polygon
      : undefined;

  if (isEditing && initialData) {
    const deckName = initialData.deck.name;
    const areaName = initialData.area.name;
    const stageName = initialData.stage.name;
    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={t("editPin")}
        formId="ga-pin-form"
        onSubmit={handleSubmit}
        successMessage={t("updateSuccess")}
        errorFallbackMessage={t("updateError")}
        onSuccessCallback={onSuccess}
        size="2xl"
      >
        <div className="space-y-4">
          {/* Compact location breadcrumb */}
          <div className="flex items-center flex-wrap gap-2 text-sm">
            <span className="text-gray-900 dark:text-gray-100">
              {deckName}
            </span>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-900 dark:text-gray-100">
              {areaName}
            </span>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            {color && (
              <span
                className="inline-block w-3 h-3 rounded-sm border border-gray-200 dark:border-gray-600 flex-shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
            )}
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {stageName}
            </span>
          </div>

          {/* GA viewer — zoomed on the deck, area polygon highlighted,
              pin draggable but constrained to the area's polygon. */}
          {showGAPreview ? (
            <div className="h-[520px]">
              <GAPreview
                imageUrl={gaImageUrl}
                imageWidth={gaImageWidth}
                imageHeight={gaImageHeight}
                x={x}
                y={y}
                color={color}
                onPositionChange={handlePositionChange}
                initialDeck={
                  decks?.find(
                    (d) => d.identifier === initialData.deck.identifier
                  ) ?? null
                }
                areas={areas ?? undefined}
                selectedAreaId={initialData.area.identifier}
                constrainPolygon={editAreaPolygon}
                existingPins={existingPins}
              />
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              {t("noGAImage") || "GA image not available."}
            </div>
          )}
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t("editPin") : t("addPin")}
      formId="ga-pin-form"
      onSubmit={handleSubmit}
      successMessage={isEditing ? t("updateSuccess") : t("createSuccess")}
      errorFallbackMessage={isEditing ? t("updateError") : t("createError")}
      onSuccessCallback={onSuccess}
      submitDisabled={
        !isEditing &&
        (!selectedStageId ||
          !label.trim() ||
          !punchlistPriority ||
          pins.length === 0)
      }
      size={showGAPreview ? "2xl" : "md"}
    >
      <div className={showGAPreview ? "flex gap-6" : ""}>
        {/* Left: GA Preview with draggable marker */}
        {showGAPreview && (
          <div className="w-1/2 flex-shrink-0">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("pinLocation") || "Pin Location"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {pins.length > 1
                ? t("dragSelectedPinToAdjust") ||
                  "Drag the selected pin to adjust its position"
                : t("dragToAdjust") || "Drag the pin to adjust position"}
            </p>
            <div className="h-[400px]">
              <GAPreview
                imageUrl={gaImageUrl}
                imageWidth={gaImageWidth}
                imageHeight={gaImageHeight}
                x={activePin?.x ?? x}
                y={activePin?.y ?? y}
                color={color}
                onPositionChange={handlePositionChange}
                initialDeck={initialDeck}
                areas={areas ?? undefined}
                selectedAreaId={selectedAreaId || undefined}
                constrainPolygon={constrainPolygonPoints}
                // Non-active pending pins ride along as read-only
                // reference markers, alongside the project's existing
                // pins. Synthesised into the `GAPin` shape the
                // GAPreview already knows how to render.
                existingPins={[
                  ...pins
                    .filter((p) => p.id !== activePinId)
                    .map((p, i) => ({
                      identifier: `draft-${p.id}`,
                      x: p.x,
                      y: p.y,
                      label:
                        p.label.trim() ||
                        label.trim() ||
                        `${t("pin") || "Pin"} ${pins.indexOf(p) + 1}`,
                      color,
                      stage: {
                        identifier: selectedStageId,
                        name: "",
                        status: "not_started",
                        remarksCount: 0,
                        punchlistItemsCount: 0,
                      },
                      area: { identifier: "", name: "" },
                      deck: { identifier: "", name: "" },
                      creator: { identifier: "", name: "" },
                      dateCreated: "",
                      dateModified: "",
                      // Silence the `i` lint hint
                      ...(i === -1 ? {} : {}),
                    })) as unknown as typeof existingPins,
                  ...existingPins,
                ]}
              />
            </div>
          </div>
        )}

        {/* Right: Form fields */}
        <div className={showGAPreview ? "w-1/2 space-y-5" : "space-y-5"}>
        {constrainToArea && initialDeck && initialArea && initialStage ? (
          // Compact location summary — caller already locked all three
          // levels so the user just needs to fill in the punchlist body.
          <div className="flex items-center flex-wrap gap-2 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 text-sm">
            <span className="text-gray-900 dark:text-gray-100">{initialDeck.name}</span>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-900 dark:text-gray-100">{initialArea.name}</span>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            {initialStage.color && (
              <span
                className="inline-block w-3 h-3 rounded-sm border border-gray-200 dark:border-gray-600 flex-shrink-0"
                style={{ backgroundColor: initialStage.color }}
                aria-hidden="true"
              />
            )}
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {initialStage.name}
            </span>
          </div>
        ) : !isEditing && initialDeck ? (
          // Deck-anchored breadcrumb. The deck is locked (user clicked
          // it on the GA tab), the area derives from where the pin
          // landed (drag updates it live), and the stage stays a
          // dropdown because the user picks which step the issue
          // belongs to within the area. Falls back to "-" when the
          // marker sits on the deck but outside every area.
          (() => {
            const areaName = selectedAreaId
              ? areas?.find((a) => a.identifier === selectedAreaId)?.name ?? "-"
              : "-";
            const stageList = stages ?? [];
            const activeStage = stageList.find(
              (s) => s.identifier === selectedStageId
            );
            return (
              <div className="space-y-2">
                <div
                  className={`flex items-center flex-wrap gap-2 px-4 py-3 rounded-lg border text-sm ${
                    selectedStageId
                      ? "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700"
                      : "bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700"
                  }`}
                >
                  <span className="text-gray-900 dark:text-gray-100">
                    {initialDeck.name}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  <span
                    className={
                      selectedAreaId
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-400 dark:text-gray-500"
                    }
                  >
                    {areaName}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">/</span>
                  {selectedAreaId && stageList.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      {activeStage?.color && (
                        <span
                          className="inline-block w-3 h-3 rounded-sm border border-gray-200 dark:border-gray-600 flex-shrink-0"
                          style={{ backgroundColor: activeStage.color }}
                          aria-hidden="true"
                        />
                      )}
                      <select
                        value={selectedStageId}
                        onChange={(e) => setSelectedStageId(e.target.value)}
                        className="bg-transparent border-0 outline-none text-gray-900 dark:text-gray-100 font-medium focus:ring-0 px-0 py-0 cursor-pointer"
                        required
                      >
                        <option value="">{t("chooseStage")}</option>
                        {stageList.map((stage) => (
                          <option key={stage.identifier} value={stage.identifier}>
                            {stage.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </div>
                {/* Visually explains why Save stays disabled — otherwise
                    the only signal is the grayed-out button itself. */}
                {!selectedStageId && (
                  <Alert
                    type="warning"
                    message={
                      t("pinOutsideAreaWarning") ||
                      "This pin isn't inside an area with a stage yet. Drag it into a colored area on the drawing to save."
                    }
                  />
                )}
              </div>
            );
          })()
        ) : (
          <>
        {/* Deck and Area Selection (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          {/* Deck Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {(decks && decks.length === 1) || initialDeck ? t("deck") : t("selectDeck")}
            </label>
            {isEditing ? (
              // Edit mode: show text with optional edit icon
              decks && decks.length > 1 && editingFields.has("deck") ? (
                <select
                  id="deck"
                  value={selectedDeckId}
                  onChange={(e) => handleDeckChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t("chooseDeck")}</option>
                  {decks?.map((deck) => (
                    <option key={deck.identifier} value={deck.identifier}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-gray-900 dark:text-gray-100 py-2 flex-1">
                    {decks?.find((d) => d.identifier === selectedDeckId)?.name || "-"}
                  </p>
                  {decks && decks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEditingFields((prev) => new Set([...prev, "deck"]))}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title={t("editPin")}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            ) : (
              // Create mode: show text for 1 option or when deck is pre-selected, dropdown for multiple
              (decks && decks.length === 1) || initialDeck ? (
                <p className="text-gray-900 dark:text-gray-100 py-2">
                  {initialDeck?.name || decks?.[0]?.name || "-"}
                </p>
              ) : (
                <select
                  id="deck"
                  value={selectedDeckId}
                  onChange={(e) => handleDeckChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">{t("chooseDeck")}</option>
                  {decks?.map((deck) => (
                    <option key={deck.identifier} value={deck.identifier}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              )
            )}
          </div>

          {/* Area Selection */}
          {selectedDeckId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {areas && areas.length === 1 ? t("area") : t("selectArea")}
              </label>
              {isEditing ? (
                // Edit mode: show text with optional edit icon
                areas && areas.length > 1 && editingFields.has("area") ? (
                  <select
                    id="area"
                    value={selectedAreaId}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t("chooseArea")}</option>
                    {areas?.map((area) => (
                      <option key={area.identifier} value={area.identifier}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 dark:text-gray-100 py-2 flex-1">
                      {areas?.find((a) => a.identifier === selectedAreaId)?.name || "-"}
                    </p>
                    {areas && areas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEditingFields((prev) => new Set([...prev, "area"]))}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title={t("editPin")}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              ) : (
                // Create mode: show text for 1 option, dropdown for
                // multiple. The static label reflects `selectedAreaId`
                // — when the marker sits on the deck but outside any
                // area, drag clears the selection and we show "-".
                areas && areas.length === 1 ? (
                  <p className="text-gray-900 dark:text-gray-100 py-2">
                    {selectedAreaId
                      ? areas.find((a) => a.identifier === selectedAreaId)
                          ?.name ?? "-"
                      : "-"}
                  </p>
                ) : (
                  <select
                    id="area"
                    value={selectedAreaId}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{t("chooseArea")}</option>
                    {areas?.map((area) => (
                      <option key={area.identifier} value={area.identifier}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                )
              )}
            </div>
          )}
        </div>

        {/* Stage Selection */}
        {selectedAreaId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {(stages && stages.length === 1) || initialStage
                ? t("stage")
                : t("selectStage")}
            </label>
            {isEditing ? (
              // Edit mode: show text with optional edit icon
              stages && stages.length > 1 && editingFields.has("stage") ? (
                <select
                  id="stage"
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t("chooseStage")}</option>
                  {stages?.map((stage) => (
                    <option key={stage.identifier} value={stage.identifier}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-gray-900 dark:text-gray-100 py-2 flex-1">
                    {stages?.find((s) => s.identifier === selectedStageId)?.name || "-"}
                  </p>
                  {stages && stages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEditingFields((prev) => new Set([...prev, "stage"]))}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title={t("editPin")}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            ) : (
              // Create mode: show text for 1 option or when the stage
              // was pre-selected from caller context; dropdown
              // otherwise. The static label reflects `selectedStageId`
              // so the drag-clears-area flow (which also clears stage)
              // visibly drops the stage label to "-" instead of
              // pretending the single available stage is still picked.
              (stages && stages.length === 1) || initialStage ? (
                <p className="text-gray-900 dark:text-gray-100 py-2">
                  {selectedStageId
                    ? stages?.find((s) => s.identifier === selectedStageId)
                        ?.name ?? "-"
                    : "-"}
                </p>
              ) : (
                <select
                  id="stage"
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">{t("chooseStage")}</option>
                  {stages?.map((stage) => (
                    <option key={stage.identifier} value={stage.identifier}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              )
            )}
          </div>
        )}
          </>
        )}

        {/* Label and Color Picker — in constrain-to-area mode the pin
            color is locked to the stage's color, so the picker is
            hidden and Label spans the full row. */}
        {/* Label only — the pin's colour follows the selected stage
            (rendered as a swatch in the breadcrumb above), so no
            colour picker here. */}
        <FormInput
          id="label"
          label={t("pinLabel")}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("pinLabelPlaceholder")}
          required={!isEditing}
        />

        {/* Pins — create mode only. Lists every dropped location with
            a #N badge, the shared color swatch, an optional per-pin
            label, and a delete button. Clicking a row makes that pin
            the draggable one on the GA preview. Works in both the
            free-roam GA flow and the stage-level constrain-to-area
            flow — new pins drop at the area centroid in the latter
            so they land inside the constraint polygon. */}
        {!isEditing && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("pinsHeading") || "Pins"}{" "}
                <span className="text-gray-400 dark:text-gray-500 font-normal">
                  ({pins.length})
                </span>
              </h4>
              <button
                type="button"
                onClick={handleAddPin}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                {t("addAnotherPin") || "Add another location"}
              </button>
            </div>
            {pins.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic px-2 py-3 rounded-md border border-dashed border-gray-300 dark:border-gray-600">
                {t("noPinsYet") || "No locations yet — add one to continue."}
              </p>
            ) : pins.length === 1 ? (
              // A single pin doesn't get its own editable label — it just
              // uses the Label field above as the punchlist item title,
              // so asking for a second one here would be a redundant,
              // confusing "do I need to fill this in too?" moment. Still
              // worth a live preview though, styled like the parent row
              // in the 2+ pins tree below, so it's clear what this pin
              // will be titled once saved.
              <div className="flex items-center gap-2 px-2.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white dark:border-gray-800 shadow-sm"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="font-mono text-xs text-gray-400 flex-shrink-0 w-7">
                  #1
                </span>
                <span
                  className={`flex-1 min-w-0 truncate text-sm ${
                    label.trim()
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-400 dark:text-gray-500 italic"
                  }`}
                >
                  {label.trim() || t("pinLabel") || "Label"}
                </span>
              </div>
            ) : (
              // 2+ pins save as a parent punchlist item (the Label field
              // above) with one child per pin — mirrored here as a
              // parent + indented sub-pins tree, same chevron/shading
              // language as PunchlistTreeList, so this draft preview
              // already looks like what it becomes after saving.
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-2.5 py-2 bg-white dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setPinsExpanded((prev) => !prev)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    aria-expanded={pinsExpanded}
                    title={
                      pinsExpanded
                        ? t("collapseLocations") || "Collapse locations"
                        : t("expandLocations") || "Expand locations"
                    }
                    aria-label={
                      pinsExpanded
                        ? t("collapseLocations") || "Collapse locations"
                        : t("expandLocations") || "Expand locations"
                    }
                  >
                    <ChevronRightIcon
                      className={`w-4 h-4 transition-transform ${
                        pinsExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white dark:border-gray-800 shadow-sm"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-xs text-gray-400 flex-shrink-0 w-7">
                    #1
                  </span>
                  <span
                    className={`flex-1 min-w-0 truncate text-sm ${
                      label.trim()
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-400 dark:text-gray-500 italic"
                    }`}
                  >
                    {label.trim() || t("pinLabel") || "Label"}
                  </span>
                </div>

                {pinsExpanded && (
                  <div className="bg-gray-50 dark:bg-gray-900/40 divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-200 dark:border-gray-700">
                    {pins.map((p, i) => {
                      const isActive = p.id === activePinId;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPin(p.id)}
                          className={`flex items-center gap-2 pl-9 pr-2.5 py-2 cursor-pointer text-sm transition-colors ${
                            isActive
                              ? "bg-blue-50 dark:bg-blue-900/20"
                              : "hover:bg-gray-100 dark:hover:bg-gray-800/60"
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white dark:border-gray-800 shadow-sm"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          />
                          <span className="font-mono text-xs text-gray-400 flex-shrink-0 w-9">
                            #1.{i + 1}
                          </span>
                          <input
                            type="text"
                            value={p.label}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handlePinLabelChange(p.id, e.target.value)
                            }
                            // Each pin becomes a child punchlist item
                            // titled by its label, falling back to
                            // "Location N" when left blank (see
                            // handleSubmit). Showing that exact fallback
                            // as the placeholder means what's on screen
                            // is what gets saved — no separate helper
                            // text needed to explain it.
                            placeholder={`${t("location") || "Location"} ${i + 1}`}
                            maxLength={255}
                            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-gray-900 dark:text-white text-sm p-0 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePin(p.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title={t("removePin") || "Remove pin"}
                            aria-label={t("removePin") || "Remove pin"}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Punchlist Item Fields (Create mode only, when stage is NOT completed) */}
        {!isEditing && selectedStageId && !isStageCompleted && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              {t("punchlistDetails")}
            </h4>
            <PunchlistItemForm
              title="" 
              onTitleChange={() => {}}
              description={punchlistDescription}
              onDescriptionChange={setPunchlistDescription}
              priority={punchlistPriority}
              onPriorityChange={setPunchlistPriority}
              dueDate={punchlistDueDate}
              onDueDateChange={setPunchlistDueDate}
              assignees={punchlistAssignees}
              onToggleAssignee={toggleAssignee}
              files={punchlistFiles}
              onFileChange={handlePunchlistFileChange}
              onFileRemove={removePunchlistFile}
              projectMembers={projectMembers || undefined}
              hideTitle={true}
              translations={{
                punchlistItemTitle: t("punchlistItemTitle"),
                punchlistTitlePlaceholder: t("punchlistTitlePlaceholder"),
                punchlistDescription: t("punchlistDescription"),
                punchlistDescriptionPlaceholder: t("punchlistDescriptionPlaceholder"),
                punchlistPriority: t("punchlistPriority"),
                punchlistPriorityPlaceholder: t("punchlistPriorityPlaceholder"),
                priorityLow: t("priorityLow"),
                priorityMedium: t("priorityMedium"),
                priorityHigh: t("priorityHigh"),
                punchlistDueDate: t("punchlistDueDate"),
                attachments: t("attachments"),
                uploadAttachment: t("uploadAttachment"),
                maxFileSize: `Max ${FILE_SIZE_LABELS.ga}`,
                assignees: t("assignees"),
              }}
            />
          </div>
        )}
        </div>
      </div>
    </BaseModal>
  );
}
