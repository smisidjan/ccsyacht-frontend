"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Alert from "@/app/components/ui/Alert";
import Tooltip from "@/app/components/ui/Tooltip";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import CreateGAPinModal from "@/app/features/ga/components/CreateGAPinModal";
import PunchlistItemCard from "./PunchlistItemCard";
import PunchlistItemRow from "./PunchlistItemRow";
import CancelPunchlistItemModal from "./CancelPunchlistItemModal";
import PunchlistAssigneeQuickFilter from "./PunchlistAssigneeQuickFilter";
import PunchlistFilterPopover, {
  EMPTY_FILTERS,
  applyPunchlistFilters,
  type PunchlistFilters,
} from "./PunchlistFilterPopover";
import { punchlistItemsApi, usePunchlistItems } from "@/lib/api/punchlist-items";
import { useGAPins } from "@/lib/api/ga-pins";
import { useToast } from "@/app/context/ToastContext";
import { handleError } from "@/lib/utils/errors";
import { useArea } from "@/lib/api/areas";
import { useDecks } from "@/lib/api/decks";
import { useProject } from "@/lib/api/hooks";
import { useGAImage } from "@/lib/hooks/useGAImage";
import { polygonCentroid } from "@/lib/utils/geometry";
import {
  hasGAImageData,
  getFixedImageUrl,
} from "@/app/features/ga/utils/helpers";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type {
  GAPin,
  PunchlistItem,
  PunchlistItemPriority,
  PunchlistItemStatus,
  Stage,
} from "@/lib/api/types";

interface PunchlistListProps {
  projectId: string;
  /** Area the stage belongs to — required so the create-pin modal can
   *  pre-lock the area selector and constrain the marker to its
   *  polygon. */
  areaId: string;
  /** Active stage object — name + color are part of the stage's
   *  identity (shown in the compact location summary), so we pass the
   *  whole object instead of just the id. */
  stage: Stage;
  /** Fired after any local mutation (create / update / delete) so
   *  ancestors that show derived punchlist stats (e.g. the open-count
   *  badge on the area detail page) can refresh in lockstep. */
  onPunchlistChange?: () => void;
}

