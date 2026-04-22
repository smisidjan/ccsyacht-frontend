/**
 * Attachment Utilities
 * Helpers for detecting attachment types (images, documents, etc.)
 */

/** Common document MIME type prefixes */
const DOCUMENT_MIME_PREFIXES = ["application/", "text/", "video/", "audio/"];

/** Common image MIME type prefix */
const IMAGE_MIME_PREFIX = "image/";

/** Image file extensions */
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"];

/** Document file extensions */
const DOCUMENT_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".rtf", ".odt", ".ods", ".odp",
  ".mp4", ".mov", ".avi", ".mp3", ".wav",
];

interface AttachmentLike {
  encodingFormat?: string | null;
  name?: string | null;
  contentUrl?: string | null;
}

/**
 * Determines if an attachment is a document (non-image file)
 * @param attachment - Attachment object with encodingFormat and/or name
 * @returns true if the attachment is a document type
 */
export function isDocumentAttachment(attachment: AttachmentLike): boolean {
  const mimeType = attachment.encodingFormat?.toLowerCase() || "";
  const fileName = attachment.name?.toLowerCase() || "";

  // Check MIME type first
  if (mimeType) {
    // Exclude images
    if (mimeType.startsWith(IMAGE_MIME_PREFIX)) {
      return false;
    }
    // Check for document MIME types
    if (DOCUMENT_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix))) {
      return true;
    }
  }

  // Fall back to extension check
  if (fileName) {
    return DOCUMENT_EXTENSIONS.some(ext => fileName.endsWith(ext));
  }

  return false;
}

/**
 * Determines if an attachment is an image
 * @param attachment - Attachment object with encodingFormat and/or name
 * @returns true if the attachment is an image type
 */
export function isImageAttachment(attachment: AttachmentLike): boolean {
  const mimeType = attachment.encodingFormat?.toLowerCase() || "";
  const fileName = attachment.name?.toLowerCase() || "";

  // Exclude documents first
  if (isDocumentAttachment(attachment)) {
    return false;
  }

  // Check MIME type
  if (mimeType && mimeType.startsWith(IMAGE_MIME_PREFIX)) {
    return true;
  }

  // Fall back to extension check
  if (fileName) {
    return IMAGE_EXTENSIONS.some(ext => fileName.endsWith(ext));
  }

  return false;
}

/**
 * Determines if an attachment is a PDF
 * @param attachment - Attachment object with encodingFormat
 * @returns true if the attachment is a PDF
 */
export function isPDFAttachment(attachment: AttachmentLike): boolean {
  const mimeType = attachment.encodingFormat?.toLowerCase() || "";
  const fileName = attachment.name?.toLowerCase() || "";
  return mimeType === "application/pdf" || fileName.endsWith(".pdf");
}

/**
 * Gets a display-friendly file type label
 * @param attachment - Attachment object
 * @returns Human-readable type label
 */
export function getAttachmentTypeLabel(attachment: AttachmentLike): string {
  if (isPDFAttachment(attachment)) return "PDF";
  if (isImageAttachment(attachment)) return "Image";
  if (isDocumentAttachment(attachment)) return "Document";
  return "File";
}

/**
 * Extracts file extension from filename or URL
 * @param nameOrUrl - Filename or URL
 * @returns Extension without dot, or empty string
 */
export function getFileExtension(nameOrUrl: string): string {
  const name = nameOrUrl.split("/").pop() || nameOrUrl;
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1) return "";
  return name.slice(lastDot + 1).toLowerCase();
}
