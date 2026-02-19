"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  FolderIcon,
  BuildingOffice2Icon,
  UsersIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import StatusBadge, { ProjectStatus } from "./StatusBadge";
import ProgressCircle from "./ProgressCircle";

export interface Project {
  id: string;
  name: string;
  shipyard: string;
  status: ProjectStatus;
  progress: number;
  membersCount: number;
}

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const t = useTranslations("projects");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6 flex flex-col transition-all hover:shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <FolderIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {project.name}
          </h3>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
        <BuildingOffice2Icon className="w-5 h-5" />
        <span className="text-sm">{project.shipyard}</span>
      </div>

      <div className="flex-1 flex justify-end mb-4">
        <ProgressCircle percentage={project.progress} />
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <UsersIcon className="w-5 h-5" />
          <span className="text-sm">
            {project.membersCount} {t("members")}
          </span>
        </div>
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
        >
          <ArrowRightIcon className="w-4 h-4" />
          {t("openProject")}
        </Link>
      </div>
    </div>
  );
}
