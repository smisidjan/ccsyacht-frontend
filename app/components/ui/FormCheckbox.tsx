"use client";

import { forwardRef } from "react";

interface FormCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: string;
  description?: string;
  error?: string;
}

const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  (
    {
      id,
      label,
      description,
      error,
      className = "",
      onChange,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div>
        <label
          htmlFor={id}
          className={`flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded ${className}`}
        >
          <input
            ref={ref}
            id={id}
            type="checkbox"
            onChange={handleChange}
            className={`
              w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${id}-error` : description ? `${id}-description` : undefined}
            {...props}
          />
          <div className="flex-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {label}
            </span>
            {description && (
              <p id={`${id}-description`} className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </label>
        {error && (
          <p id={`${id}-error`} className="mt-1 ml-6 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = "FormCheckbox";

export default FormCheckbox;
