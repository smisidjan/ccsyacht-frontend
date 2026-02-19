"use client";

import { forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  id: string;
  label: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  showRequiredMark?: boolean;
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      id,
      label,
      options,
      error,
      hint,
      required,
      showRequiredMark = true,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && showRequiredMark && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        <select
          ref={ref}
          id={id}
          required={required}
          className={`
            w-full px-4 py-3 rounded-lg border
            ${error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 dark:border-gray-700 focus:ring-blue-500"
            }
            bg-white dark:bg-gray-800
            focus:ring-2 focus:border-transparent
            outline-none transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${id}-hint`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = "FormSelect";

export default FormSelect;
