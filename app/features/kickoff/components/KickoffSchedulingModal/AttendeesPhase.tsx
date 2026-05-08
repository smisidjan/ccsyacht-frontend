"use client";

import { useTranslations } from "next-intl";
import { UserGroupIcon, XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import type { AttendeesPhaseProps } from "./types";

export default function AttendeesPhase({
  task,
  projectMembers,
  selectedUserIds,
  setSelectedUserIds,
  isAddingAssignees,
  onAddAssignees,
  onRemoveAssignee,
  getMemberInfo,
  roleTypeMap,
  canManageKickoff,
  onNext,
  currentUserId,
}: AttendeesPhaseProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffScheduling");

  // Filter out members who are already attendees AND the current user (they're auto-added)
  const availableMembers = projectMembers?.filter((member) => {
    const isAlreadyAssignee = task?.assignees?.some((a) => a.identifier === member.member.identifier);
    // Only filter out current user if currentUserId is actually defined
    const isCurrentUser = currentUserId && member.member.identifier === currentUserId;
    // Exclude if already assignee OR if it's the current user (when we know who that is)
    return !isAlreadyAssignee && !isCurrentUser;
  });

  // Toggle user selection for attendees
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(
      selectedUserIds.includes(userId)
        ? selectedUserIds.filter((id) => id !== userId)
        : [...selectedUserIds, userId]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t("attendees.title")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("attendees.description")}
        </p>
      </div>

      {/* Current attendees */}
      {task?.assignees && task.assignees.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("attendees.selected")} ({task.assignees.length})
          </label>
          <div className="space-y-2">
            {task.assignees.map((assignee) => {
              const memberInfo = getMemberInfo(assignee.identifier);
              const roleType = memberInfo ? roleTypeMap[memberInfo.roleName] : undefined;

              return (
                <div
                  key={assignee.identifier}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <UserGroupIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {assignee.name}
                        </span>
                        {roleType && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              roleType === "guest"
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            }`}
                          >
                            {roleType === "guest" ? t("attendees.guest") : t("attendees.employee")}
                          </span>
                        )}
                      </div>
                      {memberInfo && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{memberInfo.roleName}</span>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <span>{memberInfo.member.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {canManageKickoff && (
                    <button
                      onClick={() => onRemoveAssignee(assignee.identifier)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Show message if no members available */}
      {canManageKickoff && projectMembers && projectMembers.length > 0 && (!availableMembers || availableMembers.length === 0) && (
        <Alert type="info" message={t("attendees.allMembersAdded")} />
      )}

      {/* Show message if no members loaded with debug info */}
      {canManageKickoff && (!projectMembers || projectMembers.length === 0) && (
        <Alert
          type="info"
          message={`${t("attendees.noMembersLoaded")}${process.env.NODE_ENV === 'development' ? ` (Debug: projectMembers=${projectMembers?.length || 0})` : ''}`}
        />
      )}

      {/* Add attendees */}
      {canManageKickoff && availableMembers && availableMembers.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("attendees.addMore")}
          </label>
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {availableMembers.map((member) => {
              const roleType = roleTypeMap[member.roleName];

              return (
                <label
                  key={member.member.identifier}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(member.member.identifier)}
                    onChange={() => toggleUserSelection(member.member.identifier)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.member.name}
                      </span>
                      {roleType && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                            roleType === "guest"
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                          }`}
                        >
                          {roleType === "guest" ? t("attendees.guest") : t("attendees.employee")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{member.roleName}</span>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span className="truncate">{member.member.email}</span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <Button
            variant="primary"
            onClick={onAddAssignees}
            loading={isAddingAssignees}
            disabled={selectedUserIds.length === 0 || isAddingAssignees}
            className="w-full"
          >
            <PlusIcon className="w-4 h-4" />
            {t("attendees.add", { count: selectedUserIds.length })}
          </Button>
        </div>
      )}

      {/* No attendees yet */}
      {(!task?.assignees || task.assignees.length === 0) && (
        <Alert type="info" message={t("attendees.empty")} />
      )}

      {/* Continue button when attendees are added */}
      {task?.assignees && task.assignees.length > 0 && canManageKickoff && (
        <Button variant="primary" onClick={onNext} className="w-full">
          {t("attendees.continue")}
        </Button>
      )}
    </div>
  );
}
