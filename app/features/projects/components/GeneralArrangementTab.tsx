"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useGAPins } from "@/lib/api/ga-pins";
import { useDecks } from "@/lib/api/decks";
import { useAreas } from "@/lib/api/areas";
import { useProjectStages } from "@/lib/api/stages";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useGAImage } from "@/lib/hooks/useGAImage";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/app/context/ToastContext";
import { handleError } from "@/lib/utils/errors";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import Tooltip from "@/app/components/ui/Tooltip";
import { CreateGAPinModal, GALeafletViewer } from "@/app/features/ga";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import { CreateRemarkModal } from "@/app/features/remarks";
import type { GAPin, StageStatus, GeneralArrangement, Deck } from "@/lib/api/types";

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

export default function GeneralArrangementTab({
  projectId,
  generalArrangement,
}: GeneralArrangementTabProps) {
  const t = useTranslations("projectDetail.generalArrangement");
  const tPins = useTranslations("gaViewer");
  const tCommon = useTranslations("common");
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<GAPin | null>(null);
  const [pinToDelete, setPinToDelete] = useState<string | null>(null);
  const [pinForRemark, setPinForRemark] = useState<GAPin | null>(null);
  const [newPinPosition, setNewPinPosition] = useState<{ x: number; y: number } | null>(null);
  const [clickedDeck, setClickedDeck] = useState<Deck | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [selectedPinDetail, setSelectedPinDetail] = useState<GAPin | null>(null);

  // Filter state
  const [selectedDeckFilter, setSelectedDeckFilter] = useState<string | null>(null);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string | null>(null);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  // Fetch pins and filter data
  const { data: allPins, loading: rawLoading, deletePin, refetch } = useGAPins(projectId);
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

  // Filter pins based on selected filters
  const displayedPins = allPins.filter((pin) => {
    if (selectedDeckFilter && pin.deck.identifier !== selectedDeckFilter) return false;
    if (selectedAreaFilter && pin.area.identifier !== selectedAreaFilter) return false;
    if (selectedStageFilter && pin.stage.identifier !== selectedStageFilter) return false;
    if (selectedStatusFilter && pin.stage.status !== selectedStatusFilter) return false;
    return true;
  });

  // Handle filter changes
  const handleDeckFilterChange = (deckId: string | null) => {
    setSelectedDeckFilter(deckId);
    setSelectedAreaFilter(null);
    setSelectedStageFilter(null);
  };

  const handleAreaFilterChange = (areaId: string | null) => {
    setSelectedAreaFilter(areaId);
    setSelectedStageFilter(null);
    if (areaId && areas) {
      const selectedArea = areas.find((area) => area.identifier === areaId);
      if (selectedArea?.containedInPlace?.identifier) {
        setSelectedDeckFilter(selectedArea.containedInPlace.identifier);
      }
    }
  };

  const handleStageFilterChange = (stageId: string | null) => {
    setSelectedStageFilter(stageId);
    if (stageId && stages) {
      const selectedStage = stages.find((stage) => stage.identifier === stageId);
      if (selectedStage) {
        if (selectedStage.area?.identifier) {
          setSelectedAreaFilter(selectedStage.area.identifier);
        }
        if (selectedStage.deck?.identifier) {
          setSelectedDeckFilter(selectedStage.deck.identifier);
        }
      }
    }
  };

  // Handle pin deletion
  const handleDeletePin = useCallback((pinId: string) => {
    setPinToDelete(pinId);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDeletePin = useCallback(async () => {
    if (!pinToDelete) return;
    try {
      await deletePin(pinToDelete);
      showToast("success", tPins("deleteSuccess"));
    } catch (err) {
      handleError(err, { showToast, fallbackMessage: tPins("deleteError") });
    } finally {
      setPinToDelete(null);
      setIsDeleteModalOpen(false);
    }
  }, [pinToDelete, deletePin, showToast, tPins]);

  // Handle pin edit
  const handleEditPin = useCallback((pin: GAPin) => {
    setSelectedPin(pin);
    setNewPinPosition(null);
    setIsCreateModalOpen(true);
  }, []);

  // Handle add remark
  const handleAddRemark = useCallback((pin: GAPin) => {
    setPinForRemark(pin);
    setIsRemarkModalOpen(true);
  }, []);

  // Loading state
  if (loading) {
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
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Filter Dropdowns */}
          {decks && decks.length > 0 && (
            <select
              value={selectedDeckFilter || "all"}
              onChange={(e) => handleDeckFilterChange(e.target.value === "all" ? null : e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="all">{tPins("allDecks") || "All Decks"}</option>
              {decks.map((deck) => (
                <option key={deck.identifier} value={deck.identifier}>
                  {deck.name}
                </option>
              ))}
            </select>
          )}

          {areas && areas.length > 0 && (
            <select
              value={selectedAreaFilter || "all"}
              onChange={(e) => handleAreaFilterChange(e.target.value === "all" ? null : e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="all">{tPins("allAreas") || "All Areas"}</option>
              {areas.map((area) => (
                <option key={area.identifier} value={area.identifier}>
                  {area.name}
                </option>
              ))}
            </select>
          )}

          {stages && stages.length > 0 && (
            <select
              value={selectedStageFilter || "all"}
              onChange={(e) => handleStageFilterChange(e.target.value === "all" ? null : e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="all">{tPins("allStages") || "All Stages"}</option>
              {stages.map((stage) => (
                <option key={stage.identifier} value={stage.identifier}>
                  {stage.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedStatusFilter || "all"}
            onChange={(e) => setSelectedStatusFilter(e.target.value === "all" ? null : e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
          >
            <option value="all">{tPins("allStatuses")}</option>
            <option value="not_started">{tPins("statusNotStarted")}</option>
            <option value="in_progress">{tPins("statusInProgress")}</option>
            <option value="pending_signoff">{tPins("statusPendingSignoff")}</option>
            <option value="completed">{tPins("statusCompleted")}</option>
            <option value="rejected">{tPins("statusRejected")}</option>
          </select>

          {displayedPins.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {displayedPins.length} {tPins("pins")}
            </span>
          )}
        </div>
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
                onPinClick={(pin) => setSelectedPinDetail(pin)}
                onDeckClick={(deck, x, y) => {
                  if (canEdit && isAddPinMode) {
                    setNewPinPosition({ x, y });
                    setClickedDeck(deck);
                    setSelectedPin(null);
                    setIsCreateModalOpen(true);
                  }
                }}
                canEdit={canEdit && isAddPinMode}
                decks={decks || []}
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">P</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">S</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">{tPins("pinTitle")}</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">{tPins("pinDescription")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedPins.map((pin) => (
                        <tr
                          key={pin.identifier}
                          className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                            hoveredPinId === pin.identifier
                              ? "bg-blue-50 dark:bg-blue-900/20"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          }`}
                          onClick={() => setSelectedPinDetail(pin)}
                          onMouseEnter={() => setHoveredPinId(pin.identifier)}
                          onMouseLeave={() => setHoveredPinId(null)}
                        >
                          <td className="py-3 px-2">
                            <div
                              className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-800"
                              style={{ backgroundColor: pin.color || "#3B82F6" }}
                            />
                          </td>
                          <td className="py-3 px-2">
                            {getStageStatusBadge(pin.stage.status)}
                          </td>
                          <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">
                            {pin.label || tPins("unnamedPin")}
                          </td>
                          <td className="py-3 px-2">
                            {pin.punchlistItem?.description ? (
                              <Tooltip content={pin.punchlistItem.description} position="top">
                                <span className="text-gray-600 dark:text-gray-400 truncate max-w-[150px] block">
                                  {pin.punchlistItem.description}
                                </span>
                              </Tooltip>
                            ) : (
                              <span className="text-gray-600 dark:text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Detail View */}
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedPinDetail(null)}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  {tCommon("back")}
                </button>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: selectedPinDetail.color || "#3B82F6" }}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {selectedPinDetail.label || tPins("unnamedPin")}
                      </h4>
                      <div className="mt-1">
                        {getStageStatusBadge(selectedPinDetail.stage.status)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Deck: </span>
                      <span className="text-gray-900 dark:text-white font-medium">{selectedPinDetail.deck.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Area: </span>
                      <span className="text-gray-900 dark:text-white font-medium">{selectedPinDetail.area.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Stage: </span>
                      <span className="text-gray-900 dark:text-white font-medium">{selectedPinDetail.stage.name}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{tPins("createdBy")}: </span>
                      <span className="text-gray-900 dark:text-white">{selectedPinDetail.creator.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{tPins("dateCreated")}: </span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(selectedPinDetail.dateCreated).toLocaleDateString()} {new Date(selectedPinDetail.dateCreated).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4 text-sm border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      <span>{selectedPinDetail.stage.remarksCount} {tPins("remarks")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <ClipboardDocumentListIcon className="w-4 h-4" />
                      <span>{selectedPinDetail.stage.punchlistItemsCount} {tPins("punchlistItems")}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button
                      onClick={() => router.push(`/dashboard/projects/${projectId}/areas/${selectedPinDetail.area.identifier}?stage=${selectedPinDetail.stage.identifier}`)}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      {tPins("goToStage")}
                    </button>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleAddRemark(selectedPinDetail)}
                          className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <ChatBubbleLeftIcon className="w-4 h-4" />
                          {tPins("addRemark")}
                        </button>
                        <button
                          onClick={() => handleEditPin(selectedPinDetail)}
                          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                          {tPins("editPin")}
                        </button>
                        <button
                          onClick={() => handleDeletePin(selectedPinDetail.identifier)}
                          className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                          {tPins("deletePin")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
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
        }}
        projectId={projectId}
        initialPosition={selectedPin ? { x: selectedPin.x, y: selectedPin.y } : newPinPosition}
        initialData={selectedPin}
        onSuccess={refetch}
        gaImageUrl={imageBlobUrl || undefined}
        gaImageWidth={generalArrangement?.imageWidth}
        gaImageHeight={generalArrangement?.imageHeight}
        initialDeck={clickedDeck}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPinToDelete(null);
        }}
        onConfirm={confirmDeletePin}
        title={tPins("deletePin")}
        message={tPins("confirmDelete")}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        confirmVariant="danger"
      />

      {/* Create Remark Modal */}
      {pinForRemark && (
        <CreateRemarkModal
          isOpen={isRemarkModalOpen}
          onClose={() => {
            setIsRemarkModalOpen(false);
            setPinForRemark(null);
          }}
          projectId={projectId}
          stageId={pinForRemark.stage.identifier}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
