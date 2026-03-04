"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  FolderIcon,
  BuildingOffice2Icon,
  ArrowRightIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import StatusBadge from "./StatusBadge";
import type { Project } from "@/lib/api/types";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const t = useTranslations("projects");

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl dark:shadow-gray-900/50 dark:hover:shadow-gray-900/70 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600" />

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl flex items-center justify-center shadow-sm">
              <FolderIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {project.name}
            </h3>
          </div>
          <StatusBadge status={project.status} />
        </div>

        {/* Details */}
        <div className="space-y-3 mb-4">
          {/* Shipyard */}
          {project.producer?.name && (
            <div className="flex items-center gap-3 text-sm">
              <BuildingOffice2Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {project.producer.name}
              </span>
            </div>
          )}

          {/* Type & Dates */}
          <div className="flex items-start gap-3 text-sm">
            <CalendarIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-gray-700 dark:text-gray-300 mb-1">
                <span className="font-medium capitalize">{project.additionalType?.replace('_', ' ')}</span>
              </div>
              {(project.startDate || project.endDate) && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {project.startDate && new Date(project.startDate).toLocaleDateString()}
                  {project.startDate && project.endDate && ' - '}
                  {project.endDate && new Date(project.endDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <Link
            href={`/dashboard/projects/${project.identifier}`}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            {t("openProject")}
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
