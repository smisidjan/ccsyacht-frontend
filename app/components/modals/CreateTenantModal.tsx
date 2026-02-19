"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import FormInput from "@/app/components/ui/FormInput";
import PasswordInput from "@/app/components/ui/PasswordInput";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onSubmit(name, adminEmail, adminPassword);
      setName("");
      setAdminEmail("");
      setAdminPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setAdminEmail("");
    setAdminPassword("");
    setError("");
    onClose();
  };

  const footer = (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={handleClose}
        className="flex-1"
      >
        {t("cancel")}
      </Button>
      <Button
        type="submit"
        form="create-tenant-form"
        loading={loading}
        className="flex-1"
      >
        {loading ? t("creating") : t("create")}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("title")}
      footer={footer}
      size="md"
    >
      <form id="create-tenant-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

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
      </form>
    </Modal>
  );
}
