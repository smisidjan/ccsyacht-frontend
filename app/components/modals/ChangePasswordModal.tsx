"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import { authApi } from "@/lib/api/client";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const t = useTranslations("profile");
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      throw new Error(t("passwordMismatch"));
    }

    await authApi.changePassword({
      oldPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });

    onSuccess?.();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("changePassword")}
      formId="change-password-form"
      onSubmit={handleSubmit}
      successMessage={t("passwordUpdated")}
      submitLabel={t("updatePassword")}
      errorFallbackMessage={t("passwordError")}
    >
      <FormInput
        id="current-password"
        type="password"
        label={t("currentPassword")}
        value={formData.currentPassword}
        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
        required
      />

      <FormInput
        id="new-password"
        type="password"
        label={t("newPassword")}
        value={formData.newPassword}
        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
        required
        minLength={8}
      />

      <FormInput
        id="confirm-password"
        type="password"
        label={t("confirmNewPassword")}
        value={formData.confirmPassword}
        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        required
        minLength={8}
      />
    </BaseModal>
  );
}
