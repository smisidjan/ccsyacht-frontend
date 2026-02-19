"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import FormInput from "@/app/components/ui/FormInput";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import type { User, UserRole, UpdateUserRequest } from "@/lib/api/types";

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSubmit: (userId: string, data: UpdateUserRequest) => Promise<void>;
}

const AVAILABLE_ROLES: UserRole[] = [
  "admin",
  "main user",
  "invitation manager",
  "user",
  "yard",
  "surveyor",
  "painter",
  "owner representative",
];

export default function EditUserModal({ isOpen, user, onClose, onSubmit }: EditUserModalProps) {
  const t = useTranslations("usersPage.editModal");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    roles: [] as UserRole[],
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        roles: user.roles,
        active: user.active,
      });
      setError(null);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(user.id, formData);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message || t("error");
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleRoleToggle = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="secondary" onClick={handleClose}>
        {t("cancel")}
      </Button>
      <Button type="submit" form="edit-user-form" loading={isSubmitting}>
        {t("save")}
      </Button>
    </div>
  );

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("title")} footer={footer} size="md">
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

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
            {AVAILABLE_ROLES.map((role) => (
              <label key={role} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.roles.includes(role)}
                  onChange={() => handleRoleToggle(role)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t(`roleNames.${role}`)}
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
      </form>
    </Modal>
  );
}
