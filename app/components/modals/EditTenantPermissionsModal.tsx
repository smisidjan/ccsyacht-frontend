"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormCheckbox from "@/app/components/ui/FormCheckbox";
import { formatRoleName } from "@/lib/utils/roleFormatter";
import { systemApi, systemTenantsApi } from "@/lib/api/system";
import type { Tenant } from "@/lib/api/types";

interface EditTenantPermissionsModalProps {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSubmit: (tenantId: string, restrictedPermissions: string[]) => Promise<void>;
}

export default function EditTenantPermissionsModal({
  isOpen,
  tenant,
  onClose,
  onSubmit,
}: EditTenantPermissionsModalProps) {
  const t = useTranslations("systemSettings.editTenantPermissionsModal");

  const [restrictedPermissions, setRestrictedPermissions] = useState<string[]>([]);
  const [selectablePermissions, setSelectablePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Load tenant's current restricted permissions and selectable permissions
  useEffect(() => {
    const fetchData = async () => {
      if (!tenant || !isOpen) return;

      setLoading(true);
      setLoadingPermissions(true);

      try {
        // Fetch both tenant details and selectable permissions in parallel
        const [tenantDetails, permissionsResponse] = await Promise.all([
          systemApi.getTenant(tenant.identifier),
          systemTenantsApi.getSelectablePermissions(),
        ]);

        setRestrictedPermissions(tenantDetails.restrictedPermissions || []);
        setSelectablePermissions(permissionsResponse.itemListElement);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setRestrictedPermissions([]);
        setSelectablePermissions([]);
      } finally {
        setLoading(false);
        setLoadingPermissions(false);
      }
    };

    fetchData();
  }, [tenant, isOpen]);

  const handleSubmit = async () => {
    if (!tenant) return;
    await onSubmit(tenant.identifier, restrictedPermissions);
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

  if (!tenant) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title", { name: tenant.name })}
      formId="edit-tenant-permissions-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      submitLabel={t("save")}
      errorFallbackMessage={t("error")}
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("description")}
          </p>
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

          <div className="max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            {loading || loadingPermissions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
              </div>
            ) : selectablePermissions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                {t("noPermissionsAvailable")}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {selectablePermissions.map((permission: string) => (
                  <FormCheckbox
                    key={permission}
                    id={`tenant-permission-${permission}`}
                    label={formatRoleName(permission)}
                    checked={restrictedPermissions.includes(permission)}
                    onChange={() => handlePermissionToggle(permission)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
