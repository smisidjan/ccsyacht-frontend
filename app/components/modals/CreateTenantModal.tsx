"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, adminEmail: string, maxProjects: number, maxUsers: number) => Promise<void>;
}

export default function CreateTenantModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateTenantModalProps) {
  const t = useTranslations("systemSettings.createOrganisationModal");
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [maxProjects, setMaxProjects] = useState<number | "">("");
  const [maxUsers, setMaxUsers] = useState<number | "">("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setAdminEmail("");
      setMaxProjects("");
      setMaxUsers("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    // Form validation will ensure these are filled (required fields)
    if (maxProjects === "" || maxUsers === "") {
      return;
    }

    await onSubmit(name, adminEmail, maxProjects, maxUsers);
    setName("");
    setAdminEmail("");
    setMaxProjects("");
    setMaxUsers("");
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

      <FormInput
        id="max-projects"
        type="number"
        label={t("maxProjects")}
        value={maxProjects}
        onChange={(e) => setMaxProjects(e.target.value ? Number(e.target.value) : "")}
        placeholder={t("maxProjectsPlaceholder")}
        min={1}
        required
      />

      <FormInput
        id="max-users"
        type="number"
        label={t("maxUsers")}
        value={maxUsers}
        onChange={(e) => setMaxUsers(e.target.value ? Number(e.target.value) : "")}
        placeholder={t("maxUsersPlaceholder")}
        min={1}
        required
      />
    </BaseModal>
  );
}
