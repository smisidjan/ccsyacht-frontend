"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, adminEmail: string) => Promise<void>;
}

export default function CreateTenantModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateTenantModalProps) {
  const t = useTranslations("systemSettings.createOrganisationModal");
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setAdminEmail("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    await onSubmit(name, adminEmail);
    setName("");
    setAdminEmail("");
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="create-tenant-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      submitLabel={t("create")}
      errorFallbackMessage={t("error")}
      size="md"
    >
      <FormInput
        id="organisation-name"
        type="text"
        label={t("name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("namePlaceholder")}
        required
      />

      <FormInput
        id="admin-email"
        type="email"
        label={t("adminEmail")}
        value={adminEmail}
        onChange={(e) => setAdminEmail(e.target.value)}
        placeholder={t("adminEmailPlaceholder")}
        required
      />
    </BaseModal>
  );
}
