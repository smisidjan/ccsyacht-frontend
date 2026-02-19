"use client";

import { useTranslations } from "next-intl";
import { ArrowDownTrayIcon, ChartBarIcon, DocumentChartBarIcon } from "@heroicons/react/24/outline";
import ProgressCircle from "@/app/components/ui/ProgressCircle";

interface AreaProgress {
  name: string;
  progress: number;
  stages: number;
  completed: number;
}

interface ReportData {
  overallProgress: number;
  areasCompleted: number;
  totalAreas: number;
  tasksCompleted: number;
  totalTasks: number;
  documentsUploaded: number;
  totalDocuments: number;
}

interface ReportingTabProps {
  reportData?: ReportData;
  areaProgress?: AreaProgress[];
}

// Mock reporting data - replace with props from API
const defaultReportData: ReportData = {
  overallProgress: 15,
  areasCompleted: 0,
  totalAreas: 3,
  tasksCompleted: 3,
  totalTasks: 44,
  documentsUploaded: 2,
  totalDocuments: 4,
};

const defaultAreaProgress: AreaProgress[] = [
  { name: "Hull & Structure", progress: 25, stages: 12, completed: 3 },
  { name: "Engine Room", progress: 10, stages: 8, completed: 0 },
  { name: "Interior", progress: 0, stages: 24, completed: 0 },
];

export default function ReportingTab({
  reportData = defaultReportData,
  areaProgress = defaultAreaProgress,
}: ReportingTabProps) {
  const t = useTranslations("projectDetail.reporting");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
          <ArrowDownTrayIcon className="w-4 h-4" />
          {t("exportReport")}
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("overallProgress")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {reportData.overallProgress}%
              </p>
            </div>
            <ProgressCircle percentage={reportData.overallProgress} size={56} strokeWidth={4} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <ChartBarIcon className="w-10 h-10 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("areasCompleted")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {reportData.areasCompleted}/{reportData.totalAreas}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <DocumentChartBarIcon className="w-10 h-10 text-green-500" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("tasksCompleted")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {reportData.tasksCompleted}/{reportData.totalTasks}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <DocumentChartBarIcon className="w-10 h-10 text-amber-500" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("documentsUploaded")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {reportData.documentsUploaded}/{reportData.totalDocuments}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Area Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("areaProgress")}
        </h3>
        <div className="space-y-4">
          {areaProgress.map((area) => (
            <div key={area.name} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {area.name}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {area.completed}/{area.stages} {t("stagesCompleted")}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${area.progress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                {area.progress}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
