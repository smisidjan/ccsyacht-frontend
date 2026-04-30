import { apiFetch } from "./client";
import type {
  SetupTask,
  SetupTasksUnifiedStatus,
  UpdateSetupTaskRequest,
  AddSetupTaskAssigneeRequest,
  CreateChecklistItemRequest,
  CreateSetupTaskNoteRequest,
  UpdateSetupTaskNoteRequest,
  SetupTaskNote,
  SetupTaskDocument,
  ProposedDate,
  TimeSlot,
  SchedulingStatus,
  AddProposedDateRequest,
  AddTimeSlotRequest,
  RespondToTimeSlotRequest,
  BulkRespondRequest,
  RequiredDocument,
  DocumentAcknowledgementStatus,
} from "./types";

/**
 * Setup Tasks API
 * Base URL: /api/projects/{projectId}/setup-task(s)
 */
export const setupTasksApi = {
  /**
   * GET /api/projects/{projectId}/setup-tasks
   * Get unified setup tasks status
   */
  getUnifiedStatus: async (projectId: string): Promise<SetupTasksUnifiedStatus> => {
    return apiFetch(`/projects/${projectId}/setup-tasks`);
  },

  /**
   * GET /api/projects/{projectId}/setup-task
   * Get all setup tasks for a project
   */
  getAll: async (projectId: string): Promise<{ data: SetupTask[] }> => {
    return apiFetch(`/projects/${projectId}/setup-task`);
  },

  /**
   * GET /api/projects/{projectId}/setup-task/{setupTaskId}
   * Get a specific setup task
   */
  getById: async (projectId: string, setupTaskId: string): Promise<{ data: SetupTask }> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}`);
  },

  /**
   * PUT /api/projects/{projectId}/setup-task/{setupTaskId}
   * Update a setup task
   */
  update: async (
    projectId: string,
    setupTaskId: string,
    data: UpdateSetupTaskRequest
  ): Promise<{ data: SetupTask }> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/assignees
   * Add an assignee to a setup task
   */
  addAssignee: async (
    projectId: string,
    setupTaskId: string,
    data: AddSetupTaskAssigneeRequest
  ): Promise<{ data: any }> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/assignees`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /api/projects/{projectId}/setup-task/{setupTaskId}/assignees/{userId}
   * Remove an assignee from a setup task
   */
  removeAssignee: async (
    projectId: string,
    setupTaskId: string,
    userId: string
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/assignees/${userId}`, {
      method: "DELETE",
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/sign
   * Sign a setup task (current user)
   */
  sign: async (projectId: string, setupTaskId: string): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/sign`, {
      method: "POST",
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/checklist-items
   * Add a custom checklist item
   */
  addChecklistItem: async (
    projectId: string,
    setupTaskId: string,
    data: CreateChecklistItemRequest
  ): Promise<{ data: any }> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/checklist-items`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT /api/projects/{projectId}/setup-task/{setupTaskId}/checklist-items/{itemId}
   * Toggle a checklist item (current user)
   */
  toggleChecklistItem: async (
    projectId: string,
    setupTaskId: string,
    itemId: string
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/checklist-items/${itemId}`, {
      method: "PUT",
    });
  },

  /**
   * DELETE /api/projects/{projectId}/setup-task/{setupTaskId}/checklist-items/{itemId}
   * Remove a checklist item
   */
  removeChecklistItem: async (
    projectId: string,
    setupTaskId: string,
    itemId: string
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/checklist-items/${itemId}`, {
      method: "DELETE",
    });
  },

  // ============ Notes ============
  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/notes
   * Add a note to a setup task
   */
  addNote: async (
    projectId: string,
    setupTaskId: string,
    data: CreateSetupTaskNoteRequest
  ): Promise<SetupTaskNote> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/notes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT /api/projects/{projectId}/setup-task/{setupTaskId}/notes/{noteId}
   * Update a note (only your own)
   */
  updateNote: async (
    projectId: string,
    setupTaskId: string,
    noteId: string,
    data: UpdateSetupTaskNoteRequest
  ): Promise<SetupTaskNote> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /api/projects/{projectId}/setup-task/{setupTaskId}/notes/{noteId}
   * Delete a note (only your own)
   */
  deleteNote: async (
    projectId: string,
    setupTaskId: string,
    noteId: string
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/notes/${noteId}`, {
      method: "DELETE",
    });
  },

  // ============ Documents ============
  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/documents
   * Upload a document to a setup task
   */
  uploadDocument: async (
    projectId: string,
    setupTaskId: string,
    file: File,
    name?: string
  ): Promise<SetupTaskDocument> => {
    const formData = new FormData();
    formData.append("file", file);
    if (name) {
      formData.append("name", name);
    }

    // Use direct fetch for file upload to avoid JSON content-type issues
    const token = localStorage.getItem("token");
    const tenantUrl = localStorage.getItem("tenantUrl");

    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (tenantUrl) {
      headers["X-Tenant-ID"] = tenantUrl;
    }
    // Don't set Content-Type - browser will set it automatically with boundary for multipart

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/projects/${projectId}/setup-task/${setupTaskId}/documents`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || "Failed to upload document");
    }

    return response.json();
  },

  /**
   * GET /api/projects/{projectId}/setup-task/{setupTaskId}/documents/{docId}/download
   * Download a document from a setup task
   */
  downloadDocument: async (
    projectId: string,
    setupTaskId: string,
    docId: string
  ): Promise<Blob> => {
    const response = await fetch(`/api/projects/${projectId}/setup-task/${setupTaskId}/documents/${docId}/download`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "X-Tenant-ID": localStorage.getItem("tenantUrl") || "",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download document");
    }

    return response.blob();
  },

  /**
   * DELETE /api/projects/{projectId}/setup-task/{setupTaskId}/documents/{docId}
   * Delete a document from a setup task
   */
  deleteDocument: async (
    projectId: string,
    setupTaskId: string,
    docId: string
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/documents/${docId}`, {
      method: "DELETE",
    });
  },

  // ============ Kickoff Meeting Scheduling ============

  /**
   * GET /api/projects/{projectId}/setup-task/{setupTaskId}/scheduling-status
   * Get scheduling overview for a kickoff meeting
   */
  getSchedulingStatus: async (
    projectId: string,
    setupTaskId: string
  ): Promise<SchedulingStatus> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/scheduling-status`);
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/proposed-dates
   * Add a proposed date with time slots to a kickoff meeting
   */
  addProposedDate: async (
    projectId: string,
    setupTaskId: string,
    data: AddProposedDateRequest
  ): Promise<{ data: ProposedDate }> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/proposed-dates`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /api/projects/{projectId}/setup-task/{setupTaskId}/proposed-dates/{dateId}
   * Remove a proposed date and all its time slots
   */
  removeProposedDate: async (
    projectId: string,
    setupTaskId: string,
    dateId: string
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/proposed-dates/${dateId}`, {
      method: "DELETE",
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/proposed-dates/{dateId}/time-slots
   * Add a time slot to an existing proposed date
   */
  addTimeSlot: async (
    projectId: string,
    setupTaskId: string,
    dateId: string,
    data: AddTimeSlotRequest
  ): Promise<{ data: TimeSlot }> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/proposed-dates/${dateId}/time-slots`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /api/projects/{projectId}/setup-task/{setupTaskId}/proposed-dates/{dateId}/time-slots/{slotId}
   * Remove a time slot from a proposed date
   */
  removeTimeSlot: async (
    projectId: string,
    setupTaskId: string,
    dateId: string,
    slotId: string
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/proposed-dates/${dateId}/time-slots/${slotId}`, {
      method: "DELETE",
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/time-slots/{slotId}/respond
   * Submit availability response for a time slot
   */
  respondToTimeSlot: async (
    projectId: string,
    setupTaskId: string,
    slotId: string,
    data: RespondToTimeSlotRequest
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/time-slots/${slotId}/respond`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/respond
   * Bulk submit availability responses for multiple time slots
   */
  bulkRespond: async (
    projectId: string,
    setupTaskId: string,
    data: BulkRespondRequest
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/respond`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/send-invitations
   * Send invitation emails to all attendees with proposed dates
   */
  sendInvitations: async (
    projectId: string,
    setupTaskId: string
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/send-invitations`, {
      method: "POST",
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/select-time-slot/{slotId}
   * Select the final time slot for the kickoff meeting
   * @param meetingFormat - Required: "online" or "live"
   * @param meetingLink - Required when meetingFormat is "online"
   */
  selectTimeSlot: async (
    projectId: string,
    setupTaskId: string,
    slotId: string,
    meetingFormat: "online" | "live",
    meetingLink?: string
  ): Promise<{ data: SetupTask }> => {
    const body: { meeting_format: string; meeting_link?: string } = {
      meeting_format: meetingFormat,
    };
    if (meetingLink) {
      body.meeting_link = meetingLink;
    }
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/select-time-slot/${slotId}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/suggest-time-slots
   * Suggest alternative time slots as an attendee (when all existing slots are declined)
   * Suggested slots become voting options for all attendees with isAttendeeSuggestion: true
   * @param suggestions - Array of time slot suggestions (max 5)
   *   - start_datetime: required, ISO datetime string, must be in the future
   *   - end_datetime: optional, ISO datetime string, must be after start_datetime
   */
  suggestTimeSlots: async (
    projectId: string,
    setupTaskId: string,
    suggestions: Array<{ start_datetime: string; end_datetime?: string }>
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/suggest-time-slots`, {
      method: "POST",
      body: JSON.stringify({ suggestions }),
    });
  },

  // ============ Kickoff Form ============

  /**
   * GET /api/projects/{projectId}/setup-task/{setupTaskId}/kickoff-form
   * Get the kickoff meeting form data
   */
  getKickoffForm: async (
    projectId: string,
    setupTaskId: string
  ): Promise<import("./types").KickoffFormData | null> => {
    return apiFetch<import("./types").KickoffFormData>(`/projects/${projectId}/setup-task/${setupTaskId}/kickoff-form`, {
      method: "GET",
    }).catch(() => null);
  },

  /**
   * PUT /api/projects/{projectId}/setup-task/{setupTaskId}/kickoff-form
   * Update the entire kickoff meeting form
   */
  updateKickoffForm: async (
    projectId: string,
    setupTaskId: string,
    data: Partial<import("./types").KickoffFormData>
  ): Promise<import("./types").KickoffFormData> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/kickoff-form`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * PATCH /api/projects/{projectId}/setup-task/{setupTaskId}/kickoff-form/{section}
   * Update a specific section of the kickoff form (for auto-save)
   */
  updateKickoffFormSection: async (
    projectId: string,
    setupTaskId: string,
    section: string,
    data: Record<string, unknown>
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/kickoff-form/${section}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/kickoff-form/complete
   * Mark the kickoff form as completed (ready for sign-off)
   */
  completeKickoffForm: async (
    projectId: string,
    setupTaskId: string
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/kickoff-form/complete`, {
      method: "POST",
    });
  },

  /**
   * GET /api/projects/{projectId}/setup-task/{setupTaskId}/internal-setup
   * Get the CCS internal project setup data (employees only)
   */
  getInternalSetup: async (
    projectId: string,
    setupTaskId: string
  ): Promise<import("./types").InternalProjectSetup | null> => {
    return apiFetch<import("./types").InternalProjectSetup>(`/projects/${projectId}/setup-task/${setupTaskId}/internal-setup`, {
      method: "GET",
    }).catch(() => null);
  },

  /**
   * PUT /api/projects/{projectId}/setup-task/{setupTaskId}/internal-setup
   * Update the CCS internal project setup
   */
  updateInternalSetup: async (
    projectId: string,
    setupTaskId: string,
    data: Partial<import("./types").InternalProjectSetup>
  ): Promise<import("./types").InternalProjectSetup> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/internal-setup`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // ============ Required Document Acknowledgements ============

  /**
   * GET /api/projects/{projectId}/setup-task/{setupTaskId}/required-documents
   * Get required project documents for acknowledgement
   */
  getRequiredDocuments: async (
    projectId: string,
    setupTaskId: string
  ): Promise<RequiredDocument[]> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/required-documents`);
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/required-documents/{docId}/acknowledge
   * Acknowledge a required document (current user)
   * @param agreed - Whether the user agrees with the document
   * @param disagreementReason - Required when agreed is false
   */
  acknowledgeDocument: async (
    projectId: string,
    setupTaskId: string,
    docId: string,
    agreed: boolean,
    disagreementReason?: string
  ): Promise<RequiredDocument> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/required-documents/${docId}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({
        agreed,
        ...(disagreementReason && { disagreement_reason: disagreementReason }),
      }),
    });
  },

  /**
   * GET /api/projects/{projectId}/setup-task/{setupTaskId}/document-acknowledgement-status
   * Get status of all document acknowledgements
   */
  getDocumentAcknowledgementStatus: async (
    projectId: string,
    setupTaskId: string
  ): Promise<DocumentAcknowledgementStatus> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/document-acknowledgement-status`);
  },

  // ============ Kickoff Document ============

  /**
   * GET /api/projects/{projectId}/setup-task/{setupTaskId}/kickoff-document
   * Get the kickoff document for a setup task
   */
  getKickoffDocument: async (
    projectId: string,
    setupTaskId: string
  ): Promise<import("./types").KickoffDocument | null> => {
    return apiFetch<import("./types").KickoffDocument>(
      `/projects/${projectId}/setup-task/${setupTaskId}/kickoff-document`
    ).catch(() => null);
  },

  /**
   * PUT /api/projects/{projectId}/setup-task/{setupTaskId}/documents/{docId}/content
   * Update the TipTap content of a document
   */
  updateDocumentContent: async (
    projectId: string,
    setupTaskId: string,
    docId: string,
    content: Record<string, unknown>
  ): Promise<import("./types").KickoffDocument> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/documents/${docId}/content`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  },

  // ============ Document Comments ============

  /**
   * GET /api/projects/{projectId}/setup-task/{setupTaskId}/documents/{docId}/comments
   * Get all comments for a document
   */
  getDocumentComments: async (
    projectId: string,
    setupTaskId: string,
    docId: string
  ): Promise<{ data: import("./types").DocumentComment[] }> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/documents/${docId}/comments`);
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/documents/{docId}/comments
   * Add a new comment to a document
   */
  addDocumentComment: async (
    projectId: string,
    setupTaskId: string,
    docId: string,
    data: import("./types").CreateDocumentCommentRequest
  ): Promise<import("./types").DocumentComment> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/documents/${docId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * PATCH /api/projects/{projectId}/setup-task/{setupTaskId}/documents/{docId}/comments/{commentId}
   * Update a comment
   */
  updateDocumentComment: async (
    projectId: string,
    setupTaskId: string,
    docId: string,
    commentId: string,
    data: import("./types").UpdateDocumentCommentRequest
  ): Promise<import("./types").DocumentComment> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/documents/${docId}/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /api/projects/{projectId}/setup-task/{setupTaskId}/documents/{docId}/comments/{commentId}
   * Delete a comment
   */
  deleteDocumentComment: async (
    projectId: string,
    setupTaskId: string,
    docId: string,
    commentId: string
  ): Promise<void> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/documents/${docId}/comments/${commentId}`, {
      method: "DELETE",
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/documents/{docId}/comments/{commentId}/replies
   * Add a reply to a comment
   */
  addCommentReply: async (
    projectId: string,
    setupTaskId: string,
    docId: string,
    commentId: string,
    data: import("./types").CreateCommentReplyRequest
  ): Promise<import("./types").DocumentCommentReply> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/documents/${docId}/comments/${commentId}/replies`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/projects/{projectId}/setup-task/{setupTaskId}/documents/{docId}/comments/{commentId}/resolve
   * Mark a comment as resolved/unresolved
   */
  resolveComment: async (
    projectId: string,
    setupTaskId: string,
    docId: string,
    commentId: string,
    isResolved: boolean
  ): Promise<import("./types").DocumentComment> => {
    return apiFetch(`/projects/${projectId}/setup-task/${setupTaskId}/documents/${docId}/comments/${commentId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ is_resolved: isResolved }),
    });
  },
};
