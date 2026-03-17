"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import type { User, UserRole, UpdateUserRequest } from "@/lib/api/types";
import { useRoles } from "@/lib/api";
import { formatRoleName } from "@/lib/utils/roleFormatter";

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSubmit: (userId: string, data: UpdateUserRequest) => Promise<void>;
}

export default function EditUserModal({ isOpen, user, onClose, onSubmit }: EditUserModalProps) {
  const t = useTranslations("usersPage.editModal");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    roles: [] as UserRole[],
    active: true,
  });

  // Fetch roles based on user's employment type
  const userEmploymentType = user?.employmentType || "employee";
  const { data: availableRoles } = useRoles(userEmploymentType);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        roles: user.roles,
        active: user.active,
      });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    await onSubmit(user.id, formData);
  };

  const handleRoleToggle = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  if (!user) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="edit-user-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      submitLabel={t("save")}
      errorFallbackMessage={t("error")}
      size="md"
    >
      <FormInput
        id="name"
        type="text"
        label={t("name")}
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <FormInput
        id="edit-email"
        type="email"
        label={t("email")}
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("roles")}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(availableRoles || []).map((role) => (
            <label key={role.name} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.roles.includes(role.name as UserRole)}
                onChange={() => handleRoleToggle(role.name as UserRole)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {formatRoleName(role.name)}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("activeStatus")}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t("activeDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, active: !formData.active })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.active ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.active ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </div>
    </BaseModal>
  );
}
