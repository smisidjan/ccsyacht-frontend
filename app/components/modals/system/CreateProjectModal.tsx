"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "../BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import InlineShipyardForm from "@/app/components/ui/InlineShipyardForm";
import { useInlineShipyardCreation } from "@/lib/hooks/useInlineShipyardCreation";
import { useToast } from "@/app/context/ToastContext";
import type { CreateProjectRequest, Shipyard } from "@/lib/api/types";

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

  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<"new_build" | "refit">("new_build");
  const [shipyardId, setShipyardId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Inline shipyard creation using hook
  const shipyardCreation = useInlineShipyardCreation({
    tenantId,
    onSuccess: (shipyard) => {
      try {
        onShipyardCreated({ identifier: shipyard.id, name: shipyard.name } as Shipyard);
        setShipyardId(shipyard.id);
        showToast("success", t("shipyardCreated"));
      } catch (err) {
        console.error("Error in onShipyardCreated callback:", err);
      }
    },
    onError: (error) => {
      showToast("error", t("shipyardCreateError"));
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setProjectType("new_build");
      setShipyardId("");
      setStartDate("");
      setEndDate("");
      shipyardCreation.resetForm();
    }
  }, [isOpen, shipyardCreation]);

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
              onChange={(e) => setProjectType(e.target.value as "new_build" | "refit")}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="new_build">{tProjects("types.newBuild")}</option>
              <option value="refit">{tProjects("types.refit")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("shipyard")}
            </label>
            <select
              value={shipyardCreation.showInlineForm ? "create_new" : shipyardId}
              onChange={(e) => {
                const newShipyardId = shipyardCreation.handleSelectChange(e.target.value, shipyardId);
                setShipyardId(newShipyardId);
              }}
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
        {shipyardCreation.showInlineForm && (
          <InlineShipyardForm
            name={shipyardCreation.name}
            address={shipyardCreation.address}
            contactName={shipyardCreation.contactName}
            contactEmail={shipyardCreation.contactEmail}
            contactPhone={shipyardCreation.contactPhone}
            onNameChange={shipyardCreation.setName}
            onAddressChange={shipyardCreation.setAddress}
            onContactNameChange={shipyardCreation.setContactName}
            onContactEmailChange={shipyardCreation.setContactEmail}
            onContactPhoneChange={shipyardCreation.setContactPhone}
            onSubmit={shipyardCreation.handleCreate}
            onCancel={shipyardCreation.handleCancel}
            isLoading={shipyardCreation.isCreating}
          />
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
