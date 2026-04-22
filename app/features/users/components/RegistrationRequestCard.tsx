"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { RegistrationRequest } from "@/lib/api/types";
import ProcessRegistrationRequestModal from "@/app/components/modals/ProcessRegistrationRequestModal";
import type { ProcessAction, ApproveRequestData } from "@/app/components/modals/ProcessRegistrationRequestModal";

interface RegistrationRequestCardProps {
  request: RegistrationRequest;
  onApprove: (requestId: string, data: ApproveRequestData) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}

export default function RegistrationRequestCard({
  request,
  onApprove,
  onReject,
}: RegistrationRequestCardProps) {
  const t = useTranslations("usersPage.registrationRequests");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<ProcessAction>("approve");

  const isPending = request.actionStatus === "PotentialActionStatus";

  const handleOpenModal = (action: ProcessAction) => {
    setModalAction(action);
    setIsModalOpen(true);
  };

  const handleConfirm = async (data?: ApproveRequestData) => {
    if (modalAction === "approve" && data) {
      await onApprove(request.identifier, data);
    } else if (modalAction === "reject") {
      await onReject(request.identifier);
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="relative flex flex-col gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md hover:shadow-xl dark:shadow-gray-900/50 dark:hover:shadow-gray-900/70 transition-all duration-200 hover:-translate-y-1">
        {/* Email and Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
            {request.agent.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {request.agent.email}
          </p>
        </div>

        {/* Actions - alleen voor pending */}
        {isPending && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => handleOpenModal("approve")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-xs font-medium"
              title={t("approve")}
            >
              <CheckIcon className="w-4 h-4" />
              {t("approve")}
            </button>
            <button
              onClick={() => handleOpenModal("reject")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xs font-medium"
              title={t("reject")}
            >
              <XMarkIcon className="w-4 h-4" />
              {t("reject")}
            </button>
          </div>
        )}

        {/* Status badge voor non-pending */}
        {!isPending && (
          <span className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg text-xs font-medium ${
            request.actionStatus === "CompletedActionStatus"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {request.actionStatus === "CompletedActionStatus" ? t("statuses.approved") : t("statuses.rejected")}
          </span>
        )}
      </div>

      <ProcessRegistrationRequestModal
        isOpen={isModalOpen}
        action={modalAction}
        userName={request.agent.name}
        userEmail={request.agent.email}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
