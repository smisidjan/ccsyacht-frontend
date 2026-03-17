"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useTenant } from "@/app/context/TenantContext";
import TabNavState from "@/app/components/ui/TabNavState";
import type { StateTab } from "@/app/components/ui/TabNavState";
import UsersTab from "@/app/components/users-tabs/UsersTab";
import InvitationsTab from "@/app/components/users-tabs/InvitationsTab";
import InviteUserModal from "@/app/components/modals/InviteUserModal";
import EditUserModal from "@/app/components/modals/EditUserModal";
import ProtectedRoute from "@/app/components/guards/ProtectedRoute";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import type { User, UpdateUserRequest, UserRole, CreateInvitationRequest } from "@/lib/api/types";
import {
  useUsers,
  useInvitations,
  useRegistrationRequests,
  useCurrentUser,
  registrationRequestsApi,
} from "@/lib/api";

type TabKey = "users" | "invitations";

export default function UsersPage() {
  const t = useTranslations("usersPage");
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // API hooks
  const { data: currentUser } = useCurrentUser();
  const { tenantName } = useTenant();
  const { data: users, loading: rawUsersLoading, updateUser, refetch: refetchUsers } = useUsers();
  const {
    data: invitations,
    loading: rawInvitationsLoading,
    createInvitation,
    resendInvitation,
    deleteInvitation,
  } = useInvitations();
  const {
    data: registrationRequests,
    loading: requestsLoading,
    refetch: refetchRequests,
    rejectRequest,
  } = useRegistrationRequests();

  // Wrap loading states with minimum time
  const usersLoading = useMinimumLoadingTime(rawUsersLoading);
  const invitationsLoading = useMinimumLoadingTime(rawInvitationsLoading);

  // Get current user role (default to 'user' if not loaded)
  const currentUserRoles = (currentUser as { roles?: string[] })?.roles || [];
  const currentUserRole = (currentUserRoles[0] as UserRole) || "user";

  // Check if user has invitation permissions
  const { hasPermission } = usePermission();
  const canViewInvitations = hasPermission(PERMISSIONS.CREATE_INVITATIONS);

  // Build tabs array based on permissions
  const tabs: StateTab[] = [
    { key: "users", label: t("tabs.users") },
    ...(canViewInvitations ? [{ key: "invitations", label: t("tabs.invitations") }] : []),
  ];

  // Reset active tab to "users" if user doesn't have invitation permissions
  useEffect(() => {
    if (!canViewInvitations && activeTab === "invitations") {
      setActiveTab("users");
    }
  }, [canViewInvitations, activeTab]);

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

  const handleInviteUser = async (data: CreateInvitationRequest) => {
    try {
      await createInvitation(data);
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

  const handleApproveRequest = async (requestId: string, data: { role: string; employmentType: "employee" | "guest"; homeOrganization?: string }) => {
    try {
      // Map the data to the backend API format
      const apiData: any = {
        action: "approve",
        role: data.role,
        employment_type: data.employmentType,
      };

      // Add home organization for guests
      if (data.employmentType === "guest" && data.homeOrganization) {
        apiData.home_organization_name = data.homeOrganization;
      }

      await registrationRequestsApi.process(requestId, apiData);

      // Refresh both registration requests and users list
      await refetchRequests();
      await refetchUsers();
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
            registrationRequests={requestsArray}
            requestsLoading={requestsLoading}
            onRefreshRequests={refetchRequests}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute permissions={PERMISSIONS.VIEW_USERS}>
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
          tenantName={tenantName || undefined}
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
    </ProtectedRoute>
  );
}

