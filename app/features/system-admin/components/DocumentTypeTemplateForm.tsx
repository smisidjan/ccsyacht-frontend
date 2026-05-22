"use client";

import FormInput from "@/app/components/ui/FormInput";

interface DocumentTypeTemplateFormProps {
  name: string;
  isRequired: boolean;
  isLocked: boolean;
  isSystemManaged: boolean;
  isActive: boolean;
  onNameChange: (value: string) => void;
  onIsRequiredChange: (value: boolean) => void;
  onIsLockedChange: (value: boolean) => void;
  onIsSystemManagedChange: (value: boolean) => void;
  onIsActiveChange: (value: boolean) => void;
  translations: {
    name: string;
    namePlaceholder: string;
    required: string;
    locked: string;
    systemManaged: string;
    active: string;
  };
}

export default function DocumentTypeTemplateForm({
  name,
  isRequired,
  isLocked,
  isSystemManaged,
  isActive,
  onNameChange,
  onIsRequiredChange,
  onIsLockedChange,
  onIsSystemManagedChange,
  onIsActiveChange,
  translations: t,
}: DocumentTypeTemplateFormProps) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <FormInput
        id="document-type-template-name"
        label={t.name}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t.namePlaceholder}
        required
      />

      {/* Is Required */}
      <div className="flex items-center">
        <input
          id="document-type-template-required"
          type="checkbox"
          checked={isRequired}
          onChange={(e) => onIsRequiredChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="document-type-template-required"
          className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
        >
          {t.required}
        </label>
      </div>

      {/* Is Locked */}
      <div className="flex items-center">
        <input
          id="document-type-template-locked"
          type="checkbox"
          checked={isLocked}
          onChange={(e) => onIsLockedChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="document-type-template-locked"
          className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
        >
          {t.locked}
        </label>
      </div>

      {/* Is System Managed */}
      <div className="flex items-center">
        <input
          id="document-type-template-system-managed"
          type="checkbox"
          checked={isSystemManaged}
          onChange={(e) => onIsSystemManagedChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="document-type-template-system-managed"
          className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
        >
          {t.systemManaged}
        </label>
      </div>

      {/* Is Active */}
      <div className="flex items-center">
        <input
          id="document-type-template-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => onIsActiveChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="document-type-template-active"
          className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
        >
          {t.active}
        </label>
      </div>
    </div>
  );
}
