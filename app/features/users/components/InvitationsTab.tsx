"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, ArrowPathIcon, TrashIcon, EnvelopeIcon, ChevronDownIcon, ChevronUpIcon, UserPlusIcon, ClockIcon } from "@heroicons/react/24/outline";
import type { Invitation, RegistrationRequest } from "@/lib/api/types";
import { getStatusBadgeColor } from "@/lib/utils/badges";
import { getInvitationStatusKey, canDeleteInvitation, canResendInvitation } from "@/lib/utils/status";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
import RegistrationRequestCard from "./RegistrationRequestCard";
import type { ApproveRequestData } from "./ProcessRegistrationRequestModal";
import Button from "@/app/components/ui/Button";
import Toast from "@/app/components/ui/Toast";
import Table from "@/app/components/ui/Table";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import EmptyState from "@/app/components/ui/EmptyState";

interface InvitationsTabProps {
  invitations: Invitation[];
  loading?: boolean;
  onInviteUser?: () => void;
  onResendInvitation?: (invitationId: string) => Promise<void>;
  onDeleteInvitation?: (invitationId: string) => Promise<void>;
  registrationRequests?: RegistrationRequest[];
  requestsLoading?: boolean;
  onRefreshRequests?: () => Promise<void>;
  onApproveRequest?: (requestId: string, data: ApproveRequestData) => Promise<void>;
  onRejectRequest?: (requestId: string) => Promise<void>;
}

