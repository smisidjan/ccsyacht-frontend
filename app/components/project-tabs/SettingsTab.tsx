"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlusIcon, TrashIcon, PencilIcon, UserCircleIcon, StarIcon, DocumentTextIcon, TagIcon, BuildingOffice2Icon, CalendarIcon, UserIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { useProjectMembers, useProjectSigners, useUsers, useProject, projectsApi } from "@/lib/api";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useRealtimeMembers, useRealtimeSigners } from "@/lib/hooks/useRealtimeProject";
import { PERMISSIONS } from "@/lib/constants/permissions";
import Button from "@/app/components/ui/Button";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import BaseModal from "@/app/components/modals/BaseModal";
import ProfileInfoItem from "@/app/components/ui/ProfileInfoItem";
import EditProjectModal from "@/app/components/modals/EditProjectModal";
import type { User, ProjectType } from "@/lib/api/types";

interface SettingsTabProps {
  projectId: string;
  onProjectUpdate?: () => void;
}

export default function SettingsTab({ projectId, onProjectUpdate }: SettingsTabProps) {
  const t = useTranslations("projectDetail.settings");
  const locale = "en"; // TODO: Get from useLocale() if needed
  const { hasPermission, user: currentUser } = usePermission();

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Fetch data
  const { data: project, refetch: refetchProject } = useProject(projectId);
  const { data: members, loading: rawMembersLoading, error: membersError, removeMember, addMember, refetch: refetchMembers } = useProjectMembers(projectId);
  const { data: signers, loading: rawSignersLoading, error: signersError, removeSigner, addSigner, refetch: refetchSigners } = useProjectSigners(projectId);
  const { data: allUsers } = useUsers();

  const membersLoading = useMinimumLoadingTime(rawMembersLoading);
  const signersLoading = useMinimumLoadingTime(rawSignersLoading);

  // Real-time updates
  useRealtimeMembers(projectId, refetchMembers);
  useRealtimeSigners(projectId, refetchSigners);

  // Permissions
  const canManageMembers = hasPermission(PERMISSIONS.MANAGE_PROJECT_MEMBERS);
  const canManageSigners = hasPermission(PERMISSIONS.MANAGE_PROJECT_SIGNERS);
  const canEditProject = hasPermission(PERMISSIONS.EDIT_PROJECTS);

  // Modal states
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Project types for modal
  const projectTypes = [
    { id: "new_built", name: t("projectTypes.new_built") },
    { id: "refit", name: t("projectTypes.refit") },
  ];

  // Get available users (exclude already added members and current user)
  const memberIds = members?.map(m => m.member.identifier) || [];
  const signerIds = signers?.map(s => s.member.identifier) || [];
  const currentUserId = currentUser?.identifier;
  const availableUsersForMembers = allUsers?.filter(u => !memberIds.includes(u.id) && u.id !== currentUserId) || [];

  // Helper to check if a member is also a signer
  const isMemberSigner = (memberId: string) => signerIds.includes(memberId);

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    await addMember({ user_id: selectedUserId });
    setIsAddMemberModalOpen(false);
    setSelectedUserId("");
  };

  const handleMakeSigner = async (userId: string) => {
    await addSigner({ user_id: userId });
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (confirm(t("teamMembers.confirmRemove", { name: memberName }))) {
      await removeMember(userId);
    }
  };

  const handleRemoveSigner = async (userId: string, signerName: string) => {
    if (confirm(t("signers.confirmRemove", { name: signerName }))) {
      await removeSigner(userId);
    }
  };

  const handleEditProject = async (data: { name: string; description: string; project_type: ProjectType }) => {
    await projectsApi.update(projectId, {
      name: data.name,
      description: data.description,
      project_type: data.project_type,
    });
    await refetchProject();
    onProjectUpdate?.();
  };

  return (
    <div className="space-y-8">
      {/* General Information */}
      <section id="general-info" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          {t("generalInfo.title")}
        </h3>

        {project && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8">
            {/* Editable Fields */}
            <div>
              {canEditProject && (
                <div className="flex items-center justify-end mb-4">
                  <button
                    onClick={() => setIsEditProjectModalOpen(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <PencilIcon className="w-4 h-4" />
                    {t("generalInfo.edit")}
                  </button>
                </div>
              )}
              <div className="grid grid-rows-[repeat(3,auto)] grid-flow-col gap-x-8 gap-y-4 auto-cols-fr">
                <ProfileInfoItem
                  icon={DocumentTextIcon}
                  iconBgColor="bg-blue-100 dark:bg-blue-900/30"
                  iconColor="text-blue-600 dark:text-blue-400"
                  label={t("generalInfo.name")}
                  value={project.name}
                />

                <ProfileInfoItem
                  icon={TagIcon}
                  iconBgColor="bg-purple-100 dark:bg-purple-900/30"
                  iconColor="text-purple-600 dark:text-purple-400"
                  label={t("generalInfo.description")}
                  value={project.description || t("generalInfo.noDescription")}
                />

                <ProfileInfoItem
                  icon={BuildingOffice2Icon}
                  iconBgColor="bg-green-100 dark:bg-green-900/30"
                  iconColor="text-green-600 dark:text-green-400"
                  label={t("generalInfo.type")}
                  value={t(`projectTypes.${project.additionalType}`)}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-gray-200 dark:bg-gray-700" />

            {/* Read-only Fields */}
            <div>
              {/* Placeholder to align with edit button height */}
              <div className="mb-4" style={{ height: canEditProject ? 'auto' : '0' }}>
                {canEditProject && <div style={{ height: '32px' }} />}
              </div>
              <div className="grid grid-rows-[repeat(3,auto)] grid-flow-col gap-x-8 gap-y-4 auto-cols-fr">
                <ProfileInfoItem
                  icon={CalendarIcon}
                  iconBgColor="bg-gray-100 dark:bg-gray-700/30"
                  iconColor="text-gray-600 dark:text-gray-400"
                  label={t("projectDetails.created")}
                  value={formatDate(project.dateCreated)}
                />

                <ProfileInfoItem
                  icon={CalendarIcon}
                  iconBgColor="bg-gray-100 dark:bg-gray-700/30"
                  iconColor="text-gray-600 dark:text-gray-400"
                  label={t("projectDetails.modified")}
                  value={formatDate(project.dateModified)}
                />

                {project.producer && (
                  <ProfileInfoItem
                    icon={BuildingOffice2Icon}
                    iconBgColor="bg-gray-100 dark:bg-gray-700/30"
                    iconColor="text-gray-600 dark:text-gray-400"
                    label={t("projectDetails.shipyard")}
                    value={project.producer.name}
                  />
                )}

                {project.author && (
                  <ProfileInfoItem
                    icon={UserIcon}
                    iconBgColor="bg-gray-100 dark:bg-gray-700/30"
                    iconColor="text-gray-600 dark:text-gray-400"
                    label={t("projectDetails.createdBy")}
                    value={project.author.name}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Team Members & Signers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Members */}
        <section id="members" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("teamMembers.title")}
          </h3>
          {canManageMembers && (
            <Button onClick={() => setIsAddMemberModalOpen(true)}>
              <UserPlusIcon className="w-4 h-4" />
              {t("teamMembers.addMember")}
            </Button>
          )}
        </div>

        {membersLoading ? (
          <LoadingSkeleton type="list" rows={3} />
        ) : membersError ? (
          <Alert type="error" message={membersError.message || t("teamMembers.loadError")} />
        ) : members && members.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {members.map((member) => (
              <div key={member.identifier} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.member.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {member.member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {member.roleName}
                  </span>
                  {isMemberSigner(member.member.identifier) && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <StarIconSolid className="w-3 h-3" />
                      Signer
                    </span>
                  )}
                  {canManageSigners && !isMemberSigner(member.member.identifier) && (
                    <button
                      onClick={() => handleMakeSigner(member.member.identifier)}
                      className="text-gray-400 hover:text-amber-500 transition-colors"
                      title={t("teamMembers.makeSigner")}
                    >
                      <StarIcon className="w-5 h-5" />
                    </button>
                  )}
                  {canManageMembers && member.member.identifier !== currentUser?.identifier && (
                    <button
                      onClick={() => handleRemoveMember(member.member.identifier, member.member.name)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title={t("teamMembers.remove")}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t("teamMembers.noMembers")}
          </div>
        )}
      </section>

      {/* Default Signers */}
      <section id="signers" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t("signers.title")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("signers.description")}
          </p>
          {canManageSigners && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              {t("signers.manageFromMembers")}
            </p>
          )}
        </div>

        {signersLoading ? (
          <LoadingSkeleton type="list" rows={3} />
        ) : signersError ? (
          <Alert type="error" message={signersError.message || t("signers.loadError")} />
        ) : signers && signers.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {signers.map((signer) => (
              <div key={signer.identifier} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {signer.member.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {signer.member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {signer.roleName}
                  </span>
                  {canManageSigners && (
                    <button
                      onClick={() => handleRemoveSigner(signer.member.identifier, signer.member.name)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title={t("signers.remove")}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t("signers.noSigners")}
          </div>
        )}
        </section>
      </div>

      {/* Add Member Modal */}
      <BaseModal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setSelectedUserId("");
        }}
        title={t("teamMembers.addMember")}
        formId="add-member-form"
        onSubmit={handleAddMember}
        successMessage={t("teamMembers.addSuccess")}
        errorFallbackMessage={t("teamMembers.addError")}
        submitLabel={t("teamMembers.add")}
      >
        <div>
          <label htmlFor="member-user" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("teamMembers.selectUser")}
          </label>
          <select
            id="member-user"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">{t("teamMembers.selectUserPlaceholder")}</option>
            {availableUsersForMembers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>
      </BaseModal>

      {/* Edit Project Modal */}
      {project && (
        <EditProjectModal
          isOpen={isEditProjectModalOpen}
          onClose={() => setIsEditProjectModalOpen(false)}
          onSubmit={handleEditProject}
          currentName={project.name}
          currentDescription={project.description || ""}
          currentProjectType={project.additionalType}
          projectTypes={projectTypes}
        />
      )}
    </div>
  );
}
