"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormCheckbox from "@/app/components/ui/FormCheckbox";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { formatRoleName } from "@/lib/utils/roleFormatter";
import { systemTenantsApi } from "@/lib/api/system";

// Default restricted permissions for new tenants (backend auto-adds manage_guest_roles & manage_settings)
const DEFAULT_RESTRICTED_PERMISSIONS = [
  PERMISSIONS.CREATE_PROJECTS,
  PERMISSIONS.DELETE_PROJECTS,
];

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, adminEmail: string, maxProjects: number, maxUsers: number, restrictedPermissions: string[]) => Promise<void>;
}

export default function CreateTenantModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateTenantModalProps) {
  const t = useTranslations("systemSettings.createOrganisationModal");
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [maxProjects, setMaxProjects] = useState<number | "">("");
  const [maxUsers, setMaxUsers] = useState<number | "">("");
  const [restrictedPermissions, setRestrictedPermissions] = useState<string[]>(DEFAULT_RESTRICTED_PERMISSIONS);
  const [selectablePermissions, setSelectablePermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Fetch selectable permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setAdminEmail("");
      setMaxProjects("");
      setMaxUsers("");
      setRestrictedPermissions(DEFAULT_RESTRICTED_PERMISSIONS);

      // Fetch selectable permissions
      const fetchPermissions = async () => {
        setLoadingPermissions(true);
        try {
          const response = await systemTenantsApi.getSelectablePermissions();
          setSelectablePermissions(response.itemListElement);
        } catch (error) {
          console.error("Failed to fetch selectable permissions:", error);
          // Fallback to empty array on error
          setSelectablePermissions([]);
        } finally {
          setLoadingPermissions(false);
        }
      };

      fetchPermissions();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    // Form validation will ensure these are filled (required fields)
    if (maxProjects === "" || maxUsers === "") {
      return;
    }

    await onSubmit(name, adminEmail, maxProjects, maxUsers, restrictedPermissions);
    setName("");
    setAdminEmail("");
    setMaxProjects("");
    setMaxUsers("");
    setRestrictedPermissions(DEFAULT_RESTRICTED_PERMISSIONS);
  };

  const handlePermissionToggle = (permission: string) => {
    setRestrictedPermissions((prev) => {
      if (prev.includes(permission)) {
        return prev.filter((p) => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="create-tenant-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      submitLabel={t("create")}
      errorFallbackMessage={t("error")}
      size="lg"
    >
      <FormInput
        id="organisation-name"
        type="text"
        label={t("name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("namePlaceholder")}
        required
      />

      <FormInput
        id="admin-email"
        type="email"
        label={t("adminEmail")}
        value={adminEmail}
        onChange={(e) => setAdminEmail(e.target.value)}
        placeholder={t("adminEmailPlaceholder")}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          id="max-projects"
          type="number"
          label={t("maxProjects")}
          value={maxProjects}
          onChange={(e) => setMaxProjects(e.target.value ? Number(e.target.value) : "")}
          placeholder={t("maxProjectsPlaceholder")}
          min={1}
          required
        />

        <FormInput
          id="max-users"
          type="number"
          label={t("maxUsers")}
          value={maxUsers}
          onChange={(e) => setMaxUsers(e.target.value ? Number(e.target.value) : "")}
          placeholder={t("maxUsersPlaceholder")}
          min={1}
          required
        />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("restrictedPermissions")}
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            ({restrictedPermissions.length} {t("restricted")})
          </span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("restrictedPermissionsHint")}
        </p>

        <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          {loadingPermissions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
            </div>
          ) : selectablePermissions.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              {t("noPermissionsAvailable")}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectablePermissions.map((permission: string) => (
                <FormCheckbox
                  key={permission}
                  id={`permission-${permission}`}
                  label={formatRoleName(permission)}
                  checked={restrictedPermissions.includes(permission)}
                  onChange={() => handlePermissionToggle(permission)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
