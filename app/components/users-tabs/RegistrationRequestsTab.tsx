"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CheckIcon, XMarkIcon, UserIcon, ClipboardDocumentIcon, LinkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import type { RegistrationRequest } from "@/lib/api/types";
import { getStatusBadgeColor } from "@/lib/utils/badges";
import ProcessRegistrationRequestModal, {
  type ProcessAction,
} from "@/app/components/modals/ProcessRegistrationRequestModal";
import { useTenant } from "@/app/context/TenantContext";

interface RegistrationRequestsTabProps {
  requests: RegistrationRequest[];
  loading?: boolean;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  onApproveRequest?: (requestId: string, role: string) => Promise<void>;
  onRejectRequest?: (requestId: string) => Promise<void>;
}

// Convert backend actionStatus to frontend status key
function getStatusKey(request: RegistrationRequest): "pending" | "approved" | "rejected" {
  switch (request.actionStatus) {
    case "CompletedActionStatus":
      return "approved";
    case "FailedActionStatus":
      return "rejected";
    case "PotentialActionStatus":
    default:
      return "pending";
  }
}

// Generate a URL-friendly slug from the tenant name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function RegistrationRequestsTab({
  requests,
  loading = false,
  lastUpdated,
  onRefresh,
  onApproveRequest,
  onRejectRequest,
}: RegistrationRequestsTabProps) {
  const t = useTranslations("usersPage.registrationRequests");
  const { tenantName } = useTenant();
  const locale = useLocale();
  const [modal, setModal] = useState<{
    isOpen: boolean;
    action: ProcessAction;
    request: RegistrationRequest | null;
  }>({ isOpen: false, action: "approve", request: null });
  const [linkCopied, setLinkCopied] = useState(false);

  const pendingCount = requests.filter(
    (req) => req.actionStatus === "PotentialActionStatus"
  ).length;

  // Generate the registration link
  const tenantSlug = tenantName ? generateSlug(tenantName) : "";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const registrationLink = tenantSlug ? `${baseUrl}/${locale}/register/${tenantSlug}` : "";

  const handleCopyLink = async () => {
    if (registrationLink) {
      await navigator.clipboard.writeText(registrationLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleOpenModal = (action: ProcessAction, request: RegistrationRequest) => {
    setModal({ isOpen: true, action, request });
  };

  const handleCloseModal = () => {
    setModal({ isOpen: false, action: "approve", request: null });
  };

  const handleConfirm = async (role?: string) => {
    if (!modal.request) return;

    const requestId = String(modal.request.identifier);
    if (modal.action === "approve" && role) {
      await onApproveRequest?.(requestId, role);
    } else if (modal.action === "reject") {
      await onRejectRequest?.(requestId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
              <div className="animate-pulse flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/5"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t("lastUpdated")}: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-all"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
      </div>

      {/* Shareable Registration Link */}
      {registrationLink && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <LinkIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                {t("shareableLink.title")}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                {t("shareableLink.description")}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                  {registrationLink}
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all flex-shrink-0 ${
                    linkCopied
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      {t("shareableLink.linkCopied")}
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      {t("shareableLink.copyLink")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t("pendingAlert", { count: pendingCount })}
          </p>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {requests.map((request) => {
          const statusKey = getStatusKey(request);
          return (
            <div
              key={request.identifier}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {request.agent.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {request.agent.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {t("requestedAt")}: {new Date(request.dateCreated).toLocaleString()}
                    </p>
                    {request.processedBy && statusKey !== "pending" && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {t(`processedBy.${statusKey}`)}: {request.processedBy.email}
                        {request.processedAt && (
                          <span> ({new Date(request.processedAt).toLocaleString()})</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 mt-4 sm:mt-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(statusKey)}`}>
                    {t(`statuses.${statusKey}`)}
                  </span>
                  {statusKey === "pending" && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleOpenModal("approve", request)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all"
                      >
                        <CheckIcon className="w-4 h-4" />
                        {t("approve")}
                      </button>
                      <button
                        onClick={() => handleOpenModal("reject", request)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-all"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        {t("reject")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            {t("noRequests")}
          </div>
        )}
      </div>

      <ProcessRegistrationRequestModal
        isOpen={modal.isOpen}
        action={modal.action}
        userName={modal.request?.agent.name || ""}
        userEmail={modal.request?.agent.email || ""}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
