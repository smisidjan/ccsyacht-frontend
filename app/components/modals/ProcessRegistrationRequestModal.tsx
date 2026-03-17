"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormSelect from "@/app/components/ui/FormSelect";
import FormInput from "@/app/components/ui/FormInput";
import FormRadioGroup from "@/app/components/ui/FormRadioGroup";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useRoles } from "@/lib/api";
import { formatRoleName } from "@/lib/utils/roleFormatter";

export type ProcessAction = "approve" | "reject";

export interface ApproveRequestData {
  role: string;
  employmentType: "employee" | "guest";
  homeOrganization?: string;
}

interface ProcessRegistrationRequestModalProps {
  isOpen: boolean;
  action: ProcessAction;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onConfirm: (data?: ApproveRequestData) => Promise<void>;
}

export default function ProcessRegistrationRequestModal({
  isOpen,
  action,
  userName,
  userEmail,
  onClose,
  onConfirm,
}: ProcessRegistrationRequestModalProps) {
  const t = useTranslations("usersPage.processRequestModal");
  const [employmentType, setEmploymentType] = useState<"employee" | "guest">("employee");
  const [selectedRole, setSelectedRole] = useState("");
  const [homeOrganization, setHomeOrganization] = useState("");

  // Fetch roles based on employment type
  const { data: employeeRoles } = useRoles("employee");
  const { data: guestRoles } = useRoles("guest");
  const availableRoles = employmentType === "guest" ? guestRoles : employeeRoles;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmploymentType("employee");
      setSelectedRole("");
      setHomeOrganization("");
    }
  }, [isOpen]);

  // Set default role when roles are loaded or employment type changes
  useEffect(() => {
    if (availableRoles && availableRoles.length > 0) {
      setSelectedRole(availableRoles[0].name);
    }
  }, [availableRoles]);

  const isApprove = action === "approve";

  const handleSubmit = async () => {
    if (isApprove) {
      const data: ApproveRequestData = {
        role: selectedRole,
        employmentType,
      };

      // Add home organization for guests
      if (employmentType === "guest" && homeOrganization.trim()) {
        data.homeOrganization = homeOrganization.trim();
      }

      await onConfirm(data);
    } else {
      await onConfirm(undefined);
    }
  };

  const roleOptions = (availableRoles || []).map((role) => ({
    value: role.name,
    label: formatRoleName(role.name),
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
      size="md"
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
          <div className="w-full text-left space-y-4">
            <FormRadioGroup
              id="employment-type"
              name="employmentType"
              label={t("employmentType")}
              value={employmentType}
              onChange={(value) => setEmploymentType(value as "employee" | "guest")}
              options={[
                { value: "employee", label: t("employee"), color: "blue" },
                { value: "guest", label: t("guest"), color: "purple" },
              ]}
            />

            <FormSelect
              id="role"
              label={t("selectRole")}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              options={roleOptions}
              required
            />

            {employmentType === "guest" && (
              <FormInput
                id="home-organization"
                type="text"
                label={t("homeOrganization")}
                value={homeOrganization}
                onChange={(e) => setHomeOrganization(e.target.value)}
                placeholder={t("homeOrganizationPlaceholder")}
                required
              />
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
