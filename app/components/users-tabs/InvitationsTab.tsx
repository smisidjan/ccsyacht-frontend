"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, ArrowPathIcon, TrashIcon, EnvelopeIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import type { Invitation, RegistrationRequest } from "@/lib/api/types";
import { getStatusBadgeColor } from "@/lib/utils/badges";
import { getInvitationStatusKey, canDeleteInvitation, canResendInvitation } from "@/lib/utils/status";
import DeleteInvitationModal from "@/app/components/modals/DeleteInvitationModal";
import RegistrationRequestCard from "./RegistrationRequestCard";
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
  onApproveRequest?: (requestId: string, role: string) => Promise<void>;
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

  const pendingCount = invitations.filter(
    (inv) => getInvitationStatusKey(inv) === "pending"
  ).length;

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

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
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
          <Button onClick={onInviteUser}>
            <PlusIcon className="w-4 h-4" />
            {t("inviteUser")}
          </Button>
        </div>

        {/* Invitations Content */}
        {!invitationsCollapsed && (
          <div>
            {invitations.length > 0 ? (
              <Table
                columns={columns}
                data={invitations}
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
      {registrationRequests.length > 0 && !requestsLoading && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("registrationRequests.title")} ({registrationRequests.filter(r => r.actionStatus === "PotentialActionStatus").length})
            </h3>
          </button>

          {/* Registration Requests Content */}
          {!requestsCollapsed && (
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {registrationRequests.map((request) => (
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

      <DeleteInvitationModal
        isOpen={deleteModal.isOpen}
        email={deleteModal.email}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
