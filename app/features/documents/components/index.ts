/**
 * Documents Feature Components
 * Barrel export for all document-related components
 */

// Main tab component
export { default as DocumentsTab } from "./DocumentsTab";

// Sub-components (used internally by DocumentsTab)
export { default as DocumentTypeSidebar } from "./DocumentTypeSidebar";
export { default as DocumentsPanel } from "./DocumentsPanel";
export { default as AssigneesList } from "./AssigneesList";
export { default as DocumentAcknowledgementsSummary } from "./DocumentAcknowledgementsSummary";

// Status components
export { default as DocumentAcknowledgementStatus } from "./DocumentAcknowledgementStatus";

// Modal components
export { default as DocumentViewerModal } from "./DocumentViewerModal";
export { default as AssignDocumentModal } from "./AssignDocumentModal";
export { default as UploadDocumentModal } from "./UploadDocumentModal";
export { default as CreateDocumentTypeModal } from "./CreateDocumentTypeModal";
export { default as EditDocumentTypeModal } from "./EditDocumentTypeModal";
export { default as DocumentTypeModal } from "./DocumentTypeModal";
