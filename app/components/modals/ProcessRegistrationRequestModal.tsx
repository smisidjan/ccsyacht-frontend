"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormSelect from "@/app/components/ui/FormSelect";
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

  useEffect(() => {
    if (isOpen) {
      setSelectedRole("user");
    }
  }, [isOpen]);

  const isApprove = action === "approve";

  const handleSubmit = async () => {
    await onConfirm(isApprove ? selectedRole : undefined);
  };

  const roleOptions = AVAILABLE_ROLES.map((role) => ({
    value: role,
    label: t(`roles.${role.replace(/ /g, "_")}`),
  }));

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isApprove ? t("approveTitle") : t("rejectTitle")}
      onSubmit={handleSubmit}
      successMessage={isApprove ? t("approveSuccess") : t("rejectSuccess")}
      submitLabel={isApprove ? t("approve") : t("reject")}
      submitVariant={isApprove ? "success" : "danger"}
      size="sm"
    >
      <div className="flex flex-col items-center text-center">
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
            />
          </div>
        )}
      </div>
    </BaseModal>
  );
}
