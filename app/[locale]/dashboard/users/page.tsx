"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import TabNavState from "@/app/components/ui/TabNavState";
import type { StateTab } from "@/app/components/ui/TabNavState";
import UsersTab from "@/app/components/users-tabs/UsersTab";
import InvitationsTab from "@/app/components/users-tabs/InvitationsTab";
import RegistrationRequestsTab from "@/app/components/users-tabs/RegistrationRequestsTab";
import InviteUserModal from "@/app/components/modals/InviteUserModal";
import EditUserModal from "@/app/components/modals/EditUserModal";
import type { InviteUserFormData } from "@/app/components/modals/InviteUserModal";
import type { User, UpdateUserRequest, UserRole } from "@/lib/api/types";
import {
  useUsers,
  useInvitations,
  useRegistrationRequests,
  useCurrentUser,
} from "@/lib/api";

type TabKey = "users" | "invitations" | "registrationRequests";

export default function UsersPage() {
  const t = useTranslations("usersPage");
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // API hooks
  const { data: currentUser } = useCurrentUser();
  const { data: users, loading: usersLoading, updateUser, refetch: refetchUsers } = useUsers();
  const {
    data: invitations,
    loading: invitationsLoading,
    createInvitation,
    resendInvitation,
    deleteInvitation,
  } = useInvitations();
  const {
    data: registrationRequests,
    loading: requestsLoading,
    lastUpdated: requestsLastUpdated,
    refetch: refetchRequests,
    approveRequest,
    rejectRequest,
  } = useRegistrationRequests();

  // Auto-refresh registration requests every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetchRequests();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [refetchRequests]);

  // Get current user role (default to 'user' if not loaded)
  const currentUserRoles = (currentUser as { roles?: string[] })?.roles || [];
  const currentUserRole = (currentUserRoles[0] as UserRole) || "user";

  const tabs: StateTab[] = [
    { key: "users", label: t("tabs.users") },
    { key: "invitations", label: t("tabs.invitations") },
    { key: "registrationRequests", label: t("tabs.registrationRequests") },
  ];

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (userId: string, data: UpdateUserRequest) => {
    try {
      await updateUser(userId, data);
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to update user:", error);
      throw error; // Re-throw so the modal can show an error state
    }
  };

  const handleInviteUser = async (data: InviteUserFormData) => {
    try {
      await createInvitation({ email: data.email, role: data.role });
      setIsInviteModalOpen(false);
    } catch (error) {
      console.error("Failed to invite user:", error);
      throw error; // Re-throw so the modal can show an error state
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation(invitationId);
    } catch (error) {
      const apiError = error as { message?: string; status?: number };
      console.error("Failed to resend invitation:", apiError.message || error, "Status:", apiError.status);
      throw error; // Re-throw so the tab can show an error state
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    await deleteInvitation(id);
  };

  const handleApproveRequest = async (requestId: string, role: string) => {
    try {
      await approveRequest(requestId, role);
      // Refresh users list to show the newly approved user
      refetchUsers();
    } catch (error) {
      const apiError = error as { message?: string; status?: number };
      console.error("Failed to approve request:", apiError.message || error, "Status:", apiError.status);
      throw error; // Re-throw so the modal can show an error state
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectRequest(requestId);
    } catch (error) {
      const apiError = error as { message?: string; status?: number };
      console.error("Failed to reject request:", apiError.message || error, "Status:", apiError.status);
      throw error; // Re-throw so the modal can show an error state
    }
  };

  // Ensure data is always an array
  const usersArray = Array.isArray(users) ? users : [];
  const invitationsArray = Array.isArray(invitations) ? invitations : [];
  const requestsArray = Array.isArray(registrationRequests) ? registrationRequests : [];

  const renderTabContent = () => {
    switch (activeTab) {
      case "users":
        return (
          <UsersTab
            users={usersArray}
            loading={usersLoading}
            currentUserRole={currentUserRole}
            onEditUser={handleEditUser}
          />
        );
      case "invitations":
        return (
          <InvitationsTab
            invitations={invitationsArray}
            loading={invitationsLoading}
            onInviteUser={() => setIsInviteModalOpen(true)}
            onResendInvitation={handleResendInvitation}
            onDeleteInvitation={handleDeleteInvitation}
          />
        );
      case "registrationRequests":
        return (
          <RegistrationRequestsTab
            requests={requestsArray}
            loading={requestsLoading}
            lastUpdated={requestsLastUpdated}
            onRefresh={refetchRequests}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t("subtitle")}
        </p>
      </div>

      <div className="mb-8">
        <TabNavState
          tabs={tabs}
          activeTab={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
        />
      </div>

      {renderTabContent()}

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={handleInviteUser}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        user={editingUser}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleUpdateUser}
      />
    </div>
  );
}

