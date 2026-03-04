"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Squares2X2Icon, MapPinIcon, EyeIcon } from "@heroicons/react/24/outline";
import ProgressCircle from "./ProgressCircle";

export interface Area {
  id: string;
  name: string;
  description?: string;
  deckName?: string;
  areasCount: number;
  stagesCount: number;
  completedCount: number;
  inProgressCount: number;
  progress: number;
}

interface AreaCardProps {
  area: Area;
  projectId: string;
}

export default function AreaCard({ area, projectId }: AreaCardProps) {
  const t = useTranslations("projectDetail");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6 flex flex-col transition-all hover:shadow-xl">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Squares2X2Icon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {area.name}
          </h3>
        </div>
        <ProgressCircle percentage={area.progress} size={56} strokeWidth={4} />
      </div>

      {area.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {area.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
        {area.deckName && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4" />
              {area.deckName}
            </span>
            <span>•</span>
          </>
        )}
        <span>{area.stagesCount} {t("stages")}</span>
      </div>

      <div className="flex items-center gap-3 text-sm mb-4">
        <span className="text-green-600 dark:text-green-400">
          {area.completedCount} {t("completed")}
        </span>
        {area.inProgressCount > 0 && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-amber-600 dark:text-amber-400">
              {area.inProgressCount} {t("inProgress")}
            </span>
          </>
        )}
      </div>

      <div className="mt-auto">
        <Link
          href={`/dashboard/projects/${projectId}/areas/${area.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
        >
          <EyeIcon className="w-4 h-4" />
          {t("viewDetails")}
        </Link>
      </div>
    </div>
  );
}