export default function PunchlistList({ projectId, areaId, stage, onPunchlistChange }: PunchlistListProps) {
  const stageId = stage.identifier;
  const stageStatus = stage.status.name;
  const t = useTranslations("punchlist");
  const { hasPermission } = usePermission();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // Jira-style filters — all client-side against the loaded page so
  // the user can combine status / assignee / priority in one popover
  // instead of stepping through single-status tabs.
  const [filters, setFilters] = useState<PunchlistFilters>(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // GA pin currently being edited via the More-actions menu.
  // Reuses the existing CreateGAPinModal in edit mode.
  const [editingPin, setEditingPin] = useState<GAPin | null>(null);
  // Cancel needs a reason — `cancelTarget` keeps the row that asked
  // for it while the modal is open. Mirrors the pattern used inside
  // the detail card.
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { showToast } = useToast();

  // No server-side filter — the popover supports multi-select for
  // status / assignee / priority, which the current hook can't express,
  // so we load the page raw and apply every filter axis client-side.
  const { data: items, loading, error, pagination, refetch } = usePunchlistItems(
    projectId,
    stageId,
    {
      page: currentPage,
      per_page: 5,
    }
  );

  // GA pins — needed to look up the pin attached to the currently
  // selected punchlist item so the More-actions menu can offer
  // "Edit pin location" without us having to add a pin reference
  // to every PunchlistItem on the backend.
  const { data: gaPins, refetch: refetchPins } = useGAPins(projectId);

  // Refetch the local list AND ping ancestors so derived stats (e.g.
  // the area page's open-count badge) stay in sync with our mutations.
  const handleChange = () => {
    refetch();
    onPunchlistChange?.();
  };

  // GA context for the create-pin modal. We open this lazily — only the
  // GA-image fetch is deferred to when the user actually clicks "+ Add"
  // (via the conditional render below), the rest is cheap.
  const { data: project } = useProject(projectId);
  const { data: area } = useArea(projectId, areaId);
  const { data: decks } = useDecks(projectId);
  const deck = decks?.find(
    (d) => d.identifier === area?.containedInPlace?.identifier
  );
  const ga =
    project && typeof project.generalArrangement === "object"
      ? project.generalArrangement
      : null;
  const gaImageRawUrl =
    ga && hasGAImageData(ga) && ga.imageUrl
      ? getFixedImageUrl(ga.imageUrl)
      : undefined;
  const { imageBlobUrl } = useGAImage(gaImageRawUrl);
  // Centroid of the area's polygon — used as the marker's drop point so
  // the user starts inside the area. Falls back to the image centre when
  // the area has no polygon (legacy data).
  const initialPinPosition = area?.polygon
    ? (() => {
        const c = polygonCentroid(area.polygon);
        return c ? { x: c.x * 100, y: c.y * 100 } : { x: 50, y: 50 };
      })()
    : { x: 50, y: 50 };

  const canCreate = hasPermission(PERMISSIONS.CREATE_PUNCHLIST_ITEMS);
  const canView = hasPermission(PERMISSIONS.VIEW_PUNCHLIST_ITEMS);
  const isStageInProgress = stageStatus === "in_progress";

  // Filters/search are client-side — they don't drive the API, so no
  // pagination reset is needed when they change.

  // Selection lives outside the items array — if the selected id
  // disappears (filter change, page move, server-side delete) clear
  // it so the detail panel doesn't keep referencing a stale row.
  useEffect(() => {
    if (!items || !selectedItemId) return;
    if (!items.some((item) => item.identifier === selectedItemId)) {
      setSelectedItemId(null);
    }
  }, [items, selectedItemId]);

  // Apply search + filter popover values client-side. Helper is
  // shared with the project-level and GA tabs so they all read the
  // same filter semantics.
  const filteredItems = useMemo(
    () => applyPunchlistFilters(items ?? [], searchQuery, filters),
    [items, searchQuery, filters]
  );

  const selectedItem = filteredItems.find(
    (i: PunchlistItem) => i.identifier === selectedItemId
  );

  // Status mutation shared between the row dropdown and the detail
  // panel. Cancellation hits a different path (needs a reason) and
  // routes through the modal below.
  const handleRowStatusChange = async (
    itemId: string,
    status: PunchlistItemStatus
  ) => {
    try {
      await punchlistItemsApi.updateStatus(projectId, itemId, { status });
      showToast("success", t("updateSuccess"));
      handleChange();
    } catch (err) {
      handleError(err, { showToast, fallbackMessage: t("updateError") });
    }
  };

  const handleRowPriorityChange = async (
    itemId: string,
    priority: PunchlistItemPriority
  ) => {
    try {
      await punchlistItemsApi.update(projectId, itemId, { priority });
      showToast(
        "success",
        t("priorityUpdated", {
          priority: t(
            `priority${priority.charAt(0).toUpperCase()}${priority.slice(1)}`
          ),
        })
      );
      handleChange();
    } catch (err) {
      handleError(err, { showToast, fallbackMessage: t("updateError") });
    }
  };

  const handleRowCancel = async (reason: string) => {
    if (!cancelTarget) return;
    try {
      await punchlistItemsApi.updateStatus(projectId, cancelTarget.id, {
        status: "cancelled",
        reason,
      });
      showToast("success", t("cancelSuccess"));
      setCancelTarget(null);
      handleChange();
    } catch (err) {
      handleError(err, { showToast, fallbackMessage: t("updateError") });
      throw err;
    }
  };

  const canEditItems = hasPermission(PERMISSIONS.EDIT_STAGES);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  if (!canView) {
    return (
      <Alert
        type="info"
        message="You don't have permission to view punchlist items."
      />
    );
  }

  // Only swap to the skeleton on the very first load. Refetches
  // (after a status change, assignee edit, etc.) keep the previous
  // data on screen so the panel doesn't collapse and the page doesn't
  // jump while the request is in flight.
  if (loading && items === null) {
    return <LoadingSkeleton type="list" rows={5} />;
  }

  return (
    <div className="space-y-8">
      {/* Header — title + create. Per-status counts moved out; the
          filter popover handles slicing the list by status now. */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h3>
        {canCreate && isStageInProgress && (
          <Tooltip content={t("createItem")} position="left">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Toolbar — Jira-style: search input + filter popover. The
          popover handles status / assignee / priority in one place
          and supports multi-select on each axis. */}
      <div className="flex items-center flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <PunchlistAssigneeQuickFilter
          items={items ?? []}
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
          items={items ?? []}
          value={filters}
          onChange={setFilters}
        />
      </div>

      {/* Error State */}
      {error && (
        <Alert
          type="error"
          message={error.message || "Failed to load punchlist items"}
        />
      )}

      {/* Items List */}
      {!error && items && (
        <>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                {items.length === 0
                  ? t("noPunchlistItems")
                  : t("noMatchingItems")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              {/* List — thin rows, Jira-style. Stays full-width on
                  small screens; on lg+ shrinks to make room for the
                  detail panel beside it. */}
              <div
                className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md divide-y divide-gray-100 dark:divide-gray-700 ${
                  selectedItem ? "lg:w-2/5 xl:w-1/3" : "w-full"
                }`}
              >
                {filteredItems.map((item: PunchlistItem) => (
                  <PunchlistItemRow
                    key={item.identifier}
                    item={item}
                    projectId={projectId}
                    isSelected={selectedItemId === item.identifier}
                    stageStatus={stageStatus}
                    canEdit={canEditItems}
                    compact={!!selectedItem}
                    onSelect={() =>
                      setSelectedItemId(
                        selectedItemId === item.identifier
                          ? null
                          : item.identifier
                      )
                    }
                    onChangeStatus={(next) =>
                      handleRowStatusChange(item.identifier, next)
                    }
                    onChangePriority={(next) =>
                      handleRowPriorityChange(item.identifier, next)
                    }
                    onRequestCancel={() =>
                      setCancelTarget({ id: item.identifier, name: item.name })
                    }
                    onAssigneesChange={handleChange}
                  />
                ))}
              </div>

              {/* Detail panel — slides in beside the list on lg+, full
                  width above on smaller screens. Reuses the existing
                  card layout (full metadata, actions, attachments)
                  as the detail view. */}
              {selectedItem && (
                <div className="flex-1 min-w-0 max-w-3xl">
                  <PunchlistItemCard
                    key={selectedItem.identifier}
                    item={selectedItem}
                    projectId={projectId}
                    stageStatus={stageStatus}
                    onUpdate={handleChange}
                    onClose={() => setSelectedItemId(null)}
                    onEditPinLocation={(() => {
                      // Look up the GA pin attached to the selected
                      // punchlist item — only offer the menu entry
                      // when the lookup actually finds one.
                      const pin = gaPins?.find(
                        (p) =>
                          p.punchlistItem?.identifier ===
                          selectedItem.identifier
                      );
                      return pin
                        ? () => setEditingPin(pin)
                        : undefined;
                    })()}
                  />
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.lastPage > 1 && (
            <div className="flex items-center justify-between mt-6 px-5 py-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("pagination", {
                  current: pagination.currentPage,
                  total: pagination.lastPage,
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("previousPage")}
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("nextPage")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal — opens the GA pin modal pre-locked to this
          area's deck/area/stage. The marker is constrained to the
          area's polygon so the pin can't land outside it. */}
      {isCreateModalOpen && (
        <CreateGAPinModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          projectId={projectId}
          initialPosition={initialPinPosition}
          initialDeck={deck || null}
          initialArea={area || null}
          initialStage={stage}
          constrainToArea
          gaImageUrl={imageBlobUrl || undefined}
          gaImageWidth={ga?.imageWidth}
          gaImageHeight={ga?.imageHeight}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            handleChange();
          }}
        />
      )}

      {/* Edit-pin modal — reuses CreateGAPinModal in edit mode when
          the user picks "Edit pin location" from the More menu. */}
      {editingPin && (
        <CreateGAPinModal
          isOpen={!!editingPin}
          onClose={() => setEditingPin(null)}
          projectId={projectId}
          initialPosition={{ x: editingPin.x, y: editingPin.y }}
          initialData={editingPin}
          gaImageUrl={imageBlobUrl || undefined}
          gaImageWidth={ga?.imageWidth}
          gaImageHeight={ga?.imageHeight}
          onSuccess={() => {
            setEditingPin(null);
            refetchPins();
            handleChange();
          }}
        />
      )}

      {/* Cancel-reason modal shared by every row's status dropdown.
          The detail card keeps its own internal modal — both routes
          end up at the same backend endpoint with a reason string. */}
      <CancelPunchlistItemModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleRowCancel}
        itemName={cancelTarget?.name ?? ""}
      />
    </div>
  );
}
