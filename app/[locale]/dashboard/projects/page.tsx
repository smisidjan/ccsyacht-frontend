"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  PlusIcon,
  CogIcon,
  PlayIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useProjects, useShipyards } from "@/lib/api";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { usePermission } from "@/lib/hooks/usePermission";
import ProtectedRoute from "@/app/components/guards/ProtectedRoute";
import ProjectCard from "@/app/components/ui/ProjectCard";
import SearchInput from "@/app/components/ui/SearchInput";
import FilterTabs from "@/app/components/ui/FilterTabs";
import type { FilterOption } from "@/app/components/ui/FilterTabs";
import CreateProjectModal from "@/app/components/modals/CreateProjectModal";
import type { ProjectFormData } from "@/app/components/modals/CreateProjectModal";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Button from "@/app/components/ui/Button";
import type { ProjectStatus } from "@/lib/api/types";

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // API hooks
  const { data: projects, loading: projectsLoading, createProject } = useProjects();
  const { data: shipyards, loading: shipyardsLoading } = useShipyards();
  const { hasPermission } = usePermission();

  // Permissions
  const canCreateProject = hasPermission(PERMISSIONS.CREATE_PROJECTS);

  // Prepare data
  const projectsArray = Array.isArray(projects) ? projects : [];
  const shipyardsArray = Array.isArray(shipyards) ? shipyards : [];

  // Transform shipyards for modal
  const shipyardOptions = shipyardsArray.map((shipyard) => ({
    id: shipyard.identifier,
    name: shipyard.name,
  }));

  // Project types for modal
  const projectTypeOptions = [
    { id: "new_built", name: t("types.newBuilt") },
    { id: "refit", name: t("types.refit") },
  ];

  const handleCreateProject = async (data: ProjectFormData) => {
    await createProject({
      name: data.name,
      description: data.description,
      project_type: data.projectTypeId as "new_built" | "refit",
      shipyard_id: data.shipyardId,
    });
    setIsCreateModalOpen(false);
  };

  const filterTabs = [
    { key: "all" as FilterOption, label: t("filters.all") },
    { key: "setup" as FilterOption, label: t("filters.setup"), icon: CogIcon },
    { key: "active" as FilterOption, label: t("filters.active"), icon: PlayIcon },
    { key: "locked" as FilterOption, label: t("filters.locked"), icon: LockClosedIcon },
    { key: "completed" as FilterOption, label: t("filters.completed"), icon: CheckCircleIcon },
  ];

  const filteredProjects = useMemo(() => {
    return projectsArray.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.producer?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        activeFilter === "all" || project.status === (activeFilter as ProjectStatus);

      return matchesSearch && matchesFilter;
    });
  }, [projectsArray, searchQuery, activeFilter]);

  const loading = projectsLoading || shipyardsLoading;

  return (
    <ProtectedRoute permissions={PERMISSIONS.VIEW_PROJECTS}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("title")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t("subtitle")}
            </p>
          </div>
          {canCreateProject && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="w-5 h-5" />
              {t("newProject")}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="space-y-6 mb-8">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("searchPlaceholder")}
          />
          <FilterTabs
            activeFilter={activeFilter}
            onChange={setActiveFilter}
            tabs={filterTabs}
          />
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {t("showing", {
              count: filteredProjects.length,
              total: projectsArray.length,
            })}
          </p>
        )}

        {/* Content */}
        {loading ? (
          <LoadingSkeleton type="table" rows={6} />
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-inner">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-200 dark:from-blue-900/30 dark:to-purple-800/30 rounded-2xl mb-4 shadow-lg">
              <CogIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {projectsArray.length === 0 ? t("noProjectsYet") : t("noProjects")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {projectsArray.length === 0 ? t("createFirstProject") : t("tryDifferentFilters")}
            </p>
            {canCreateProject && projectsArray.length === 0 && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="w-5 h-5" />
                {t("newProject")}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.identifier} project={project} />
            ))}
          </div>
        )}

        {/* Create Modal */}
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateProject}
          shipyards={shipyardOptions}
          projectTypes={projectTypeOptions}
        />
      </div>
    </ProtectedRoute>
  );
}
