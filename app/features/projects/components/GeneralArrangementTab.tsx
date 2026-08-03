"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  DocumentTextIcon,
  PaperClipIcon,
  UserCircleIcon,
  ArrowLeftIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useGAPins } from "@/lib/api/ga-pins";
import { useDecks } from "@/lib/api/decks";
import { useAreas } from "@/lib/api/areas";
import { useProjectStages } from "@/lib/api/stages";
import {
  punchlistItemsApi,
  usePunchlistItemAttachments,
} from "@/lib/api/punchlist-items";
import { isImageAttachment } from "@/lib/utils/attachmentUtils";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useGAImage } from "@/lib/hooks/useGAImage";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/app/context/ToastContext";
import { handleError } from "@/lib/utils/errors";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import Tooltip from "@/app/components/ui/Tooltip";
import AuthenticatedImage from "@/app/components/ui/AuthenticatedImage";
import { CreateGAPinModal, GALeafletViewer } from "@/app/features/ga";
import type { AreaPolygonOverlay } from "@/app/features/ga";
import { buildDeckColorMap } from "@/app/features/ga/utils/helpers";
import { CreateDeckModal } from "@/app/features/decks";
import {
  PunchlistItemCard,
  PunchlistTreeList,
  CancelPunchlistItemModal,
} from "@/app/features/punchlist";
import PunchlistAssigneeQuickFilter from "@/app/features/punchlist/components/PunchlistAssigneeQuickFilter";
import { usePunchlistProjectItems } from "@/lib/hooks/usePunchlistProjectItems";
import PunchlistFilterPopover, {
  EMPTY_FILTERS,
  applyPunchlistFilters,
  type PunchlistFilters,
} from "@/app/features/punchlist/components/PunchlistFilterPopover";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ProjectStatus } from "@/app/components/ui/StatusBadge";
import type {
  GAPin,
  PunchlistItem,
  PunchlistItemPriority,
  PunchlistItemStatus,
  StageStatus,
  GeneralArrangement,
  Deck,
  Area,
} from "@/lib/api/types";

/** Project the GA pin's embedded punchlistItem onto the
 *  `PunchlistItem` shape the shared row + dropdowns expect. The
 *  embedded version omits a few fields (`assignees[].email`,
 *  `actionStatus`, `dateModified`), so we fill in sensible blanks —
 *  none of them are rendered as primary content in the row. */
function pinToPunchlistItem(pin: GAPin): PunchlistItem | null {
  if (!pin.punchlistItem) return null;
  const dueDate = pin.punchlistItem.dueDate ?? undefined;
  const isOverdue =
    !!dueDate &&
    new Date(dueDate) < new Date() &&
    pin.punchlistItem.status !== "done" &&
    pin.punchlistItem.status !== "cancelled";
  return {
    identifier: pin.punchlistItem.identifier,
    // Pin payload doesn't ship parent context — assume top-level
    // and let the consumer override if it has tree info nearby.
    parentId: null,
    name: pin.punchlistItem.name,
    description: pin.punchlistItem.description ?? undefined,
    actionStatus: "",
    status: pin.punchlistItem.status,
    priority: pin.punchlistItem.priority,
    dueDate,
    isOverdue,
    stage: {
      identifier: pin.stage.identifier,
      name: pin.stage.name,
      area: {
        identifier: pin.area.identifier,
        name: pin.area.name,
        deck: pin.deck
          ? { identifier: pin.deck.identifier, name: pin.deck.name }
          : undefined,
      },
    },
    creator: {
      identifier: pin.creator.identifier,
      name: pin.creator.name,
    },
    assignees: pin.punchlistItem.assignees.map((a) => ({
      identifier: a.identifier,
      name: a.name,
      email: "",
      assignedAt: "",
    })),
    attachmentCount: pin.punchlistItem.attachmentCount,
    dateCreated: pin.punchlistItem.dateCreated,
    dateModified: pin.punchlistItem.dateCreated,
  };
}

interface GeneralArrangementTabProps {
  projectId: string;
  generalArrangement?: GeneralArrangement;
  projectStatus?: ProjectStatus;
}

// Categorical palette for area outlines, cycled per-area so distinct
// areas are visually distinguishable on the canvas and in the legend.
// Deliberately stays clear of the blue/indigo (decks) and violet/purple
// (side profiles) palettes below.
const AREA_COLOR_PALETTE = [
  "#10B981", // emerald
  "#F59E0B", // amber
  "#F43F5E", // rose
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#D946EF", // fuchsia
  "#F97316", // orange
  "#14B8A6", // teal
  "#EAB308", // yellow
  "#DC2626", // red
];

// Per-deck / per-side-profile palettes live in `ga/utils/helpers` (via
// `buildDeckColorMap`) so this tab and the area-drawing modals assign
// the exact same color to the same deck everywhere it's shown.

// Helper to check if GA exists (uploaded but maybe not yet converted)
function hasGA(ga: GeneralArrangement | undefined): boolean {
  return !!ga && !!ga.contentUrl;
}

// Helper to check if we have valid GA image data (conversion complete)
function hasGAImageData(ga: GeneralArrangement | undefined): boolean {
  return (
    !!ga &&
    !!ga.imageUrl &&
    typeof ga.imageWidth === "number" &&
    typeof ga.imageHeight === "number"
  );
}

// Helper to check if GA is still being converted
function isGAConverting(ga: GeneralArrangement | undefined): boolean {
  return hasGA(ga) && !hasGAImageData(ga);
}

