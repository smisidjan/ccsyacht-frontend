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
