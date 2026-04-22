/**
 * File Upload Configuration
 * Centralized constants for file upload validation across the application
 */

/** Maximum file size in bytes (20MB) - default for most uploads */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** Maximum file size in bytes (10MB) - for GA pin attachments */
export const MAX_GA_FILE_SIZE = 10 * 1024 * 1024;

/** Human-readable file size labels */
export const FILE_SIZE_LABELS = {
  default: "20MB",
  ga: "10MB",
} as const;

/** Allowed image MIME types */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

/** Allowed document MIME types */
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
] as const;

/**
 * Validates file size against maximum allowed
 * @param file - File to validate
 * @param maxSize - Maximum size in bytes (defaults to MAX_FILE_SIZE)
 * @returns true if file is within size limit
 */
export function isFileSizeValid(file: File, maxSize: number = MAX_FILE_SIZE): boolean {
  return file.size <= maxSize;
}

/**
 * Formats bytes to human-readable string
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
