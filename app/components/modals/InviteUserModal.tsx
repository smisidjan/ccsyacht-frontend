"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import FormInput from "@/app/components/ui/FormInput";
import FormSelect from "@/app/components/ui/FormSelect";
import Button from "@/app/components/ui/Button";
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

  const roleOptions = AVAILABLE_ROLES.map((role) => ({
    value: role,
    label: t(`roles.${role.replace(/ /g, "_")}`),
  }));

  const footer = (
    <div className="flex justify-end gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={handleClose}
        disabled={isSubmitting}
      >
        {t("cancel")}
      </Button>
      <Button
        type="submit"
        form="invite-user-form"
        loading={isSubmitting}
      >
        {isSubmitting ? t("sending") : t("sendInvitation")}
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("title")} footer={footer} size="md">
      <form id="invite-user-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <FormInput
          id="email"
          type="email"
          label={t("email")}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder={t("emailPlaceholder")}
          required
          disabled={isSubmitting}
        />

        <FormSelect
          id="role"
          label={t("role")}
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          options={roleOptions}
          required
          disabled={isSubmitting}
        />

        <Alert type="info" message={t("infoText")} />
      </form>
    </Modal>
  );
}
