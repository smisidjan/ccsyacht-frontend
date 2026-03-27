"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
  UserCircleIcon,
  MapPinIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Alert from "@/app/components/ui/Alert";
import PunchlistItemCard from "@/app/components/punchlist/PunchlistItemCard";
import { useProjectPunchlistItems, type PunchlistItemsQueryParams } from "@/lib/api";
import type { PunchlistItem, PunchlistItemStatus } from "@/lib/api/types";

interface PunchlistTabProps {
  projectId: string;
}

export default function PunchlistTab({ projectId }: PunchlistTabProps) {
  const t = useTranslations("projectDetail.punchlist");
  const tPunchlist = useTranslations("punchlist");

  const [statusFilter, setStatusFilter] = useState<PunchlistItemStatus | "all">("all");
  const [deckFilter, setDeckFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<PunchlistItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Build query params based on filters
  const queryParams: PunchlistItemsQueryParams = {
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    page: currentPage,
    per_page: 25,
  };

  const { data: allItems, loading, error, pagination, refetch } = useProjectPunchlistItems(projectId, queryParams);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  // Get unique decks, areas, and stages for filtering
  const filterOptions = useMemo(() => {
    if (!allItems) return { decks: [], areas: [], stages: [] };

    const decks = new Map<string, string>();
    const areas = new Map<string, string>();
    const stages = new Map<string, string>();

    allItems.forEach(item => {
      if (item.stage.area) {
        // Add deck
        if (item.stage.area.deck) {
          decks.set(item.stage.area.deck.identifier, item.stage.area.deck.name);
        }
        // Add area
        areas.set(item.stage.area.identifier, item.stage.area.name);
      }
      // Add stage
      stages.set(item.stage.identifier, item.stage.name);
    });

    return {
      decks: Array.from(decks.entries()).map(([id, name]) => ({ id, name })),
      areas: Array.from(areas.entries()).map(([id, name]) => ({ id, name })),
      stages: Array.from(stages.entries()).map(([id, name]) => ({ id, name })),
    };
  }, [allItems]);

  // Filter items by deck, area, and stage
  const items = useMemo(() => {
    if (!allItems) return allItems;

    return allItems.filter(item => {
      if (deckFilter !== "all" && item.stage.area?.deck?.identifier !== deckFilter) return false;
      if (areaFilter !== "all" && item.stage.area?.identifier !== areaFilter) return false;
      if (stageFilter !== "all" && item.stage.identifier !== stageFilter) return false;
      return true;
    });
  }, [allItems, deckFilter, areaFilter, stageFilter]);

  // Calculate counts (from all items, not filtered)
  const openCount = allItems?.filter((i) => i.status === "open").length || 0;
  const inProgressCount = allItems?.filter((i) => i.status === "in_progress").length || 0;
  const doneCount = allItems?.filter((i) => i.status === "done").length || 0;
  const cancelledCount = allItems?.filter((i) => i.status === "cancelled").length || 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 shadow-sm";
      case "medium":
        return "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 shadow-sm";
      case "low":
        return "text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 shadow-sm";
      default:
        return "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 shadow-sm";
      case "in_progress":
        return "text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 shadow-sm";
      case "done":
        return "text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50 shadow-sm";
      case "cancelled":
        return "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm";
      default:
        return "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return tPunchlist("justNow");
    if (diffMinutes < 60) return tPunchlist("minutesAgo", { minutes: diffMinutes });
    if (diffHours < 24) return tPunchlist("hoursAgo", { hours: diffHours });
    if (diffDays < 7) return tPunchlist("daysAgo", { days: diffDays });

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          {tPunchlist("loading")}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message={error.message || "Failed to load punchlist items"}
      />
    );
  }

  const hasActiveFilters = deckFilter !== "all" || areaFilter !== "all" || stageFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center gap-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <ClockIcon className="w-4 h-4" />
            {tPunchlist("openItems", { count: openCount })}
          </span>
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <ExclamationTriangleIcon className="w-4 h-4" />
            {inProgressCount} {tPunchlist("statusInProgress").toLowerCase()}
          </span>
          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-4 h-4" />
            {tPunchlist("completedItems", { count: doneCount })}
          </span>
          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <XCircleIcon className="w-4 h-4" />
            {tPunchlist("cancelledItems", { count: cancelledCount })}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: "all" as const, label: tPunchlist("filterAll") },
          { key: "open" as const, label: tPunchlist("filterOpen") },
          { key: "in_progress" as const, label: tPunchlist("filterInProgress") },
          { key: "done" as const, label: tPunchlist("filterDone") },
          { key: "cancelled" as const, label: tPunchlist("filterCancelled") },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === filter.key
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Location Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Deck Filter */}
        {filterOptions.decks.length > 0 && (
          <select
            value={deckFilter}
            onChange={(e) => setDeckFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{tPunchlist("allDecks")}</option>
            {filterOptions.decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        )}

        {/* Area Filter */}
        {filterOptions.areas.length > 0 && (
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{tPunchlist("allAreas")}</option>
            {filterOptions.areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        )}

        {/* Stage Filter */}
        {filterOptions.stages.length > 0 && (
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{tPunchlist("allStages")}</option>
            {filterOptions.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setDeckFilter("all");
              setAreaFilter("all");
              setStageFilter("all");
            }}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {tPunchlist("clearFilters")}
          </button>
        )}
      </div>

      {/* Master-Detail View */}
      <div className="flex gap-6">
        {/* List (Left) */}
        <div className="flex-1">
          {!items || items.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-gray-500 dark:text-gray-400">
                {statusFilter === "all" && !hasActiveFilters
                  ? tPunchlist("noPunchlistItems")
                  : tPunchlist("noItemsMatchFilter")}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {items.map((item) => (
                <button
                  key={item.identifier}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-all ${
                    selectedItem?.identifier === item.identifier
                      ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-600 dark:border-l-blue-400 shadow-sm"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900/30 hover:shadow-sm border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title and badges */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {item.name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                          {tPunchlist(`priority${item.priority.charAt(0).toUpperCase()}${item.priority.slice(1)}`)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(item.status)}`}>
                          {tPunchlist(`status${item.status.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("")}`)}
                        </span>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg px-3 py-2">
                        <span className="flex items-center gap-1.5">
                          <UserCircleIcon className="w-4 h-4" />
                          <span className="font-medium">{item.creator.name}</span>
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span>{formatDate(item.dateCreated)}</span>
                        {item.stage.area && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="flex items-center gap-1.5 truncate">
                              <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate font-medium">
                                {item.stage.area.deck && `${item.stage.area.deck.name} / `}
                                {item.stage.area.name} / {item.stage.name}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <ChevronRightIcon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                      selectedItem?.identifier === item.identifier
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400"
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.lastPage > 1 && (
            <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {tPunchlist("pagination", {
                  current: pagination.currentPage,
                  total: pagination.lastPage,
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {tPunchlist("previousPage")}
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {tPunchlist("nextPage")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel (Right) */}
        {selectedItem && (
          <div className="w-[500px] flex-shrink-0">
            <div className="sticky top-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-4">
                {/* Close button */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {tPunchlist("itemDetails")}
                  </h3>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Item Card */}
                <PunchlistItemCard
                  item={selectedItem}
                  projectId={projectId}
                  onUpdate={() => {
                    refetch();
                    // Update selected item if it still exists
                    const updatedItem = items?.find(i => i.identifier === selectedItem.identifier);
                    if (updatedItem) {
                      setSelectedItem(updatedItem);
                    } else {
                      setSelectedItem(null);
                    }
                  }}
                  readonly={true}
                  showLocation={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
