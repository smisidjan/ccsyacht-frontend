"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  DocumentTextIcon,
  PaperClipIcon,
  UserCircleIcon,
  ArrowLeftIcon,
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
import {
  PunchlistItemRow,
  PunchlistItemCard,
  CancelPunchlistItemModal,
} from "@/app/features/punchlist";
import PunchlistFilterPopover, {
  EMPTY_FILTERS,
  applyPunchlistFilters,
  type PunchlistFilters,
} from "@/app/features/punchlist/components/PunchlistFilterPopover";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
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
}

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

// Pin status badge — reflects the linked punchlist item's status
// (open / in_progress / done / cancelled), which is what the user
// actually wants to triage from this view. Stage status lives one
// level up and is shown separately in the detail panel.
const punchlistStatusBadgeStyles: Record<PunchlistItemStatus, string> = {
  open: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
  in_progress: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  next_step_release:
    "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
  done: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  cancelled: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
};
const getPunchlistStatusBadge = (
  status: PunchlistItemStatus | undefined,
  label: string
) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        —
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${punchlistStatusBadgeStyles[status]}`}
    >
      {label}
    </span>
  );
};

export default function GeneralArrangementTab({
  projectId,
  generalArrangement,
}: GeneralArrangementTabProps) {
  const t = useTranslations("projectDetail.generalArrangement");
  const tPins = useTranslations("gaViewer");
  const tCommon = useTranslations("common");
  const tPunchlist = useTranslations("punchlist");

  // Localized labels for the punchlist status badge / filter — kept
  // inline so the badge helper stays a pure renderer.
  const punchlistStatusLabel = (s: PunchlistItemStatus): string => {
    switch (s) {
      case "open":
        return tPunchlist("statusOpen");
      case "in_progress":
        return tPunchlist("statusInProgress");
      case "next_step_release":
        return tPunchlist("statusNextStepRelease");
      case "done":
        return tPunchlist("statusDone");
      case "cancelled":
        return tPunchlist("statusCancelled");
    }
  };
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
  // When true, overlay each area's polygon on the GA, colored by its active
  // stage. Off by default — opt-in visualization.
  const [showActiveStages, setShowActiveStages] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<GAPin | null>(null);
  const [newPinPosition, setNewPinPosition] = useState<{ x: number; y: number } | null>(null);
  const [clickedDeck, setClickedDeck] = useState<Deck | null>(null);
  const [clickedArea, setClickedArea] = useState<Area | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [selectedPinDetail, setSelectedPinDetail] = useState<GAPin | null>(null);
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
  const { data: decks } = useDecks(projectId);
  const { data: areas } = useAreas(projectId, undefined);
  const { data: stages } = useProjectStages(projectId);

  // Enforce minimum loading time to prevent flickering
  const loading = useMinimumLoadingTime(rawLoading);

  const canEdit = hasPermission(PERMISSIONS.EDIT_PROJECTS);

  // Compute "active stage per area" overlays. We treat the active stage as
  // the one the team is currently progressing through:
  //   1. status === in_progress
  //   2. else status === pending_signoff
  //   3. else the first not_started (= next up)
  // If none match, the area has nothing meaningful to show right now and is
  // skipped. Empty array when the toggle is off so we don't churn render
  // work when the user isn't looking.
  const activeStagePolygons = useMemo(() => {
    if (!showActiveStages) return [];
    if (!areas || !stages) return [];
    const stagesByArea = new Map<string, typeof stages>();
    for (const s of stages) {
      if (!s.area?.identifier) continue;
      const list = stagesByArea.get(s.area.identifier) ?? [];
      list.push(s);
      stagesByArea.set(s.area.identifier, list);
    }
    return areas
      .filter((a) => Array.isArray(a.polygon) && a.polygon.length >= 3)
      .map((a) => {
        const areaStages = (stagesByArea.get(a.identifier) ?? [])
          .slice()
          .sort((x, y) => x.position - y.position);
        const active =
          areaStages.find((s) => s.status.name === "in_progress") ??
          areaStages.find((s) => s.status.name === "pending_signoff") ??
          areaStages.find((s) => s.status.name === "not_started") ??
          null;
        if (!active?.color) return null;
        return {
          id: a.identifier,
          name: `${a.name} — ${active.name}`,
          polygon: a.polygon!,
          color: active.color,
          stageName: active.name,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [showActiveStages, areas, stages]);

  // Legend: each distinct (stageName + color) combination currently coloring
  // a polygon on the GA. Sorted alphabetically so the list reads stably.
  const activeStageLegend = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; color: string }[] = [];
    for (const entry of activeStagePolygons) {
      const key = `${entry.stageName}|${entry.color.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: entry.stageName, color: entry.color });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeStagePolygons]);

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


  // Row mutation handlers — mirror the stage/project punchlist
  // tabs so editing from this surface stays consistent. Each one
  // hits the same backend endpoints and triggers a pins refetch so
  // the linked `punchlistItem` snapshot in the row updates too.
  const handleRowStatusChange = useCallback(
    async (itemId: string, status: PunchlistItemStatus) => {
      try {
        await punchlistItemsApi.updateStatus(projectId, itemId, { status });
        showToast("success", tPunchlist("updateSuccess"));
        refetch();
      } catch (err) {
        handleError(err, {
          showToast,
          fallbackMessage: tPunchlist("updateError"),
        });
      }
    },
    [projectId, refetch, showToast, tPunchlist]
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
        refetch();
      } catch (err) {
        handleError(err, {
          showToast,
          fallbackMessage: tPunchlist("updateError"),
        });
      }
    },
    [projectId, refetch, showToast, tPunchlist]
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
        refetch();
      } catch (err) {
        handleError(err, {
          showToast,
          fallbackMessage: tPunchlist("updateError"),
        });
        throw err;
      }
    },
    [cancelTarget, projectId, refetch, showToast, tPunchlist]
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
      <div className="flex items-center gap-3">
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
          {/* Edit Mode + Show active stages toggles */}
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            {canEdit && (
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tPins("editMode") || "Edit mode"}
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isAddPinMode}
                    onChange={(e) => setIsAddPinMode(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${
                    isAddPinMode ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      isAddPinMode ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </div>
                </div>
              </label>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {tPins("showActiveStages") || "Show active stages"}
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showActiveStages}
                  onChange={(e) => setShowActiveStages(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  showActiveStages ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    showActiveStages ? "translate-x-5" : "translate-x-0"
                  }`} />
                </div>
              </div>
            </label>

            {canEdit && isAddPinMode && (
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {tPins("hoverDeckToAdd") || "Hover over a deck to add a pin"}
              </span>
            )}
            {showActiveStages && activeStagePolygons.length === 0 && areas && stages && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {tPins("noActiveStages") || "No areas with an active stage to show."}
              </span>
            )}
          </div>

          {/* Legend — one pill per distinct stage currently coloring an
              area on the GA. Helps the viewer connect color → stage name
              without hovering every polygon. */}
          {showActiveStages && activeStageLegend.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mr-1">
                {tPins("legend") || "Legend"}
              </span>
              {activeStageLegend.map((entry) => (
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
                selectedPinId={selectedPinDetail?.identifier}
                hoveredPinId={hoveredPinId}
                onPinClick={(pin) => setSelectedPinDetail(pin)}
                onPinHover={(pin) => setHoveredPinId(pin?.identifier ?? null)}
                onDeckClick={(deck, x, y, area) => {
                  if (canEdit && isAddPinMode) {
                    setNewPinPosition({ x, y });
                    setClickedDeck(deck);
                    setClickedArea(area ?? null);
                    setSelectedPin(null);
                    setIsCreateModalOpen(true);
                  }
                }}
                canEdit={canEdit && isAddPinMode}
                decks={decks || []}
                areas={areas || []}
                areaPolygons={activeStagePolygons}
              />
            ) : (
              <div className="flex items-center justify-center min-h-[600px]">
                <LoadingSkeleton type="list" rows={3} />
              </div>
            )}
          </div>
        </div>

        {/* Right: Pin Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex-1 min-w-0">
          {!selectedPinDetail ? (
            <>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                {tPins("pinsList")}
              </h4>
              {displayedPins.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tPins("noPins")}
                </p>
              ) : (
                <div
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md divide-y divide-gray-100 dark:divide-gray-700"
                  onMouseLeave={() => setHoveredPinId(null)}
                >
                  {displayedPins.map((pin) => {
                    const synthetic = pinToPunchlistItem(pin);
                    // Pins without a linked punchlist item are rare —
                    // surface a minimal row so they don't disappear.
                    if (!synthetic) {
                      return (
                        <div
                          key={pin.identifier}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedPinDetail(pin)}
                          onMouseEnter={() => setHoveredPinId(pin.identifier)}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-l-2 ${
                            hoveredPinId === pin.identifier
                              ? "bg-blue-50 dark:bg-blue-900/20 border-l-blue-500"
                              : "border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40"
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white dark:border-gray-800 shadow-sm"
                            style={{ backgroundColor: pin.color || "#3B82F6" }}
                            aria-hidden="true"
                          />
                          <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white truncate">
                            {pin.label || tPins("unnamedPin")}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={pin.identifier}
                        onMouseEnter={() => setHoveredPinId(pin.identifier)}
                      >
                        <PunchlistItemRow
                          item={synthetic}
                          projectId={projectId}
                          isSelected={false}
                          canEdit={canEditPunchlistItems}
                          stageColor={pin.color}
                          onSelect={() => setSelectedPinDetail(pin)}
                          onChangeStatus={(next) =>
                            handleRowStatusChange(synthetic.identifier, next)
                          }
                          onChangePriority={(next) =>
                            handleRowPriorityChange(
                              synthetic.identifier,
                              next
                            )
                          }
                          onRequestCancel={() =>
                            setCancelTarget({
                              id: synthetic.identifier,
                              name: synthetic.name,
                            })
                          }
                          onAssigneesChange={() => refetch()}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Detail view — same shared `PunchlistItemCard` as the
                  stage / project punchlist tabs. Deck / Area / Stage
                  show up under Details because we pass `showLocation`.
                  Pin-specific actions (Go to stage / Edit / Delete pin)
                  sit below since the punchlist card doesn't own them. */}
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedPinDetail(null)}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  {tCommon("back")}
                </button>

                {(() => {
                  const synthetic = pinToPunchlistItem(selectedPinDetail);
                  if (!synthetic) {
                    return (
                      <p className="text-sm italic text-gray-500 dark:text-gray-400">
                        {tPins("unnamedPin")}
                      </p>
                    );
                  }
                  return (
                    <PunchlistItemCard
                      key={synthetic.identifier}
                      item={synthetic}
                      projectId={projectId}
                      showLocation
                      onUpdate={refetch}
                      onGoToStage={() =>
                        router.push(
                          `/dashboard/projects/${projectId}/areas/${selectedPinDetail.area.identifier}?stage=${selectedPinDetail.stage.identifier}`
                        )
                      }
                      onEditPinLocation={
                        canEdit
                          ? () => handleEditPin(selectedPinDetail)
                          : undefined
                      }
                    />
                  );
                })()}
              </div>
            </>
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
        onSuccess={refetch}
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
