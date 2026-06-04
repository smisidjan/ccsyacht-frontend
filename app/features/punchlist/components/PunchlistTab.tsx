"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useRouter } from "@/i18n/navigation";
import Alert from "@/app/components/ui/Alert";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import PunchlistItemCard from "./PunchlistItemCard";
import PunchlistItemRow from "./PunchlistItemRow";
import { usePunchlistNumbers } from "@/lib/hooks/usePunchlistNumbers";
import CancelPunchlistItemModal from "./CancelPunchlistItemModal";
import PunchlistFilterPopover, {
  EMPTY_FILTERS,
  applyPunchlistFilters,
  type PunchlistFilters,
} from "./PunchlistFilterPopover";
import PunchlistAssigneeQuickFilter from "./PunchlistAssigneeQuickFilter";
import {
  punchlistItemsApi,
  useProjectPunchlistItems,
} from "@/lib/api/punchlist-items";
import { useProjectStages } from "@/lib/api/stages";
import { useGAPins } from "@/lib/api/ga-pins";
import { useProject } from "@/lib/api/hooks";
import { useGAImage } from "@/lib/hooks/useGAImage";
import {
  hasGAImageData,
  getFixedImageUrl,
} from "@/app/features/ga/utils/helpers";
import CreateGAPinModal from "@/app/features/ga/components/CreateGAPinModal";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { handleError } from "@/lib/utils/errors";
import { useToast } from "@/app/context/ToastContext";
import type {
  GAPin,
  PunchlistItem,
  PunchlistItemPriority,
  PunchlistItemStatus,
} from "@/lib/api/types";

interface PunchlistTabProps {
  projectId: string;
}

/** Project-wide punchlist view. Same row + detail + filter pattern as
 *  the stage-scoped `PunchlistList`, plus deck / area / stage
 *  selectors and an inline location breadcrumb on each row so the
 *  user can see at a glance which stage an item lives under when the
 *  list crosses many of them. */
