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
import ProjectCard from "@/app/components/ui/ProjectCard";
import type { Project } from "@/app/components/ui/ProjectCard";
import SearchInput from "@/app/components/ui/SearchInput";
import FilterTabs from "@/app/components/ui/FilterTabs";
import type { FilterOption } from "@/app/components/ui/FilterTabs";
import CreateProjectModal from "@/app/components/modals/CreateProjectModal";
import type { ProjectFormData } from "@/app/components/modals/CreateProjectModal";

// Mock data - replace with API call
const mockProjects: Project[] = [
  {
    id: "1",
    name: "TEST TEST",
    shipyard: "Baltic Shipyard",
    status: "setup",
    progress: 0,
    membersCount: 0,
  },
  {
    id: "2",
    name: "Pieter",
    shipyard: "Monaco Marine Yard",
    status: "active",
    progress: 0,
    membersCount: 1,
  },
  {
    id: "3",
    name: "Test Project 3",
    shipyard: "Baltic Shipyard",
    status: "active",
    progress: 0,
    membersCount: 0,
  },
  {
    id: "4",
    name: "Test Project 2",
    shipyard: "Monaco Marine Yard",
    status: "active",
    progress: 0,
    membersCount: 0,
  },
  {
    id: "5",
    name: "Test Project 1",
    shipyard: "Baltic Shipyard",
    status: "active",
    progress: 0,
    membersCount: 0,
  },
  {
    id: "6",
    name: "Test Project",
    shipyard: "Baltic Shipyard",
    status: "setup",
    progress: 0,
    membersCount: 0,
  },
];

// Mock data for shipyards and project types - replace with API call
const mockShipyards = [
  { id: "1", name: "Baltic Shipyard" },
  { id: "2", name: "Monaco Marine Yard" },
];

const mockProjectTypes = [
  { id: "1", name: "New Build" },
  { id: "2", name: "Refit" },
  { id: "3", name: "Maintenance" },
];

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateProject = (data: ProjectFormData) => {
    console.log("Create project:", data);
    // TODO: API call to create project
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
    return mockProjects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.shipyard.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        activeFilter === "all" || project.status === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
        >
          <PlusIcon className="w-5 h-5" />
          {t("newProject")}
        </button>
      </div>

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

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {t("showing", {
          count: filteredProjects.length,
          total: mockProjects.length,
        })}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t("noProjects")}
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        shipyards={mockShipyards}
        projectTypes={mockProjectTypes}
      />
    </div>
  );
}
