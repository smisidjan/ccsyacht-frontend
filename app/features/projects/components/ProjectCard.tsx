"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  FolderIcon,
  BuildingOffice2Icon,
  ArrowRightIcon,
  CalendarIcon,
  UserPlusIcon,
  LockClosedIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import StatusBadge from "@/app/components/ui/StatusBadge";
import Tooltip from "@/app/components/ui/Tooltip";
import type { Project, UserRole } from "@/lib/api/types";
import { projectMembersApi, useAreas } from "@/lib/api";
import { useToast } from "@/app/context/ToastContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { handleError } from "@/lib/utils/errors";

interface ProjectCardProps {
  project: Project;
  isMember: boolean;
  userRole: UserRole;
  memberCount?: number;
  onJoin?: () => void;
}

export default function ProjectCard({ project, isMember, userRole, memberCount, onJoin }: ProjectCardProps) {
  const t = useTranslations("projects");
  const router = useRouter();
  const { showToast } = useToast();
  const { user: currentUser } = usePermission();
  const [isJoining, setIsJoining] = useState(false);

  const { data: areas } = useAreas(project.identifier);
  const areasArray = useMemo(() => (Array.isArray(areas) ? areas : []), [areas]);
  const totalStages = useMemo(() => areasArray.reduce((s, a) => s + (a.stageCount || 0), 0), [areasArray]);
  const completedStages = useMemo(() => areasArray.reduce((s, a) => s + (a.completedStageCount || 0), 0), [areasArray]);
  const stageProgress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl dark:shadow-gray-900/50 dark:hover:shadow-gray-900/70 transition-all duration-300 hover:-translate-y-1 overflow-hidden h-full flex flex-col">
      {/* Gradient accent — only visible on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl flex items-center justify-center shadow-sm">
              <FolderIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white break-words line-clamp-2 min-h-[3.5rem]">
              {project.name}
            </h3>
          </div>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 break-words line-clamp-2 min-h-[2.5rem]">
          {project.description || ' '}
        </p>
        {totalStages > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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

      {/* Details \u2014 compact sub-rows, same rhythm as the setup task cards */}
      <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        <div className="flex items-start gap-3 px-6 py-3">
          <Tooltip content={t("shipyardLabel")} position="top" triggerClassName="flex-shrink-0 mt-0.5">
            <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
          </Tooltip>
          <div className="min-w-0 flex-1">
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">
              {project.producer?.name || '\u00A0'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
              {project.producer?.isQuayside && project.quaysideNote ? project.quaysideNote : '\u00A0'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-3">
          <Tooltip content={t("typeLabel")} position="top" triggerClassName="flex-shrink-0">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
          </Tooltip>
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
              {project.additionalType?.replace('_', ' ') || '\u00A0'}
            </span>
            {(project.startDate || project.endDate) && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {project.startDate && new Date(project.startDate).toLocaleDateString()}
                {project.startDate && project.endDate && ' - '}
                {project.endDate && new Date(project.endDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-1 flex-1 flex flex-col">
        {/* Member count — stays close to the details above */}
        <div className="flex items-center justify-end gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
          <UsersIcon className="w-4 h-4" />
          <span>{t("memberCount", { count: memberCount ?? 0 })}</span>
        </div>

        {/* Footer — pinned to the bottom so cards in a row stay aligned */}
        <div className="pt-5 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          {isMember ? (
            // If user is a member, show "Open Project" button
            <Link
              href={`/dashboard/projects/${project.identifier}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              {t("openProject")}
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          ) : userRole === "admin" || userRole === "main user" || userRole === "surveyor" ? (
            // If admin, main user, or surveyor and NOT a member, show "Join Project" button
            <button
              onClick={async () => {
                if (!currentUser?.identifier) {
                  showToast("error", t("joinError"));
                  return;
                }
                setIsJoining(true);
                try {
                  await projectMembersApi.add(project.identifier, { user_id: currentUser.identifier });
                  showToast("success", t("joinSuccess"));
                  if (onJoin) onJoin();
                  router.push(`/dashboard/projects/${project.identifier}`);
                } catch (error) {
                  handleError(error, { showToast, fallbackMessage: t("joinError") });
                } finally {
                  setIsJoining(false);
                }
              }}
              disabled={isJoining}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              {isJoining ? t("joining") : t("joinProject")}
              <UserPlusIcon className="w-4 h-4" />
            </button>
          ) : (
            // If user or painter, show "Request Access" button (disabled)
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-400 dark:bg-gray-600 text-white text-sm font-medium rounded-lg cursor-not-allowed opacity-60"
            >
              {t("requestAccess")}
              <LockClosedIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
