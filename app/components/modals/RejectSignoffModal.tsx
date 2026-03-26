"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";

interface RejectSignoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => Promise<void>;
}

export default function RejectSignoffModal({
  isOpen,
  onClose,
  onSubmit,
}: RejectSignoffModalProps) {
  const t = useTranslations("signoffs");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!notes.trim()) {
      throw new Error(t("notesRequired"));
    }

    await onSubmit(notes.trim());
  };

  const handleClose = () => {
    setNotes("");
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("rejectSignoff")}
      size="md"
      formId="reject-signoff-form"
      onSubmit={handleSubmit}
      successMessage={t("rejectSuccess")}
      errorFallbackMessage={t("rejectError")}
      submitDisabled={!notes.trim()}
      submitLabel={t("reject")}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("rejectDescription")}
        </p>

        <FormInput
          id="notes"
          label={t("rejectionReason")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={4}
          maxLength={1000}
          required
          hint={t("notesHint", { count: 1000 - notes.length })}
        />
      </div>
    </BaseModal>
  );
}