export default function InvitationsTab({
  invitations,
  loading = false,
  onInviteUser,
  onResendInvitation,
  onDeleteInvitation,
  registrationRequests = [],
  requestsLoading = false,
  onRefreshRequests,
  onApproveRequest,
  onRejectRequest,
}: InvitationsTabProps) {
  const t = useTranslations("usersPage.invitations");
  const tDelete = useTranslations("usersPage.deleteInvitationModal");

  // Auto-refresh registration requests every 10 minutes
  useEffect(() => {
    if (!onRefreshRequests) return;

    const interval = setInterval(() => {
      onRefreshRequests();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [onRefreshRequests]);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    invitationId: string;
    email: string;
  }>({ isOpen: false, invitationId: "", email: "" });
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [invitationsCollapsed, setInvitationsCollapsed] = useState(false);
  const [requestsCollapsed, setRequestsCollapsed] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);

  // Active = still actionable; everything resolved (accepted/declined/expired,
  // approved/rejected) moves to the History section so it doesn't clutter the view.
  const activeInvitations = invitations.filter((inv) => getInvitationStatusKey(inv) === "pending");
  const historyInvitations = invitations.filter((inv) => getInvitationStatusKey(inv) !== "pending");

  const pendingRequests = registrationRequests.filter((r) => r.actionStatus === "PotentialActionStatus");
  const historyRequests = registrationRequests.filter((r) => r.actionStatus !== "PotentialActionStatus");

  const historyCount = historyInvitations.length + historyRequests.length;
  const pendingCount = activeInvitations.length;

  const handleDeleteClick = (invitation: Invitation) => {
    setDeleteModal({
      isOpen: true,
      invitationId: String(invitation.identifier),
      email: invitation.recipient.email,
    });
  };

  const handleDeleteConfirm = async () => {
    if (onDeleteInvitation) {
      await onDeleteInvitation(deleteModal.invitationId);
    }
  };

  const handleDeleteClose = () => {
    setDeleteModal({ isOpen: false, invitationId: "", email: "" });
  };

  const handleResend = async (invitationId: string) => {
    if (!onResendInvitation || resendingId) return;

    setResendingId(invitationId);
    setNotification(null);

    try {
      await onResendInvitation(invitationId);
      setNotification({ type: "success", message: t("resendSuccess") });
    } catch (err) {
      const errorMessage = (err as { message?: string })?.message || t("resendError");
      setNotification({ type: "error", message: errorMessage });
    } finally {
      setResendingId(null);
    }
  };

  const dismissNotification = () => setNotification(null);

  if (loading) {
    return <LoadingSkeleton type="list" rows={3} showButton />;
  }

  const columns = [
    {
      key: "email",
      header: t("email"),
      cell: (invitation: Invitation) => (
        <div className="flex items-center gap-3">
          <EnvelopeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
            {invitation.recipient.email}
          </span>
        </div>
      ),
    },
    {
      key: "role",
      header: t("role"),
      cell: (invitation: Invitation) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize whitespace-nowrap">
          {invitation.object?.roleName || invitation.role || "-"}
        </span>
      ),
    },
    {
      key: "type",
      header: t("typeColumn"),
      cell: (invitation: Invitation) => {
        const userType = invitation.object?.employmentType || "employee";
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
            userType === "guest"
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
          }`}>
            {userType === "guest" ? t("guest") : t("employee")}
          </span>
        );
      },
    },
    {
      key: "status",
      header: t("status"),
      cell: (invitation: Invitation) => {
        const statusKey = getInvitationStatusKey(invitation);
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(statusKey)}`}>
            {t(`statuses.${statusKey}`)}
          </span>
        );
      },
    },
    {
      key: "sentBy",
      header: t("sentBy"),
      cell: (invitation: Invitation) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {invitation.agent?.email || "-"}
        </span>
      ),
    },
    {
      key: "sentAt",
      header: t("sentAt"),
      cell: (invitation: Invitation) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {invitation.dateCreated
            ? new Date(invitation.dateCreated).toLocaleString()
            : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      headerClassName: "text-right",
      className: "text-right",
      cell: (invitation: Invitation) => (
        <div className="flex items-center justify-end gap-2">
          {canResendInvitation(invitation) && (
            <button
              onClick={() => handleResend(String(invitation.identifier))}
              disabled={resendingId === String(invitation.identifier)}
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={t("resend")}
            >
              <ArrowPathIcon className={`w-5 h-5 ${resendingId === String(invitation.identifier) ? "animate-spin" : ""}`} />
            </button>
          )}
          {canDeleteInvitation(invitation) && (
            <button
              onClick={() => handleDeleteClick(invitation)}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title={t("delete")}
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {notification && (
        <Toast
          type={notification.type}
          message={notification.message}
          onClose={dismissNotification}
        />
      )}

      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />

        {/* Invitations Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setInvitationsCollapsed(!invitationsCollapsed)}
            className="flex items-center gap-3 flex-1 text-left group"
          >
            <div className="flex items-center gap-3">
              {invitationsCollapsed ? (
                <ChevronDownIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              ) : (
                <ChevronUpIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              )}
              <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <EnvelopeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t("title")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t("subtitle", { pending: pendingCount })}
                </p>
              </div>
            </div>
          </button>
          <Button
            size="sm"
            className="flex-shrink-0 whitespace-nowrap sm:py-3 sm:px-5 sm:text-base"
            onClick={onInviteUser}
          >
            <PlusIcon className="w-4 h-4" />
            {t("inviteUser")}
          </Button>
        </div>

        {/* Invitations Content */}
        {!invitationsCollapsed && (
          <div>
            {activeInvitations.length > 0 ? (
              <Table
                columns={columns}
                data={activeInvitations}
                keyExtractor={(invitation) => String(invitation.identifier)}
                minWidth="700px"
              />
            ) : (
              <EmptyState
                icon={<EnvelopeIcon className="w-6 h-6" />}
                description={t("noInvitations")}
              />
            )}
          </div>
        )}
      </div>

      {/* Registration Requests Section */}
      {pendingRequests.length > 0 && !requestsLoading && (
        <div className="relative mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />

          {/* Registration Requests Header */}
          <button
            onClick={() => setRequestsCollapsed(!requestsCollapsed)}
            className="flex items-center gap-3 w-full p-4 text-left group border-b border-gray-200 dark:border-gray-700"
          >
            {requestsCollapsed ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            ) : (
              <ChevronUpIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            )}
            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <UserPlusIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("registrationRequests.title")} ({pendingRequests.length})
            </h3>
          </button>

          {/* Registration Requests Content */}
          {!requestsCollapsed && (
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {pendingRequests.map((request) => (
                  <RegistrationRequestCard
                    key={request.identifier}
                    request={request}
                    onApprove={onApproveRequest || (async () => {})}
                    onReject={onRejectRequest || (async () => {})}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Section — resolved invitations & registration requests, collapsed by default */}
      {historyCount > 0 && (
        <div className="relative mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-400 to-gray-500" />

          <button
            onClick={() => setHistoryCollapsed(!historyCollapsed)}
            className="flex items-center gap-3 w-full p-4 text-left group"
          >
            {historyCollapsed ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            ) : (
              <ChevronUpIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            )}
            <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <ClockIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("history.title")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t("history.subtitle", { count: historyCount })}
              </p>
            </div>
          </button>

          {!historyCollapsed && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-gray-200 dark:border-gray-700">
              {historyInvitations.length > 0 && (
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {t("history.invitationsLabel")}
                  </h4>
                  <Table
                    columns={columns}
                    data={historyInvitations}
                    keyExtractor={(invitation) => String(invitation.identifier)}
                    minWidth="700px"
                  />
                </div>
              )}

              {historyRequests.length > 0 && (
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {t("history.requestsLabel")}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {historyRequests.map((request) => (
                      <RegistrationRequestCard
                        key={request.identifier}
                        request={request}
                        onApprove={onApproveRequest || (async () => {})}
                        onReject={onRejectRequest || (async () => {})}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {deleteModal.isOpen && (
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={handleDeleteClose}
          onConfirm={handleDeleteConfirm}
          title={tDelete("title")}
          message={tDelete("message")}
          successMessage={tDelete("success")}
          confirmLabel={tDelete("delete")}
          showIcon
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">{deleteModal.email}</span>
          </p>
        </DeleteConfirmModal>
      )}
    </div>
  );
}
