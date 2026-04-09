"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormSelect from "@/app/components/ui/FormSelect";
import { useUsers } from "@/lib/api";
import type { Shipyard, CreateShipyardRequest, UpdateShipyardRequest } from "@/lib/api/types";

interface ShipyardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateShipyardRequest | UpdateShipyardRequest) => Promise<void>;
  shipyard?: Shipyard | null; // If provided, it's edit mode
}

export default function ShipyardFormModal({
  isOpen,
  onClose,
  onSubmit,
  shipyard,
}: ShipyardFormModalProps) {
  const t = useTranslations("shipyards.form");
  const isEditMode = !!shipyard;

  // Fetch users for selection (filter only users with "yard" role)
  const { data: allUsers } = useUsers();
  const users = allUsers?.filter((user) => user.roles.includes("yard"));

  // Form state
  const [name, setName] = useState("");
  const [contactMode, setContactMode] = useState<"existing" | "new">("new");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");

  // Reset form when modal opens/closes or shipyard changes
  useEffect(() => {
    if (isOpen && shipyard) {
      // Edit mode - populate with existing data
      setName(shipyard.name || "");
      // Check if there's a linked user
      if (shipyard.linkedUser) {
        setContactMode("existing");
        setSelectedUserId(shipyard.linkedUser.identifier);
      } else {
        setContactMode("new");
        setSelectedUserId("");
      }
      setContactName(shipyard.contactPoint?.name || "");
      setContactEmail(shipyard.contactPoint?.email || "");
      setContactPhone(shipyard.contactPoint?.telephone || "");
      setAddress(shipyard.address || "");
    } else if (isOpen && !shipyard) {
      // Create mode - reset to empty
      setName("");
      setContactMode("new");
      setSelectedUserId("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setAddress("");
    }
  }, [isOpen, shipyard]);

  const handleSubmit = async () => {
    // Validation: Either contact_user_id OR (contact_name + contact_email) must be provided
    if (contactMode === "existing" && !selectedUserId) {
      throw new Error(t("selectUserRequired"));
    }
    if (contactMode === "new" && (!contactName || !contactEmail)) {
      throw new Error(t("contactDetailsRequired"));
    }

    const data: CreateShipyardRequest | UpdateShipyardRequest = {
      name,
      // Option 1: Link existing user
      ...(contactMode === "existing" && selectedUserId ? { contact_user_id: selectedUserId } : {}),
      // Option 2: New contact person
      ...(contactMode === "new" ? {
        contact_name: contactName || undefined,
        contact_email: contactEmail || undefined,
      } : {}),
      contact_phone: contactPhone || undefined,
      address: address || undefined,
    };

    await onSubmit(data);

    // Reset form
    setName("");
    setContactMode("new");
    setSelectedUserId("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setAddress("");
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t("editTitle") : t("createTitle")}
      formId="shipyard-form"
      onSubmit={handleSubmit}
      successMessage={isEditMode ? t("editSuccess") : t("createSuccess")}
      errorFallbackMessage={isEditMode ? t("editError") : t("createError")}
      submitLabel={isEditMode ? t("update") : t("create")}
    >
      <div className="space-y-4">
        {/* Shipyard Name */}
        <FormInput
          id="shipyard-name"
          label={t("name")}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          required
        />

        {/* Contact Person Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("contactPersonLabel")}
          </label>

          {/* Radio buttons */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contact-mode"
                value="new"
                checked={contactMode === "new"}
                onChange={() => setContactMode("new")}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t("newContact")}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contact-mode"
                value="existing"
                checked={contactMode === "existing"}
                onChange={() => setContactMode("existing")}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t("existingUser")}
              </span>
            </label>
          </div>

          {/* Option 1: Select existing user */}
          {contactMode === "existing" && (
            <FormSelect
              id="contact-user"
              label={t("selectUser")}
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              options={[
                { value: "", label: t("selectUserPlaceholder") },
                ...(users?.map((user) => ({
                  value: user.id,
                  label: `${user.name} (${user.email})`,
                })) || []),
              ]}
              required
              hint={t("selectUserHint")}
            />
          )}

          {/* Option 2: Enter new contact details */}
          {contactMode === "new" && (
            <div className="space-y-4">
              <FormInput
                id="contact-name"
                label={t("contactName")}
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={t("contactNamePlaceholder")}
                required
                hint={t("contactNameHint")}
              />

              <FormInput
                id="contact-email"
                label={t("contactEmail")}
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={t("contactEmailPlaceholder")}
                required
                hint={t("contactEmailHint")}
              />
            </div>
          )}
        </div>

        {/* Contact Phone */}
        <FormInput
          id="contact-phone"
          label={t("contactPhone")}
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder={t("contactPhonePlaceholder")}
        />

        {/* Address */}
        <FormInput
          id="address"
          label={t("address")}
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t("addressPlaceholder")}
        />
      </div>
    </BaseModal>
  );
}
