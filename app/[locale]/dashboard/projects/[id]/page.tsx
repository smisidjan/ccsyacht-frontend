"use client";

import { useState, useEffect } from "react";
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
import { useProject, projectsApi } from "@/lib/api";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { usePermission } from "@/lib/hooks/usePermission";
import { useToast } from "@/app/context/ToastContext";
import { PERMISSIONS } from "@/lib/constants/permissions";

// Tab content components
import OverviewTab from "@/app/components/project-tabs/OverviewTab";
import DocumentsTab from "@/app/components/project-tabs/DocumentsTab";
import GeneralArrangementTab from "@/app/components/project-tabs/GeneralArrangementTab";
import PunchlistTab from "@/app/components/project-tabs/PunchlistTab";
import LogbookTab from "@/app/components/project-tabs/LogbookTab";
import ReportingTab from "@/app/components/project-tabs/ReportingTab";
import SettingsTab from "@/app/components/project-tabs/SettingsTab";

type TabKey = "overview" | "documents" | "generalArrangement" | "punchlist" | "logbook" | "reporting" | "settings";

export default function ProjectDetailPage() {
  const t = useTranslations("projectDetail");
  const params = useParams();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const { hasPermission } = usePermission();
  const { showToast } = useToast();

  // Fetch project from API
  const { data: project, loading: rawLoading, error, refetch } = useProject(projectId);

  // Enforce minimum loading time to prevent flickering
  const loading = useMinimumLoadingTime(rawLoading);

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

  const renderTabContent = () => {
    if (!project) return null;

    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            projectId={projectId}
            projectStatus={project.status}
            onProjectUpdate={refetch}
          />
        );
      case "generalArrangement":
        return (
          <GeneralArrangementTab
            projectId={projectId}
            generalArrangementUrl={project.generalArrangement}
          />
        );  
      case "documents":
        return <DocumentsTab projectId={projectId} projectStatus={project.status} />;
      case "punchlist":
        return <PunchlistTab />;
      case "logbook":
        return <LogbookTab projectId={projectId} />;
      case "reporting":
        return <ReportingTab />;
      case "settings":
        return <SettingsTab projectId={projectId} onProjectUpdate={refetch} />;
      default:
        return null;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/projects"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {project.name}
            </h1>
            <StatusBadge status={project.status} />
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