// Helper to fix image URL to use the correct API base
function getFixedImageUrl(imageUrl: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";

  if (imageUrl.startsWith("/")) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);
    const path = url.pathname;

    if (apiBase.startsWith("/")) {
      return path;
    }

    const apiUrl = new URL(apiBase);
    return `${apiUrl.origin}${path}`;
  } catch {
    return imageUrl;
  }
}

// Helper to render stage status badge
const getStageStatusBadge = (status: StageStatus) => {
  const statusConfig: Record<StageStatus, { bgColor: string; textColor: string; label: string }> = {
    not_started: { bgColor: "bg-gray-100 dark:bg-gray-700", textColor: "text-gray-700 dark:text-gray-300", label: "Not Started" },
    in_progress: { bgColor: "bg-blue-100 dark:bg-blue-900", textColor: "text-blue-700 dark:text-blue-300", label: "In Progress" },
    pending_signoff: { bgColor: "bg-amber-100 dark:bg-amber-900", textColor: "text-amber-700 dark:text-amber-300", label: "Pending" },
    completed: { bgColor: "bg-green-100 dark:bg-green-900", textColor: "text-green-700 dark:text-green-300", label: "Completed" },
    rejected: { bgColor: "bg-red-100 dark:bg-red-900", textColor: "text-red-700 dark:text-red-300", label: "Rejected" },
  };

  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      {config.label}
    </span>
  );
};

