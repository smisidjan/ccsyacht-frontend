"use client";

import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import type { TenantRole } from "@/lib/api/types";
import { formatRoleName } from "@/lib/utils/roleFormatter";

interface DeleteRoleModalProps {
  isOpen: boolean;
  role: TenantRole | null;
  onClose: () => void;
  onConfirm: (roleId: string) => Promise<void>;
}

export default function DeleteRoleModal({
  isOpen,
  role,
  onClose,
  onConfirm,
}: DeleteRoleModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.roles.deleteModal");

  const handleDelete = async () => {
    if (!role) return;
    await onConfirm(role.id);
  };

  if (!role) return null;

  const hasUsers = role.usersCount > 0;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      onSubmit={handleDelete}
      successMessage={t("success", { name: role.name })}
      submitLabel={t("delete")}
      submitVariant="danger"
      submitDisabled={hasUsers}
      cancelLabel={t("cancel")}
      errorFallbackMessage={t("error")}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("message")}
        </p>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("roleName")}
            </span>
            <span className="text-sm text-gray-900 dark:text-white font-semibold">
              {formatRoleName(role.name)}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("roleType")}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                role.additionalType === "guest"
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
              }`}
            >
              {formatRoleName(role.additionalType)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("usersWithRole")}
            </span>
            <span className="text-sm text-gray-900 dark:text-white font-semibold">
              {role.usersCount || 0}
            </span>
          </div>
        </div>

        {hasUsers ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
              🚫 {t("cannotDelete")}
            </p>
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {t("confirmQuestion")}
          </p>
        )}
      </div>
    </BaseModal>
  );
}
