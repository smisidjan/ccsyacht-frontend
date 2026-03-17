"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { LinkIcon, ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormSelect from "@/app/components/ui/FormSelect";
import FormRadioGroup from "@/app/components/ui/FormRadioGroup";
import Alert from "@/app/components/ui/Alert";
import type { CreateInvitationRequest } from "@/lib/api/types";
import { invitationsApi, useRoles } from "@/lib/api";
import { formatRoleName } from "@/lib/utils/roleFormatter";

export interface InviteUserFormData {
  email: string;
  role: string;
  employmentType: "employee" | "guest";
  homeOrganization?: string;
}

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInvitationRequest) => Promise<void>;
  tenantName?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function InviteUserModal({ isOpen, onClose, onSubmit, tenantName }: InviteUserModalProps) {
  const t = useTranslations("usersPage.inviteModal");
  const locale = useLocale();
  const [formData, setFormData] = useState<InviteUserFormData>({
    email: "",
    role: "",
    employmentType: "employee",
    homeOrganization: "",
  });
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch roles dynamically from API
  const { data: employeeRoles, loading: employeeRolesLoading } = useRoles("employee");
  const { data: guestRoles, loading: guestRolesLoading } = useRoles("guest");

  // Generate registration link
  const tenantSlug = tenantName ? generateSlug(tenantName) : "";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const registrationLink = tenantSlug ? `${baseUrl}/${locale}/register/${tenantSlug}` : "";

  // Debug logging
  console.log("InviteUserModal Debug:", {
    tenantName,
    tenantSlug,
    baseUrl,
    locale,
    registrationLink,
  });

  // Set default role when roles are loaded
  useEffect(() => {
    if (isOpen && employeeRoles && employeeRoles.length > 0 && !formData.role) {
      setFormData(prev => ({
        ...prev,
        role: employeeRoles[0].name,
      }));
    }
  }, [isOpen, employeeRoles, formData.role]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: "",
        role: employeeRoles?.[0]?.name || "",
        employmentType: "employee",
        homeOrganization: "",
      });
      setLinkCopied(false);
    }
  }, [isOpen, employeeRoles]);

  const handleCopyLink = async () => {
    if (!registrationLink) return;

    await navigator.clipboard.writeText(registrationLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSubmit = async () => {
    console.log("InviteUserModal - Form Data:", formData);

    // Validate home organization for guests
    if (formData.employmentType === "guest" && !formData.homeOrganization?.trim()) {
      console.log("Validation failed: Guest requires home organization");
      return;
    }

    const data: CreateInvitationRequest = {
      email: formData.email,
      role: formData.role,
      employment_type: formData.employmentType,
    };

    // Only add home_organization_name if user is a guest
    if (formData.employmentType === "guest") {
      data.home_organization_name = formData.homeOrganization;
    }

    console.log("InviteUserModal - Sending data to API:", data);
    await onSubmit(data);
    setFormData({
      email: "",
      role: "user",
      employmentType: "employee",
      homeOrganization: "",
    });
  };

  // Dynamic role options based on employment type
  const availableRoles = formData.employmentType === "guest"
    ? (guestRoles || [])
    : (employeeRoles || []);

  const roleOptions = availableRoles.map((role) => ({
    value: role.name,
    label: formatRoleName(role.name),
  }));

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="invite-user-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      submitLabel={t("sendInvitation")}
      errorFallbackMessage={t("error")}
      size="md"
    >
      {/* Registration Link Section */}
      {registrationLink && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <LinkIcon className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                {t("registrationLink.title")}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                {t("registrationLink.description")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded border border-blue-200 dark:border-blue-700 text-gray-900 dark:text-gray-100 truncate">
                  {registrationLink}
                </code>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all flex-shrink-0 ${
                    linkCopied
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      {t("registrationLink.copied")}
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      {t("registrationLink.copy")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <FormRadioGroup
        id="employment-type"
        name="employmentType"
        label={t("userType")}
        value={formData.employmentType}
        onChange={(value) => {
          const newType = value as "employee" | "guest";
          const newRoles = newType === "guest" ? (guestRoles || []) : (employeeRoles || []);
          setFormData({
            ...formData,
            employmentType: newType,
            role: newRoles[0]?.name || "" // Reset to first available role
          });
        }}
        options={[
          { value: "employee", label: t("employee"), color: "blue" },
          { value: "guest", label: t("guest"), color: "purple" },
        ]}
      />

      <FormInput
        id="email"
        type="email"
        label={t("email")}
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder={t("emailPlaceholder")}
        required
      />

      <FormSelect
        id="role"
        label={t("role")}
        value={formData.role}
        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        options={roleOptions}
        required
      />

      {formData.employmentType === "guest" && (
        <FormInput
          id="home-organization"
          type="text"
          label={t("homeOrganization")}
          value={formData.homeOrganization || ""}
          onChange={(e) => setFormData({ ...formData, homeOrganization: e.target.value })}
          placeholder={t("homeOrganizationPlaceholder")}
          hint={t("homeOrganizationHint")}
          required
        />
      )}

      <Alert type="info" message={t("infoText")} />
    </BaseModal>
  );
}
