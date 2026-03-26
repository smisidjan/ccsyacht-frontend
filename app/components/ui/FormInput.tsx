"use client";

import { forwardRef } from "react";

interface BaseFormInputProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  showRequiredMark?: boolean;
  multiline?: boolean;
  rows?: number;
}

type FormInputProps = BaseFormInputProps &
  (
    | (Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & { multiline?: false })
    | (Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> & { multiline: true })
  );

const FormInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormInputProps>(
  (props, ref) => {
    const {
      id,
      label,
      error,
      hint,
      required,
      showRequiredMark = true,
      className = "",
      onChange,
      multiline = false,
      rows = 4,
      ...restProps
    } = props;

    // Extract type only if not multiline
    const type = !multiline && 'type' in props ? props.type : undefined;
    // Pass through onChange without modification
    // Email transformation (lowercase, trim) happens at API level
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e as any);
      }
    };

    const inputClassName = `
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
      ${multiline ? "resize-none" : ""}
      ${className}
    `;

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
        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={id}
            rows={rows}
            required={required}
            onChange={handleChange}
            className={inputClassName}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            {...(restProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={id}
            type={type}
            required={required}
            onChange={handleChange}
            className={inputClassName}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            {...(restProps as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
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
