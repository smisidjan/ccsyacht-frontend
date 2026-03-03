"use client";

interface RadioOption {
  value: string;
  label: string;
  color?: "blue" | "purple" | "green" | "red" | "amber";
}

interface FormRadioGroupProps {
  id: string;
  label: string;
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  showRequiredMark?: boolean;
  className?: string;
}

const colorClasses = {
  blue: "text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600",
  purple: "text-purple-600 focus:ring-purple-500 dark:focus:ring-purple-600",
  green: "text-green-600 focus:ring-green-500 dark:focus:ring-green-600",
  red: "text-red-600 focus:ring-red-500 dark:focus:ring-red-600",
  amber: "text-amber-600 focus:ring-amber-500 dark:focus:ring-amber-600",
};

export default function FormRadioGroup({
  id,
  label,
  name,
  options,
  value,
  onChange,
  error,
  hint,
  required = false,
  showRequiredMark = true,
  className = "",
}: FormRadioGroupProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        {label}
        {required && showRequiredMark && (
          <span className="text-red-500 ml-1">*</span>
        )}
      </label>
      <div
        className="flex gap-4"
        role="radiogroup"
        aria-labelledby={id}
        aria-required={required}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      >
        {options.map((option) => {
          const optionId = `${id}-${option.value}`;
          const colorClass = colorClasses[option.color || "blue"];

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className={`w-4 h-4 border-gray-300 dark:border-gray-600 dark:bg-gray-700 ${colorClass}`}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
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
