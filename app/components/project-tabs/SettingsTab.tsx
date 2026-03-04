"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlusIcon, TrashIcon, PencilIcon, UserCircleIcon, StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { useProjectMembers, useProjectSigners, useUsers } from "@/lib/api";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import Button from "@/app/components/ui/Button";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import BaseModal from "@/app/components/modals/BaseModal";
import type { User } from "@/lib/api/types";

interface SettingsTabProps {
  projectId: string;
}

export default function SettingsTab({ projectId }: SettingsTabProps) {
  const t = useTranslations("projectDetail.settings");
  const { hasPermission, user: currentUser } = usePermission();

  // Fetch data
  const { data: members, loading: membersLoading, error: membersError, removeMember, addMember } = useProjectMembers(projectId);
  const { data: signers, loading: signersLoading, error: signersError, removeSigner, addSigner } = useProjectSigners(projectId);
  const { data: allUsers } = useUsers();

  // Permissions
  const canManageMembers = hasPermission(PERMISSIONS.MANAGE_PROJECT_MEMBERS);
  const canManageSigners = hasPermission(PERMISSIONS.MANAGE_PROJECT_SIGNERS);

  // Modal states
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

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

  return (
    <div className="space-y-8">
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
                  {canManageMembers && (
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
    </div>
  );
}
