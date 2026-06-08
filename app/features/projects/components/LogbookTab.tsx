"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  UserCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  CogIcon,
  UserGroupIcon,
  DocumentTextIcon,
  MapIcon,
  RectangleStackIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftEllipsisIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import type { LogbookCategory } from "@/lib/api/types";
import { useLogbook } from "@/lib/api";
import { useProjectMembers } from "@/lib/api/project-members";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import FilterPopover from "@/app/components/ui/FilterPopover";
import Pagination from "@/app/components/ui/Pagination";

// Server-side page size — the backend slices by this and our
// pagination control walks the actual full filtered set.
const PAGE_SIZE = 20;

// Debounce on the search input so typing doesn't fire a request
// per keystroke.
const SEARCH_DEBOUNCE_MS = 300;

/** Translate the multi-select date buckets ("Last 7 days" /
 *  "Last 30 days" / "Older than 30 days") into the contiguous
 *  `from_date` / `to_date` window the backend expects. Returns
 *  `{}` when the selection collapses to "no constraint" — that
 *  happens when the user picks non-adjacent buckets (e.g. Last 7d
 *  + Older), where there's no single range that fits. */
function dateRangeFromBuckets(buckets: string[]): {
  from_date?: string;
  to_date?: string;
} {
  if (buckets.length === 0) return {};
  const has7 = buckets.includes("last7days");
  const has30 = buckets.includes("last30days");
  const hasOlder = buckets.includes("older");
  const day = 24 * 60 * 60 * 1000;
  const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const now = Date.now();

  if (hasOlder && !has7 && !has30) {
    return { to_date: toIso(now - 30 * day) };
  }
  if (!hasOlder && (has7 || has30)) {
    return { from_date: toIso(now - (has30 ? 30 : 7) * day) };
  }
  // mixed (older + a newer bucket) or all three → no single
  // contiguous window can express it cleanly.
  return {};
}

interface LogbookTabProps {
  projectId: string;
}

type CategoryKey = "all" | LogbookCategory;

// Icon glyph per backend-provided category. Falls back to
// UserCircleIcon for `null`/`other` so unmapped events still render.
const CATEGORY_ICONS: Record<LogbookCategory, ComponentType<SVGProps<SVGSVGElement>>> = {
  project: CogIcon,
  members: UserGroupIcon,
  decks_areas: MapIcon,
  stages: RectangleStackIcon,
  release_forms: ChatBubbleLeftEllipsisIcon,
  punchlist: ClipboardDocumentListIcon,
  documents: DocumentTextIcon,
  kickoff: RectangleStackIcon,
  setup_tasks: WrenchScrewdriverIcon,
  other: UserCircleIcon,
};

function iconForCategory(
  category: LogbookCategory | null
): ComponentType<SVGProps<SVGSVGElement>> {
  return category ? CATEGORY_ICONS[category] : UserCircleIcon;
}

