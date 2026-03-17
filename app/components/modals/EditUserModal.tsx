"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormSelect from "@/app/components/ui/FormSelect";
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
    role: "" as UserRole,
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
        role: user.roles[0] || ("" as UserRole),
        active: user.active,
      });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    await onSubmit(user.id, formData);
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

      <FormSelect
        id="role"
        label={t("role")}
        value={formData.role}
        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
        options={(availableRoles || []).map((role) => ({
          value: role.name,
          label: formatRoleName(role.name),
        }))}
        required
      />

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
