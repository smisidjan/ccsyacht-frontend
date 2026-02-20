"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormSelect from "@/app/components/ui/FormSelect";
import Alert from "@/app/components/ui/Alert";

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

  useEffect(() => {
    if (isOpen) {
      setFormData({ email: "", role: "user" });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    await onSubmit(formData);
    setFormData({ email: "", role: "user" });
  };

  const roleOptions = AVAILABLE_ROLES.map((role) => ({
    value: role,
    label: t(`roles.${role.replace(/ /g, "_")}`),
  }));

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="invite-user-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      submitLabel={t("sendInvitation")}
      errorFallbackMessage={t("error")}
      size="md"
    >
      <FormInput
        id="email"
        type="email"
        label={t("email")}
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder={t("emailPlaceholder")}
        required
      />

      <FormSelect
        id="role"
        label={t("role")}
        value={formData.role}
        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        options={roleOptions}
        required
      />

      <Alert type="info" message={t("infoText")} />
    </BaseModal>
  );
}