export default function LogbookTab({ projectId }: LogbookTabProps) {
  const t = useTranslations("projectDetail.logbook");
  const [searchQuery, setSearchQuery] = useState("");
  // Primary axis — same idea as the document-type sidebar: pick a
  // category first, then narrow with the FilterPopover sub-axes.
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedDateRanges, setSelectedDateRanges] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  // Debounced copy of the search query — only this value is wired
  // to the API call, so each keystroke doesn't fire a request.
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedSearch(searchQuery.trim()),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Jump back to page 1 whenever the filter narrowing could shrink
  // the result set — otherwise the user can end up on an empty page.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCategory, selectedAgents, selectedDateRanges]);

  const dateRange = useMemo(
    () => dateRangeFromBuckets(selectedDateRanges),
    [selectedDateRanges]
  );

  const {
    data: entries,
    loading: rawLoading,
    error,
    pagination,
  } = useLogbook(projectId, {
    per_page: PAGE_SIZE,
    page: currentPage,
    search: debouncedSearch || undefined,
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    user_id: selectedAgents.length > 0 ? selectedAgents : undefined,
    from_date: dateRange.from_date,
    to_date: dateRange.to_date,
  });
  const loading = useMinimumLoadingTime(rawLoading);

  // Project members feed the "Performed by" dropdown — using the
  // members list (not the current page of entries) means the option
  // set stays stable as the user paginates or narrows other filters.
  const { data: projectMembers } = useProjectMembers(projectId);

  // Compact date — drops the year and the AM/PM (24h) so the
  // metadata row stays short. Older entries get the year appended
  // so the relative position in the timeline is still readable.
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const sameYear = date.getFullYear() === now.getFullYear();
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  };

  // Format action name to readable text
  const formatActionName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const categoryTabs = useMemo(
    () => [
      { key: "all" as CategoryKey, label: t("filters.all") },
      { key: "project" as CategoryKey, label: t("filters.project") },
      { key: "members" as CategoryKey, label: t("filters.members") },
      { key: "decks_areas" as CategoryKey, label: t("filters.decksAreas") },
      { key: "stages" as CategoryKey, label: t("filters.stages") },
      { key: "release_forms" as CategoryKey, label: t("filters.releaseForms") },
      { key: "punchlist" as CategoryKey, label: t("filters.punchlist") },
      { key: "documents" as CategoryKey, label: t("filters.documents") },
      { key: "kickoff" as CategoryKey, label: t("filters.kickoff") },
      { key: "setup_tasks" as CategoryKey, label: t("filters.setupTasks") },
      { key: "other" as CategoryKey, label: t("filters.other") },
    ],
    [t]
  );

  const agentOptions = useMemo(() => {
    if (!projectMembers) return [];
    return projectMembers
      .map((pm) => ({ value: pm.member.identifier, label: pm.member.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projectMembers]);

  const visibleEntries = entries ?? [];
  const totalEntries = pagination?.total ?? visibleEntries.length;
  const totalPages = pagination?.lastPage ?? 1;
  const safePage = pagination?.currentPage ?? currentPage;
  const rangeStart = totalEntries === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = (safePage - 1) * PAGE_SIZE + visibleEntries.length;
  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    selectedCategory !== "all" ||
    selectedAgents.length > 0 ||
    selectedDateRanges.length > 0;

  if (error) {
    return <Alert type="error" message={error.message || t("loadError")} />;
  }

  // First-load only — once we have entries cached we keep showing
  // them across refetches so clicking a filter/page doesn't flash
  // the whole tab into a skeleton.
  const showInitialSkeleton = loading && entries === null;

  return (
    <div className="space-y-6">
      {/* Category dropdown — primary axis, single-select. Sits
          inline with the search + FilterPopover so the whole
          filter context lives on one row. Picking a category
          narrows the data first, then the popover sub-axes
          (Performed by / Date) and search filter further. */}
      <div className="flex items-center flex-wrap gap-3">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as CategoryKey)}
          className="py-1.5 pl-3 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {categoryTabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label}
            </option>
          ))}
        </select>
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <FilterPopover
          triggerLabel={t("filterLabel")}
          sections={[
            {
              id: "agent",
              label: t("filterCategoryPerformedBy"),
              searchPlaceholder: t("filterSearchPerformedBy"),
              emptyLabel: t("filterPerformedByEmpty"),
              options: agentOptions,
              selected: selectedAgents,
              onChange: setSelectedAgents,
            },
            {
              id: "date",
              label: t("filterCategoryDate"),
              searchPlaceholder: t("filterSearchDate"),
              options: [
                { value: "last7days", label: t("filterDateLast7Days") },
                { value: "last30days", label: t("filterDateLast30Days") },
                { value: "older", label: t("filterDateOlder") },
              ],
              selected: selectedDateRanges,
              onChange: setSelectedDateRanges,
            },
          ]}
          onClearAll={
            selectedAgents.length > 0 || selectedDateRanges.length > 0
              ? () => {
                  setSelectedAgents([]);
                  setSelectedDateRanges([]);
                }
              : undefined
          }
          activeCountLabel={(count) => t("filterActiveCount", { count })}
          clearAllLabel={t("filterClear")}
        />
      </div>

      {/* Results count + pagination on one row so the user always
          sees the prev/next controls — the bottom-only placement
          made it look like there was only one page of results. */}
      {visibleEntries.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("showingRange", {
              from: rangeStart,
              to: rangeEnd,
              total: totalEntries,
            })}
          </p>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Log Entries Timeline — skeleton only on first load; otherwise
          keep the previous list visible (slightly dimmed) so flipping
          filters or pages doesn't blank out the tab. */}
      {showInitialSkeleton ? (
        <LoadingSkeleton type="list" rows={5} />
      ) : visibleEntries.length > 0 ? (
        <div
          className={`space-y-2 transition-opacity ${
            loading ? "opacity-60" : ""
          }`}
        >
          {visibleEntries.map((entry) => {
            const Icon = iconForCategory(entry.category);
            return (
              <div
                key={entry.identifier}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg dark:shadow-gray-900/50 transition-shadow px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {formatActionName(entry.name)}
                        </h3>
                        {entry.agent?.name && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            · {entry.agent.name}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {formatDate(entry.startTime)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {entry.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <ClockIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {hasActiveFilters ? t("noResults") : t("noEntries")}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            {hasActiveFilters
              ? t("tryDifferentFilters")
              : t("noEntriesDescription")}
          </p>
        </div>
      )}

      {visibleEntries.length > 0 && totalPages > 1 && (
        <div className="flex justify-end">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
