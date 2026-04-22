/**
 * Type Normalization Utilities
 * Helpers for normalizing API responses that may come in different formats
 */

import type { DocumentAcknowledgement } from "@/lib/api/types";

/**
 * Normalizes acknowledgements from object to array
 * The API sometimes returns acknowledgements as an object with numeric keys
 * instead of an array. This function handles both cases.
 *
 * @param acknowledgements - Array or object of acknowledgements
 * @returns Normalized array of DocumentAcknowledgement
 *
 * @example
 * // Array input (passes through)
 * normalizeAcknowledgements([{ identifier: "1", hasAgreed: true }])
 * // => [{ identifier: "1", hasAgreed: true }]
 *
 * @example
 * // Object input (converts to array)
 * normalizeAcknowledgements({ "0": { identifier: "1", hasAgreed: true } })
 * // => [{ identifier: "1", hasAgreed: true }]
 */
export function normalizeAcknowledgements(
  acknowledgements: DocumentAcknowledgement[] | Record<string, DocumentAcknowledgement> | unknown
): DocumentAcknowledgement[] {
  if (!acknowledgements) return [];
  if (Array.isArray(acknowledgements)) return acknowledgements;
  if (typeof acknowledgements === "object") {
    return Object.values(acknowledgements as Record<string, DocumentAcknowledgement>);
  }
  return [];
}

/**
 * Normalizes a value that might be an array or a single item into an array
 * @param value - Single item or array
 * @returns Array of items
 */
export function normalizeToArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Safely extracts a nested property path from an object
 * @param obj - Source object
 * @param path - Dot-separated path (e.g., "user.profile.name")
 * @param defaultValue - Default value if path doesn't exist
 * @returns Value at path or default
 */
export function getNestedValue<T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue: T
): T {
  const value = path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return (value as T) ?? defaultValue;
}