export default function GeneralArrangementTab({
  projectId,
  generalArrangement,
  projectStatus,
}: GeneralArrangementTabProps) {
  const t = useTranslations("projectDetail.generalArrangement");
  const tPins = useTranslations("gaViewer");
  const tCommon = useTranslations("common");
  const tPunchlist = useTranslations("punchlist");

  const { hasPermission } = usePermission();
  const router = useRouter();
  const { showToast } = useToast();

  // Check if we have valid GA image data
  const hasValidGA = hasGAImageData(generalArrangement);
  const isConverting = isGAConverting(generalArrangement);

  // Fetch GA image with authentication
  const gaImageUrl = hasValidGA && generalArrangement
    ? getFixedImageUrl(generalArrangement.imageUrl!)
    : undefined;
  const { imageBlobUrl, isLoading: isImageLoading, error: imageError } = useGAImage(gaImageUrl);

  // Pin state
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  // Pure display filters — no action attached, just show/hide outlines.
  // Independent of each other and of edit mode (which always shows both,
  // since it needs them for pin placement regardless of these). Off by
  // default — opt-in visualization.
  const [showDeckOutlines, setShowDeckOutlines] = useState(false);
  const [showAreaOutlines, setShowAreaOutlines] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<GAPin | null>(null);
  const [newPinPosition, setNewPinPosition] = useState<{ x: number; y: number } | null>(null);
  const [clickedDeck, setClickedDeck] = useState<Deck | null>(null);
  const [clickedArea, setClickedArea] = useState<Area | null>(null);
  // Pin ids the GA viewer should highlight in lockstep with a hover
  // in the pins list. A set rather than a single id so hovering a
  // parent row pops every child pin attached under it at the same
  // time — child rows just contribute their own single pin.
  const [hoveredPinIds, setHoveredPinIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  // Mirror direction: punchlist item ids whose rows should light up
  // when the user hovers their pin on the GA. Carries the matched
  // item plus its top-level parent so a sub-pin lights up the parent
  // row too, surfacing the group context without the user having to
  // expand it manually.
  const [hoveredItemIds, setHoveredItemIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  // Detail panel selection — drives both the right-hand `PunchlistItemCard`
  // and the GA viewer's `selectedPinId` highlight. We track the
  // punchlist item id (parent or child) instead of the pin object so
  // clicking a parent row opens the parent's detail with its sub-tasks
  // listed inside; clicking a child row opens that child's detail.
  // Orphan pins (no real item) fall back to the pin id.
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(
    null
  );
  // Cancel-reason modal target — same pattern as the stage punchlist
  // list. Row dropdown signals intent here, modal collects the reason.
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Filter state — same shared shape as the punchlist tabs so the
  // GA pin list filters by status / assignee / priority / deck /
  // area / stage through one popover instead of four selects.
  const [filters, setFilters] = useState<PunchlistFilters>(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch pins and filter data
  const { data: allPins, loading: rawLoading, refetch } = useGAPins(projectId);
  const { data: decks, refetch: refetchDecks } = useDecks(projectId);
  const [isManageDecksOpen, setIsManageDecksOpen] = useState(false);

  const { data: areas } = useAreas(projectId, undefined);
  const { data: stages } = useProjectStages(projectId);

  // Enforce minimum loading time to prevent flickering
  const loading = useMinimumLoadingTime(rawLoading);

  const canEdit = hasPermission(PERMISSIONS.EDIT_PROJECTS);

  // No stage exists anywhere in the project yet — every area/deck the
  // user could click leads to a dead end (CreateGAPinModal keeps Save
  // disabled without a stage). Block pin placement up front instead of
  // letting the user discover this after opening the modal.
  const pinsLocked = stages !== null && stages.length === 0;

  // Whether decks/areas should be drawn on the canvas at all right now —
  // edit mode always needs both (it's how pin placement works), the two
  // toggles are the opt-in "just let me look" path outside of that.
  const decksVisible = isAddPinMode || showDeckOutlines;
  const areasVisible = isAddPinMode || showAreaOutlines;

  // Stable color per area, cycling through a palette — lets both the
  // canvas overlay and the legend below identify areas by color instead
  // of every area looking identical. Sorted by identifier so the
  // assignment doesn't shuffle between renders as unrelated data
  // (pins, stages) refetches.
  const areaColorById = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...(areas ?? [])].sort((a, b) =>
      a.identifier.localeCompare(b.identifier)
    );
    sorted.forEach((a, i) => {
      map.set(a.identifier, AREA_COLOR_PALETTE[i % AREA_COLOR_PALETTE.length]);
    });
    return map;
  }, [areas]);

  // Same idea for decks — each deck gets its own blue/indigo shade so
  // the "Decks" legend can list them individually instead of one
  // generic "Deck outline" swatch for all of them. A deck's side
  // profile(s) share its palette *index* into the paired violet
  // palette, so e.g. "Main Deck" (blue #1) and "Main Deck — SB"
  // (violet #1) visually read as belonging together.
  const deckColorById = useMemo(() => buildDeckColorMap(decks), [decks]);

  // Deck legend: one entry per deck, plus one per side profile it has —
  // so "the corresponding side profiles" the user asked for show up by
  // name, not folded into a generic "Side profile" category.
  // Grouped by deck (rather than one flat pill list) so each deck's row
  // stacks under the previous one, with its own side profiles sitting
  // right alongside it — reads clearly even with many decks, instead of
  // an unrelated wrapping mix of deck/side-profile pills.
  const deckLegend = useMemo(() => {
    const out: {
      deck: { name: string; color: string };
      sideProfiles: { name: string; color: string }[];
    }[] = [];
    for (const d of decks ?? []) {
      const colors = deckColorById.get(d.identifier);
      if (!colors) continue;
      out.push({
        deck: { name: d.name, color: colors.deck },
        sideProfiles: (d.sideProfilePolygons ?? []).map((sp) => ({
          name: sp.name,
          color: colors.sideProfile,
        })),
      });
    }
    return out;
  }, [decks, deckColorById]);

  // Every area's polygon(s) — shown purely for spatial context when
  // "Area outlines" is on, and as clickable pin-drop targets whenever
  // Edit mode is on (the two can be independently or simultaneously
  // true). Interactivity itself is decided downstream in
  // GALeafletContent from `canEdit`, not from anything here.
  const areaOverlayPolygons = useMemo<AreaPolygonOverlay[]>(() => {
    if (!areasVisible || !areas) return [];
    const overlays: AreaPolygonOverlay[] = [];
    for (const a of areas) {
      const deckId = a.containedInPlace?.identifier;
      if (!deckId) continue;
      const deck = decks?.find((d) => d.identifier === deckId);
      const color = areaColorById.get(a.identifier) ?? AREA_COLOR_PALETTE[0];
      const perPlacement = (a.polygons ?? []).filter(
        (p) => Array.isArray(p.points) && p.points.length >= 3
      );
      if (perPlacement.length > 0) {
        for (const entry of perPlacement) {
          // Same area can be drawn on the deck's primary (top-down) view
          // *and* on one of its side profiles — without a distinguishing
          // label the hover tooltip would show the same area name for
          // both, leaving the user unsure whether they're about to drop
          // a pin on the plan view or a side elevation.
          const sideProfile = deck?.sideProfilePolygons?.find(
            (sp) => sp.identifier === entry.parentPolygonId
          );
          overlays.push({
            id: `area-${a.identifier}-${entry.parentPolygonId}`,
            name: sideProfile ? `${a.name} — ${sideProfile.name}` : a.name,
            polygon: entry.points,
            color,
            areaId: a.identifier,
            deckId,
          });
        }
      } else if (Array.isArray(a.polygon) && a.polygon.length >= 3) {
        overlays.push({
          id: `area-${a.identifier}`,
          name: a.name,
          polygon: a.polygon,
          color,
          areaId: a.identifier,
          deckId,
        });
      }
    }
    return overlays;
  }, [areasVisible, areas, decks, areaColorById]);

  // Area legend: one entry per distinct area (deduped by id, not by
  // placement — the same area can appear 2-3 times in `areaOverlayPolygons`
  // if it's drawn on a side profile too). Sorted by name so the list
  // reads stably regardless of identifier order.
  const areaLegend = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; color: string }[] = [];
    for (const overlay of areaOverlayPolygons) {
      if (!overlay.areaId || seen.has(overlay.areaId)) continue;
      seen.add(overlay.areaId);
      const area = areas?.find((a) => a.identifier === overlay.areaId);
      if (!area) continue;
      out.push({ name: area.name, color: overlay.color });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [areaOverlayPolygons, areas]);

  // The stages list contains one row per (area × stage-template) combo, so
  // names repeat for every area. The filter is a stage-template picker:
  // dedupe by name (first occurrence wins) and match pins by stage name —
  // selecting "Substrate filler" then shows pins from every area's
  // Substrate-filler stage.
  const uniqueStageNames = useMemo(() => {
    if (!stages) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of stages) {
      if (seen.has(s.name)) continue;
      seen.add(s.name);
      out.push(s.name);
    }
    return out;
  }, [stages]);

  // Pair every pin with the synthetic `PunchlistItem` shape the
  // shared filter helper understands. Pins without a linked punchlist
  // get a `null` synthetic and pass through unfiltered on the
  // punchlist axes — they only respect deck / area / stage matches.
  const pinsWithSynthetic = useMemo(
    () =>
      allPins.map((pin) => ({
        pin,
        item: pinToPunchlistItem(pin),
      })),
    [allPins]
  );

  /** Project-wide punchlist items tree (top-level + inlined children)
   *  plus derived id→display-number map (`"3"` for parents, `"3.1"`
   *  for child sub-items). The lookup map lets the Pins List fold a
   *  child's pin under its parent row without walking the tree on
   *  every render. `treeRefreshKey` bumps after any row-level mutation
   *  so the tree (which carries the up-to-date status / priority /
   *  assignees that we render in the rows) refetches alongside the
   *  GA pins. */
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);
  const {
    items: projectPunchlistItems,
    lookup: punchlistTreeLookup,
    numbers: punchlistNumbers,
  } = usePunchlistProjectItems(projectId, treeRefreshKey);
  const refreshAll = useCallback(() => {
    refetch();
    setTreeRefreshKey((k) => k + 1);
  }, [refetch]);

  // Drive the GA pin list through the same filter helper as the
  // punchlist tabs. Pins are mapped to their synthetic
  // `PunchlistItem`; pins without one fall back to a manual location
  // check so they keep showing when no other axis is active.
  const displayedPins = useMemo(() => {
    const itemsForOptions = pinsWithSynthetic
      .map((p) => p.item)
      .filter((i): i is NonNullable<typeof i> => i !== null);
    const matched = new Set(
      applyPunchlistFilters(itemsForOptions, searchQuery, filters).map(
        (i) => i.identifier
      )
    );
    const anyFilter =
      searchQuery.trim().length > 0 ||
      filters.statuses.length > 0 ||
      filters.assigneeIds.length > 0 ||
      filters.priorities.length > 0 ||
      filters.deckIds.length > 0 ||
      filters.areaIds.length > 0 ||
      filters.stageIds.length > 0;
    return pinsWithSynthetic
      .filter(({ pin, item }) => {
        if (item) return matched.has(item.identifier);
        // No linked punchlist item — only location filters apply.
        if (filters.deckIds.length > 0 && !filters.deckIds.includes(pin.deck.identifier))
          return false;
        if (filters.areaIds.length > 0 && !filters.areaIds.includes(pin.area.identifier))
          return false;
        if (filters.stageIds.length > 0 && !filters.stageIds.includes(pin.stage.identifier))
          return false;
        // Status / assignee / priority / search wipe these pins out
        // entirely since they're orthogonal to GA-only markers.
        if (
          filters.statuses.length > 0 ||
          filters.assigneeIds.length > 0 ||
          filters.priorities.length > 0 ||
          searchQuery.trim().length > 0
        )
          return false;
        return anyFilter ? true : true;
      })
      .map(({ pin }) => pin);
  }, [pinsWithSynthetic, searchQuery, filters]);

  const filterSourceItems = useMemo(
    () =>
      pinsWithSynthetic
        .map((p) => p.item)
        .filter((i): i is NonNullable<typeof i> => i !== null),
    [pinsWithSynthetic]
  );

  /** Top-level items to feed the shared `PunchlistTreeList`. We walk
   *  the displayed pins, resolve each to its top-level tree node, and
   *  dedupe so the same parent only shows once. Children are pre-sorted
   *  by display number so the rendered order matches their `#N.M`
   *  labels (the backend doesn't promise a stable child order across
   *  requests). Pins whose linked item isn't in the tree yet (data lag)
   *  fall back to a synthetic node so they don't disappear from the
   *  list — orphan pins behave the same as singletons. */
  const displayedTreeItems = useMemo<PunchlistItem[]>(() => {
    const out: PunchlistItem[] = [];
    const seen = new Set<string>();
    for (const pin of displayedPins) {
      const pinItemId = pin.punchlistItem?.identifier;
      const lookup = pinItemId ? punchlistTreeLookup.get(pinItemId) : undefined;
      if (lookup) {
        if (seen.has(lookup.topLevel.identifier)) continue;
        seen.add(lookup.topLevel.identifier);
        const sortedChildren = [...(lookup.topLevel.children ?? [])].sort(
          (a, b) => {
            const na = punchlistNumbers.get(a.identifier) ?? "";
            const nb = punchlistNumbers.get(b.identifier) ?? "";
            return na.localeCompare(nb, undefined, { numeric: true });
          }
        );
        out.push({ ...lookup.topLevel, children: sortedChildren });
      } else {
        const synthetic = pinToPunchlistItem(pin);
        if (!synthetic) continue;
        if (seen.has(synthetic.identifier)) continue;
        seen.add(synthetic.identifier);
        out.push(synthetic);
      }
    }
    return out;
  }, [displayedPins, punchlistTreeLookup, punchlistNumbers]);

  /** Map item id → first pin that references it. Used by the hover
   *  bridge that highlights the corresponding marker on the GA
   *  viewer when the user mouses over a row. Pin colour matches the
   *  stage colour, but we don't rely on it for the leading dot
   *  anymore — `stageColorById` covers items that have no direct pin
   *  (e.g. a parent whose pins all live on its children). */
  const pinByItemId = useMemo(() => {
    const map = new Map<string, GAPin>();
    for (const pin of displayedPins) {
      const id = pin.punchlistItem?.identifier ?? pin.identifier;
      if (!map.has(id)) map.set(id, pin);
    }
    return map;
  }, [displayedPins]);

  /** Stage id → hex colour map, derived from the project's stages.
   *  Lets the row's leading dot resolve to the stage colour even when
   *  the item has no pin attached (parent rows), and when the inline
   *  child payload omits the `stage` relation (we fall back to the
   *  parent's stage id at the call site). */
  const stageColorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stages ?? []) {
      if (s.color) map.set(s.identifier, s.color);
    }
    return map;
  }, [stages]);

  /** Resolve the selected item id back into a real `PunchlistItem`,
   *  a backing pin (when available) and a flag telling the card
   *  whether sub-tasks should be rendered. Tree-backed parents get
   *  their children inlined; child rows and orphans don't. */
  const selectedDetail = useMemo(() => {
    if (!selectedDetailId) return null;
    const lookup = punchlistTreeLookup.get(selectedDetailId);
    if (lookup) {
      const pin =
        allPins.find(
          (p) => p.punchlistItem?.identifier === selectedDetailId
        ) ?? null;
      const isParent = lookup.item.identifier === lookup.topLevel.identifier;
      return {
        item: lookup.item,
        pin,
        // Only the top-level item carries sub-tasks. Children render
        // as standalone detail panels with no Sub-tasks section.
        subItems:
          isParent && (lookup.item.children?.length ?? 0) > 0
            ? lookup.item.children
            : undefined,
      };
    }
    // Tree miss — fall back to synthetic from the matching pin. Used
    // for orphan pins (no real punchlist item) and momentary lag
    // between a mutation and the tree refetch.
    const pin =
      allPins.find(
        (p) =>
          p.identifier === selectedDetailId ||
          p.punchlistItem?.identifier === selectedDetailId
      ) ?? null;
    if (!pin) return null;
    const synthetic = pinToPunchlistItem(pin);
    if (!synthetic) return null;
    return { item: synthetic, pin, subItems: undefined };
  }, [selectedDetailId, punchlistTreeLookup, allPins]);


  // Row mutation handlers — mirror the stage/project punchlist
  // tabs so editing from this surface stays consistent. Each one
  // hits the same backend endpoints and triggers a pins refetch so
  // the linked `punchlistItem` snapshot in the row updates too.
  const handleRowStatusChange = useCallback(
    async (itemId: string, status: PunchlistItemStatus) => {
      try {
        await punchlistItemsApi.updateStatus(projectId, itemId, { status });
        showToast("success", tPunchlist("updateSuccess"));
        refreshAll();
      } catch (err) {
        handleError(err, {
          showToast,
          fallbackMessage: tPunchlist("updateError"),
        });
      }
    },
    [projectId, refreshAll, showToast, tPunchlist]
  );

  const handleRowPriorityChange = useCallback(
    async (itemId: string, priority: PunchlistItemPriority) => {
      try {
        await punchlistItemsApi.update(projectId, itemId, { priority });
        showToast(
          "success",
          tPunchlist("priorityUpdated", {
            priority: tPunchlist(
              `priority${priority.charAt(0).toUpperCase()}${priority.slice(1)}`
            ),
          })
        );
        refreshAll();
      } catch (err) {
        handleError(err, {
          showToast,
          fallbackMessage: tPunchlist("updateError"),
        });
      }
    },
    [projectId, refreshAll, showToast, tPunchlist]
  );

  const handleRowCancel = useCallback(
    async (reason: string) => {
      if (!cancelTarget) return;
      try {
        await punchlistItemsApi.updateStatus(projectId, cancelTarget.id, {
          status: "cancelled",
          reason,
        });
        showToast("success", tPunchlist("cancelSuccess"));
        setCancelTarget(null);
        refreshAll();
      } catch (err) {
        handleError(err, {
          showToast,
          fallbackMessage: tPunchlist("updateError"),
        });
        throw err;
      }
    },
    [cancelTarget, projectId, refreshAll, showToast, tPunchlist]
  );

  const canEditPunchlistItems = hasPermission(PERMISSIONS.EDIT_STAGES);

  // Handle pin edit
  const handleEditPin = useCallback((pin: GAPin) => {
    setSelectedPin(pin);
    setNewPinPosition(null);
    setIsCreateModalOpen(true);
  }, []);

  // Only swap to the skeleton on the very first load — refetches
  // (after an attachment upload, pin edit, etc.) keep the rendered
  // tab in place so the page doesn't jump while the request is in
  // flight.
  if (loading && allPins.length === 0) {
    return <LoadingSkeleton type="list" rows={5} />;
  }

  // GA is being converted - show processing state
  if (isConverting) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t("converting") || "Converting document..."}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
          {t("convertingDescription") || "The General Arrangement is being processed. This page will automatically update when ready."}
        </p>
      </div>
    );
  }

  // No document state
  if (!hasValidGA) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
        <DocumentTextIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t("noDocument")}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
          {t("noDocumentDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toolbar — same search + filter popover as the punchlist
          tabs. The popover sources its deck / area / stage options
          from the synthetic items derived from the loaded pins. */}
      <div className="flex items-center flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tPunchlist("searchPlaceholder")}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <PunchlistAssigneeQuickFilter
          items={filterSourceItems}
          selectedIds={filters.assigneeIds}
          onToggle={(id) =>
            setFilters((prev) => ({
              ...prev,
              assigneeIds: prev.assigneeIds.includes(id)
                ? prev.assigneeIds.filter((v) => v !== id)
                : [...prev.assigneeIds, id],
            }))
          }
        />
        <PunchlistFilterPopover
          items={filterSourceItems}
          value={filters}
          onChange={setFilters}
        />
        {displayedPins.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {displayedPins.length} {tPins("pins")}
          </span>
        )}
      </div>

      {/* GA Image with Pins - Flex Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: GA Viewer */}
        <div className="flex-shrink-0">
          {/* Blocking banner — shown instead of letting the user discover
              via a disabled Save button deep inside the Add Pin modal
              that nothing can be placed until an area + stage exists. */}
          {canEdit && pinsLocked && (
            <Alert
              type="warning"
              title={tPins("pinsLockedTitle") || "Pin placement is locked"}
              message={tPins("pinsLockedMessage") || "Create at least one area with a stage before you can add pins to the General Arrangement."}
              action={{
                label: tPins("pinsLockedCta") || "Go to Overview to create an area",
                onClick: () => {
                  window.location.hash = "overview";
                },
              }}
              className="mb-4"
            />
          )}

          {/* Edit Mode + Show active stages toggles */}
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            {canEdit && (() => {
              const editModeToggle = (
                <label className={`flex items-center gap-3 ${pinsLocked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {tPins("editMode") || "Edit mode"}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isAddPinMode && !pinsLocked}
                      disabled={pinsLocked}
                      onChange={(e) => setIsAddPinMode(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      isAddPinMode && !pinsLocked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        isAddPinMode && !pinsLocked ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </div>
                  </div>
                </label>
              );

              return pinsLocked ? (
                <Tooltip
                  content={tPins("pinsLockedMessage") || "Create at least one area with a stage before you can add pins to the General Arrangement."}
                  position="top"
                  triggerClassName="opacity-50"
                >
                  {editModeToggle}
                </Tooltip>
              ) : (
                editModeToggle
              );
            })()}

            {/* Pure display filters — checkboxes, not switches, so they
                read as "no action, just a view option" at a glance next
                to Edit mode's switch (which actually changes what
                clicking the canvas does). Disabled while Edit mode is
                on: it already forces both decks and areas visible (see
                `decksVisible` / `areasVisible`), so toggling these here
                would be a no-op — better to make that honest than let
                the user think unchecking one did something. */}
            <Tooltip
              content={
                isAddPinMode
                  ? tPins("outlineToggleDisabledInEditMode") ||
                    "Edit mode already shows deck and area outlines"
                  : ""
              }
              position="top"
              triggerClassName={isAddPinMode ? "opacity-50" : ""}
            >
              <label
                className={`flex items-center gap-2 select-none ${
                  isAddPinMode ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={showDeckOutlines || isAddPinMode}
                  disabled={isAddPinMode}
                  onChange={(e) => setShowDeckOutlines(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 disabled:cursor-not-allowed"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tPins("deckOutlines") || "Deck outlines"}
                </span>
              </label>
            </Tooltip>

            <Tooltip
              content={
                isAddPinMode
                  ? tPins("outlineToggleDisabledInEditMode") ||
                    "Edit mode already shows deck and area outlines"
                  : ""
              }
              position="top"
              triggerClassName={isAddPinMode ? "opacity-50" : ""}
            >
              <label
                className={`flex items-center gap-2 select-none ${
                  isAddPinMode ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={showAreaOutlines || isAddPinMode}
                  disabled={isAddPinMode}
                  onChange={(e) => setShowAreaOutlines(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 disabled:cursor-not-allowed"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tPins("areaOutlines") || "Area outlines"}
                </span>
              </label>
            </Tooltip>

            {canEdit && projectStatus !== "setup" && (
              <button
                type="button"
                onClick={() => setIsManageDecksOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Squares2X2Icon className="w-4 h-4" />
                {tPins("manageDecks") || "Manage decks"}
              </button>
            )}

            {showAreaOutlines && areaLegend.length === 0 && areas && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {tPins("noAreasToShow") || "No areas with an outline to show."}
              </span>
            )}
          </div>

          {/* Hint sits on its own line and is always rendered (visibility
              toggled, not display) so flipping edit mode doesn't shift
              the GA viewer down/up. */}
          {canEdit && (
            <p
              className={`mb-4 text-sm text-blue-600 dark:text-blue-400 ${
                isAddPinMode ? "" : "invisible"
              }`}
              aria-hidden={!isAddPinMode}
            >
              {tPins("hoverAreaToAdd") || "Hover over an area to add a pin"}
            </p>
          )}

          {/* Legends — shown alongside whichever outlines are currently
              on the canvas (either toggle, or edit mode, which always
              shows both). Both decks and areas get their own per-item
              color (see `deckColorById` / `areaColorById`), so each
              legend lists every visible deck/side profile or area by
              name rather than a generic category swatch. */}
          {decksVisible && deckLegend.length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 block mb-1.5">
                {tPins("decksLegendLabel") || "Decks"}
              </span>
              {/* One row per deck, stacked — its side profiles sit on
                  the same row (wrapping onto their own line if there
                  are several) so the group reads as one unit instead of
                  flowing into the next deck's pills. */}
              <div className="flex flex-col gap-1.5">
                {deckLegend.map((entry) => (
                  <div
                    key={entry.deck.name}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200">
                      <span
                        className="w-3 h-3 rounded-sm border border-gray-300 dark:border-gray-600 flex-shrink-0"
                        style={{ backgroundColor: entry.deck.color }}
                        aria-hidden="true"
                      />
                      {entry.deck.name}
                    </span>
                    {entry.sideProfiles.map((sp) => (
                      <span
                        key={sp.name}
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200"
                      >
                        <span
                          className="w-3 h-3 rounded-sm border border-gray-300 dark:border-gray-600 flex-shrink-0"
                          style={{ backgroundColor: sp.color }}
                          aria-hidden="true"
                        />
                        {sp.name}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {areasVisible && areaLegend.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mr-1">
                {tPins("areasLegendLabel") || "Areas"}
              </span>
              {areaLegend.map((entry) => (
                <span
                  key={`${entry.name}-${entry.color}`}
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200"
                >
                  <span
                    className="w-3 h-3 rounded-sm border border-gray-300 dark:border-gray-600 flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                    aria-hidden="true"
                  />
                  {entry.name}
                </span>
              ))}
            </div>
          )}

          <div className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-900">
            {isImageLoading ? (
              <div className="flex items-center justify-center min-h-[600px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("loadingImage") || "Loading image..."}
                  </p>
                </div>
              </div>
            ) : imageError ? (
              <div className="flex items-center justify-center min-h-[600px]">
                <Alert type="error" message={imageError} />
              </div>
            ) : imageBlobUrl && hasValidGA && generalArrangement ? (
              <GALeafletViewer
                imageUrl={imageBlobUrl}
                imageWidth={generalArrangement.imageWidth!}
                imageHeight={generalArrangement.imageHeight!}
                pins={displayedPins}
                selectedPinId={selectedDetail?.pin?.identifier}
                hoveredPinIds={hoveredPinIds}
                onPinClick={(pin) =>
                  setSelectedDetailId(
                    pin.punchlistItem?.identifier ?? pin.identifier
                  )
                }
                onPinHover={(pin) => {
                  if (!pin) {
                    setHoveredPinIds(new Set());
                    setHoveredItemIds(new Set());
                    return;
                  }
                  setHoveredPinIds(new Set([pin.identifier]));
                  // Light up the matching row too — both the directly
                  // linked punchlist item and (if it's a child) its
                  // top-level parent, so the group context is obvious
                  // even when the tree isn't expanded.
                  const itemId = pin.punchlistItem?.identifier;
                  if (!itemId) {
                    setHoveredItemIds(new Set());
                    return;
                  }
                  const lookup = punchlistTreeLookup.get(itemId);
                  const ids = new Set<string>([itemId]);
                  if (lookup && lookup.topLevel.identifier !== itemId) {
                    ids.add(lookup.topLevel.identifier);
                  }
                  setHoveredItemIds(ids);
                }}
                onDeckClick={(deck, x, y, area) => {
                  if (canEdit && isAddPinMode && !pinsLocked) {
                    setNewPinPosition({ x, y });
                    setClickedDeck(deck);
                    setClickedArea(area ?? null);
                    setSelectedPin(null);
                    setIsCreateModalOpen(true);
                  }
                }}
                canEdit={canEdit && isAddPinMode && !pinsLocked}
                decks={decks || []}
                areas={areas || []}
                areaPolygons={areaOverlayPolygons}
                showDecks={decksVisible}
                deckColors={deckColorById}
              />
            ) : (
              <div className="flex items-center justify-center min-h-[600px]">
                <LoadingSkeleton type="list" rows={3} />
              </div>
            )}
          </div>
        </div>

        {/* Right column — either the pins list or the selected item's
            detail card with its sub-tasks inlined. The column itself
            sticks to the top of the viewport on lg+ so it follows
            the page scroll; only the inner list scrolls when it
            overflows so the column chrome doesn't move while a long
            list ticks past.
            `lg:mt-20` nudges the column down so its top edge lands at
            the GA viewer's start, not at the toggles row above it —
            the toggles live inside the left column and would
            otherwise leave the list starting a few rows higher than
            the drawing it's annotating. */}
        <div className="flex-1 min-w-0 lg:mt-20 lg:sticky lg:top-4 lg:self-start">
          {!selectedDetail ? (
            displayedPins.length === 0 ? (
              pinsLocked ? null : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tPins("noPins")}
                </p>
              )
            ) : (
              <PunchlistTreeList
                  items={displayedTreeItems}
                  projectId={projectId}
                  selectedItemId={selectedDetailId}
                  canEdit={canEditPunchlistItems}
                  // The GA column is permanently narrow (drawing on
                  // the left takes the rest), so always shrink rows
                  // to the essentials — the reporter / breadcrumb
                  // are nice but they push the row past the column
                  // width and force a horizontal scroll.
                  compact
                  getDisplayNumber={(id) => punchlistNumbers.get(id)}
                  getRowColor={(it, parent) =>
                    stageColorById.get(
                      it.stage?.identifier ??
                        parent?.stage?.identifier ??
                        ""
                    ) ?? pinByItemId.get(it.identifier)?.color
                  }
                  highlightedItemIds={hoveredItemIds}
                  onRowHover={(it) => {
                    if (!it) {
                      setHoveredPinIds(new Set());
                      return;
                    }
                    // Collect every pin reachable from this row — the
                    // item itself plus each of its children. Parents
                    // often carry no pin directly (all pins live on
                    // children); without this expansion hovering a
                    // parent row would highlight nothing on the GA.
                    const ids = new Set<string>();
                    const own = pinByItemId.get(it.identifier);
                    if (own) ids.add(own.identifier);
                    for (const child of it.children ?? []) {
                      const childPin = pinByItemId.get(child.identifier);
                      if (childPin) ids.add(childPin.identifier);
                    }
                    setHoveredPinIds(ids);
                  }}
                  onSelectItem={(id) => setSelectedDetailId(id)}
                  onChangeStatus={(id, next) =>
                    handleRowStatusChange(id, next)
                  }
                  onChangePriority={(id, next) =>
                    handleRowPriorityChange(id, next)
                  }
                  onRequestCancel={(t) => setCancelTarget(t)}
                  onAssigneesChange={() => refreshAll()}
                />
              )
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedDetailId(null)}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                {tCommon("back")}
              </button>

              <PunchlistItemCard
                key={selectedDetail.item.identifier}
                item={selectedDetail.item}
                projectId={projectId}
                showLocation
                displayNumber={punchlistNumbers.get(
                  selectedDetail.item.identifier
                )}
                onUpdate={refreshAll}
                subItems={selectedDetail.subItems}
                onSubItemSelect={(id) => setSelectedDetailId(id)}
                getSubItemDisplayNumber={(id) => punchlistNumbers.get(id)}
                onGoToStage={
                  selectedDetail.pin
                    ? () =>
                        router.push(
                          `/dashboard/projects/${projectId}/areas/${selectedDetail.pin!.area.identifier}?stage=${selectedDetail.pin!.stage.identifier}`
                        )
                    : undefined
                }
                onEditPinLocation={
                  canEdit && selectedDetail.pin
                    ? () => handleEditPin(selectedDetail.pin!)
                    : undefined
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Pin Modal */}
      <CreateGAPinModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedPin(null);
          setNewPinPosition(null);
          setClickedDeck(null);
          setClickedArea(null);
        }}
        projectId={projectId}
        initialPosition={selectedPin ? { x: selectedPin.x, y: selectedPin.y } : newPinPosition}
        initialData={selectedPin}
        onSuccess={refreshAll}
        gaImageUrl={imageBlobUrl || undefined}
        gaImageWidth={generalArrangement?.imageWidth}
        gaImageHeight={generalArrangement?.imageHeight}
        initialDeck={clickedDeck}
        initialArea={clickedArea}
      />

      {/* Cancel-reason modal triggered from the row's status dropdown
          when the user picks "Cancelled". Sits alongside the existing
          pin-delete confirmation. */}
      <CancelPunchlistItemModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleRowCancel}
        itemName={cancelTarget?.name ?? ""}
      />

      {/* Manage decks (edit mode of the same modal used during Setup
          tasks). Lets a user with EDIT_PROJECTS revise deck placements
          and side profiles without leaving the GA tab. */}
      {isManageDecksOpen && (
        <CreateDeckModal
          isOpen={isManageDecksOpen}
          onClose={() => setIsManageDecksOpen(false)}
          projectId={projectId}
          // Fires once on modal close *if* the user persisted any
          // changes during the session. Refetching here (instead of
          // after every action) keeps the parent re-render from
          // cascading back into the modal mid-edit.
          onSuccess={refetchDecks}
          gaImageUrl={imageBlobUrl || undefined}
          gaImageWidth={generalArrangement?.imageWidth}
          gaImageHeight={generalArrangement?.imageHeight}
          existingDecks={decks ?? []}
          editMode
        />
      )}

    </div>
  );
}

/** Assignees + attachments block for the selected pin's detail panel.
 *  Extracted so the attachments hook only fires while a pin is selected
 *  (the parent only mounts this when `selectedPinDetail` exists). */
function PinDetailExtras({
  pin,
  projectId,
  tPunchlist,
}: {
  pin: GAPin;
  projectId: string;
  tPunchlist: ReturnType<typeof useTranslations>;
}) {
  const punchlistItem = pin.punchlistItem;
  const { data: attachments, loading: attachmentsLoading } =
    usePunchlistItemAttachments(
      projectId,
      punchlistItem?.identifier ?? "",
      !!punchlistItem
    );

  // Nothing meaningful to show without a linked punchlist item.
  if (!punchlistItem) return null;

  const images = (attachments ?? []).filter((a) => isImageAttachment(a));
  const files = (attachments ?? []).filter((a) => !isImageAttachment(a));

  return (
    <div className="space-y-4 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
      {/* Assignees */}
      <div>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
          <UserCircleIcon className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wide">
            {tPunchlist("assignees")}
          </span>
        </div>
        {punchlistItem.assignees.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">
            {tPunchlist("noAssignees")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {punchlistItem.assignees.map((a) => (
              <span
                key={a.identifier}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs"
              >
                <UserCircleIcon className="w-3.5 h-3.5" />
                {a.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Attachments — images render as thumbnails (auth-fetched blob),
          other file types show as a name + size row. We don't wire up
          click-to-view here; the user can open the item on the stage
          page for the full editor. */}
      <div>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
          <PaperClipIcon className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wide">
            {tPunchlist("attachments")}
          </span>
        </div>
        {attachmentsLoading ? (
          <div className="h-20 w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ) : (attachments ?? []).length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">
            {tPunchlist("attachmentsCount", { count: 0 })}
          </p>
        ) : (
          <div className="space-y-3">
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img) => {
                  const imgUrl = punchlistItemsApi.getDownloadUrl(
                    projectId,
                    punchlistItem.identifier,
                    img.identifier
                  );
                  return (
                    <div
                      key={img.identifier}
                      className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                      title={img.name}
                    >
                      <AuthenticatedImage
                        src={imgUrl}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f) => (
                  <li
                    key={f.identifier}
                    className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
                  >
                    <PaperClipIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {f.contentSizeHuman}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
