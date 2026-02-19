"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import FormSelect from "@/app/components/ui/FormSelect";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export type ProcessAction = "approve" | "reject";

interface ProcessRegistrationRequestModalProps {
  isOpen: boolean;
  action: ProcessAction;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onConfirm: (role?: string) => Promise<void>;
}

const AVAILABLE_ROLES = [
  "user",
  "admin",
  "main user",
  "invitation manager",
  "yard",
  "surveyor",
  "painter",
  "owner representative",
];

export default function ProcessRegistrationRequestModal({
  isOpen,
  action,
  userName,
  userEmail,
  onClose,
  onConfirm,
}: ProcessRegistrationRequestModalProps) {
  const t = useTranslations("usersPage.processRequestModal");
  const [selectedRole, setSelectedRole] = useState("user");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRole("user");
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await onConfirm(action === "approve" ? selectedRole : undefined);
      onClose();
    } catch (err) {
      const apiError = err as { message?: string };
      setError(apiError.message || `Failed to ${action} request`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isApprove = action === "approve";

  const roleOptions = AVAILABLE_ROLES.map((role) => ({
    value: role,
    label: t(`roles.${role.replace(/ /g, "_")}`),
  }));

  const footer = (
    <div className="flex justify-end gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isProcessing}
      >
        {t("cancel")}
      </Button>
      <Button
        type="button"
        variant={isApprove ? "success" : "danger"}
        onClick={handleConfirm}
        loading={isProcessing}
      >
        {isProcessing
          ? t("processing")
          : isApprove
            ? t("approve")
            : t("reject")}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isApprove ? t("approveTitle") : t("rejectTitle")}
      footer={footer}
      size="sm"
    >
      <div className="flex flex-col items-center text-center">
        {error && <Alert type="error" message={error} className="w-full mb-4" />}

        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            isApprove
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-red-100 dark:bg-red-900/30"
          }`}
        >
          {isApprove ? (
            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          ) : (
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          )}
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-2">
          {isApprove ? t("approveMessage") : t("rejectMessage")}
        </p>

        <div className="mb-4">
          <p className="font-medium text-gray-900 dark:text-white">{userName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
        </div>

        {isApprove && (
          <div className="w-full text-left">
            <FormSelect
              id="role"
              label={t("selectRole")}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              options={roleOptions}
              required
              disabled={isProcessing}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
