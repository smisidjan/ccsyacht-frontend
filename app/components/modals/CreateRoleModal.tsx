"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormSelect from "@/app/components/ui/FormSelect";
import FormCheckbox from "@/app/components/ui/FormCheckbox";
import { systemApi } from "@/lib/api/system";
import type { CreateTenantRoleRequest } from "@/lib/api/types";
import { formatRoleName } from "@/lib/utils/roleFormatter";

interface CreateRoleModalProps {
  isOpen: boolean;
  tenantId: string;
  onClose: () => void;
  onSubmit: (data: CreateTenantRoleRequest) => Promise<void>;
  isCcsYacht?: boolean;
}

export default function CreateRoleModal({
  isOpen,
  tenantId,
  onClose,
  onSubmit,
  isCcsYacht = false,
}: CreateRoleModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.roles.createModal");

  const [formData, setFormData] = useState<CreateTenantRoleRequest>({
    name: "",
    type: "employee",
    permissions: [],
  });

  const [roleTypes, setRoleTypes] = useState<string[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch role types and permissions when modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !tenantId) return;

      setLoadingData(true);
      try {
        const [typesResponse, permissionsResponse] = await Promise.all([
          systemApi.getTenantRoleTypes(tenantId),
          systemApi.getTenantPermissions(tenantId),
        ]);

        setRoleTypes(typesResponse.itemListElement || []);

        let permissions = permissionsResponse.itemListElement || [];
        // For CCS Yacht tenant, include the alwaysRestricted permissions
        if (isCcsYacht && permissionsResponse.metadata?.alwaysRestricted) {
          permissions = [...permissions, ...permissionsResponse.metadata.alwaysRestricted];
        }

        setAvailablePermissions(permissions);
      } catch (err) {
        console.error("Failed to fetch role data:", err);
        setRoleTypes([]);
        setAvailablePermissions([]);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isOpen, tenantId, isCcsYacht]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        type: "employee",
        permissions: [],
      });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const handlePermissionToggle = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleToggleAll = () => {
    const allSelected = formData.permissions.length === availablePermissions.length;
    setFormData((prev) => ({
      ...prev,
      permissions: allSelected ? [] : [...availablePermissions],
    }));
  };

  const allSelected = formData.permissions.length === availablePermissions.length;

  const roleTypeOptions = roleTypes.map((type) => ({
    value: type,
    label: formatRoleName(type),
  }));

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="create-role-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      submitLabel={t("create")}
      errorFallbackMessage={t("error")}
      size="lg"
    >
      <FormInput
        id="role-name"
        type="text"
        label={t("roleName")}
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder={t("roleNamePlaceholder")}
        required
      />

      <FormSelect
        id="role-type"
        label={t("roleType")}
        value={formData.type}
        onChange={(e) => setFormData({ ...formData, type: e.target.value as "employee" | "guest" })}
        options={roleTypeOptions}
        required
        disabled={loadingData}
      />

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("permissions")}
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              ({formData.permissions.length} {t("selected")})
            </span>
          </label>

          {!loadingData && availablePermissions.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {allSelected ? t("deselectAll") : t("selectAll")}
            </button>
          )}
        </div>

        {loadingData ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t("loadingPermissions")}
          </div>
        ) : availablePermissions.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t("noPermissions")}
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availablePermissions.map((permission) => (
                <FormCheckbox
                  key={permission}
                  id={`create-permission-${permission}`}
                  label={formatRoleName(permission)}
                  checked={formData.permissions.includes(permission)}
                  onChange={() => handlePermissionToggle(permission)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("hint")}
        </p>
      </div>
    </BaseModal>
  );
}
