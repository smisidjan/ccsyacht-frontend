"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { UserPlusIcon, TrashIcon, PencilIcon, UserCircleIcon, StarIcon, DocumentTextIcon, TagIcon, BuildingOffice2Icon, CalendarIcon, UserIcon, CheckIcon, UserGroupIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { useProjectMembers, useProjectSigners, useUsers, useProject, useRoles, projectsApi, setupTasksApi, invitationsApi } from "@/lib/api";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useRealtimeMembers, useRealtimeSigners } from "@/lib/hooks/useRealtimeProject";
import { PERMISSIONS } from "@/lib/constants/permissions";
import Button from "@/app/components/ui/Button";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import BaseModal from "@/app/components/modals/BaseModal";
import ProfileInfoItem from "@/app/components/ui/ProfileInfoItem";
import { EditProjectModal } from "@/app/features/projects";
import type { User, ProjectType, SetupTask, SelectedTimeSlot } from "@/lib/api/types";

interface SettingsTabProps {
  projectId: string;
  onProjectUpdate?: () => void;
}

export default function SettingsTab({ projectId, onProjectUpdate }: SettingsTabProps) {
  const t = useTranslations("projectDetail.settings");
  const tTasks = useTranslations("projectDetail.setupTasks");
  const locale = "en"; // TODO: Get from useLocale() if needed
  const { hasPermission, user: currentUser } = usePermission();

  // Kickoff meeting state
  const [kickoffMeeting, setKickoffMeeting] = useState<SetupTask | null>(null);
  const [kickoffTimeSlot, setKickoffTimeSlot] = useState<SelectedTimeSlot | null>(null);
  const [kickoffLoading, setKickoffLoading] = useState(false);

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

  // Check if project is read-only (archived or completed)
  const isReadOnly = project?.status === "archived" || project?.status === "completed";

  // Modal states
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Add member modal state - for searchable input
  const [searchInput, setSearchInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [employmentType, setEmploymentType] = useState<"employee" | "guest">("employee");
  const [homeOrganization, setHomeOrganization] = useState("");

  // Fetch roles for invitation (filtered by employment type)
  const { data: roles } = useRoles(employmentType);

  // Project types for modal
  const projectTypes = [
    { id: "new_build", name: t("projectTypes.new_build") },
    { id: "refit", name: t("projectTypes.refit") },
  ];

  // Get available users (exclude already added members and current user)
  const memberIds = members?.map(m => m.member.identifier) || [];
  const signerIds = signers?.map(s => s.member.identifier) || [];
  const currentUserId = currentUser?.identifier;
  const availableUsersForMembers = allUsers?.filter(u => !memberIds.includes(u.id) && u.id !== currentUserId) || [];

  // Email validation helper
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Filter available users based on search input
  const filteredUsers = useMemo(() => {
    if (!searchInput.trim()) return availableUsersForMembers;
    const query = searchInput.toLowerCase().trim();
    return availableUsersForMembers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [availableUsersForMembers, searchInput]);

  // Check if search input is an email that doesn't exist in the system
  const isNewEmailInvite = useMemo(() => {
    if (!isValidEmail(searchInput)) return false;
    const emailLower = searchInput.toLowerCase().trim();
    // Check if this email exists in all users
    return !allUsers?.some((user) => user.email.toLowerCase() === emailLower);
  }, [searchInput, allUsers]);

  // Helper to check if a member is also a signer
  const isMemberSigner = (memberId: string) => signerIds.includes(memberId);

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    await addMember({ user_id: selectedUserId });
    resetAddMemberModal();
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const user = availableUsersForMembers.find((u) => u.id === userId);
    if (user) {
      setSearchInput(user.email);
    }
  };

  const handleInviteNewUser = async () => {
    if (!isValidEmail(searchInput) || !selectedRole) return;
    if (employmentType === "guest" && !homeOrganization.trim()) return;

    await invitationsApi.create({
      email: searchInput.trim(),
      role: selectedRole,
      employment_type: employmentType,
      home_organization_name: employmentType === "guest" ? homeOrganization.trim() : undefined,
    });
    resetAddMemberModal();
  };

  const resetAddMemberModal = () => {
    setIsAddMemberModalOpen(false);
    setSelectedUserId("");
    setSearchInput("");
    setSelectedRole("");
    setEmploymentType("employee");
    setHomeOrganization("");
  };

  const handleModalSubmit = async () => {
    if (selectedUserId) {
      // Adding existing user
      await handleAddMember();
    } else if (isNewEmailInvite && selectedRole) {
      // Inviting new user
      await handleInviteNewUser();
    }
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

  const handleEditProject = async (data: { name: string; description: string; project_type: ProjectType; external_id: string }) => {
    await projectsApi.update(projectId, {
      name: data.name,
      description: data.description,
      project_type: data.project_type,
      external_id: data.external_id || undefined,
    });
    await refetchProject();
    onProjectUpdate?.();
  };

  // Fetch kickoff meeting task and scheduling status
  useEffect(() => {
    async function fetchKickoffMeeting() {
      try {
        setKickoffLoading(true);
        const response = await setupTasksApi.getAll(projectId);
        const kickoff = response.data.find(task => task.additionalType === "kickoff_meeting");
        setKickoffMeeting(kickoff || null);

        // If kickoff is scheduled, fetch the scheduling status to get the time
        if (kickoff && (kickoff.actionStatus === "scheduled" || kickoff.actionStatus === "completed")) {
          try {
            const schedulingStatus = await setupTasksApi.getSchedulingStatus(projectId, kickoff.identifier);
            // Try selectedTimeSlot first, then look for isSelected in proposedDates
            let timeSlot = schedulingStatus.selectedTimeSlot || null;
            if (!timeSlot && schedulingStatus.proposedDates) {
              for (const pd of schedulingStatus.proposedDates) {
                const selected = pd.timeSlots?.find((ts) => ts.isSelected);
                if (selected) {
                  timeSlot = {
                    identifier: selected.id,
                    date: pd.proposedDate,
                    startTime: selected.startTime,
                    endTime: selected.endTime,
                    responses: selected.responses || [],
                  };
                  break;
                }
              }
            }
            setKickoffTimeSlot(timeSlot);
          } catch (err) {
            console.error("Failed to fetch scheduling status:", err);
          }
        }
      } catch (error) {
        console.error("Failed to load kickoff meeting:", error);
      } finally {
        setKickoffLoading(false);
      }
    }

    fetchKickoffMeeting();
  }, [projectId]);

  return (
    <div className="space-y-8">
      {/* General Information */}
      <section id="general-info" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          {t("generalInfo.title")}
        </h3>

        {project && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8">
            {/* Editable Fields */}
            <div>
              {canEditProject && project.status !== "archived" && project.status !== "completed" && (
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
              <div className="space-y-4">
                {/* Project Name and Number on same row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ProfileInfoItem
                    icon={DocumentTextIcon}
                    iconBgColor="bg-blue-100 dark:bg-blue-900/30"
                    iconColor="text-blue-600 dark:text-blue-400"
                    label={t("generalInfo.name")}
                    value={project.name}
                  />

                  <ProfileInfoItem
                    icon={TagIcon}
                    iconBgColor="bg-amber-100 dark:bg-amber-900/30"
                    iconColor="text-amber-600 dark:text-amber-400"
                    label={t("generalInfo.projectNumber")}
                    value={project.externalId || "-"}
                  />
                </div>

                {/* Description and Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-gray-200 dark:bg-gray-700" />

            {/* Read-only Fields */}
            <div>
              {/* Placeholder to align with edit button height */}
              <div className="mb-4" style={{ height: canEditProject ? 'auto' : '0' }}>
                {canEditProject && <div style={{ height: '32px' }} />}
              </div>
              <div className="space-y-4">
                {/* Row 1: Shipyard and Created */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.producer && (
                    <ProfileInfoItem
                      icon={BuildingOffice2Icon}
                      iconBgColor="bg-gray-100 dark:bg-gray-700/30"
                      iconColor="text-gray-600 dark:text-gray-400"
                      label={t("projectDetails.shipyard")}
                      value={project.producer.name}
                    />
                  )}

                  <ProfileInfoItem
                    icon={CalendarIcon}
                    iconBgColor="bg-gray-100 dark:bg-gray-700/30"
                    iconColor="text-gray-600 dark:text-gray-400"
                    label={t("projectDetails.created")}
                    value={formatDate(project.dateCreated)}
                  />
                </div>

                {/* Row 2: Created By and Last Modified */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.author && (
                    <ProfileInfoItem
                      icon={UserIcon}
                      iconBgColor="bg-gray-100 dark:bg-gray-700/30"
                      iconColor="text-gray-600 dark:text-gray-400"
                      label={t("projectDetails.createdBy")}
                      value={project.author.name}
                    />
                  )}

                  <ProfileInfoItem
                    icon={CalendarIcon}
                    iconBgColor="bg-gray-100 dark:bg-gray-700/30"
                    iconColor="text-gray-600 dark:text-gray-400"
                    label={t("projectDetails.modified")}
                    value={formatDate(project.dateModified)}
                  />
                </div>
              </div>
            </div>
            </div>

            {/* Kickoff Meeting Info (inline) */}
            {kickoffMeeting && (kickoffMeeting.actionStatus === "scheduled" || kickoffMeeting.actionStatus === "completed") && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tTasks("kickoffMeeting.title")}
                    </h4>
                  </div>

                  {kickoffLoading ? (
                    <LoadingSkeleton type="list" rows={2} />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <ProfileInfoItem
                        icon={CalendarIcon}
                        iconBgColor="bg-blue-100 dark:bg-blue-900/30"
                        iconColor="text-blue-600 dark:text-blue-400"
                        label="Status"
                        value={kickoffMeeting.actionStatus === "completed" ? tTasks("completed") : tTasks("scheduled")}
                      />

                      {kickoffMeeting.scheduledDate && (
                        <ProfileInfoItem
                          icon={CalendarIcon}
                          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
                          iconColor="text-purple-600 dark:text-purple-400"
                          label={tTasks("kickoffMeeting.scheduledDate")}
                          value={
                            kickoffTimeSlot
                              ? `${new Date(kickoffMeeting.scheduledDate).toLocaleDateString(locale, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}, ${kickoffTimeSlot.startTime} - ${kickoffTimeSlot.endTime}`
                              : new Date(kickoffMeeting.scheduledDate).toLocaleDateString(locale, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                          }
                        />
                      )}

                      {kickoffMeeting.assignees && kickoffMeeting.assignees.length > 0 && (
                        <ProfileInfoItem
                          icon={UserGroupIcon}
                          iconBgColor="bg-green-100 dark:bg-green-900/30"
                          iconColor="text-green-600 dark:text-green-400"
                          label={tTasks("kickoffMeeting.attendees")}
                          value={`${kickoffMeeting.assignees.filter(a => a.hasSigned).length}/${kickoffMeeting.assignees.length} ${kickoffMeeting.actionStatus === "completed" ? tTasks("kickoffMeeting.signed") : ""}`}
                        />
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
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
          {canManageMembers && !isReadOnly && (
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
                  {canManageSigners && !isMemberSigner(member.member.identifier) && !isReadOnly && (
                    <button
                      onClick={() => handleMakeSigner(member.member.identifier)}
                      className="text-gray-400 hover:text-amber-500 transition-colors"
                      title={t("teamMembers.makeSigner")}
                    >
                      <StarIcon className="w-5 h-5" />
                    </button>
                  )}
                  {canManageMembers && member.member.identifier !== currentUser?.identifier && !isReadOnly && (
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
          {canManageSigners && !isReadOnly && (
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
                  {canManageSigners && !isReadOnly && (
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
        onClose={resetAddMemberModal}
        title={t("teamMembers.addMember")}
        size="md"
        formId="add-member-form"
        onSubmit={handleModalSubmit}
        successMessage={isNewEmailInvite ? t("teamMembers.inviteSuccess") : t("teamMembers.addSuccess")}
        errorFallbackMessage={isNewEmailInvite ? t("teamMembers.inviteError") : t("teamMembers.addError")}
        submitLabel={isNewEmailInvite ? t("teamMembers.invite") : t("teamMembers.add")}
        submitDisabled={!selectedUserId && (!isNewEmailInvite || !selectedRole || (employmentType === "guest" && !homeOrganization.trim()))}
      >
        <div className="space-y-4">
          {/* Search input */}
          <div>
            <label htmlFor="member-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("teamMembers.searchOrInvite")}
            </label>
            <input
              id="member-search"
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSelectedUserId("");
              }}
              placeholder={t("teamMembers.searchPlaceholder")}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="off"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("teamMembers.searchHint")}
            </p>
          </div>

          {/* User list - inline, scrollable */}
          {(filteredUsers.length > 0 || isNewEmailInvite) && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto">
              {/* Existing users */}
              {filteredUsers.slice(0, 5).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                    selectedUserId === user.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  {selectedUserId === user.id && (
                    <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  )}
                </button>
              ))}

              {/* Invite option when valid email not found */}
              {isNewEmailInvite && (
                <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <EnvelopeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {t("teamMembers.inviteEmail", { email: searchInput })}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {t("teamMembers.inviteDescription")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No results message */}
          {searchInput.trim() && filteredUsers.length === 0 && !isNewEmailInvite && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center border border-gray-200 dark:border-gray-600 rounded-lg">
              {t("teamMembers.noResults")}
            </div>
          )}

          {/* Invitation fields */}
          {isNewEmailInvite && (
            <>
              {/* Employment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("teamMembers.employmentType")}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="employment-type"
                      value="employee"
                      checked={employmentType === "employee"}
                      onChange={() => {
                        setEmploymentType("employee");
                        setSelectedRole("");
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t("teamMembers.employee")}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="employment-type"
                      value="guest"
                      checked={employmentType === "guest"}
                      onChange={() => {
                        setEmploymentType("guest");
                        setSelectedRole("");
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t("teamMembers.guest")}
                    </span>
                  </label>
                </div>
              </div>

              {/* Role selector */}
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("teamMembers.selectRole")} <span className="text-red-500">*</span>
                </label>
                <select
                  id="invite-role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">{t("teamMembers.selectRolePlaceholder")}</option>
                  {roles?.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Home Organization (only for guests) */}
              {employmentType === "guest" && (
                <div>
                  <label htmlFor="home-organization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("teamMembers.homeOrganization")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="home-organization"
                    type="text"
                    value={homeOrganization}
                    onChange={(e) => setHomeOrganization(e.target.value)}
                    placeholder={t("teamMembers.homeOrganizationPlaceholder")}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t("teamMembers.homeOrganizationHint")}
                  </p>
                </div>
              )}
            </>
          )}
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
          currentExternalId={project.externalId || ""}
          currentProjectType={project.additionalType}
          projectTypes={projectTypes}
        />
      )}
    </div>
  );
}
