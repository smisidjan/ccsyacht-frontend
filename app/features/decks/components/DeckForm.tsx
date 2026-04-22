"use client";

import FormInput from "@/app/components/ui/FormInput";

const DEFAULT_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F97316", // Orange
];

interface DeckFormProps {
  name: string;
  description: string;
  color: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onColorChange: (value: string) => void;
  translations: {
    name: string;
    namePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    color: string;
  };
}

export default function DeckForm({
  name,
  description,
  color,
  onNameChange,
  onDescriptionChange,
  onColorChange,
  translations: t,
}: DeckFormProps) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <FormInput
        id="deck-name"
        label={t.name}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t.namePlaceholder}
        required
      />

      {/* Description */}
      <div>
        <label
          htmlFor="deck-description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {t.description}
        </label>
        <textarea
          id="deck-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t.descriptionPlaceholder}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Color Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.color}
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                color === c
                  ? "border-gray-900 dark:border-white scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
