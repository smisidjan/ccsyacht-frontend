"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { UserCircleIcon, ClockIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useLogbook } from "@/lib/api";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import SearchInput from "@/app/components/ui/SearchInput";

interface LogbookTabProps {
  projectId: string;
}

type ActivityFilter =
  | "all"
  | "project_management"
  | "members_signers"
  | "documents"
  | "decks_areas"
  | "stage_activities"
  | "punchlist_items"
  | "remarks"
  | "setup_tasks";

export default function LogbookTab({ projectId }: LogbookTabProps) {
  const t = useTranslations("projectDetail.logbook");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ActivityFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const { data: entries, loading: rawLoading, error } = useLogbook(projectId, { per_page: 100 });
  const loading = useMinimumLoadingTime(rawLoading);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Format action name to readable text
  const formatActionName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Filter options
  const filterOptions: { value: ActivityFilter; label: string }[] = [
    { value: "all", label: t("filters.all") },
    { value: "project_management", label: t("filters.projectManagement") },
    { value: "members_signers", label: t("filters.membersSigners") },
    { value: "documents", label: t("filters.documents") },
    { value: "decks_areas", label: t("filters.decksAreas") },
    { value: "stage_activities", label: t("filters.stageActivities") },
    { value: "punchlist_items", label: t("filters.punchlistItems") },
    { value: "remarks", label: t("filters.remarks") },
    { value: "setup_tasks", label: t("filters.setupTasks") },
  ];

  // Map filter to activity name patterns
  const getActivityPattern = (filter: ActivityFilter): string[] | null => {
    switch (filter) {
      case "all":
        return null;
      case "project_management":
        return ["project", "status"];
      case "members_signers":
        return ["member", "signer"];
      case "documents":
        return ["document"];
      case "decks_areas":
        return ["deck", "area"];
      case "stage_activities":
        return ["stage"];
      case "punchlist_items":
        return ["punchlist", "item"];
      case "remarks":
        return ["remark", "comment"];
      case "setup_tasks":
        return ["setup", "task"];
      default:
        return null;
    }
  };

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    return entries.filter((entry) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.agent?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      // Category filter
      const patterns = getActivityPattern(selectedFilter);
      const matchesFilter =
        patterns === null ||
        patterns.some((pattern) =>
          entry.name.toLowerCase().includes(pattern.toLowerCase())
        );

      return matchesSearch && matchesFilter;
    });
  }, [entries, searchQuery, selectedFilter]);

  if (loading) {
    return <LoadingSkeleton type="list" rows={5} />;
  }

  if (error) {
    return <Alert type="error" message={error.message || t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <div className="md:col-span-4">
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <span>
                {filterOptions.find((f) => f.value === selectedFilter)?.label}
              </span>
              <ChevronDownIcon
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isFilterOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isFilterOpen && (
              <div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-96 overflow-auto">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedFilter(option.value);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedFilter === option.value
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {selectedFilter === option.value && (
                      <span className="mr-2">✓</span>
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("showing", {
            count: filteredEntries.length,
            total: entries?.length || 0,
          })}
        </p>
      )}

      {/* Log Entries Timeline */}
      {filteredEntries && filteredEntries.length > 0 ? (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.identifier}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <UserCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {formatActionName(entry.name)}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <ClockIcon className="w-3 h-3" />
                      {formatDate(entry.startTime)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {entry.description}
                  </p>
                  {entry.agent && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                      <span className="font-medium">{entry.agent.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <ClockIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {entries && entries.length > 0 ? t("noResults") : t("noEntries")}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            {entries && entries.length > 0
              ? t("tryDifferentFilters")
              : t("noEntriesDescription")}
          </p>
        </div>
      )}
    </div>
  );
}
