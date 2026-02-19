"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, ArrowPathIcon, TrashIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import type { Invitation } from "@/lib/api/types";
import DeleteInvitationModal from "@/app/components/modals/DeleteInvitationModal";
import Button from "@/app/components/ui/Button";
import Toast from "@/app/components/ui/Toast";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import EmptyState from "@/app/components/ui/EmptyState";

interface InvitationsTabProps {
  invitations: Invitation[];
  loading?: boolean;
  onInviteUser?: () => void;
  onResendInvitation?: (invitationId: string) => Promise<void>;
  onDeleteInvitation?: (invitationId: string) => Promise<void>;
}

// Convert backend actionStatus to frontend status key
function getStatusKey(invitation: Invitation): "pending" | "accepted" | "declined" | "expired" {
  if (invitation.isExpired) return "expired";
  switch (invitation.actionStatus) {
    case "CompletedActionStatus":
      return "accepted";
    case "FailedActionStatus":
      return "declined";
    case "PotentialActionStatus":
    default:
      return "pending";
  }
}

export default function InvitationsTab({
  invitations,
  loading = false,
  onInviteUser,
  onResendInvitation,
  onDeleteInvitation,
}: InvitationsTabProps) {
  const t = useTranslations("usersPage.invitations");
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

  const pendingCount = invitations.filter(
    (inv) => !inv.isExpired && inv.actionStatus === "PotentialActionStatus"
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

  // Check if invitation can be deleted (only pending invitations)
  const canDelete = (invitation: Invitation) => {
    return (
      invitation.actionStatus === "PotentialActionStatus" &&
      !invitation.isExpired
    );
  };

  const getStatusBadgeColor = (statusKey: string) => {
    switch (statusKey) {
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "accepted":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "declined":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "expired":
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  if (loading) {
    return <LoadingSkeleton type="list" rows={3} showButton />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <Toast
          type={notification.type}
          message={notification.message}
          onClose={dismissNotification}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle", { pending: pendingCount })}
          </p>
        </div>
        <Button onClick={onInviteUser}>
          <PlusIcon className="w-4 h-4" />
          {t("inviteUser")}
        </Button>
      </div>

      {/* Invitations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("email")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("role")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("status")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("sentBy")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("sentAt")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {invitations.map((invitation) => {
              const statusKey = getStatusKey(invitation);
              return (
                <tr key={invitation.identifier} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {invitation.recipient.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {invitation.role || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(statusKey)}`}>
                      {t(`statuses.${statusKey}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {invitation.agent?.email || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {invitation.dateCreated
                      ? new Date(invitation.dateCreated).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {(statusKey === "pending" || statusKey === "expired") && (
                        <button
                          onClick={() => handleResend(String(invitation.identifier))}
                          disabled={resendingId === String(invitation.identifier)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t("resend")}
                        >
                          <ArrowPathIcon className={`w-5 h-5 ${resendingId === String(invitation.identifier) ? "animate-spin" : ""}`} />
                        </button>
                      )}
                      {canDelete(invitation) && (
                        <button
                          onClick={() => handleDeleteClick(invitation)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title={t("delete")}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {invitations.length === 0 && (
          <EmptyState
            icon={<EnvelopeIcon className="w-6 h-6" />}
            description={t("noInvitations")}
          />
        )}
      </div>

      <DeleteInvitationModal
        isOpen={deleteModal.isOpen}
        email={deleteModal.email}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
