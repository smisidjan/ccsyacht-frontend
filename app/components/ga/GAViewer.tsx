"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, PencilIcon, TrashIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { useGAPins } from "@/lib/api/ga-pins";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import CreateGAPinModal from "@/app/components/modals/CreateGAPinModal";
import type { GAPin } from "@/lib/api/types";

interface GAViewerProps {
  projectId: string;
  stageId: string;
  stageStatus: string;
  gaImageUrl?: string; // Optional: URL to the GA image
}

export default function GAViewer({
  projectId,
  stageId,
  stageStatus,
  gaImageUrl = "/placeholder-ga.png", // Default placeholder
}: GAViewerProps) {
  const t = useTranslations("gaViewer");
  const { hasPermission } = usePermission();
  const imageRef = useRef<HTMLDivElement>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<GAPin | null>(null);
  const [newPinPosition, setNewPinPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  const { data: allPins, loading, error, createPin, updatePin, deletePin, refetch } = useGAPins(projectId);

  const canEdit = hasPermission(PERMISSIONS.EDIT_PROJECTS);
  const isStageInProgress = stageStatus === "in_progress";
  const canAddPin = canEdit && isStageInProgress;

  // Filter pins for current stage
  const stagePins = allPins.filter((pin) => pin.stage.identifier === stageId);

  // Handle click on GA image to add new pin
  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canAddPin) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setNewPinPosition({ x, y });
      setSelectedPin(null);
      setIsCreateModalOpen(true);
    },
    [canAddPin]
  );

  // Handle pin deletion
  const handleDeletePin = useCallback(
    async (pinId: string) => {
      if (!confirm(t("confirmDelete"))) return;
      try {
        await deletePin(pinId);
      } catch (err) {
        console.error("Failed to delete pin:", err);
      }
    },
    [deletePin, t]
  );

  // Handle pin edit
  const handleEditPin = useCallback(
    (pin: GAPin) => {
      setSelectedPin(pin);
      setNewPinPosition(null);
      setIsCreateModalOpen(true);
    },
    []
  );

  if (loading) {
    return <LoadingSkeleton type="list" rows={3} />;
  }

  if (error) {
    return <Alert type="error" message={error.message || t("loadError")} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MapPinIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h3>
          {stagePins.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({stagePins.length} {t("pins")})
            </span>
          )}
        </div>
        {canAddPin && (
          <Button
            variant="primary"
            onClick={() => {
              setNewPinPosition({ x: 50, y: 50 }); // Default center position
              setSelectedPin(null);
              setIsCreateModalOpen(true);
            }}
          >
            <PlusIcon className="w-4 h-4" />
            {t("addPin")}
          </Button>
        )}
      </div>

      {/* GA Image with Pins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: GA Image */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div
              ref={imageRef}
              onClick={handleImageClick}
              className={`relative w-full aspect-[16/9] bg-gray-100 dark:bg-gray-900 ${
                canAddPin ? "cursor-crosshair" : ""
              }`}
              style={{
                backgroundImage: `url(${gaImageUrl})`,
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              {/* Render pins */}
              {stagePins.map((pin) => (
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
                  {pin.label && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">
                        {pin.label}
                      </p>
                    </div>
                  )}

                  {/* Pin actions */}
                  {canEdit && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPin(pin);
                        }}
                        className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        title={t("editPin")}
                      >
                        <PencilIcon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePin(pin.identifier);
                        }}
                        className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t("deletePin")}
                      >
                        <TrashIcon className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Instruction text */}
              {canAddPin && stagePins.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-sm text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-lg">
                    {t("clickToAddPin")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pins List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              {t("pinsList")}
            </h4>
            {stagePins.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("noPins")}
              </p>
            ) : (
              <div className="space-y-3">
                {stagePins.map((pin) => (
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
                          {pin.label || t("unnamedPin")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t("position")}: {pin.x.toFixed(1)}%, {pin.y.toFixed(1)}%
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditPin(pin)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePin(pin.identifier)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
        onSuccess={() => {
          setIsCreateModalOpen(false);
          setSelectedPin(null);
          setNewPinPosition(null);
          refetch();
        }}
      />
    </div>
  );
}
