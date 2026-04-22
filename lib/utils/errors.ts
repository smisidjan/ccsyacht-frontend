/**
 * Extracts error message from various error types
 * @param error - The error object
 * @param fallbackMessage - Default message if extraction fails
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage: string = "An error occurred"
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;

    // Check common error message properties
    if (typeof errorObj.message === "string") {
      return errorObj.message;
    }
    if (typeof errorObj.error === "string") {
      return errorObj.error;
    }
    if (typeof errorObj.detail === "string") {
      return errorObj.detail;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return fallbackMessage;
}

/**
 * Translates API error messages using a translation function and error map
 * @param error - The error object
 * @param t - Translation function (e.g., from next-intl)
 * @param errorMap - Map of API error messages to translation keys
 * @param fallbackKey - Fallback translation key if no mapping found
 */
export function translateApiError(
  error: unknown,
  t: (key: string) => string,
  errorMap?: Record<string, string>,
  fallbackKey: string = "error"
): string {
  const message = getErrorMessage(error, "");

  // Try to find a translation key in the error map
  if (errorMap && message && errorMap[message]) {
    return t(errorMap[message]);
  }

  // If no mapping found, return the original message or fallback
  return message || t(fallbackKey);
}

/**
 * Error severity levels for different handling strategies
 */
export type ErrorSeverity = "silent" | "toast" | "console" | "both";

export interface HandleErrorOptions {
  /** How to handle the error */
  severity?: ErrorSeverity;
  /** Fallback message if error message can't be extracted */
  fallbackMessage?: string;
  /** Toast function for showing user-facing errors */
  showToast?: (type: "error" | "success" | "warning", message: string) => void;
  /** Context for better error logging */
  context?: string;
}

/**
 * Centralized error handler for consistent error handling across the app
 *
 * @example
 * ```tsx
 * const { showToast } = useToast();
 *
 * try {
 *   await api.doSomething();
 * } catch (error) {
 *   handleError(error, {
 *     severity: "both",
 *     showToast,
 *     context: "Creating project",
 *     fallbackMessage: "Failed to create project"
 *   });
 * }
 * ```
 */
export function handleError(
  error: unknown,
  options: HandleErrorOptions = {}
): string {
  const {
    severity = "both",
    fallbackMessage = "An error occurred",
    showToast,
    context,
  } = options;

  const message = getErrorMessage(error, fallbackMessage);
  const logMessage = context ? `[${context}] ${message}` : message;

  // Console logging (for debugging)
  if (severity === "console" || severity === "both") {
    console.error(logMessage, error);
  }

  // Toast notification (for user feedback)
  if ((severity === "toast" || severity === "both") && showToast) {
    showToast("error", message);
  }

  return message;
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is { message: string; status?: number; code?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}
