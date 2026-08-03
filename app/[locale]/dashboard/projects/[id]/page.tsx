"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeftIcon, ArchiveBoxIcon, CheckCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import StatusBadge from "@/app/components/ui/StatusBadge";
import TabNavState from "@/app/components/ui/TabNavState";
import type { StateTab } from "@/app/components/ui/TabNavState";
import Alert from "@/app/components/ui/Alert";
import Tooltip from "@/app/components/ui/Tooltip";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import { useProject, useProjectMembers, useAreas, projectsApi } from "@/lib/api";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { usePermission } from "@/lib/hooks/usePermission";
import { useToast } from "@/app/context/ToastContext";
import { useGA } from "@/app/context/GAContext";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { GeneralArrangement } from "@/lib/api/types";

// Helper to get URL from generalArrangement (can be string or object)
function getGAContentUrl(ga: string | GeneralArrangement | undefined): string | undefined {
  if (!ga) return undefined;
  if (typeof ga === "string") return ga;
  return ga.contentUrl;
}

// Helper to get GeneralArrangement object (ignores legacy string URLs)
function getGAObject(ga: string | GeneralArrangement | undefined): GeneralArrangement | undefined {
  if (!ga || typeof ga === "string") return undefined;
  return ga;
}

// Helper to check if GA is being converted (has contentUrl but no imageUrl yet)
function isGAConverting(ga: string | GeneralArrangement | undefined): boolean {
  if (!ga || typeof ga === "string") return false;
  return !!ga.contentUrl && !ga.imageUrl;
}

// Tab content components
import {
  OverviewTab,
  GeneralArrangementTab,
  LogbookTab,
  ReportingTab,
  SettingsTab,
} from "@/app/features/projects";
import { DocumentsTab } from "@/app/features/documents";
import { PunchlistTab } from "@/app/features/punchlist";

