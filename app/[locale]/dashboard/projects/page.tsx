"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  PlusIcon,
  CogIcon,
  PlayIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useProjects, useShipyards, projectsApi, documentTypesApi } from "@/lib/api";
import { handleError } from "@/lib/utils/errors";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useRealtimeProjectsList } from "@/lib/hooks/useRealtimeProject";
import ProtectedRoute from "@/app/components/guards/ProtectedRoute";
import FilterPopover from "@/app/components/ui/FilterPopover";
import Pagination from "@/app/components/ui/Pagination";
import { CreateProjectModal, ProjectCard, type ProjectFormData } from "@/app/features/projects";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Button from "@/app/components/ui/Button";
import PageHeader from "@/app/components/ui/PageHeader";
import type { ProjectStatus, UserRole } from "@/lib/api/types";

/** Status options ordered the same way the old tab strip was — keeps
 *  the iconography (cog/play/archive/check) and the user's mental
 *  model of the workflow stages intact. */
const STATUS_OPTIONS: { value: ProjectStatus; icon: typeof CogIcon }[] = [
  { value: "setup", icon: CogIcon },
  { value: "active", icon: PlayIcon },
  { value: "archived", icon: ArchiveBoxIcon },
  { value: "completed", icon: CheckCircleIcon },
];

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const [searchQuery, setSearchQuery] = useState("");
  // Empty selection = no constraint (matches every status). Same
  // Jira-style multi-select semantics as the punchlist + my-tasks
  // filter popovers.
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>(
    []
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // API hooks
  const { data: projects, loading: projectsLoading, pagination, refetch } = useProjects({ page: currentPage });
  const { data: shipyards, loading: shipyardsLoading, refetch: refetchShipyards } = useShipyards();
  const { hasPermission, user: currentUser } = usePermission();

  // Permissions
  const canCreateProject = hasPermission(PERMISSIONS.CREATE_PROJECTS);

  // Prepare data
  const projectsArray = Array.isArray(projects) ? projects : [];
  const shipyardsArray = Array.isArray(shipyards) ? shipyards : [];
  const shipyardAddressById = new Map(shipyardsArray.map((s) => [s.identifier, s.address]));

  // Transform shipyards for modal — quayside always first
  const shipyardOptions = [...shipyardsArray]
    .sort((a, b) => (b.isQuayside ? 1 : 0) - (a.isQuayside ? 1 : 0))
    .map((shipyard) => ({
      id: shipyard.identifier,
      name: shipyard.name,
      isQuayside: shipyard.isQuayside,
    }));

  // Project types for modal
  const projectTypeOptions = [
    { id: "new_build", name: t("types.newBuild") },
    { id: "refit", name: t("types.refit") },
  ];

  // Real-time updates for member/signer changes across all projects
  // Only subscribe to projects where the user is a member (to avoid 403 errors)
  // When a member/signer is added or removed, refetch the entire projects list
  // This ensures that:
  // - New members see the project appear in their list
  // - Removed members see the project disappear from their list
  // - All users see updated member counts
  const memberProjectIds = projectsArray
    .filter((p) => p.isMember)
    .map((p) => p.identifier);

  // Memoize callback to prevent multiple subscriptions
  const handleMemberOrSignerUpdate = useCallback(() => {
    refetch(); // Refetch projects list with updated isMember and memberCount from backend
  }, [refetch]);

  useRealtimeProjectsList(memberProjectIds, handleMemberOrSignerUpdate);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatuses]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const handleCreateProject = async (data: ProjectFormData) => {
    let projectId: string | null = null;

    try {
      // 1. Create the project first
      const newProject = await projectsApi.create({
        name: data.name,
        description: data.description,
        project_type: data.projectTypeId as "new_build" | "refit",
        shipyard_id: data.shipyardId || undefined,
        quayside_note: data.quaysideNote || undefined,
        external_id: data.externalId || undefined,
        include_kickoff_meeting: data.includeKickoffMeeting,
      });

      projectId = newProject.identifier;

      // 2. Upload General Arrangement (required)
      if (!data.generalArrangement) {
        throw new Error("General Arrangement is required");
      }
      await projectsApi.uploadGeneralArrangement(projectId, data.generalArrangement);

      // 3. Create document types in parallel (only non-locked ones, backend handles locked templates)
      const nonLockedDocTypes = data.documentTypes.filter(dt => !dt.isLocked);
      if (nonLockedDocTypes.length > 0) {
        await Promise.all(
          nonLockedDocTypes.map(docType =>
            documentTypesApi.create(projectId!, {
              name: docType.name,
              is_required: docType.required,
            })
          )
        );
      }

      // Refresh the projects list
      refetch();
      // Modal will close itself after successful submit
    } catch (error) {
      handleError(error, { severity: "console", context: "Error creating project" });

      // Cleanup: if project was created but later steps failed, delete it
      if (projectId) {
        try {
          await projectsApi.delete(projectId);
        } catch (deleteError) {
          handleError(deleteError, { severity: "console", context: "Failed to cleanup project after error" });
        }
      }

      throw error;
    }
  };

  const filteredProjects = useMemo(() => {
    return projectsArray.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.producer?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(project.status);

      // For guest roles, only show projects where user is a member
      const userRole = currentUser?.roles?.[0] as UserRole | undefined;
      const isGuestRole = userRole && !["admin", "main user", "surveyor", "user", "painter"].includes(userRole);
      const matchesMembership = !isGuestRole || project.isMember;

      return matchesSearch && matchesFilter && matchesMembership;
    });
  }, [projectsArray, searchQuery, selectedStatuses, currentUser]);

  // Enforce minimum loading time to prevent flickering
  const rawLoading = projectsLoading || shipyardsLoading;
  const loading = useMinimumLoadingTime(rawLoading);

  return (
    <ProtectedRoute permissions={PERMISSIONS.VIEW_PROJECTS}>
      <div>
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          action={canCreateProject && (
            <Button
              size="sm"
              className="whitespace-nowrap sm:py-3 sm:px-5 sm:text-base"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusIcon className="w-5 h-5" />
              {t("newProject")}
            </Button>
          )}
        />

        {/* Search + filter — same visual + interaction language as
            the punchlist / my-tasks surfaces. The Filter popover holds
            the status options that used to live in the tab strip,
            keeping the cog/play/archive/check iconography. */}
        <div className="flex items-center flex-wrap gap-3 mb-10">
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
                id: "status",
                label: t("filterCategoryStatus"),
                searchPlaceholder: t("filterSearchStatus"),
                options: STATUS_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: t(`filters.${opt.value}`),
                  icon: opt.icon,
                })),
                selected: selectedStatuses,
                onChange: (next) =>
                  setSelectedStatuses(next as ProjectStatus[]),
              },
            ]}
            onClearAll={
              selectedStatuses.length > 0
                ? () => setSelectedStatuses([])
                : undefined
            }
            activeCountLabel={(count) =>
              t("filterActiveCount", { count })
            }
            clearAllLabel={t("filterClear")}
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

            {pagination && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.lastPage}
                onPageChange={setCurrentPage}
              />
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
                isMember={project.isMember || false}
                userRole={(currentUser?.roles?.[0] as UserRole) || "user"}
                memberCount={project.memberCount}
                shipyardAddress={project.producer && shipyardAddressById.get(project.producer.identifier)}
                onJoin={refetch}
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
          onShipyardCreated={() => refetchShipyards()}
        />
      </div>
    </ProtectedRoute>
  );
}

