"use client";

import { forwardRef } from "react";

interface FormInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  showRequiredMark?: boolean;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      id,
      label,
      error,
      hint,
      required,
      showRequiredMark = true,
      className = "",
      type,
      onChange,
      ...props
    },
    ref
  ) => {
    // For email inputs, automatically convert to lowercase and trim whitespace
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === "email") {
        e.target.value = e.target.value.toLowerCase().trim();
      }
      if (onChange) {
        onChange(e);
      }
    };

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
        <input
          ref={ref}
          id={id}
          type={type}
          required={required}
          onChange={handleChange}
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
            ${type === "email" ? "lowercase" : ""}
            ${className}
          `}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
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

FormInput.displayName = "FormInput";

export default FormInput;