type TabKey = "overview" | "documents" | "generalArrangement" | "punchlist" | "logbook" | "reporting" | "settings";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function ProjectDetailPageContent({ projectId }: { projectId: string }) {
  const t = useTranslations("projectDetail");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const { hasPermission } = usePermission();
  const { showToast } = useToast();
  const { loadGA } = useGA(); // TODO: re-add isDownloading, downloadProgress when GA progress indicator is fixed

  // Fetch project from API
  const { data: project, loading: rawLoading, error, refetch } = useProject(projectId);

  // Header enrichment
  const { data: membersRaw } = useProjectMembers(projectId);
  const { data: areasRaw } = useAreas(projectId);
  const membersArray = useMemo(() => (Array.isArray(membersRaw) ? membersRaw : []), [membersRaw]);
  const totalStages = useMemo(() => (areasRaw || []).reduce((s, a) => s + (a.stageCount || 0), 0), [areasRaw]);
  const completedStages = useMemo(() => (areasRaw || []).reduce((s, a) => s + (a.completedStageCount || 0), 0), [areasRaw]);
  const stageProgress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  // Enforce minimum loading time to prevent flickering
  // Only show loading on initial load, not during background polling (when we already have data)
  const loading = useMinimumLoadingTime(rawLoading && !project);

  const canEditProject = hasPermission(PERMISSIONS.EDIT_PROJECTS);

  // Modal states
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);

  // Handle hash-based navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as TabKey; // Remove the # character
      if (hash && ["overview", "documents", "generalArrangement", "punchlist", "logbook", "reporting", "settings"].includes(hash)) {
        setActiveTab(hash);
      }
    };

    // Set initial tab from hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Preload GA when project loads
  // Reload if generalArrangement URL changes (e.g., new GA uploaded)
  const gaContentUrl = getGAContentUrl(project?.generalArrangement);
  useEffect(() => {
    if (project && gaContentUrl) {
      loadGA(projectId, gaContentUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaContentUrl, projectId]);

  // Poll for GA conversion completion
  // When GA is uploading/converting (has contentUrl but no imageUrl), poll every 3 seconds
  const gaIsConverting = isGAConverting(project?.generalArrangement);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (!gaIsConverting) return;

    const pollInterval = setInterval(() => {
      refetchRef.current();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [gaIsConverting]);

  // Update hash when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key as TabKey);
    window.location.hash = key;
  };

  // Status transition handlers
  const handleArchiveProject = async () => {
    try {
      await projectsApi.archive(projectId);
      showToast("success", t("statusActions.archiveSuccess"));
      refetch();
    } catch (error: any) {
      showToast("error", error.message || t("statusActions.archiveError"));
    }
  };

  const handleCompleteProject = async () => {
    try {
      await projectsApi.complete(projectId);
      showToast("success", t("statusActions.completeSuccess"));
      refetch();
    } catch (error: any) {
      showToast("error", error.message || t("statusActions.completeError"));
    }
  };

  const handleReactivateProject = async () => {
    try {
      await projectsApi.activate(projectId);
      showToast("success", t("statusActions.reactivateSuccess"));
      refetch();
    } catch (error: any) {
      showToast("error", error.message || t("statusActions.reactivateError"));
    }
  };

  const tabs: StateTab[] = [
    { key: "overview", label: t("tabs.overview") },
    { key: "generalArrangement", label: t("tabs.generalArrangement") },
    { key: "documents", label: t("tabs.documents") },
    { key: "punchlist", label: t("tabs.punchlist") },
    { key: "logbook", label: t("tabs.logbook") },
    { key: "reporting", label: t("tabs.reporting") },
    { key: "settings", label: t("tabs.settings") },
  ];

  // Render tab content - all tabs are conditionally rendered for fresh data
  const renderTabContent = () => {
    if (!project) return null;

    return (
      <>
        {activeTab === "generalArrangement" && (
          <GeneralArrangementTab
            projectId={projectId}
            generalArrangement={getGAObject(project.generalArrangement)}
            projectStatus={project.status}
          />
        )}
        {activeTab === "overview" && (
          <OverviewTab
            projectId={projectId}
            projectStatus={project.status}
            onProjectUpdate={refetch}
            generalArrangement={getGAObject(project.generalArrangement)}
          />
        )}
        {activeTab === "documents" && (
          <DocumentsTab projectId={projectId} projectStatus={project.status} />
        )}
        {activeTab === "punchlist" && (
          <PunchlistTab projectId={projectId} />
        )}
        {activeTab === "logbook" && (
          <LogbookTab projectId={projectId} />
        )}
        {activeTab === "reporting" && (
          <ReportingTab projectId={projectId} />
        )}
        {activeTab === "settings" && (
          <SettingsTab projectId={projectId} onProjectUpdate={refetch} />
        )}
      </>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard/projects"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div className="animate-pulse">
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard/projects"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("tabs.overview")}
          </h1>
        </div>
        <Alert
          type="error"
          message={error?.message || t("projectNotFound")}
        />
      </div>
    );
  }

  return (
    <div>
{/* TODO: GA Download Progress Indicator - disabled, fix later
      {isDownloading && (
        <div className="fixed top-20 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 z-50 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-48">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {t("loadingGA")} ({downloadProgress}%)
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      */}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard/projects"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {project.name}
              </h1>
              <StatusBadge status={project.status} />
            </div>
            {/* Meta row: members + stage progress */}
            {(membersArray.length > 0 || totalStages > 0) && (
              <div className="flex items-center gap-5 flex-wrap">
                {membersArray.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {membersArray.slice(0, 6).map((member) => (
                        <Tooltip
                          key={member.identifier}
                          content={`${member.member.name}\n${member.member.email}\n${member.roleName}`}
                          position="bottom"
                          multiline
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-semibold text-blue-700 dark:text-blue-300 cursor-default select-none">
                            {getInitials(member.member.name)}
                          </div>
                        </Tooltip>
                      ))}
                      {membersArray.length > 6 && (
                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 select-none">
                          +{membersArray.length - 6}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {membersArray.length} {t("members")}
                    </span>
                  </div>
                )}
                {totalStages > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-28 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500"
                        style={{ width: `${stageProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {completedStages}/{totalStages} {t("stages")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Action Buttons */}
        {canEditProject && (
          <div className="flex items-center gap-2">
            {project.status === "active" && (
              <>
                <Tooltip content={t("statusActions.completeTooltip")} position="bottom">
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                  </button>
                </Tooltip>
                <Tooltip content={t("statusActions.archiveTooltip")} position="bottom">
                  <button
                    onClick={() => setShowArchiveModal(true)}
                    className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <ArchiveBoxIcon className="w-5 h-5" />
                  </button>
                </Tooltip>
              </>
            )}
            {project.status === "archived" && (
              <Tooltip content={t("statusActions.reactivateTooltip")} position="bottom">
                <button
                  onClick={() => setShowReactivateModal(true)}
                  className="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {project.description}
        </p>
      )}

      {/* Tab Navigation */}
      <div className="mb-8">
        <TabNavState
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleArchiveProject}
        title={t("statusActions.archiveTitle")}
        message={t("statusActions.confirmArchive")}
        confirmLabel={t("statusActions.archive")}
        cancelLabel={t("statusActions.cancel")}
      />

      <ConfirmModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={handleCompleteProject}
        title={t("statusActions.completeTitle")}
        message={t("statusActions.confirmComplete")}
        confirmLabel={t("statusActions.complete")}
        cancelLabel={t("statusActions.cancel")}
        confirmVariant="primary"
      />

      <ConfirmModal
        isOpen={showReactivateModal}
        onClose={() => setShowReactivateModal(false)}
        onConfirm={handleReactivateProject}
        title={t("statusActions.reactivateTitle")}
        message={t("statusActions.confirmReactivate")}
        confirmLabel={t("statusActions.reactivate")}
        cancelLabel={t("statusActions.cancel")}
      />
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  // ProjectProvider and GAProvider are now in the layout
  return <ProjectDetailPageContent projectId={projectId} />;
}
