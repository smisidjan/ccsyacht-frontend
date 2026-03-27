"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  DocumentTextIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  PencilIcon,
  TrashIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentListIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { documentsApi } from "@/lib/api/documents";
import { useGAPins } from "@/lib/api/ga-pins";
import { useDecks } from "@/lib/api/decks";
import { useAreas } from "@/lib/api/areas";
import { useProjectStages } from "@/lib/api/stages";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/app/context/ToastContext";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import Tooltip from "@/app/components/ui/Tooltip";
import CreateGAPinModal from "@/app/components/modals/CreateGAPinModal";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import CreateRemarkModal from "@/app/components/modals/CreateRemarkModal";
import CreatePunchlistItemModal from "@/app/components/modals/CreatePunchlistItemModal";
import type { GAPin } from "@/lib/api/types";

interface GeneralArrangementTabProps {
  projectId: string;
  generalArrangementUrl?: string;
}

export default function GeneralArrangementTab({
  projectId,
  generalArrangementUrl,
}: GeneralArrangementTabProps) {
  const t = useTranslations("projectDetail.generalArrangement");
  const tPins = useTranslations("gaViewer");
  const tCommon = useTranslations("common");
  const { hasPermission } = usePermission();
  const router = useRouter();
  const { showToast } = useToast();
  const imageRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(100);
  const [gaUrl, setGaUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [rawLoading, setRawLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pin state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [isPunchlistModalOpen, setIsPunchlistModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<GAPin | null>(null);
  const [pinToDelete, setPinToDelete] = useState<string | null>(null);
  const [pinForRemark, setPinForRemark] = useState<GAPin | null>(null);
  const [pinForPunchlist, setPinForPunchlist] = useState<GAPin | null>(null);
  const [newPinPosition, setNewPinPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  // Filter state
  const [selectedDeckFilter, setSelectedDeckFilter] = useState<string | null>(null);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string | null>(null);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  const loading = useMinimumLoadingTime(rawLoading);
  const { data: allPins, deletePin, refetch } = useGAPins(projectId);

  // Fetch data for filters
  const { data: decks } = useDecks(projectId);
  const { data: areas } = useAreas(projectId, undefined); // Fetch all areas
  const { data: stages } = useProjectStages(projectId); // Fetch all stages

  const canEdit = hasPermission(PERMISSIONS.EDIT_PROJECTS);

  // Filter pins based on selected filters
  const displayedPins = allPins.filter((pin) => {
    if (selectedDeckFilter && pin.deck.identifier !== selectedDeckFilter) return false;
    if (selectedAreaFilter && pin.area.identifier !== selectedAreaFilter) return false;
    if (selectedStageFilter && pin.stage.identifier !== selectedStageFilter) return false;
    if (selectedStatusFilter && pin.stage.status !== selectedStatusFilter) return false;
    return true;
  });

  // Handle filter changes with cascading reset
  const handleDeckFilterChange = (deckId: string | null) => {
    setSelectedDeckFilter(deckId);
    setSelectedAreaFilter(null);
    setSelectedStageFilter(null);
  };

  const handleAreaFilterChange = (areaId: string | null) => {
    setSelectedAreaFilter(areaId);
    setSelectedStageFilter(null);

    // Auto-select the deck that contains this area
    if (areaId && areas) {
      const selectedArea = areas.find((area) => area.identifier === areaId);
      if (selectedArea?.containedInPlace?.identifier) {
        setSelectedDeckFilter(selectedArea.containedInPlace.identifier);
      }
    }
  };

  const handleStageFilterChange = (stageId: string | null) => {
    setSelectedStageFilter(stageId);

    // Auto-select the area and deck that contain this stage
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

  // Fetch general arrangement on mount
  useEffect(() => {
    async function fetchGA() {
      try {
        setRawLoading(true);
        setError(null);
        const blob = await documentsApi.downloadGeneralArrangement(projectId);

        // Debug logging
        console.log("GA blob fetched:", {
          type: blob.type,
          size: blob.size,
        });

        const url = window.URL.createObjectURL(blob);
        setGaUrl(url);
        setFileType(blob.type);
      } catch (err: any) {
        console.error("Failed to fetch general arrangement:", err);
        if (err.status === 404) {
          setGaUrl(null);
        } else {
          setError(err.message || "Failed to load general arrangement");
        }
      } finally {
        setRawLoading(false);
      }
    }

    fetchGA();

    return () => {
      if (gaUrl) {
        window.URL.revokeObjectURL(gaUrl);
      }
    };
  }, [projectId]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoom(100);

  // Handle click on GA image to add new pin
  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canEdit) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setNewPinPosition({ x, y });
      setSelectedPin(null);
      setIsCreateModalOpen(true);
    },
    [canEdit]
  );

  // Handle pin deletion - open confirmation modal
  const handleDeletePin = useCallback(
    (pinId: string) => {
      setPinToDelete(pinId);
      setIsDeleteModalOpen(true);
    },
    []
  );

  // Confirm delete pin
  const confirmDeletePin = useCallback(async () => {
    if (!pinToDelete) return;
    try {
      await deletePin(pinToDelete);
      showToast("success", tPins("deleteSuccess"));
    } catch (err) {
      console.error("Failed to delete pin:", err);
      showToast("error", tPins("deleteError"));
    } finally {
      setPinToDelete(null);
      setIsDeleteModalOpen(false);
    }
  }, [pinToDelete, deletePin, showToast, tPins]);

  // Handle pin edit
  const handleEditPin = useCallback(
    (pin: GAPin) => {
      setSelectedPin(pin);
      setNewPinPosition(null);
      setIsCreateModalOpen(true);
    },
    []
  );

  // Handle add remark to pin
  const handleAddRemark = useCallback(
    (pin: GAPin) => {
      setPinForRemark(pin);
      setIsRemarkModalOpen(true);
    },
    []
  );

  // Handle add punchlist item to pin
  const handleAddPunchlist = useCallback(
    (pin: GAPin) => {
      setPinForPunchlist(pin);
      setIsPunchlistModalOpen(true);
    },
    []
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSkeleton type="list" rows={3} />
      </div>
    );
  }

  // Error state
  if (error) {
    return <Alert type="error" message={error} />;
  }

  // No document state
  if (!loading && !gaUrl) {
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
          {/* Zoom Controls */}
          {fileType !== "application/pdf" && (
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-1">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title={t("zoomOut")}
              >
                <MagnifyingGlassMinusIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <span className="px-3 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title={t("zoomIn")}
              >
                <MagnifyingGlassPlusIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={handleZoomReset}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title={t("resetZoom")}
              >
                <ArrowsPointingOutIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          )}

          {/* Filter Dropdowns */}
          {/* Deck Filter */}
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

          {/* Area Filter */}
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

          {/* Stage Filter */}
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

          {/* Status Filter */}
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

          {/* Pins Count */}
          {displayedPins.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {displayedPins.length} {tPins("pins")}
            </span>
          )}
        </div>
      </div>

      {/* GA Image with Pins - 70/30 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
        {/* Left: PDF Viewer (70%) */}
        <div className="rounded-xl shadow-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
          <div
            ref={imageRef}
            className="relative w-full bg-gray-50 dark:bg-gray-900"
            style={{
              minHeight: "800px",
            }}
          >
            {/* Render PDF or Image */}
            {fileType === "application/pdf" ? (
              <>
                <object
                  data={`${gaUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  type="application/pdf"
                  className="w-full"
                  style={{ minHeight: "1200px", height: "100vh" }}
                >
                  <p>PDF cannot be displayed</p>
                </object>
                {/* Transparent overlay for pin placement - only when canEdit */}
                {canEdit && (
                  <div
                    onClick={handleImageClick}
                    className="absolute inset-0 cursor-crosshair"
                    style={{ pointerEvents: "auto" }}
                    title="Click to add pin"
                  />
                )}
              </>
            ) : (
              <div
                className="w-full h-full absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${gaUrl})`,
                  backgroundSize: `${zoom}%`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />
            )}
            {/* Render pins on PDF */}
            {displayedPins.map((pin) => (
            <div
              key={pin.identifier}
              className="absolute group"
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: "translate(-50%, -100%)",
              }}
              onMouseEnter={() => setHoveredPinId(pin.identifier)}
              onMouseLeave={() => setHoveredPinId(null)}
            >
              {/* Pin marker */}
              <div
                className={`w-8 h-8 rounded-full border-4 border-white dark:border-gray-800 shadow-lg transition-transform ${
                  hoveredPinId === pin.identifier ? "scale-125" : ""
                }`}
                style={{
                  backgroundColor: pin.color || "#3B82F6",
                }}
              />

              {/* Pin label */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {pin.label || tPins("unnamedPin")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {pin.area?.name} &gt; {pin.stage.name}
                </p>
              </div>
            </div>
          ))}

          {/* Instruction text */}
          {canEdit && displayedPins.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-lg">
                {tPins("clickToAddPin")}
              </p>
            </div>
          )}
          </div>
        </div>

        {/* Right: Pin Info (30%) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
            {tPins("pinsList")}
          </h4>
          {displayedPins.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tPins("noPins")}
            </p>
          ) : (
            <div className="space-y-3">
              {displayedPins.map((pin) => (
                <div
                  key={pin.identifier}
                  className={`p-4 rounded-lg border transition-colors ${
                    hoveredPinId === pin.identifier
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                  onMouseEnter={() => setHoveredPinId(pin.identifier)}
                  onMouseLeave={() => setHoveredPinId(null)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: pin.color || "#3B82F6" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {pin.label || tPins("unnamedPin")}
                      </p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                        <p>Deck: {pin.deck.name}</p>
                        <p>Area: {pin.area.name}</p>
                        <p>Stage: {pin.stage.name}</p>
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 space-y-1">
                          <p className="text-xs">
                            {tPins("createdBy")}: {pin.creator.name}
                          </p>
                          <p className="text-xs">
                            {new Date(pin.dateCreated).toLocaleDateString()} {new Date(pin.dateCreated).toLocaleTimeString()}
                          </p>
                          <div className="flex gap-3 text-xs">
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <ChatBubbleLeftIcon className="w-3 h-3" />
                              {pin.stage.remarksCount} {tPins("remarks")}
                            </span>
                            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                              <ClipboardDocumentListIcon className="w-3 h-3" />
                              {pin.stage.punchlistItemsCount} {tPins("punchlistItems")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {/* Navigation button */}
                      <Tooltip content={tPins("goToStage")} position="left">
                        <button
                          onClick={() => router.push(`/dashboard/projects/${projectId}/areas/${pin.area.identifier}?stage=${pin.stage.identifier}`)}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      {canEdit && (
                        <>
                          <Tooltip content={tPins("addRemark")} position="left">
                            <button
                              onClick={() => handleAddRemark(pin)}
                              className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                            >
                              <ChatBubbleLeftIcon className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          {pin.stage.status !== "completed" && (
                            <Tooltip content={tPins("addPunchlist")} position="left">
                              <button
                                onClick={() => handleAddPunchlist(pin)}
                                className="p-1 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                              >
                                <ClipboardDocumentListIcon className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          )}
                          <Tooltip content={tPins("editPin")} position="left">
                            <button
                              onClick={() => handleEditPin(pin)}
                              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          </Tooltip>
                          <Tooltip content={tPins("deletePin")} position="left">
                            <button
                              onClick={() => handleDeletePin(pin.identifier)}
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
        }}
        projectId={projectId}
        initialPosition={selectedPin ? { x: selectedPin.x, y: selectedPin.y } : newPinPosition}
        initialData={selectedPin}
        onSuccess={refetch}
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

      {/* Create Punchlist Item Modal */}
      {pinForPunchlist && (
        <CreatePunchlistItemModal
          isOpen={isPunchlistModalOpen}
          onClose={() => {
            setIsPunchlistModalOpen(false);
            setPinForPunchlist(null);
          }}
          projectId={projectId}
          stageId={pinForPunchlist.stage.identifier}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
