"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { EyeIcon, FolderIcon } from "@heroicons/react/24/outline";
import { systemProjectsApi } from "@/lib/api/system/projects";
import type { Project, ApiError } from "@/lib/api/types";
import SearchInput from "@/app/components/ui/SearchInput";
import FilterTabs from "@/app/components/ui/FilterTabs";
import Button from "@/app/components/ui/Button";
import Table from "@/app/components/ui/Table";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import StatusBadge from "@/app/components/ui/StatusBadge";

interface TenantProjectsTableProps {
  tenantId: string;
}

type StatusFilter = "all" | "setup" | "active" | "locked" | "completed";
type TypeFilter = "all" | "new_built" | "refit";

export default function TenantProjectsTable({
  tenantId,
}: TenantProjectsTableProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects");

  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: {
        status?: string;
        project_type?: string;
        per_page?: number;
      } = { per_page: 100 };

      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.project_type = typeFilter;

      const response = await systemProjectsApi.getProjects(tenantId, params);
      setProjects(response.data || []);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError?.message || "Failed to fetch projects";
      console.error("Failed to fetch projects:", errorMessage);
      setError(errorMessage);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter, typeFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Filter projects by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.producer?.name.toLowerCase().includes(query)
    );
    setFilteredProjects(filtered);
  }, [projects, searchQuery]);

  if (loading) {
    return <LoadingSkeleton type="table" rows={5} />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert type="error" title="Error loading projects" message={error} />
        <Button variant="danger" onClick={fetchProjects}>
          {t("tryAgain")}
        </Button>
      </div>
    );
  }

  const statusFilters = [
    { key: "all", label: t("filters.all") },
    { key: "setup", label: t("filters.setup") },
    { key: "active", label: t("filters.active") },
    { key: "locked", label: t("filters.locked") },
    { key: "completed", label: t("filters.completed") },
  ];

  const typeFilters = [
    { key: "all", label: t("typeFilters.all") },
    { key: "new_built", label: t("typeFilters.newBuilt") },
    { key: "refit", label: t("typeFilters.refit") },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t("searchPlaceholder")}
        />

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("statusLabel")}
            </label>
            <FilterTabs
              tabs={statusFilters}
              activeFilter={statusFilter}
              onChange={(key) => setStatusFilter(key as StatusFilter)}
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("typeLabel")}
            </label>
            <FilterTabs
              tabs={typeFilters}
              activeFilter={typeFilter}
              onChange={(key) => setTypeFilter(key as TypeFilter)}
            />
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <Table
        columns={[
          {
            key: "name",
            header: t("columns.name"),
            cell: (project: Project) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {project.name}
                  </div>
                  {project.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {project.description}
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "type",
            header: t("columns.type"),
            cell: (project: Project) => (
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {project.additionalType === "new_built"
                  ? t("types.newBuilt")
                  : t("types.refit")}
              </span>
            ),
          },
          {
            key: "status",
            header: t("columns.status"),
            cell: (project: Project) => (
              <StatusBadge status={project.status} />
            ),
          },
          {
            key: "shipyard",
            header: t("columns.shipyard"),
            cell: (project: Project) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {project.producer?.name || "-"}
              </span>
            ),
          },
          {
            key: "dates",
            header: t("columns.dates"),
            cell: (project: Project) => (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {project.startDate
                  ? new Date(project.startDate).toLocaleDateString()
                  : "-"}
                {project.endDate && (
                  <>
                    {" - "}
                    {new Date(project.endDate).toLocaleDateString()}
                  </>
                )}
              </div>
            ),
          },
          {
            key: "actions",
            header: t("columns.actions"),
            cell: (project: Project) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // TODO: Open project details modal
                    console.log("View project:", project.identifier);
                  }}
                  title={t("viewDetails")}
                >
                  <EyeIcon className="w-4 h-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={filteredProjects}
        keyExtractor={(project) => project.identifier}
        emptyMessage={
          searchQuery
            ? t("noProjectsFound")
            : t("noProjects")
        }
        minWidth="800px"
      />

      {/* Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {t("summary", {
          showing: filteredProjects.length,
          total: projects.length,
        })}
      </div>
    </div>
  );
}
