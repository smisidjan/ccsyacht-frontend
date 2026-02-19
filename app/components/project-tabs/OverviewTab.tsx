"use client";

import { useTranslations } from "next-intl";
import AreaCard from "@/app/components/ui/AreaCard";
import type { Area } from "@/app/components/ui/AreaCard";
import SetupTaskCard from "@/app/components/ui/SetupTaskCard";
import type { SetupTask } from "@/app/components/ui/SetupTaskCard";
import type { ProjectStatus } from "@/app/components/ui/StatusBadge";

interface OverviewTabProps {
  projectId: string;
  projectStatus: ProjectStatus;
  areas: Area[];
  setupTasks: SetupTask[];
  onMarkTaskComplete?: (taskId: string) => void;
}

export default function OverviewTab({
  projectId,
  projectStatus,
  areas,
  setupTasks,
  onMarkTaskComplete,
}: OverviewTabProps) {
  const t = useTranslations("projectDetail");

  const pendingTasksCount = setupTasks.filter((task) => task.status === "pending").length;

  return (
    <div className="space-y-8">
      {/* Setup Tasks Section (only shown for projects in setup status) */}
      {projectStatus === "setup" && setupTasks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("setupTasks.title")}
            </h2>
            {pendingTasksCount > 0 && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                {t("setupTasks.pendingCount", { count: pendingTasksCount })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {setupTasks.map((task) => (
              <SetupTaskCard
                key={task.id}
                task={task}
                onMarkComplete={onMarkTaskComplete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Areas Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t("areasSection.title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {areas.map((area) => (
            <AreaCard key={area.id} area={area} projectId={projectId} />
          ))}
        </div>
        {areas.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            {t("areasSection.noAreas")}
          </div>
        )}
      </section>
    </div>
  );
}
