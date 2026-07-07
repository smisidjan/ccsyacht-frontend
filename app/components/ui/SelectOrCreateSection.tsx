"use client";

import { ReactNode } from "react";
import FormSelect from "@/app/components/ui/FormSelect";
import Alert from "@/app/components/ui/Alert";

interface SelectOrCreateSectionProps<T extends string = "existing" | "new"> {
  title: string;
  mode: T;
  onModeChange: (mode: T) => void;
  selectLabel: string;
  createLabel: string;
  selectModeValue?: T; // The value that represents "select from existing" mode (default: "existing")
  // For existing selection
  selectDropdownLabel: string;
  selectDropdownValue: string;
  selectDropdownOptions: { value: string; label: string }[];
  onSelectChange: (value: string) => void;
  selectRequired?: boolean;
  selectDisabled?: boolean;
  noItemsMessage?: string;
  // For new creation
  createFormContent: ReactNode;
  // Optional children to render in select mode (after dropdown)
  children?: ReactNode;
  /** Optional third radio option — used for domain-specific "extras"
   *  like the Keyside shipyard entry. When `extraModeValue` matches
   *  the current `mode`, `extraContent` is rendered in place of the
   *  dropdown / create form. All three props must be provided
   *  together for the radio to appear. */
  extraModeValue?: T;
  extraModeLabel?: string;
  extraContent?: ReactNode;
}

export default function SelectOrCreateSection<T extends string = "existing" | "new">({
  title,
  mode,
  onModeChange,
  selectLabel,
  createLabel,
  selectModeValue = "existing" as T,
  selectDropdownLabel,
  selectDropdownValue,
  selectDropdownOptions,
  onSelectChange,
  selectRequired = false,
  selectDisabled = false,
  noItemsMessage,
  createFormContent,
  children,
  extraModeValue,
  extraModeLabel,
  extraContent,
}: SelectOrCreateSectionProps<T>) {
  const hasItems = selectDropdownOptions && selectDropdownOptions.length > 0;
  const newModeValue = "new" as T;
  const hasExtraMode =
    extraModeValue !== undefined && extraModeLabel !== undefined;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>

      {/* Radio buttons for mode selection */}
      <div className="flex gap-4 mb-4">
        <label className="flex items-center">
          <input
            type="radio"
            name={`mode-${title}`}
            value={selectModeValue}
            checked={mode === selectModeValue}
            onChange={() => onModeChange(selectModeValue)}
            disabled={selectDisabled || !hasItems}
            className="mr-2 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {selectLabel}
          </span>
        </label>

        <label className="flex items-center">
          <input
            type="radio"
            name={`mode-${title}`}
            value={newModeValue}
            checked={mode === newModeValue}
            onChange={() => onModeChange(newModeValue)}
            className="mr-2 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {createLabel}
          </span>
        </label>

        {hasExtraMode && (
          <label className="flex items-center">
            <input
              type="radio"
              name={`mode-${title}`}
              value={extraModeValue}
              checked={mode === extraModeValue}
              onChange={() => onModeChange(extraModeValue as T)}
              className="mr-2 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {extraModeLabel}
            </span>
          </label>
        )}
      </div>

      {/* Select existing dropdown */}
      {mode === selectModeValue && (
        <>
          {hasItems ? (
            <>
              <FormSelect
                id={`select-${title}`}
                label={selectDropdownLabel}
                value={selectDropdownValue}
                onChange={(e) => onSelectChange(e.target.value)}
                options={selectDropdownOptions}
                required={selectRequired}
              />
              {children}
            </>
          ) : (
            noItemsMessage && (
              <Alert type="info" message={noItemsMessage} />
            )
          )}
        </>
      )}

      {/* Create new form */}
      {mode === newModeValue && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {createFormContent}
        </div>
      )}

      {/* Extra mode (e.g. Keyside) — rendered raw so callers can pick
          their own layout (a note textarea, a helper alert, etc.). */}
      {hasExtraMode && mode === extraModeValue && extraContent && (
        <div>{extraContent}</div>
      )}
    </div>
  );
}
