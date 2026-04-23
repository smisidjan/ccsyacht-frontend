"use client";

import {
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { DocumentStatusBadge, calculateDocumentStatus } from "@/app/components/ui/DocumentAcknowledgementStatus";
import { normalizeAcknowledgements } from "@/lib/utils/typeNormalization";
import type { Document } from "@/lib/api/types";

interface DocumentAcknowledgementsSummaryProps {
  documents: Document[];
}

export default function DocumentAcknowledgementsSummary({
  documents,
}: DocumentAcknowledgementsSummaryProps) {
  // Aggregate acknowledgements across all documents
  const allAcks = documents.flatMap((doc) =>
    normalizeAcknowledgements(doc.acknowledgements)
  );

  if (allAcks.length === 0) return null;

  const totalRequired = documents.reduce(
    (sum, doc) => sum + (doc.totalAssignees || doc.totalRequiredAcknowledgers || 0),
    0
  );
  const agreedCount = allAcks.filter((a) => a.hasAgreed === true).length;
  const disagreedCount = allAcks.filter((a) => a.hasAgreed === false).length;
  const pendingCount = totalRequired - agreedCount - disagreedCount;

  // Find disputed acknowledgements with reasons
  const disputedAcks = allAcks.filter(
    (a) => a.hasAgreed === false && a.disagreementReason
  );

  // Determine overall status
  const status =
    disagreedCount > 0
      ? "disputed"
      : agreedCount === totalRequired
      ? "active"
      : "pending_review";

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {/* Status & Progress */}
        <div className="flex items-center gap-3">
          <DocumentStatusBadge status={status} />
          <div className="flex items-center gap-2 text-xs">
            {agreedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                {agreedCount}
              </span>
            )}
            {disagreedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                <XMarkIcon className="w-3.5 h-3.5" />
                {disagreedCount}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <ClockIcon className="w-3.5 h-3.5" />
                {pendingCount}
              </span>
            )}
            <span className="text-gray-400">/ {totalRequired}</span>
          </div>
        </div>

        {/* Individual acknowledgement chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {allAcks.map((ack, idx) => {
            const ackId = ack.agent?.identifier || ack.identifier;
            const ackName = ack.agent?.name || ack.name;

            const chipClasses =
              ack.hasAgreed === true
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : ack.hasAgreed === false
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";

            const StatusIcon =
              ack.hasAgreed === true
                ? CheckCircleIcon
                : ack.hasAgreed === false
                ? XMarkIcon
                : ClockIcon;

            return (
              <span
                key={ackId || idx}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${chipClasses}`}
              >
                <StatusIcon className="w-3 h-3" />
                {ackName}
              </span>
            );
          })}
        </div>
      </div>

      {/* Disputed reasons - shown separately for clarity */}
      {disputedAcks.length > 0 && (
        <div className="mt-2 space-y-1">
          {disputedAcks.map((ack, idx) => {
            const ackName = ack.agent?.name || ack.name;
            return (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs bg-red-50 dark:bg-red-900/20 rounded-lg px-2.5 py-1.5"
              >
                <XMarkIcon className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-red-700 dark:text-red-400">
                    {ackName}:
                  </span>
                  <span className="text-red-600 dark:text-red-300 ml-1">
                    {ack.disagreementReason}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