export default function PunchlistTab({ projectId }: PunchlistTabProps) {
  const t = useTranslations("punchlist");
  const router = useRouter();
  const { hasPermission } = usePermission();
  const { showToast } = useToast();
  const punchlistNumbers = usePunchlistNumbers(projectId);

  const [filters, setFilters] = useState<PunchlistFilters>(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // GA pin currently being edited via the More-actions menu. Same
  // CreateGAPinModal as the GA tab, just hosted here so the menu
  // item in the punchlist card can reach it.
  const [editingPin, setEditingPin] = useState<GAPin | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const {
    data: rawItems,
    loading,
    error,
    pagination,
    refetch,
  } = useProjectPunchlistItems(projectId, {
    page: currentPage,
    per_page: 25,
  });

  // The project-wide punchlist endpoint doesn't embed deck / area on
  // each item — it just identifies the stage. Pull the project's
  // stages once and build a lookup so the filter popover can offer
  // Deck / Area options derived from the items currently on screen.
  const { data: projectStages } = useProjectStages(projectId);
  const { data: gaPins, refetch: refetchPins } = useGAPins(projectId);

  // GA image context — needed by CreateGAPinModal in edit mode so it
  // can render the viewer with the deck zoomed in and the pin
  // draggable. Cheap; only the blob fetch is deferred until the
  // image URL resolves.
  const { data: project } = useProject(projectId);
  const ga =
    project && typeof project.generalArrangement === "object"
      ? project.generalArrangement
      : null;
  const gaImageRawUrl =
    ga && hasGAImageData(ga) && ga.imageUrl
      ? getFixedImageUrl(ga.imageUrl)
      : undefined;
  const { imageBlobUrl } = useGAImage(gaImageRawUrl);
  const stageLocationLookup = useMemo(() => {
    const map = new Map<
      string,
      {
        areaId?: string;
        areaName?: string;
        deckId?: string;
        deckName?: string;
      }
    >();
    for (const stage of projectStages ?? []) {
      map.set(stage.identifier, {
        areaId: stage.area?.identifier,
        areaName: stage.area?.name,
        deckId: stage.deck?.identifier,
        deckName: stage.deck?.name,
      });
    }
    return map;
  }, [projectStages]);

  // Enrich each item's `stage.area.deck` from the lookup so the
  // shared filter / popover code can read deck + area off the same
  // shape it expects from the stage-scoped endpoint.
  const items = useMemo<PunchlistItem[] | null>(() => {
    if (!rawItems) return null;
    return rawItems.map((item: PunchlistItem) => {
      const lookup = stageLocationLookup.get(item.stage.identifier);
      if (!lookup) return item;
      const existingArea = item.stage.area;
      const enrichedArea =
        existingArea ??
        (lookup.areaId && lookup.areaName
          ? { identifier: lookup.areaId, name: lookup.areaName }
          : undefined);
      if (!enrichedArea) return item;
      const enrichedDeck =
        enrichedArea.deck ??
        (lookup.deckId && lookup.deckName
          ? { identifier: lookup.deckId, name: lookup.deckName }
          : undefined);
      return {
        ...item,
        stage: {
          ...item.stage,
          area: { ...enrichedArea, deck: enrichedDeck },
        },
      };
    });
  }, [rawItems, stageLocationLookup]);

  const handleChange = () => {
    refetch();
  };

  // Apply every filter axis on top of the loaded page. Searching is
  // case-insensitive against the title; an empty axis matches all.
  // Deck / area / stage now live inside the filter popover so the tab
  // no longer carries dedicated state for them.
  const filteredItems = useMemo(
    () => applyPunchlistFilters(items ?? [], searchQuery, filters),
    [items, searchQuery, filters]
  );

  // Clear selection when the item disappears from the current page /
  // filter set so the detail panel doesn't keep referencing a stale
  // row.
  useEffect(() => {
    if (!selectedItemId) return;
    if (!filteredItems.some((i) => i.identifier === selectedItemId)) {
      setSelectedItemId(null);
    }
  }, [filteredItems, selectedItemId]);

  const selectedItem = filteredItems.find(
    (i) => i.identifier === selectedItemId
  );

  // Scroll to top on page change — same UX cue the old tab had.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

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
  const canView = hasPermission(PERMISSIONS.VIEW_PUNCHLIST_ITEMS);

  if (!canView) {
    return (
      <Alert type="info" message="You don't have permission to view punchlist items." />
    );
  }

  // Same loading rule as the stage list — skeleton only on the first
  // fetch, refetches keep the previous data on screen.
  if (loading && items === null) {
    return <LoadingSkeleton type="list" rows={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h3>
      </div>

      {/* Toolbar — search + assignee quick-filter + filter popover.
          Location selectors sit inside the popover on a second axis so
          this row stays compact. */}
      <div className="flex items-center flex-wrap gap-3">
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


      {error && (
        <Alert
          type="error"
          message={error.message || "Failed to load punchlist items"}
        />
      )}

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
                    canEdit={canEditItems}
                    compact={!!selectedItem}
                    showLocation
                    displayNumber={punchlistNumbers.get(item.identifier)}
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

              {selectedItem && (
                <div className="flex-1 min-w-0 max-w-3xl">
                  <PunchlistItemCard
                    key={selectedItem.identifier}
                    item={selectedItem}
                    projectId={projectId}
                    onUpdate={handleChange}
                    showLocation
                    displayNumber={punchlistNumbers.get(selectedItem.identifier)}
                    onClose={() => setSelectedItemId(null)}
                    onGoToStage={() =>
                      router.push(
                        `/dashboard/projects/${projectId}/areas/${selectedItem.stage.area?.identifier}?stage=${selectedItem.stage.identifier}`
                      )
                    }
                    onEditPinLocation={(() => {
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

          {pagination && pagination.lastPage > 1 && (
            <div className="flex items-center justify-between mt-2 px-5 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("pagination", {
                  current: pagination.currentPage,
                  total: pagination.lastPage,
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("previousPage")}
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("nextPage")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <CancelPunchlistItemModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleRowCancel}
        itemName={cancelTarget?.name ?? ""}
      />

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
    </div>
  );
}
