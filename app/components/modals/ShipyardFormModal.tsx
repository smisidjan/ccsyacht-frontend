"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
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

  // Form state
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");

  // Reset form when modal opens/closes or shipyard changes
  useEffect(() => {
    if (isOpen && shipyard) {
      // Edit mode - populate with existing data
      setName(shipyard.name || "");
      setContactName(shipyard.contactPoint?.name || "");
      setContactEmail(shipyard.contactPoint?.email || "");
      setContactPhone(shipyard.contactPoint?.telephone || "");
      setAddress(shipyard.address || "");
    } else if (isOpen && !shipyard) {
      // Create mode - reset to empty
      setName("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setAddress("");
    }
  }, [isOpen, shipyard]);

  const handleSubmit = async () => {
    const data: CreateShipyardRequest | UpdateShipyardRequest = {
      name,
      contact_name: contactName || undefined,
      contact_email: contactEmail || undefined,
      contact_phone: contactPhone || undefined,
      address: address || undefined,
    };

    await onSubmit(data);

    // Reset form
    setName("");
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

        {/* Contact Name */}
        <FormInput
          id="contact-name"
          label={t("contactName")}
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder={t("contactNamePlaceholder")}
        />

        {/* Contact Email */}
        <FormInput
          id="contact-email"
          label={t("contactEmail")}
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder={t("contactEmailPlaceholder")}
        />

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
