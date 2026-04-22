"use client";

import FormInput from "@/app/components/ui/FormInput";

interface StageTemplateFormProps {
  name: string;
  description: string;
  requiresReleaseForm: boolean;
  isActive: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onRequiresReleaseFormChange: (value: boolean) => void;
  onIsActiveChange: (value: boolean) => void;
  translations: {
    name: string;
    namePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    requiresReleaseForm: string;
    isActive: string;
  };
}

export default function StageTemplateForm({
  name,
  description,
  requiresReleaseForm,
  isActive,
  onNameChange,
  onDescriptionChange,
  onRequiresReleaseFormChange,
  onIsActiveChange,
  translations: t,
}: StageTemplateFormProps) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <FormInput
        id="stage-template-name"
        label={t.name}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t.namePlaceholder}
        required
      />

      {/* Description */}
      <div>
        <label
          htmlFor="stage-template-description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {t.description}
        </label>
        <textarea
          id="stage-template-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t.descriptionPlaceholder}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Requires Release Form */}
      <div className="flex items-center">
        <input
          id="stage-template-requires-release"
          type="checkbox"
          checked={requiresReleaseForm}
          onChange={(e) => onRequiresReleaseFormChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="stage-template-requires-release"
          className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
        >
          {t.requiresReleaseForm}
        </label>
      </div>

      {/* Is Active */}
      <div className="flex items-center">
        <input
          id="stage-template-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => onIsActiveChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="stage-template-active"
          className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
        >
          {t.isActive}
        </label>
      </div>
    </div>
  );
}
