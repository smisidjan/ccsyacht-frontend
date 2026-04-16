"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import { ReactNode } from "react";

export interface Step {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  status: "pending" | "current" | "completed" | "waiting" | "error";
  badge?: string; // e.g., "2/5" for responses
}

interface StepperProps {
  steps: Step[];
  currentStep?: string;
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export default function Stepper({
  steps,
  currentStep,
  onStepClick,
  className = "",
}: StepperProps) {
  const getStepStyles = (status: Step["status"]) => {
    switch (status) {
      case "completed":
        return {
          circle: "bg-green-600 border-green-600",
          text: "text-green-600 dark:text-green-400",
          line: "bg-green-600",
          icon: <CheckIcon className="w-4 h-4 text-white" />,
        };
      case "current":
        return {
          circle: "bg-blue-600 border-blue-600",
          text: "text-blue-600 dark:text-blue-400 font-semibold",
          line: "bg-gray-300 dark:bg-gray-600",
          icon: null,
        };
      case "waiting":
        return {
          circle: "bg-amber-500 border-amber-500",
          text: "text-amber-600 dark:text-amber-400",
          line: "bg-gray-300 dark:bg-gray-600",
          icon: null,
        };
      case "error":
        return {
          circle: "bg-red-500 border-red-500",
          text: "text-red-600 dark:text-red-400",
          line: "bg-gray-300 dark:bg-gray-600",
          icon: null,
        };
      default: // pending
        return {
          circle: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600",
          text: "text-gray-500 dark:text-gray-400",
          line: "bg-gray-300 dark:bg-gray-600",
          icon: null,
        };
    }
  };

  return (
    <nav className={`${className}`} aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const styles = getStepStyles(step.status);
          const isLast = index === steps.length - 1;
          const isClickable = onStepClick && step.status === "completed";

          return (
            <li
              key={step.id}
              className={`relative ${isLast ? "" : "flex-1"}`}
            >
              <div className="flex items-center">
                {/* Step Circle */}
                <button
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={`
                    relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                    ${styles.circle}
                    ${isClickable ? "cursor-pointer hover:scale-110" : "cursor-default"}
                  `}
                >
                  {styles.icon || (
                    step.icon || (
                      <span className={`text-xs font-medium ${step.status === "pending" ? "text-gray-500 dark:text-gray-400" : "text-white"}`}>
                        {index + 1}
                      </span>
                    )
                  )}
                </button>

                {/* Connecting Line */}
                {!isLast && (
                  <div className="flex-1 mx-3 h-0.5">
                    <div className={`h-full ${styles.line}`} />
                  </div>
                )}
              </div>

              {/* Label and Badge */}
              <div className="mt-2 min-w-max">
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${styles.text}`}>
                    {step.label}
                  </span>
                  {step.badge && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {step.badge}
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
