"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  PlusIcon,
  CogIcon,
  PlayIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useProjects, useShipyards, projectsApi, documentTypesApi, projectMembersApi } from "@/lib/api";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useRealtimeProjectsList } from "@/lib/hooks/useRealtimeProject";
import ProtectedRoute from "@/app/components/guards/ProtectedRoute";
import ProjectCard from "@/app/components/ui/ProjectCard";
import SearchInput from "@/app/components/ui/SearchInput";
import FilterTabs from "@/app/components/ui/FilterTabs";
import type { FilterOption } from "@/app/components/ui/FilterTabs";
import CreateProjectModal from "@/app/components/modals/CreateProjectModal";
import type { ProjectFormData } from "@/app/components/modals/CreateProjectModal";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Button from "@/app/components/ui/Button";
import type { ProjectStatus, UserRole } from "@/lib/api/types";

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectMemberships, setProjectMemberships] = useState<Record<string, boolean>>({});
  const [projectMemberCounts, setProjectMemberCounts] = useState<Record<string, number>>({});
  const [membershipsLoading, setMembershipsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // API hooks
  const { data: projects, loading: projectsLoading, pagination, refetch } = useProjects({ page: currentPage });
  const { data: shipyards, loading: shipyardsLoading } = useShipyards();
  const { hasPermission, user: currentUser } = usePermission();

  // Permissions
  const canCreateProject = hasPermission(PERMISSIONS.CREATE_PROJECTS);
  const canViewProjectMembers = hasPermission(PERMISSIONS.VIEW_PROJECT_MEMBERS);

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

  // Fetch project memberships
  useEffect(() => {
    const fetchMemberships = async () => {
      // If no projects, no need to load
      if (!projectsArray.length) {
        setMembershipsLoading(false);
        return;
      }

      // Keep loading while waiting for currentUser to load
      if (!currentUser) {
        setMembershipsLoading(true);
        return;
      }

      setMembershipsLoading(true);
      const memberships: Record<string, boolean> = {};
      const memberCounts: Record<string, number> = {};

      // If user doesn't have permission to view project members, we can't determine membership
      // Backend should give all authenticated users this permission
      if (!canViewProjectMembers) {
        console.warn("User does not have VIEW_PROJECT_MEMBERS permission. Cannot determine project membership.");
        setMembershipsLoading(false);
        return;
      }

      // Fetch members for each project and check if current user is a member
      await Promise.all(
        projectsArray.map(async (project) => {
          try {
            const response = await projectMembersApi.getAll(project.identifier);
            const members = response.data || [];
            const isMember = members.some(
              (member) => member.member.identifier === currentUser.identifier
            );
            memberships[project.identifier] = isMember;
            memberCounts[project.identifier] = members.length;
          } catch (error: any) {
            // If 403, user doesn't have permission (shouldn't happen if canViewProjectMembers is true)
            // For other errors, assume not a member
            memberships[project.identifier] = false;
            memberCounts[project.identifier] = 0;
          }
        })
      );

      setProjectMemberships(memberships);
      setProjectMemberCounts(memberCounts);
      setMembershipsLoading(false);
    };

    fetchMemberships();
  }, [projectsArray, currentUser, canViewProjectMembers]);

  // Real-time updates for member/signer changes across all projects
  // Only subscribe to projects where the user is a member (to avoid 403 errors)
  // When a member/signer is added or removed, refetch the entire projects list
  // This ensures that:
  // - New members see the project appear in their list
  // - Removed members see the project disappear from their list
  // - All users see updated member counts
  const memberProjectIds = projectsArray
    .filter((p) => projectMemberships[p.identifier])
    .map((p) => p.identifier);

  // Memoize callback to prevent multiple subscriptions
  const handleMemberOrSignerUpdate = useCallback(() => {
    refetch(); // Refetch projects list, which will trigger memberships reload via useEffect
  }, [refetch]);

  useRealtimeProjectsList(memberProjectIds, handleMemberOrSignerUpdate);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const handleCreateProject = async (data: ProjectFormData) => {
    try {
      // 1. Create the project first
      const newProject = await projectsApi.create({
        name: data.name,
        description: data.description,
        project_type: data.projectTypeId as "new_built" | "refit",
        shipyard_id: data.shipyardId,
      });

      const projectId = newProject.identifier;

      // 2. Upload General Arrangement (required)
      if (!data.generalArrangement) {
        throw new Error("General Arrangement is required");
      }
      await projectsApi.uploadGeneralArrangement(projectId, data.generalArrangement);

      // 3. Create document types
      for (const docType of data.documentTypes) {
        await documentTypesApi.create(projectId, {
          name: docType.name,
          is_required: docType.required,
        });
      }

      // Refresh the projects list
      refetch();
      // Modal will close itself after successful submit
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  };

  const filterTabs = [
    { key: "all" as FilterOption, label: t("filters.all") },
    { key: "setup" as FilterOption, label: t("filters.setup"), icon: CogIcon },
    { key: "active" as FilterOption, label: t("filters.active"), icon: PlayIcon },
    { key: "archived" as FilterOption, label: t("filters.archived"), icon: ArchiveBoxIcon },
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

      // For guest roles, only show projects where user is a member
      const userRole = currentUser?.roles?.[0] as UserRole | undefined;
      const isGuestRole = userRole && !["admin", "main user", "surveyor", "user", "painter"].includes(userRole);
      const isMember = projectMemberships[project.identifier] || false;
      const matchesMembership = !isGuestRole || isMember;

      return matchesSearch && matchesFilter && matchesMembership;
    });
  }, [projectsArray, searchQuery, activeFilter, projectMemberships, currentUser]);

  // Enforce minimum loading time to prevent flickering
  const rawLoading = projectsLoading || shipyardsLoading || membershipsLoading;
  const loading = useMinimumLoadingTime(rawLoading);

  const handleRefetch = () => {
    refetch();
    // Refetch will trigger the useEffect to reload memberships
  };

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
        <div className="space-y-8 mb-10">
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

        {/* Results count and pagination */}
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("showing", {
                count: filteredProjects.length,
                total: projectsArray.length,
              })}
            </p>

            {/* Pagination controls */}
            {pagination && pagination.lastPage > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("pagination.page", { current: pagination.currentPage, total: pagination.lastPage })}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={t("pagination.previous")}
                  >
                    <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={t("pagination.next")}
                  >
                    <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.identifier}
                project={project}
                isMember={projectMemberships[project.identifier] || false}
                userRole={(currentUser?.roles?.[0] as UserRole) || "user"}
                memberCount={projectMemberCounts[project.identifier]}
                onJoin={handleRefetch}
              />
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

