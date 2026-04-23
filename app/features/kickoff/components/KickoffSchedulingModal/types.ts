/**
 * KickoffSchedulingModal Types
 * Shared types for the kickoff scheduling modal and its sub-components
 */

import type { SetupTask, SchedulingStatus, ProjectMember, Role } from "@/lib/api/types";

/** The scheduling workflow phases */
export type Phase = "attendees" | "dates" | "responses" | "confirmation";

/** Role type categorization for members */
export type RoleType = "employee" | "guest";

/** Local time slot with start and end time */
export interface LocalTimeSlot {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

/** Local state for dates with multiple time slots */
export interface LocalDateWithTimes {
  date: string; // YYYY-MM-DD
  timeSlots: LocalTimeSlot[];
}

/** Attendee grouping by response status */
export interface AttendeeResponses {
  responded: Array<{
    identifier: string;
    name: string;
  }>;
  pending: Array<{
    identifier: string;
    name: string;
  }>;
}

/** Time slot new inputs state */
export interface TimeInputState {
  start: string;
  end: string;
}

/** Base props shared across all phase components */
export interface PhaseBaseProps {
  projectId: string;
  taskId: string;
  task: SetupTask | null;
  schedulingStatus: SchedulingStatus | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  canManageKickoff: boolean;
}

/** Attendees phase specific props */
export interface AttendeesPhaseProps extends PhaseBaseProps {
  projectMembers: ProjectMember[] | null;
  roles: Role[] | null;
  selectedUserIds: string[];
  setSelectedUserIds: (ids: string[]) => void;
  isAddingAssignees: boolean;
  onAddAssignees: () => Promise<void>;
  onRemoveAssignee: (userId: string) => Promise<void>;
  getMemberInfo: (userId: string) => ProjectMember | undefined;
  roleTypeMap: Record<string, RoleType>;
  onNext: () => void;
}

/** Dates phase specific props */
export interface DatesPhaseProps extends PhaseBaseProps {
  localDatesWithTimes: LocalDateWithTimes[];
  setLocalDatesWithTimes: React.Dispatch<React.SetStateAction<LocalDateWithTimes[]>>;
  newDateInput: string;
  setNewDateInput: (date: string) => void;
  newTimeInputs: Record<string, TimeInputState>;
  setNewTimeInputs: React.Dispatch<React.SetStateAction<Record<string, TimeInputState>>>;
  expandedDates: Set<string>;
  setExpandedDates: React.Dispatch<React.SetStateAction<Set<string>>>;
  isSendingInvitations: boolean;
  onAddDate: () => void;
  onAddTimeSlotToDate: (date: string, startTime: string, endTime: string) => void;
  onRemoveLocalTimeSlot: (date: string, slot: LocalTimeSlot) => void;
  onRemoveLocalDate: (date: string) => void;
  onRemoveProposedDate: (dateId: string) => Promise<void>;
  onSendInvitations: () => Promise<void>;
  hasValidDateTimes: boolean;
  onBack: () => void;
}

/** User response for a time slot with online/live attendance */
export interface TimeSlotUserResponse {
  online: boolean;
  live: boolean;
}

/** Responses phase specific props */
export interface ResponsesPhaseProps extends PhaseBaseProps {
  currentUser: { identifier: string; name: string } | null;
  currentUserResponses: Record<string, TimeSlotUserResponse | null>;
  isRespondingToDate: boolean;
  onRespondToTimeSlot: (slotId: string, canAttendOnline: boolean, canAttendLive: boolean) => Promise<void>;
  isCurrentUserAttendee: boolean;
  hasDeclinedAllSlots: boolean;
  // Propose alternative props
  showProposeAlternative: boolean;
  setShowProposeAlternative: (show: boolean) => void;
  proposedAlternatives: LocalDateWithTimes[];
  setProposedAlternatives: React.Dispatch<React.SetStateAction<LocalDateWithTimes[]>>;
  newProposedDateInput: string;
  setNewProposedDateInput: (date: string) => void;
  newProposedTimeInputs: Record<string, TimeInputState>;
  setNewProposedTimeInputs: React.Dispatch<React.SetStateAction<Record<string, TimeInputState>>>;
  expandedProposedDates: Set<string>;
  setExpandedProposedDates: React.Dispatch<React.SetStateAction<Set<string>>>;
  isSubmittingProposal: boolean;
  onSubmitProposedAlternatives: () => Promise<void>;
  // Handlers for propose alternatives
  onAddProposedAlternativeDate: () => void;
  onAddTimeToProposedDate: (date: string, startTime: string, endTime: string) => void;
  onRemoveTimeFromProposedDate: (date: string, slot: LocalTimeSlot) => void;
  onRemoveProposedAlternativeDate: (date: string) => void;
}

/** Meeting format options */
export type MeetingFormat = "online" | "in_person" | null;

/** Confirmation phase specific props */
export interface ConfirmationPhaseProps extends PhaseBaseProps {
  selectedFinalDateId: string | null;
  setSelectedFinalDateId: (id: string | null) => void;
  selectedMeetingFormat: MeetingFormat;
  setSelectedMeetingFormat: (format: MeetingFormat) => void;
  isSelectingDate: boolean;
  onSelectFinalDate: (slotId?: string, format?: MeetingFormat) => Promise<void>;
  // For propose new dates mode
  confirmationMode: "select" | "propose";
  setConfirmationMode: (mode: "select" | "propose") => void;
  localDatesWithTimes: LocalDateWithTimes[];
  setLocalDatesWithTimes: React.Dispatch<React.SetStateAction<LocalDateWithTimes[]>>;
  newDateInput: string;
  setNewDateInput: (date: string) => void;
  newTimeInputs: Record<string, TimeInputState>;
  setNewTimeInputs: React.Dispatch<React.SetStateAction<Record<string, TimeInputState>>>;
  expandedDates: Set<string>;
  setExpandedDates: React.Dispatch<React.SetStateAction<Set<string>>>;
  isSendingInvitations: boolean;
  onAddDate: () => void;
  onAddTimeSlotToDate: (date: string, startTime: string, endTime: string) => void;
  onRemoveLocalTimeSlot: (date: string, slot: LocalTimeSlot) => void;
  onRemoveLocalDate: (date: string) => void;
  onSendInvitations: () => Promise<void>;
  hasValidDateTimes: boolean;
}

/** Props for the KickoffSchedulingModal */
export interface KickoffSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  taskId: string;
  onUpdate?: () => void;
}
