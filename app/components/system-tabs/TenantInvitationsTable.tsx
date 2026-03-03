"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { systemApi } from "@/lib/api/client";
import type { Invitation, ApiError } from "@/lib/api/types";
import Table from "@/app/components/ui/Table";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";

interface TenantInvitationsTableProps {
  tenantId: string;
}

export default function TenantInvitationsTable({
  tenantId,
}: TenantInvitationsTableProps) {
  const t = useTranslations("systemSettings.tenantDetail");

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await systemApi.getTenantInvitations(tenantId);
      setInvitations(response.itemListElement || []);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage =
        apiError?.message || "Failed to fetch invitations";
      console.error("Failed to fetch invitations:", errorMessage);
      setError(errorMessage);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  if (loading) {
    return <LoadingSkeleton type="table" rows={5} />;
  }

  if (error) {
    return <Alert type="error" title="Error" message={error} />;
  }

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.dateAccepted) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
          {t("accepted")}
        </span>
      );
    }
    if (invitation.dateDeclined) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
          {t("declined")}
        </span>
      );
    }
    if (invitation.isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300">
          {t("expired")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
        {t("pending")}
      </span>
    );
  };

  const getUserType = (invitation: Invitation) => {
    const userType = invitation.object?.employmentType || "employee";
    return userType === "guest" ? t("guest") : t("employee");
  };

  return (
    <div className="space-y-4">
      <Table
        columns={[
          {
            key: "email",
            header: t("emailColumn"),
            cell: (invitation: Invitation) => (
              <span className="text-sm text-gray-900 dark:text-white">
                {invitation.recipient.email}
              </span>
            ),
          },
          {
            key: "type",
            header: t("typeColumn"),
            cell: (invitation: Invitation) => (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getUserType(invitation) === t("guest")
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                }`}
              >
                {getUserType(invitation)}
              </span>
            ),
          },
          {
            key: "role",
            header: t("roleColumn"),
            cell: (invitation: Invitation) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {invitation.role}
              </span>
            ),
          },
          {
            key: "status",
            header: t("statusColumn"),
            cell: (invitation: Invitation) => getStatusBadge(invitation),
          },
          {
            key: "sentBy",
            header: t("sentByColumn"),
            cell: (invitation: Invitation) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {invitation.agent.name}
              </span>
            ),
          },
          {
            key: "dateCreated",
            header: t("dateCreatedColumn"),
            cell: (invitation: Invitation) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(invitation.dateCreated).toLocaleDateString()}
              </span>
            ),
          },
        ]}
        data={invitations}
        keyExtractor={(invitation) => invitation.identifier}
        emptyMessage={t("noInvitations")}
      />
    </div>
  );
}
