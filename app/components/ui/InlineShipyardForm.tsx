"use client";

import { useTranslations } from "next-intl";
import FormInput from "./FormInput";
import FormTextarea from "./FormTextarea";
import Button from "./Button";

interface InlineShipyardFormProps {
  name: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  onNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onContactNameChange: (value: string) => void;
  onContactEmailChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function InlineShipyardForm({
  name,
  address,
  contactName,
  contactEmail,
  contactPhone,
  onNameChange,
  onAddressChange,
  onContactNameChange,
  onContactEmailChange,
  onContactPhoneChange,
  onSubmit,
  onCancel,
  isLoading,
}: InlineShipyardFormProps) {
  const t = useTranslations("createProject");

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        {t("createShipyardInline")}
      </h4>

      <FormInput
        id="inline-shipyard-name"
        label={t("shipyardName")}
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t("shipyardNamePlaceholder")}
        required
      />

      <FormTextarea
        id="inline-shipyard-address"
        label={t("shipyardAddress")}
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
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
            value={contactName}
            onChange={(e) => onContactNameChange(e.target.value)}
            placeholder={t("contactNamePlaceholder")}
          />

          <FormInput
            id="inline-contact-phone"
            label={t("contactPhone")}
            type="tel"
            value={contactPhone}
            onChange={(e) => onContactPhoneChange(e.target.value)}
            placeholder={t("contactPhonePlaceholder")}
          />

          <div className="md:col-span-2">
            <FormInput
              id="inline-contact-email"
              label={t("contactEmail")}
              type="email"
              value={contactEmail}
              onChange={(e) => onContactEmailChange(e.target.value)}
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
          onClick={onSubmit}
          loading={isLoading}
          disabled={!name.trim() || isLoading}
        >
          {t("createShipyard")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
