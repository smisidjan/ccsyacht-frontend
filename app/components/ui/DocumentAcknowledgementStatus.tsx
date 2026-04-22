"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon as CheckCircleSolid,
  XCircleIcon as XCircleSolid,
} from "@heroicons/react/24/solid";
import Tooltip from "@/app/components/ui/Tooltip";
import { normalizeAcknowledgements } from "@/lib/utils/typeNormalization";
import type { DocumentAcknowledgement, DocumentStatus } from "@/lib/api/types";

interface DocumentAcknowledgementStatusProps {
  acknowledgements?: DocumentAcknowledgement[];
  totalRequired?: number;
  showStatusBadge?: boolean;
  showProgress?: boolean;
  showIndividual?: boolean;
  compact?: boolean;
  className?: string;
}

export default function DocumentAcknowledgementStatus({
  acknowledgements = [],
  totalRequired = 0,
  showStatusBadge = true,
  showProgress = true,
  showIndividual = true,
  compact = false,
  className = "",
}: DocumentAcknowledgementStatusProps) {
  const t = useTranslations("projectDetail.documents.acknowledgements");

  // Normalize acknowledgements to handle both array and object formats from API
  const normalizedAcks = useMemo(
    () => normalizeAcknowledgements(acknowledgements),
    [acknowledgements]
  );

  // Calculate counts
  const counts = useMemo(() => {
    const agreed = normalizedAcks.filter(a => a.hasAgreed === true).length;
    const disagreed = normalizedAcks.filter(a => a.hasAgreed === false).length;
    const pending = totalRequired - agreed - disagreed;

    return { agreed, disagreed, pending, total: totalRequired };
  }, [normalizedAcks, totalRequired]);

  // Determine document status
  const status: DocumentStatus = useMemo(() => {
    if (totalRequired === 0) return "draft";
    if (counts.disagreed > 0) return "disputed";
    if (counts.agreed === totalRequired) return "active";
    return "pending_review";
  }, [counts, totalRequired]);

  // Status badge configuration
  const statusConfig = useMemo(() => {
    switch (status) {
      case "active":
        return {
          label: t("status.active"),
          icon: ShieldCheckIcon,
          bgColor: "bg-green-100 dark:bg-green-900/30",
          textColor: "text-green-700 dark:text-green-400",
          borderColor: "border-green-200 dark:border-green-800",
        };
      case "disputed":
        return {
          label: t("status.disputed"),
          icon: ExclamationTriangleIcon,
          bgColor: "bg-red-100 dark:bg-red-900/30",
          textColor: "text-red-700 dark:text-red-400",
          borderColor: "border-red-200 dark:border-red-800",
        };
      case "pending_review":
        return {
          label: t("status.pendingReview"),
          icon: DocumentCheckIcon,
          bgColor: "bg-amber-100 dark:bg-amber-900/30",
          textColor: "text-amber-700 dark:text-amber-400",
          borderColor: "border-amber-200 dark:border-amber-800",
        };
      default:
        return {
          label: t("status.draft"),
          icon: ClockIcon,
          bgColor: "bg-gray-100 dark:bg-gray-700",
          textColor: "text-gray-600 dark:text-gray-400",
          borderColor: "border-gray-200 dark:border-gray-600",
        };
    }
  }, [status, t]);

  // Find pending users (required but not yet acknowledged)
  const pendingUsers = useMemo(() => {
    const acknowledgedIds = new Set(normalizedAcks.map(a => a.identifier));
    // This would need the full list of required users from props
    // For now, we'll show based on the count
    return counts.pending;
  }, [normalizedAcks, counts.pending]);

  if (totalRequired === 0) {
    return null; // No acknowledgements required
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Status Badge & Progress */}
      {(showStatusBadge || showProgress) && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Badge */}
          {showStatusBadge && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}
            >
              <statusConfig.icon className="w-3.5 h-3.5" />
              {statusConfig.label}
            </span>
          )}

          {/* Progress */}
          {showProgress && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                {counts.agreed > 0 && (
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircleSolid className="w-3.5 h-3.5" />
                    {counts.agreed}
                  </span>
                )}
                {counts.disagreed > 0 && (
                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                    <XCircleSolid className="w-3.5 h-3.5" />
                    {counts.disagreed}
                  </span>
                )}
                {counts.pending > 0 && (
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {counts.pending}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                / {counts.total}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Individual Acknowledgements */}
      {showIndividual && normalizedAcks.length > 0 && (
        <div className={`flex items-center gap-1.5 flex-wrap ${compact ? "" : "mt-2"}`}>
          {normalizedAcks.map((ack, idx) => {
            // Handle both nested agent structure and flat structure
            const ackId = ack.agent?.identifier || ack.identifier;
            const ackName = ack.agent?.name || ack.name;
            return (
              <Tooltip
                key={ackId || idx}
                content={
                  ack.hasAgreed === false && ack.disagreementReason
                    ? `${ackName}\n${t("disagreedReason")}: ${ack.disagreementReason}`
                    : ack.hasAgreed === true
                    ? `${ackName}\n${t("agreed")}`
                    : `${ackName}\n${t("pending")}`
                }
                position="top"
                multiline
              >
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-default transition-transform hover:scale-105 ${
                    ack.hasAgreed === true
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : ack.hasAgreed === false
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {ack.hasAgreed === true ? (
                    <CheckCircleIcon className="w-3 h-3" />
                  ) : ack.hasAgreed === false ? (
                    <XCircleIcon className="w-3 h-3" />
                  ) : (
                    <ClockIcon className="w-3 h-3" />
                  )}
                  <span className="truncate max-w-[80px]">{ackName}</span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Compact version for table cells
export function DocumentStatusBadge({
  status,
  className = "",
}: {
  status: DocumentStatus;
  className?: string;
}) {
  const t = useTranslations("projectDetail.documents.acknowledgements.status");

  const config = useMemo(() => {
    switch (status) {
      case "active":
        return {
          label: t("active"),
          icon: ShieldCheckIcon,
          bgColor: "bg-green-100 dark:bg-green-900/30",
          textColor: "text-green-700 dark:text-green-400",
        };
      case "disputed":
        return {
          label: t("disputed"),
          icon: ExclamationTriangleIcon,
          bgColor: "bg-red-100 dark:bg-red-900/30",
          textColor: "text-red-700 dark:text-red-400",
        };
      case "pending_review":
        return {
          label: t("pendingReview"),
          icon: DocumentCheckIcon,
          bgColor: "bg-amber-100 dark:bg-amber-900/30",
          textColor: "text-amber-700 dark:text-amber-400",
        };
      default:
        return {
          label: t("draft"),
          icon: ClockIcon,
          bgColor: "bg-gray-100 dark:bg-gray-700",
          textColor: "text-gray-600 dark:text-gray-400",
        };
    }
  }, [status, t]);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      <config.icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// Helper function to calculate document status
export function calculateDocumentStatus(
  acknowledgements: DocumentAcknowledgement[] | unknown = [],
  totalRequired: number = 0
): DocumentStatus {
  if (totalRequired === 0) return "draft";

  // Normalize in case API returns object instead of array
  const normalized = normalizeAcknowledgements(acknowledgements);
  const agreed = normalized.filter(a => a.hasAgreed === true).length;
  const disagreed = normalized.filter(a => a.hasAgreed === false).length;

  if (disagreed > 0) return "disputed";
  if (agreed === totalRequired) return "active";
  return "pending_review";
}
