"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import FormSelect from "@/app/components/ui/FormSelect";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { areasApi, stagesApi, useAreas, useDecks, useStages, useGAPins } from "@/lib/api";
import { stageTemplatesApi } from "@/lib/api/stageTemplates";
import { usePlacementPolygons } from "@/lib/hooks/usePlacementPolygons";
import StageEditList, { type LocalStage } from "./StageEditList";
import { useGAImage } from "@/lib/hooks/useGAImage";
import { handleError } from "@/lib/utils/errors";
import { normalizeStageColor, pickFreshStageColor } from "@/lib/utils/colors";
import { isInsidePolygon, polygonsOverlap, polygonBbox } from "@/lib/utils/geometry";
import { buildDeckColorMap } from "@/app/features/ga/utils/helpers";
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
  AreaPolygonInput,
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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
        muted
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
      {row.kind === "template" ? (
        <input
          type="checkbox"
          checked={row.included}
          onChange={() => onToggleInclude(row.id)}
          className="flex-shrink-0"
        />
      ) : (
        // Custom rows don't have an include toggle — removing is the way
        // to opt out. Spacer keeps row alignment with template rows.
        <span className="w-4 flex-shrink-0" aria-hidden="true" />
      )}
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
      <span
        className={`flex-1 truncate text-sm font-medium ${
          muted
            ? "text-gray-500 dark:text-gray-500"
            : "text-gray-900 dark:text-white"
        }`}
      >
        {row.name}
      </span>
      {row.kind === "custom" && (
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
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

interface DefineAreaModalProps {
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

export default function DefineAreaModal({
  isOpen,
  onClose,
  projectId,
  generalArrangement,
  onSuccess,
  area,
}: DefineAreaModalProps) {
  const isEditing = !!area;
  const t = useTranslations("areas");
  const { data: decks, loading: decksLoading } = useDecks(projectId);
  // Stages of the area being edited. Hook is always called (no
  // conditional hooks); the empty-areaId fetch fails harmlessly when
  // we're in create mode and the result is unused there anyway.
  const {
    data: areaStages,
    loading: stagesLoading,
    refetch: refetchStages,
  } = useStages(projectId, area?.identifier ?? "");
  // Local working copy of stages. Edits (add, delete, reorder) only
  // mutate this list; the API is hit once when the user saves. Reset
  // back to the server snapshot when the user cancels or the modal
  // reopens.
  const [localStages, setLocalStages] = useState<LocalStage[]>([]);
  const [editTab, setEditTab] = useState<"details" | "stages">("details");

  /** Mobile-only view switcher — the GA drawer and the form share the
   *  screen side by side on desktop, but that squeezes both into
   *  unusably narrow columns below `md`. Same pattern as the "Define
   *  Decks" modal: one pane at a time, picked via a top tab bar.
   *  Default to the GA pane so the user sees the drawing surface (and
   *  the deck picker prompt) immediately on open. */
  const [activeMobileTab, setActiveMobileTab] = useState<"ga" | "form">("ga");

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
    reset: resetActivePolygon,
    canUndo,
    canRedo,
    activeId: activePlacementId,
    setActive: setActivePlacement,
    seed: seedPlacement,
    resetAll: resetAllPolygons,
    all: polygonsByPlacement,
  } = usePlacementPolygons();
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
  // Gate on Save when one or more side profiles were never drawn — see
  // `untouchedSideProfiles` below.
  const [showMissingViewsConfirm, setShowMissingViewsConfirm] = useState(false);

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
  // Polygons are seeded in a separate effect below because we need
  // `selectedDeck` (which loads asynchronously via `useDecks`) to know
  // which placement IDs to hydrate.
  useEffect(() => {
    if (!isOpen) return;
    resetAllPolygons();
    if (area) {
      setSelectedDeckId(area.containedInPlace?.identifier ?? "");
      setName(area.name);
      setDescription(area.description ?? "");
    } else {
      setSelectedDeckId("");
      setName("");
      setDescription("");
    }
    setError(null);
    setCreateStages(true);
    setStageRows([]);
    setNewCustomStageName("");
    setEditTab("details");
    setLocalStages([]);
    setActiveMobileTab("ga");
  }, [isOpen, area, resetAllPolygons]);

  // Seed the local stage list from the server snapshot once stages
  // arrive. Stays in sync only on the first arrival per modal open —
  // after that the user's in-progress edits own the list until they
  // hit Save (which refetches + reseeds via the isOpen reset above).
  useEffect(() => {
    if (!isOpen || !area || !areaStages) return;
    setLocalStages((prev) => {
      if (prev.length > 0) return prev;
      return areaStages
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          key: s.identifier,
          identifier: s.identifier,
          name: s.name,
          color: s.color,
          position: s.position,
          status: { name: s.status.name },
          punchlistItemsCount: s.punchlistItemsCount,
          remarksCount: s.remarksCount,
          releaseFormsCount: s.releaseFormsCount,
          isNew: false,
          isExcluded: false,
        }));
    });
  }, [isOpen, area, areaStages]);

  // Switching deck mid-create wipes the polygon — the user is moving to
  // a different region, the old polygon doesn't apply. Triggered only by
  // user action; the initialisation effect above sets the deck without
  // going through this path.
  const handleDeckChange = (deckId: string) => {
    if (deckId === selectedDeckId) return;
    setSelectedDeckId(deckId);
    // New deck → polygons drawn against the old deck's placements no
    // longer apply. Wipe everything; the "set active to primary"
    // effect below picks up the new deck's primary placement.
    resetAllPolygons();
  };

  const selectedDeck = useMemo(
    () => decks?.find((d) => d.identifier === selectedDeckId),
    [decks, selectedDeckId]
  );

  // The set of "views" the user can draw on: the primary deck rectangle
  // first, then each side profile. `id` matches the placement ID the
  // backend expects on save.
  type PlacementView = {
    id: string;
    name: string;
    bounds: { x1: number; y1: number; x2: number; y2: number };
    kind: "deck" | "side_profile";
  };
  const placements = useMemo<PlacementView[]>(() => {
    if (!selectedDeck) return [];
    const out: PlacementView[] = [];
    // Polygons travel as normalized 0..1; the AreaPolygonDrawer reads
    // DeckBounds in 0..100, so scale through here.
    const pd = selectedDeck.deckPolygon;
    if (pd) {
      const bbox = polygonBbox(pd.points);
      if (bbox) {
        out.push({
          id: pd.identifier,
          name: t("placementDeckView") || "Top view",
          bounds: {
            x1: bbox.bbox_x * 100,
            y1: bbox.bbox_y * 100,
            x2: (bbox.bbox_x + bbox.bbox_width) * 100,
            y2: (bbox.bbox_y + bbox.bbox_height) * 100,
          },
          kind: "deck",
        });
      }
    }
    for (const sp of selectedDeck.sideProfilePolygons ?? []) {
      const bbox = polygonBbox(sp.points);
      if (!bbox) continue;
      out.push({
        id: sp.identifier,
        name: sp.name,
        bounds: {
          x1: bbox.bbox_x * 100,
          y1: bbox.bbox_y * 100,
          x2: (bbox.bbox_x + bbox.bbox_width) * 100,
          y2: (bbox.bbox_y + bbox.bbox_height) * 100,
        },
        kind: "side_profile",
      });
    }
    return out;
  }, [selectedDeck, t]);

  const primaryPlacementId = selectedDeck?.deckPolygon?.identifier ?? null;

  // Same per-deck / per-side-profile color palette as the GA tab, so
  // the outline the user draws inside here is the same shade they'll
  // later see highlighted there — makes it obvious which deck/side
  // profile is currently active instead of a generic gray box.
  const deckColorById = useMemo(() => buildDeckColorMap(decks), [decks]);
  const activePlacementKind = placements.find(
    (p) => p.id === activePlacementId
  )?.kind;
  const activeOutlineColor = selectedDeck
    ? activePlacementKind === "side_profile"
      ? deckColorById.get(selectedDeck.identifier)?.sideProfile
      : deckColorById.get(selectedDeck.identifier)?.deck
    : undefined;

  // Keep `activePlacementId` pointing at a valid placement: default to
  // the primary deck view whenever the deck changes or the current
  // active placement disappears.
  useEffect(() => {
    if (placements.length === 0) return;
    if (
      !activePlacementId ||
      !placements.some((p) => p.id === activePlacementId)
    ) {
      setActivePlacement(placements[0].id);
    }
  }, [placements, activePlacementId, setActivePlacement]);

  // Hydrate from an existing area in edit mode. Prefer `area.polygons`
  // (per-placement); fall back to the legacy `area.polygon` (mapped to
  // the primary placement) so old records keep working until the
  // backend drops the field.
  useEffect(() => {
    if (!isOpen || !area || placements.length === 0) return;
    let seededAny = false;
    if (Array.isArray(area.polygons) && area.polygons.length > 0) {
      for (const entry of area.polygons) {
        // Only seed placements that actually exist on the current deck
        // (defensive against orphaned polygons after side-profile
        // deletes).
        if (!placements.some((p) => p.id === entry.parentPolygonId)) continue;
        if (!Array.isArray(entry.points) || entry.points.length < 3) continue;
        seedPlacement(entry.parentPolygonId, entry.points, true);
        seededAny = true;
      }
    }
    if (!seededAny && primaryPlacementId && area.polygon && area.polygon.length >= 3) {
      seedPlacement(primaryPlacementId, area.polygon, true);
    }
    // Only re-hydrate when the area / deck changes — not when the
    // user is mid-edit (placements stays stable then).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, area, primaryPlacementId, placements.length]);

  const { data: existingAreasInDeck } = useAreas(projectId, selectedDeckId);

  // GA pins for the project — only used in edit mode to keep the
  // polygon from leaving a pin orphaned outside the new outline. In
  // create mode the area doesn't exist yet, so no pins can belong to
  // it. The hook always fires (no conditional hooks); the filter is
  // what trims it to the relevant set.
  const { data: allGAPins } = useGAPins(projectId);
  const existingPinsForDrawer = useMemo(() => {
    if (!area) return [];
    return (allGAPins ?? [])
      .filter((pin) => pin.area?.identifier === area.identifier)
      .map((pin) => ({
        id: pin.identifier,
        label: pin.label,
        // GAPin coordinates are 0..100 percentages; drawer wants 0..1.
        point: { x: pin.x / 100, y: pin.y / 100 },
      }));
  }, [allGAPins, area]);

  const deckOptions = useMemo(
    () => [
      { value: "", label: t("selectDeckPlaceholder") },
      ...(decks ?? []).map((d) => ({ value: d.identifier, label: d.name })),
    ],
    [decks, t]
  );

  // Map existing areas (with polygons) to the drawer format —
  // restricted to the active placement so the obstacles shown on a
  // side-profile view are the polygons drawn on THAT view, not the
  // top-down ones. Falls back to the legacy `area.polygon` only when
  // the active view is the primary deck (where it was always drawn).
  const existingAreasForDrawer = useMemo(() => {
    if (!activePlacementId) return [];
    type Entry = { id: string; name: string; polygon: AreaPolygonPoint[] };
    const out: Entry[] = [];
    for (const a of existingAreasInDeck ?? []) {
      if (a.identifier === area?.identifier) continue;
      const perPlacement = a.polygons?.find(
        (p) => p.parentPolygonId === activePlacementId
      );
      const points =
        perPlacement?.points ??
        (activePlacementId === primaryPlacementId ? a.polygon : undefined);
      if (!points || points.length < 3) continue;
      out.push({ id: a.identifier, name: a.name, polygon: points });
    }
    return out;
  }, [existingAreasInDeck, area?.identifier, activePlacementId, primaryPlacementId]);

  // Bounds for the drawer: the bbox of whichever placement is active.
  const deckBounds = useMemo(() => {
    if (!activePlacementId) return null;
    return placements.find((p) => p.id === activePlacementId)?.bounds ?? null;
  }, [placements, activePlacementId]);

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

  // Count pins that would end up outside the new polygon. Pins live in
  // top-down coordinates, so this check only makes sense on the primary
  // deck view — on a side profile the pin's (x, y) doesn't map to
  // what's being drawn.
  const pinsOutsideCount = useMemo(() => {
    if (activePlacementId !== primaryPlacementId) return 0;
    if (existingPinsForDrawer.length === 0) return 0;
    if (polygon.length < 3) return 0;
    return existingPinsForDrawer.reduce(
      (count, pin) => (isInsidePolygon(pin.point, polygon) ? count : count + 1),
      0
    );
  }, [existingPinsForDrawer, polygon, activePlacementId, primaryPlacementId]);
  const hasPinsOutside = pinsOutsideCount > 0;

  // Catch overlap with neighbour areas. The drawer already rejects
  // individual vertex drops inside another area, but that doesn't stop
  // an edge from sweeping across one — a polygon-polygon check covers
  // both. Same drawer-format list we render as faded outlines.
  const overlappingAreasCount = useMemo(() => {
    if (polygon.length < 3) return 0;
    return existingAreasForDrawer.reduce(
      (count, other) =>
        polygonsOverlap(polygon, other.polygon) ? count + 1 : count,
      0
    );
  }, [existingAreasForDrawer, polygon]);
  const hasOverlap = overlappingAreasCount > 0;

  // Primary deck polygon is the gating one; side-profile polygons are
  // optional. Whichever side-profile views the user did start drawing
  // on must be closed though — half-drawn polygons can't be saved.
  const primaryEntry = primaryPlacementId
    ? polygonsByPlacement[primaryPlacementId]
    : undefined;
  const primaryReady =
    !!primaryEntry && primaryEntry.isClosed && primaryEntry.polygon.length >= 3;

  const halfDrawnPlacements = useMemo(() => {
    const ids: string[] = [];
    for (const p of placements) {
      if (p.id === primaryPlacementId) continue;
      const entry = polygonsByPlacement[p.id];
      if (!entry || entry.polygon.length === 0) continue;
      if (!entry.isClosed || entry.polygon.length < 3) ids.push(p.id);
    }
    return ids;
  }, [placements, polygonsByPlacement, primaryPlacementId]);

  const canSave =
    !!selectedDeckId &&
    primaryReady &&
    halfDrawnPlacements.length === 0 &&
    name.trim().length > 0 &&
    !hasDuplicateColors &&
    !hasPinsOutside &&
    !hasOverlap;

  // Side profiles the user never touched at all (as opposed to
  // `halfDrawnPlacements`, which already blocks Save outright). These
  // are allowed to stay empty, but skipping one silently means the
  // area only exists on the top view — worth a confirmation instead of
  // saving without a word, since the modal's own copy tells the user
  // to outline every view.
  const untouchedSideProfiles = useMemo(
    () =>
      placements.filter((p) => {
        if (p.id === primaryPlacementId) return false;
        const entry = polygonsByPlacement[p.id];
        return !entry || entry.polygon.length === 0;
      }),
    [placements, polygonsByPlacement, primaryPlacementId]
  );

  const handleReset = () => {
    // Reset clears just the view the user is currently on — switching
    // to a different placement and resetting only wipes that one.
    resetActivePolygon();
  };

  const handleSave = async () => {
    if (!canSave || !selectedDeckId) return;
    setError(null);
    setSubmitting(true);
    try {
      // Build the per-placement payload. Only closed, ≥3-vertex
      // polygons go to the server — `canSave` already gates this so
      // half-drawn side profiles can't sneak through.
      const polygonsPayload: AreaPolygonInput[] = [];
      for (const p of placements) {
        const entry = polygonsByPlacement[p.id];
        if (!entry || !entry.isClosed || entry.polygon.length < 3) continue;
        polygonsPayload.push({ parentPolygonId: p.id, points: entry.polygon });
      }
      if (isEditing && area) {
        await areasApi.update(projectId, area.identifier, {
          name: name.trim(),
          description: description.trim() || undefined,
          polygons: polygonsPayload,
        });

        // Diff localStages against the server snapshot and apply the
        // pending stage changes in a single batch. Direct API calls so
        // we don't fire a fetchStages between each one.
        const original = areaStages ?? [];
        const serverIds = new Set(original.map((s) => s.identifier));
        const keptLocalIds = new Set(
          localStages
            .filter((s) => !s.isNew && !s.isExcluded && s.identifier)
            .map((s) => s.identifier as string)
        );
        // Track each op's intent + stage name so we can surface
        // per-stage error messages from Promise.allSettled below.
        type StageOp =
          | { kind: "delete"; stageName: string; promise: Promise<unknown> }
          | { kind: "create"; stageName: string; promise: Promise<unknown> }
          | { kind: "update"; stageName: string; promise: Promise<unknown> };
        const ops: StageOp[] = [];
        // Deletes: server stages the user excluded (or that vanished
        // from the local list entirely — same end result).
        for (const s of original) {
          if (!keptLocalIds.has(s.identifier)) {
            ops.push({
              kind: "delete",
              stageName: s.name,
              promise: stagesApi.delete(projectId, s.identifier),
            });
          }
        }
        // Creates: brand-new entries the user added in this session.
        for (const s of localStages) {
          if (!s.isNew) continue;
          ops.push({
            kind: "create",
            stageName: s.name,
            promise: stagesApi.create(projectId, area.identifier, {
              name: s.name,
              color: s.color ?? undefined,
              sort_order: s.position,
            }),
          });
        }
        // Sort_order updates: kept existing stages whose position
        // shifted. Excluded ones are about to be deleted, no point.
        for (const s of localStages) {
          if (s.isNew || s.isExcluded || !s.identifier) continue;
          if (!serverIds.has(s.identifier)) continue;
          const serverStage = original.find(
            (o) => o.identifier === s.identifier
          );
          if (serverStage && serverStage.position !== s.position) {
            ops.push({
              kind: "update",
              stageName: s.name,
              promise: stagesApi.update(projectId, s.identifier, {
                sort_order: s.position,
              }),
            });
          }
        }
        if (ops.length > 0) {
          // Promise.allSettled — DELETE on a stage now returns 422 if it
          // still has punchlist items / remarks / release forms attached,
          // and we want to surface every blocked stage instead of bailing
          // on the first one. Backend message already names the stage and
          // lists the blocking categories.
          const results = await Promise.allSettled(ops.map((o) => o.promise));
          const failures: string[] = [];
          let hadDeleteFailure = false;
          results.forEach((r, i) => {
            if (r.status !== "rejected") return;
            const op = ops[i];
            const err = r.reason as ApiError | undefined;
            const msg = err?.message;
            if (op.kind === "delete") {
              hadDeleteFailure = true;
              failures.push(
                msg ?? `Could not remove stage '${op.stageName}'.`
              );
            } else if (msg) {
              failures.push(msg);
            }
          });
          // Refetch + clear localStages so the user sees the post-save
          // server state next time the stages tab re-renders, instead of
          // a stale view that still includes deletes the server rejected.
          await refetchStages();
          if (failures.length > 0) {
            setLocalStages([]);
            const header = hadDeleteFailure
              ? t("stageDeleteBlockedTitle")
              : t("areaCreatedError");
            setError(`${header}: ${failures.join(" ")}`);
            return;
          }
        }
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
          polygons: polygonsPayload,
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

  // Drawing-state hint shown beneath the form fields. Reflects the
  // active view's polygon — a "polygon ready" message on the top view
  // doesn't mean the user is done if a side-profile polygon is still
  // half-drawn, so we also flag that.
  const drawingHint = (() => {
    if (!selectedDeckId) return t("hintSelectDeck");
    if (polygon.length === 0) return t("hintStartDrawing");
    if (polygon.length < 3) return t("hintAddMoreVertices");
    if (!isClosed) return t("hintClosePolygon");
    if (halfDrawnPlacements.length > 0) {
      return t("hintFinishOtherViews") || "Finish or clear half-drawn views";
    }
    return t("hintPolygonReady");
  })();

  // Save is the primary button's click target. When every touched view
  // is valid but one or more side profiles were skipped entirely, pause
  // on a confirmation instead of saving silently — `handleSave` itself
  // runs unconditionally once the user confirms (or didn't need to).
  const handleSaveClick = () => {
    if (untouchedSideProfiles.length > 0) {
      setShowMissingViewsConfirm(true);
      return;
    }
    handleSave();
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t("editAreaTitle") : t("createAndDefineAreaTitle")}
      size="2xl"
      disableBackdropClick
    >
      {/* Mobile-only view switcher — the GA drawer and the form share
          the screen side by side on desktop, but that squeezes both
          into unusably narrow columns below `md` (the drawer ends up
          a sliver and the toolbar overlaps the hint text). Same
          pattern as the "Define Decks" modal: one pane at a time,
          picked via a top tab bar. Only shown when there's a GA image
          to switch to — otherwise both panes already render fine
          stacked full-width. */}
      {hasGA && (
        <div className="md:hidden flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg gap-1 mb-4">
          {(["ga", "form"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveMobileTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMobileTab === tab
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {t(tab === "ga" ? "mobileTabGA" : "mobileTabDetails")}
            </button>
          ))}
        </div>
      )}

      {/* On mobile the GA pane is a dedicated full-width tab (see the
          switcher above) so it can take a generous share of the
          viewport — h-[300px] was sized for the old squeezed
          side-by-side layout and left barely any room for the canvas
          once the hint text, view tabs, and floating toolbar all
          shared it (the toolbar's negative margin ended up overlapping
          the content above it). At md+ the columns sit side by side
          and the fixed 70vh box takes over instead; when there's no
          GA image the form's natural height still drives the modal
          via the scroller. */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-4 md:h-[70vh]">
        {/* Left: GA viewer + per-placement view tabs */}
        <div
          className={`${
            hasGA && activeMobileTab !== "ga" ? "hidden" : "flex"
          } md:flex flex-col relative md:flex-1 ${
            hasGA ? "h-[65vh]" : "h-[300px]"
          } md:h-auto md:min-h-[300px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700`}
        >
          {hasGA && selectedDeckId && placements.length > 1 && (
            // Explains *why* there are multiple tabs before the user
            // hits `hintFinishOtherViews` as an error-shaped nudge — the
            // area is one physical space, so its outline has to be
            // redrawn on every view (top + each side profile), not just
            // the one they happened to start on.
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/40 flex-shrink-0">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                {t("multiViewHint")}
              </p>
            </div>
          )}
          {hasGA && selectedDeckId && placements.length > 1 && (
            // Tab strip: one button per view (top + each side profile).
            // A small green dot marks views that already have a closed
            // polygon, so the user can see which are still to-do.
            <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              {placements.map((p) => {
                const isActive = p.id === activePlacementId;
                const entry = polygonsByPlacement[p.id];
                const drawn = !!entry && entry.isClosed && entry.polygon.length >= 3;
                const halfDrawn =
                  !!entry && !drawn && entry.polygon.length > 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePlacement(p.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p.name}
                    {drawn && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? "bg-white" : "bg-green-500"
                        }`}
                        aria-label={t("placementDrawn") || "Drawn"}
                      />
                    )}
                    {halfDrawn && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? "bg-white" : "bg-amber-500"
                        }`}
                        aria-label={t("placementInProgress") || "In progress"}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="relative flex-1 min-h-0">
            {hasGA && selectedDeckId ? (
              <AreaPolygonDrawer
                imageUrl={gaBlobUrl!}
                imageWidth={ga!.imageWidth!}
                imageHeight={ga!.imageHeight!}
                deckBounds={deckBounds ?? undefined}
                deckOutlineColor={activeOutlineColor}
                existingAreas={existingAreasForDrawer}
                existingPins={existingPinsForDrawer}
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
        </div>

        {/* Right: form. Scrollable only on md+ where the column is
            height-bounded; on mobile the modal itself scrolls so the
            focused input stays in view. */}
        <div
          className={`${
            hasGA && activeMobileTab !== "form" ? "hidden" : "flex"
          } md:flex flex-col gap-4 md:w-80 md:flex-shrink-0 md:border-l md:pl-4 md:border-gray-200 md:dark:border-gray-700 md:overflow-y-auto`}
        >
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {(["details", "stages"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setEditTab(tab)}
                className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  editTab === tab
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t(tab === "details" ? "tabDetails" : "tabStages")}
              </button>
            ))}
          </div>

          {editTab === "details" ? (
            <>
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

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {drawingHint}
              </p>

              {hasPinsOutside && (
                <Alert
                  type="warning"
                  message={t("pinsOutsidePolygonWarning", {
                    count: pinsOutsideCount,
                  })}
                />
              )}

              {hasOverlap && (
                <Alert
                  type="warning"
                  message={t("polygonOverlapWarning", {
                    count: overlappingAreasCount,
                  })}
                />
              )}
            </>
          ) : isEditing ? (
            <StageEditList
              stages={localStages}
              loading={stagesLoading && localStages.length === 0}
              onChange={setLocalStages}
            />
          ) : (
            <div className="space-y-3">
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
                <div className="space-y-3">
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
                        <ul className="space-y-2">
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

              {hasDuplicateColors && (
                <Alert type="warning" message={t("duplicateColorsWarning")} />
              )}
            </div>
          )}

          {error && <Alert type="error" message={error} />}

          <div className="mt-auto flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveClick}
              disabled={!canSave || submitting}
              loading={submitting}
            >
              {t("save")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
    <ConfirmModal
      isOpen={showMissingViewsConfirm}
      onClose={() => setShowMissingViewsConfirm(false)}
      onConfirm={handleSave}
      title={t("missingSideProfilesTitle")}
      message={t("missingSideProfilesMessage", {
        names: untouchedSideProfiles.map((p) => p.name).join(", "),
        count: untouchedSideProfiles.length,
      })}
      confirmLabel={t("missingSideProfilesConfirm")}
      cancelLabel={t("missingSideProfilesCancel")}
    />
    </>
  );
}
