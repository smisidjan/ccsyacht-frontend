"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

export interface InviteUserFormData {
  email: string;
  role: string;
}

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InviteUserFormData) => Promise<void>;
}

const AVAILABLE_ROLES = [
  "user",
  "admin",
  "main user",
  "invitation manager",
  "yard",
  "surveyor",
  "painter",
  "owner representative",
];

export default function InviteUserModal({ isOpen, onClose, onSubmit }: InviteUserModalProps) {
  const t = useTranslations("usersPage.inviteModal");
  const [formData, setFormData] = useState<InviteUserFormData>({
    email: "",
    role: "user",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      setFormData({ email: "", role: "user" });
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
    setFormData({ email: "", role: "user" });
    setError(null);
    onClose();
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={handleClose}
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
      >
        {t("cancel")}
      </button>
      <button
        type="submit"
        form="invite-user-form"
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? t("sending") : t("sendInvitation")}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("title")} footer={footer} size="md">
      <form id="invite-user-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("email")} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t("emailPlaceholder")}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("role")} <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isSubmitting}
          >
            {AVAILABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role.replace(/ /g, "_")}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Info text */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t("infoText")}
          </p>
        </div>
      </form>
    </Modal>
  );
}
