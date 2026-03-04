"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import StatusBadge from "@/app/components/ui/StatusBadge";
import type { ProjectStatus } from "@/app/components/ui/StatusBadge";
import TabNavState from "@/app/components/ui/TabNavState";
import type { StateTab } from "@/app/components/ui/TabNavState";
import type { Area } from "@/app/components/ui/AreaCard";
import type { SetupTask } from "@/app/components/ui/SetupTaskCard";

// Tab content components
import OverviewTab from "@/app/components/project-tabs/OverviewTab";
import DocumentsTab from "@/app/components/project-tabs/DocumentsTab";
import PunchlistTab from "@/app/components/project-tabs/PunchlistTab";
import LogbookTab from "@/app/components/project-tabs/LogbookTab";
import ReportingTab from "@/app/components/project-tabs/ReportingTab";
import SettingsTab from "@/app/components/project-tabs/SettingsTab";

// Mock project data - replace with API call
const mockProjects: Record<string, {
  id: string;
  name: string;
  shipyard: string;
  status: ProjectStatus;
  description: string;
}> = {
  "1": {
    id: "1",
    name: "TEST TEST",
    shipyard: "Baltic Shipyard",
    status: "setup",
    description: "This is a test project for yacht construction at Baltic Shipyard. The project involves the construction of a 50-meter luxury yacht.",
  },
  "2": {
    id: "2",
    name: "Pieter",
    shipyard: "Monaco Marine Yard",
    status: "active",
    description: "Active yacht refit project at Monaco Marine Yard.",
  },
};

// Mock areas data - replace with API call
const mockAreas: Area[] = [
  {
    id: "1",
    name: "Hull & Structure",
    description: "Main hull construction and structural elements",
    areasCount: 4,
    stagesCount: 12,
    completedCount: 3,
    inProgressCount: 2,
    progress: 25,
  },
  {
    id: "2",
    name: "Engine Room",
    description: "Engine installation and mechanical systems",
    areasCount: 3,
    stagesCount: 8,
    completedCount: 0,
    inProgressCount: 1,
    progress: 10,
  },
  {
    id: "3",
    name: "Interior",
    description: "Interior design and finishing",
    areasCount: 6,
    stagesCount: 24,
    completedCount: 0,
    inProgressCount: 0,
    progress: 0,
  },
];

// Mock setup tasks - replace with API call
const mockSetupTasks: SetupTask[] = [
  {
    id: "1",
    title: "Upload Required Documents",
    description: "Upload all required project documentation including contracts, specifications, and drawings.",
    status: "pending",
    actionLabel: "Upload Documents",
    actionHref: "/dashboard/projects/1/documents",
  },
  {
    id: "2",
    title: "Add Project Members",
    description: "Invite team members to collaborate on this project.",
    status: "pending",
    actionLabel: "Add Members",
    actionHref: "/dashboard/projects/1/settings",
  },
  {
    id: "3",
    title: "Add Default Signers",
    description: "Configure the default signers for document approvals.",
    status: "completed",
    actionLabel: "Configure Signers",
    actionHref: "/dashboard/projects/1/settings",
  },
];

type TabKey = "overview" | "documents" | "punchlist" | "logbook" | "reporting" | "settings";

export default function ProjectDetailPage() {
  const t = useTranslations("projectDetail");
  const params = useParams();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // In real app, fetch project by ID
  const project = mockProjects[projectId] || mockProjects["1"];

  const tabs: StateTab[] = [
    { key: "overview", label: t("tabs.overview") },
    { key: "documents", label: t("tabs.documents") },
    { key: "punchlist", label: t("tabs.punchlist") },
    { key: "logbook", label: t("tabs.logbook") },
    { key: "reporting", label: t("tabs.reporting") },
    { key: "settings", label: t("tabs.settings") },
  ];

  const handleMarkTaskComplete = (taskId: string) => {
    console.log("Mark task complete:", taskId);
    // TODO: API call to mark task complete
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            projectId={projectId}
            projectStatus={project.status}
            areas={mockAreas}
            setupTasks={mockSetupTasks}
            onMarkTaskComplete={handleMarkTaskComplete}
          />
        );
      case "documents":
        return <DocumentsTab projectId={projectId} />;
      case "punchlist":
        return <PunchlistTab />;
      case "logbook":
        return <LogbookTab />;
      case "reporting":
        return <ReportingTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
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
          onChange={(key) => setActiveTab(key as TabKey)}
        />
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
