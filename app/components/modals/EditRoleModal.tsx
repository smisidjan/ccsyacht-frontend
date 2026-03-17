"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormCheckbox from "@/app/components/ui/FormCheckbox";
import { systemApi } from "@/lib/api/client";
import type { TenantRole, UpdateTenantRoleRequest } from "@/lib/api/types";
import { formatRoleName } from "@/lib/utils/roleFormatter";

interface EditRoleModalProps {
  isOpen: boolean;
  tenantId: string;
  role: TenantRole | null;
  onClose: () => void;
  onSubmit: (roleId: string, data: UpdateTenantRoleRequest) => Promise<void>;
}

export default function EditRoleModal({
  isOpen,
  tenantId,
  role,
  onClose,
  onSubmit,
}: EditRoleModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.roles.editModal");

  const [formData, setFormData] = useState<UpdateTenantRoleRequest>({
    name: "",
    permissions: [],
  });

  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  // Fetch available permissions when modal opens
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!isOpen || !tenantId) return;

      setLoadingPermissions(true);
      try {
        const response = await systemApi.getTenantPermissions(tenantId);
        setAvailablePermissions(response.itemListElement || []);
      } catch (err) {
        console.error("Failed to fetch permissions:", err);
        setAvailablePermissions([]);
      } finally {
        setLoadingPermissions(false);
      }
    };

    fetchPermissions();
  }, [isOpen, tenantId]);

  // Load role data into form
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        permissions: role.permissions,
      });
    }
  }, [role]);

  const handleSubmit = async () => {
    if (!role) return;
    await onSubmit(role.id, formData);
  };

  const handlePermissionToggle = (permission: string) => {
    setFormData((prev) => {
      const currentPermissions = prev.permissions || [];
      return {
        ...prev,
        permissions: currentPermissions.includes(permission)
          ? currentPermissions.filter((p) => p !== permission)
          : [...currentPermissions, permission],
      };
    });
  };

  if (!role) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="edit-role-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      submitLabel={t("save")}
      errorFallbackMessage={t("error")}
      size="lg"
    >
      <FormInput
        id="edit-role-name"
        type="text"
        label={t("roleName")}
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder={t("roleNamePlaceholder")}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("roleType")}
        </label>
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
          {formatRoleName(role.additionalType)}
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            ({t("typeCannotChange")})
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t("permissions")}
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            ({formData.permissions?.length || 0} {t("selected")})
          </span>
        </label>

        {loadingPermissions ? (
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
                  id={`edit-permission-${permission}`}
                  label={formatRoleName(permission)}
                  checked={formData.permissions?.includes(permission) || false}
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
