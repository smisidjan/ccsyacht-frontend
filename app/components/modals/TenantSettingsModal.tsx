"use client";

import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";

interface TenantSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName: string;
  maxProjects: number | null;
  maxUsers: number | null;
}

export default function TenantSettingsModal({
  isOpen,
  onClose,
  tenantName,
  maxProjects,
  maxUsers,
}: TenantSettingsModalProps) {
  const t = useTranslations("systemSettings.tenantSettings");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title", { name: tenantName })}
      size="md"
      footer={
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {t("close")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Max Projects */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("maxProjects")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("maxProjectsDescription")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {maxProjects === null ? t("unlimited") : maxProjects}
              </p>
            </div>
          </div>
        </div>

        {/* Max Users */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("maxUsers")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("maxUsersDescription")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {maxUsers === null ? t("unlimited") : maxUsers}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
