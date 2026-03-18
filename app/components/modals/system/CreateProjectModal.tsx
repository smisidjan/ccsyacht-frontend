"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "../BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import Button from "@/app/components/ui/Button";
import type { CreateProjectRequest, Shipyard, CreateShipyardRequest } from "@/lib/api/types";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectRequest) => Promise<void>;
  shipyards: Shipyard[];
  tenantId: string;
  onShipyardCreated: (shipyard: Shipyard) => void;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
  shipyards,
  tenantId,
  onShipyardCreated,
}: CreateProjectModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects.createModal");
  const tProjects = useTranslations("systemSettings.tenantDetail.projects");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<"new_built" | "refit">("new_built");
  const [shipyardId, setShipyardId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showInlineShipyardForm, setShowInlineShipyardForm] = useState(false);
  const [isCreatingShipyard, setIsCreatingShipyard] = useState(false);

  // Inline shipyard form fields
  const [shipyardName, setShipyardName] = useState("");
  const [shipyardAddress, setShipyardAddress] = useState("");
  const [shipyardContactName, setShipyardContactName] = useState("");
  const [shipyardContactEmail, setShipyardContactEmail] = useState("");
  const [shipyardContactPhone, setShipyardContactPhone] = useState("");

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setProjectType("new_built");
      setShipyardId("");
      setStartDate("");
      setEndDate("");
      setShowInlineShipyardForm(false);
      setShipyardName("");
      setShipyardAddress("");
      setShipyardContactName("");
      setShipyardContactEmail("");
      setShipyardContactPhone("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const data: CreateProjectRequest = {
      name,
      project_type: projectType,
    };

    if (description) data.description = description;
    if (shipyardId) data.shipyard_id = shipyardId;
    if (startDate) data.start_date = startDate;
    if (endDate) data.end_date = endDate;

    await onSubmit(data);
  };

  const handleCreateInlineShipyard = async () => {
    if (!shipyardName.trim()) return;

    setIsCreatingShipyard(true);
    try {
      const { systemProjectsApi } = await import("@/lib/api/system");
      const data: CreateShipyardRequest = {
        name: shipyardName,
      };

      if (shipyardAddress) data.address = shipyardAddress;
      if (shipyardContactName) data.contact_name = shipyardContactName;
      if (shipyardContactEmail) data.contact_email = shipyardContactEmail;
      if (shipyardContactPhone) data.contact_phone = shipyardContactPhone;

      const response = await systemProjectsApi.createShipyard(tenantId, data);
      const newShipyard = response.result;

      // Add the new shipyard to the list and select it
      onShipyardCreated(newShipyard);
      setShipyardId(newShipyard.identifier);

      // Reset inline form
      setShowInlineShipyardForm(false);
      setShipyardName("");
      setShipyardAddress("");
      setShipyardContactName("");
      setShipyardContactEmail("");
      setShipyardContactPhone("");
    } finally {
      setIsCreatingShipyard(false);
    }
  };

  const handleShipyardSelectChange = (value: string) => {
    if (value === "create_new") {
      setShowInlineShipyardForm(true);
      setShipyardId("");
    } else {
      setShowInlineShipyardForm(false);
      setShipyardId(value);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      size="lg"
      formId="create-project-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("create")}
    >
      <div className="space-y-4">
        <FormInput
          id="project-name"
          label={t("name")}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          required
        />

        <FormTextarea
          id="project-description"
          label={t("description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("type")} <span className="text-red-500">*</span>
            </label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as "new_built" | "refit")}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="new_built">{tProjects("types.newBuilt")}</option>
              <option value="refit">{tProjects("types.refit")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("shipyard")}
            </label>
            <select
              value={showInlineShipyardForm ? "create_new" : shipyardId}
              onChange={(e) => handleShipyardSelectChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("selectShipyard")}</option>
              <option value="create_new" className="font-medium text-blue-600 dark:text-blue-400">
                + {t("addShipyard")}
              </option>
              {shipyards.map((shipyard) => (
                <option key={shipyard.identifier} value={shipyard.identifier}>
                  {shipyard.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inline Shipyard Creation Form */}
        {showInlineShipyardForm && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t("createShipyardInline")}
            </h4>

            <FormInput
              id="inline-shipyard-name"
              label={t("shipyardName")}
              type="text"
              value={shipyardName}
              onChange={(e) => setShipyardName(e.target.value)}
              placeholder={t("shipyardNamePlaceholder")}
              required
            />

            <FormTextarea
              id="inline-shipyard-address"
              label={t("shipyardAddress")}
              value={shipyardAddress}
              onChange={(e) => setShipyardAddress(e.target.value)}
              placeholder={t("shipyardAddressPlaceholder")}
              rows={2}
            />

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {t("contactInfoOptional")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormInput
                  id="inline-contact-name"
                  label={t("contactName")}
                  type="text"
                  value={shipyardContactName}
                  onChange={(e) => setShipyardContactName(e.target.value)}
                  placeholder={t("contactNamePlaceholder")}
                />

                <FormInput
                  id="inline-contact-phone"
                  label={t("contactPhone")}
                  type="tel"
                  value={shipyardContactPhone}
                  onChange={(e) => setShipyardContactPhone(e.target.value)}
                  placeholder={t("contactPhonePlaceholder")}
                />

                <div className="md:col-span-2">
                  <FormInput
                    id="inline-contact-email"
                    label={t("contactEmail")}
                    type="email"
                    value={shipyardContactEmail}
                    onChange={(e) => setShipyardContactEmail(e.target.value)}
                    placeholder={t("contactEmailPlaceholder")}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCreateInlineShipyard}
                loading={isCreatingShipyard}
                disabled={!shipyardName.trim() || isCreatingShipyard}
              >
                {t("createShipyard")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowInlineShipyardForm(false);
                  setShipyardId("");
                }}
                disabled={isCreatingShipyard}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            id="start-date"
            label={t("startDate")}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <FormInput
            id="end-date"
            label={t("endDate")}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
    </BaseModal>
  );
}
