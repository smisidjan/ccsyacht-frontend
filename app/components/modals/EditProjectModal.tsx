"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import FormSelect from "@/app/components/ui/FormSelect";
import type { ProjectType } from "@/lib/api/types";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; project_type: ProjectType }) => Promise<void>;
  currentName: string;
  currentDescription: string;
  currentProjectType: ProjectType;
  projectTypes: { id: string; name: string }[];
}

export default function EditProjectModal({
  isOpen,
  onClose,
  onSubmit,
  currentName,
  currentDescription,
  currentProjectType,
  projectTypes,
}: EditProjectModalProps) {
  const t = useTranslations("editProject");
  const [formData, setFormData] = useState({
    name: currentName,
    description: currentDescription,
    project_type: currentProjectType,
  });

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: currentName,
        description: currentDescription,
        project_type: currentProjectType,
      });
    }
  }, [isOpen, currentName, currentDescription, currentProjectType]);

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const projectTypeOptions = projectTypes.map((pt) => ({
    value: pt.id,
    label: pt.name,
  }));

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      formId="edit-project-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("save")}
    >
      <div className="space-y-6">
        <FormInput
          id="project-name"
          type="text"
          label={t("projectName")}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <FormTextarea
          id="project-description"
          label={t("description")}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />

        <FormSelect
          id="project-type"
          label={t("projectType")}
          value={formData.project_type}
          onChange={(e) => setFormData({ ...formData, project_type: e.target.value as ProjectType })}
          options={projectTypeOptions}
          required
        />
      </div>
    </BaseModal>
  );
}
