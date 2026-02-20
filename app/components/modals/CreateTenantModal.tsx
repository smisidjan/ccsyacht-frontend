"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import PasswordInput from "@/app/components/ui/PasswordInput";

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    name: string,
    adminEmail: string,
    adminPassword: string
  ) => Promise<void>;
}

export default function CreateTenantModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateTenantModalProps) {
  const t = useTranslations("systemSettings.createOrganisationModal");
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setAdminEmail("");
      setAdminPassword("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    await onSubmit(name, adminEmail, adminPassword);
    setName("");
    setAdminEmail("");
    setAdminPassword("");
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

      <div>
        <label
          htmlFor="admin-password"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {t("adminPassword")}
        </label>
        <PasswordInput
          id="admin-password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          placeholder={t("adminPasswordPlaceholder")}
          required
        />
      </div>
    </BaseModal>
  );
}
