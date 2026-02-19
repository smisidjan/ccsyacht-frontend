"use client";

import { forwardRef } from "react";

interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  showRequiredMark?: boolean;
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      id,
      label,
      error,
      hint,
      required,
      showRequiredMark = true,
      rows = 3,
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
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          required={required}
          className={`
            w-full px-4 py-3 rounded-lg border resize-none
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

FormTextarea.displayName = "FormTextarea";

export default FormTextarea;
