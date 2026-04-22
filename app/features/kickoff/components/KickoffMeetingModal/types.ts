/**
 * KickoffMeetingModal Types
 * Type definitions for the kickoff meeting modal components
 */

import type {
  SetupTask,
  SchedulingStatus,
  RequiredDocument,
  DocumentType,
  SetupTaskAssignee,
  SetupTaskDocument,
} from "@/lib/api/types";

export interface KickoffMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  taskId: string;
  onUpdate?: () => void;
}

export interface TimeSlotInfo {
  date: string;
  startTime: string;
  endTime: string;
}

export interface DocumentStats {
  total: number;
  needsUserAction: number;
  disputed: number;
  completed: number;
  pendingOthers: number;
}

export interface SignatureProgress {
  count: number;
  total: number;
}

export interface Progress {
  signatures: SignatureProgress;
}

export interface PendingDocument extends DocumentType {
  isRequested: boolean;
  dueDate: string | null;
}

export interface NormalizedAcknowledgement {
  identifier: string;
  name: string;
  acknowledgedAt: string | null;
  hasRead: boolean;
  readAt: string | null;
  hasAgreed: boolean | null;
  agreedAt: string | null;
  disagreementReason: string | null;
}

export interface NormalizedRequiredDocument extends Omit<RequiredDocument, "acknowledgements"> {
  acknowledgements: NormalizedAcknowledgement[];
}

// Shared section props
export interface SectionBaseProps {
  task: SetupTask;
  projectId: string;
  taskId: string;
}

export interface StatusHeaderProps {
  task: SetupTask;
  selectedTimeSlotInfo: TimeSlotInfo | null;
}

export interface DocumentStatsProps {
  documentStats: DocumentStats | null;
  progress: Progress | null;
  pendingDocuments: PendingDocument[];
  requiredPendingDocs: PendingDocument[];
  requestedPendingDocs: PendingDocument[];
  taskStatus: string;
  hasRequiredDocuments: boolean;
}

export interface AttendeesProps {
  assignees: SetupTaskAssignee[];
}

export interface MeetingDocumentProps extends SectionBaseProps {
  meetingDocument: RequiredDocument["documents"][0] | null;
  canEditProject: boolean;
  isUploadingDocument: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (documentId: string) => void;
  isAttendee: boolean;
  currentUserAttendee: SetupTaskAssignee | null;
}

export interface PendingDocumentsProps {
  requiredPendingDocs: PendingDocument[];
  requestedPendingDocs: PendingDocument[];
}

export interface RequiredDocumentsProps extends SectionBaseProps {
  requiredDocuments: NormalizedRequiredDocument[];
  expandedDocId: string | null;
  setExpandedDocId: (id: string | null) => void;
  acknowledgingDocId: string | null;
  isAttendee: boolean;
  onAcknowledge: (docId: string, agreed: boolean) => void;
  onDisagreeClick: (docId: string) => void;
  hasUserRespondedToDocument: (doc: NormalizedRequiredDocument) => boolean;
  hasDocumentDisagreement: (doc: NormalizedRequiredDocument) => boolean;
  isDocumentResubmission: (doc: NormalizedRequiredDocument) => boolean;
}

export interface DocumentAccordionItemProps {
  doc: NormalizedRequiredDocument;
  task: SetupTask;
  projectId: string;
  isExpanded: boolean;
  onToggle: () => void;
  acknowledgingDocId: string | null;
  isAttendee: boolean;
  onAcknowledge: (docId: string, agreed: boolean) => void;
  onDisagreeClick: (docId: string) => void;
  userHasResponded: boolean;
  hasDisagreement: boolean;
  isResubmission: boolean;
}
