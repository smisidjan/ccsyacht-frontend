"use client";

import FormInput from "@/app/components/ui/FormInput";

interface ChecklistTemplateFormProps {
  description: string;
  isActive: boolean;
  onDescriptionChange: (value: string) => void;
  onIsActiveChange: (value: boolean) => void;
  translations: {
    description: string;
    descriptionPlaceholder: string;
    isActive: string;
  };
}

export default function ChecklistTemplateForm({
  description,
  isActive,
  onDescriptionChange,
  onIsActiveChange,
  translations: t,
}: ChecklistTemplateFormProps) {
  return (
    <div className="space-y-4">
      {/* Description */}
      <FormInput
        id="checklist-template-description"
        label={t.description}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder={t.descriptionPlaceholder}
        required
      />

      {/* Is Active */}
      <div className="flex items-center">
        <input
          id="checklist-template-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => onIsActiveChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="checklist-template-active"
          className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
        >
          {t.isActive}
        </label>
      </div>
    </div>
  );
}
