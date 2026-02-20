"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";

interface ChangeNameModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSubmit: (newName: string) => Promise<void>;
}

export default function ChangeNameModal({
  isOpen,
  currentName,
  onClose,
  onSubmit,
}: ChangeNameModalProps) {
  const t = useTranslations("profile");
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  const handleSubmit = async () => {
    await onSubmit(name);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("changeName")}
      formId="change-name-form"
      onSubmit={handleSubmit}
      successMessage={t("nameUpdated")}
      errorFallbackMessage={t("nameError")}
    >
      <FormInput
        id="new-name"
        type="text"
        label={t("newName")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
    </BaseModal>
  );
}
