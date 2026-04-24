"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import Alert from "@/app/components/ui/Alert";
import { setupTasksApi, useDocumentTypes } from "@/lib/api";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { useToast } from "@/app/context/ToastContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { handleError } from "@/lib/utils/errors";
import type { SetupTask, SchedulingStatus, RequiredDocument } from "@/lib/api/types";

// Section Components
import StatusHeader from "./StatusHeader";
import DocumentStatsSection from "./DocumentStatsSection";
import AttendeesSection from "./AttendeesSection";
import MeetingDocumentSection from "./MeetingDocumentSection";
import PendingDocumentsSection from "./PendingDocumentsSection";
import RequiredDocumentsSection from "./RequiredDocumentsSection";

import type {
  KickoffMeetingModalProps,
  TimeSlotInfo,
  DocumentStats,
  Progress,
  PendingDocument,
  NormalizedRequiredDocument,
  NormalizedAcknowledgement,
} from "./types";

export default function KickoffMeetingModal({
  isOpen,
  onClose,
  projectId,
  taskId,
  onUpdate,
}: KickoffMeetingModalProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();
  const { hasPermission } = usePermission();
  const { currentUser } = useCurrentUserContext();

  const [task, setTask] = useState<SetupTask | null>(null);
  const [schedulingStatus, setSchedulingStatus] = useState<SchedulingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document state
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Required Documents state
  const [requiredDocuments, setRequiredDocuments] = useState<NormalizedRequiredDocument[]>([]);
  const [acknowledgingDocId, setAcknowledgingDocId] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // Disagree modal state
  const [disagreeDocId, setDisagreeDocId] = useState<string | null>(null);
  const [disagreementReason, setDisagreementReason] = useState("");
  const [isSubmittingDisagree, setIsSubmittingDisagree] = useState(false);

  // Delete confirmation state
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permissions
  const canEditProject = hasPermission(PERMISSIONS.EDIT_PROJECTS);

  // Fetch document types
  const { data: documentTypes } = useDocumentTypes(projectId, { includeAssignees: true });

  // Check if current user is an attendee
  const currentUserAttendee = useMemo(() => {
    if (!task || !currentUser || !task.assignees) return null;
    return task.assignees.find((a) => a.identifier === currentUser.identifier);
  }, [task, currentUser]);

  const isAttendee = !!currentUserAttendee;

  // Find the selected time slot
  const selectedTimeSlotInfo = useMemo((): TimeSlotInfo | null => {
    if (schedulingStatus?.selectedTimeSlot) {
      return {
        date: schedulingStatus.selectedTimeSlot.date,
        startTime: schedulingStatus.selectedTimeSlot.startTime,
        endTime: schedulingStatus.selectedTimeSlot.endTime,
        meetingFormat: schedulingStatus.selectedTimeSlot.meetingFormat || null,
      };
    }
    if (task?.proposedDates) {
      for (const proposedDate of task.proposedDates) {
        for (const slot of proposedDate.timeSlots) {
          if (slot.isSelected) {
            return {
              date: proposedDate.proposedDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
              meetingFormat: task.meetingFormat || null,
            };
          }
        }
      }
    }
    return null;
  }, [task?.proposedDates, task?.meetingFormat, schedulingStatus?.selectedTimeSlot]);

  // Get the meeting document
  const meetingDocument = useMemo(() => {
    return task?.documents?.[0] || null;
  }, [task?.documents]);

  // Get pending documents
  const pendingDocuments = useMemo((): PendingDocument[] => {
    if (!documentTypes) return [];
    return documentTypes
      .filter((dt) => dt.isRequired && dt.documentCount === 0)
      .map((dt) => ({
        ...dt,
        isRequested: !!(dt.assignees && dt.assignees.length > 0),
        dueDate: selectedTimeSlotInfo?.date || null,
      } as PendingDocument));
  }, [documentTypes, selectedTimeSlotInfo]);

  const requiredPendingDocs = useMemo(
    () => pendingDocuments.filter((d) => !d.isRequested),
    [pendingDocuments]
  );
  const requestedPendingDocs = useMemo(
    () => pendingDocuments.filter((d) => d.isRequested),
    [pendingDocuments]
  );

  // Calculate progress
  const progress = useMemo((): Progress | null => {
    if (!task || !task.assignees) return null;
    const totalAttendees = task.assignees.length;
    const signedAttendees = task.assignees.filter((a) => a.hasSigned).length;
    return {
      signatures: { count: signedAttendees, total: totalAttendees },
    };
  }, [task]);

  // Calculate document stats
  const documentStats = useMemo((): DocumentStats | null => {
    if (!requiredDocuments.length) return null;
    const totalAssignees = task?.assignees?.length || 0;

    const needsUserAction = requiredDocuments.filter((doc) => {
      if (!currentUser) return false;
      const userAck = doc.acknowledgements.find(
        (a) => a.identifier === currentUser.identifier || a.name === currentUser.name
      );
      return !userAck || userAck.hasAgreed === null;
    });

    const disputed = requiredDocuments.filter((doc) =>
      doc.acknowledgements.some((a) => a.hasAgreed === false)
    );

    const completed = requiredDocuments.filter((doc) => {
      const respondedCount = doc.acknowledgements.filter(
        (a) => a.hasAgreed === true || a.hasAgreed === false
      ).length;
      const effectiveTotal = doc.totalAssignees || totalAssignees;
      const hasDisagreement = doc.acknowledgements.some((a) => a.hasAgreed === false);
      return effectiveTotal > 0 && respondedCount === effectiveTotal && !hasDisagreement;
    });

    const pendingOthers = requiredDocuments.filter((doc) => {
      const respondedCount = doc.acknowledgements.filter(
        (a) => a.hasAgreed === true || a.hasAgreed === false
      ).length;
      const effectiveTotal = doc.totalAssignees || totalAssignees;
      const hasDisagreement = doc.acknowledgements.some((a) => a.hasAgreed === false);
      return !hasDisagreement && respondedCount < effectiveTotal;
    });

    return {
      total: requiredDocuments.length,
      needsUserAction: needsUserAction.length,
      disputed: disputed.length,
      completed: completed.length,
      pendingOthers: pendingOthers.length,
    };
  }, [requiredDocuments, currentUser, task]);

  // Fetch task details
  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
    }
  }, [isOpen, taskId]);

  const normalizeAcknowledgements = (
    rawAcks: RequiredDocument["acknowledgements"]
  ): NormalizedAcknowledgement[] => {
    if (Array.isArray(rawAcks)) {
      return rawAcks.map((ack) => ({
        identifier: ack.identifier || "",
        name: ack.name || "Unknown",
        acknowledgedAt: ack.acknowledgedAt || null,
        hasRead: ack.hasRead ?? false,
        readAt: ack.readAt || null,
        hasAgreed: ack.hasAgreed ?? null,
        agreedAt: ack.agreedAt || null,
        disagreementReason: ack.disagreementReason || null,
      }));
    } else if (rawAcks && typeof rawAcks === "object") {
      const ackValues = Object.values(rawAcks) as Array<{
        agent?: { identifier: string; name: string };
        identifier?: string;
        name?: string;
        dateCreated?: string;
        hasRead?: boolean;
        readAt?: string;
        hasAgreed?: boolean | null;
        agreedAt?: string;
        disagreementReason?: string;
      }>;
      return ackValues.map((ack) => ({
        identifier: ack.agent?.identifier || ack.identifier || "",
        name: ack.agent?.name || ack.name || "Unknown",
        acknowledgedAt: ack.dateCreated || null,
        hasRead: ack.hasRead ?? false,
        readAt: ack.readAt || null,
        hasAgreed: ack.hasAgreed ?? null,
        agreedAt: ack.agreedAt || null,
        disagreementReason: ack.disagreementReason || null,
      }));
    }
    return [];
  };

  const fetchTaskDetails = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const [taskResponse, statusResponse, requiredDocsResponse] = await Promise.all([
        setupTasksApi.getById(projectId, taskId),
        setupTasksApi.getSchedulingStatus(projectId, taskId).catch(() => null),
        setupTasksApi.getRequiredDocuments(projectId, taskId).catch(() => []),
      ]);

      const taskData = taskResponse.data || taskResponse;
      if (!taskData) throw new Error(t("loadError"));

      setTask(taskData);
      if (statusResponse) setSchedulingStatus(statusResponse);

      const normalizedDocs = (
        Array.isArray(requiredDocsResponse) ? requiredDocsResponse : []
      ).map((doc) => ({
        ...doc,
        acknowledgements: normalizeAcknowledgements(doc.acknowledgements),
      }));
      setRequiredDocuments(normalizedDocs);
    } catch (err) {
      const errorMessage = handleError(err, {
        severity: "console",
        context: "Error fetching task details",
        fallbackMessage: t("loadError"),
      });
      setError(errorMessage);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refreshTaskDetails = () => fetchTaskDetails(true);

  // Handlers
  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast("error", t("fileTooLarge"));
      return;
    }

    try {
      setIsUploadingDocument(true);
      await setupTasksApi.uploadDocument(projectId, taskId, file);
      showToast("success", t("documentUploaded"));
      await refreshTaskDetails();
      e.target.value = "";
    } catch {
      showToast("error", t("documentUploadError"));
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      setIsDeleting(true);
      await setupTasksApi.deleteDocument(projectId, taskId, documentToDelete);
      showToast("success", t("documentDeleted"));
      setDocumentToDelete(null);
      await refreshTaskDetails();
    } catch {
      showToast("error", t("documentDeleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAcknowledgeDocument = async (docId: string, agreed: boolean, reason?: string) => {
    try {
      setAcknowledgingDocId(docId);
      await setupTasksApi.acknowledgeDocument(projectId, taskId, docId, agreed, reason);
      showToast("success", agreed ? t("agreeSuccess") : t("disagreeSuccess"));
      await refreshTaskDetails();
      onUpdate?.();
    } catch {
      showToast("error", t("acknowledgeError"));
    } finally {
      setAcknowledgingDocId(null);
    }
  };

  const handleDisagreeClick = (docId: string) => {
    setDisagreeDocId(docId);
    setDisagreementReason("");
  };

  const handleDisagreeSubmit = async () => {
    if (!disagreeDocId || !disagreementReason.trim()) return;

    try {
      setIsSubmittingDisagree(true);
      await setupTasksApi.acknowledgeDocument(
        projectId,
        taskId,
        disagreeDocId,
        false,
        disagreementReason.trim()
      );
      showToast("success", t("disagreeSuccess"));
      setDisagreeDocId(null);
      setDisagreementReason("");
      await refreshTaskDetails();
      onUpdate?.();
    } catch {
      showToast("error", t("acknowledgeError"));
    } finally {
      setIsSubmittingDisagree(false);
    }
  };

  const handleDisagreeCancel = () => {
    setDisagreeDocId(null);
    setDisagreementReason("");
  };

  // Helper functions
  const hasUserRespondedToDocument = (doc: NormalizedRequiredDocument): boolean => {
    if (!currentUser || !Array.isArray(doc.acknowledgements)) return false;
    const ack = doc.acknowledgements.find((a) => a.identifier === currentUser.identifier);
    return ack?.hasAgreed !== null && ack?.hasAgreed !== undefined;
  };

  const hasDocumentDisagreement = (doc: NormalizedRequiredDocument): boolean => {
    return doc.acknowledgements.some((ack) => ack.hasAgreed === false);
  };

  const isDocumentResubmission = (doc: NormalizedRequiredDocument): boolean => {
    const actualAckCount = doc.acknowledgements.filter(
      (ack) => ack.hasAgreed === true || ack.hasAgreed === false
    ).length;
    if (actualAckCount > 0) return false;

    const docCategory = doc.category?.identifier || doc.category?.name;
    if (!docCategory) return false;

    return requiredDocuments.some((otherDoc) => {
      if (otherDoc.identifier === doc.identifier) return false;
      const otherCategory = otherDoc.category?.identifier || otherDoc.category?.name;
      if (otherCategory !== docCategory) return false;
      return otherDoc.acknowledgements.some((ack) => ack.hasAgreed === false);
    });
  };

  const actions = useMemo(() => {
    return [
      {
        label: tCommon("close"),
        onClick: onClose,
        variant: "secondary" as const,
      },
    ];
  }, [tCommon, onClose]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={task?.name || t("title")}
        size="lg"
        actions={actions}
        error={error}
      >
        {loading ? (
          <div className="space-y-4 py-8">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mx-auto" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse mx-auto" />
          </div>
        ) : (
          task && (
            <div className="space-y-6">
              <StatusHeader task={task} />

              {task.actionStatus === "completed" && (
                <Alert type="success" message={t("taskCompleted")} />
              )}

              <DocumentStatsSection
                documentStats={documentStats}
                progress={progress}
                pendingDocuments={pendingDocuments}
                requiredPendingDocs={requiredPendingDocs}
                requestedPendingDocs={requestedPendingDocs}
                taskStatus={task.actionStatus}
                hasRequiredDocuments={requiredDocuments.length > 0}
              />

              <AttendeesSection assignees={task.assignees || []} />

              <MeetingDocumentSection
                task={task}
                projectId={projectId}
                taskId={taskId}
                meetingDocument={meetingDocument}
                canEditProject={canEditProject}
                isUploadingDocument={isUploadingDocument}
                onUpload={handleUploadDocument}
                onDelete={setDocumentToDelete}
                isAttendee={isAttendee}
                currentUserAttendee={currentUserAttendee ?? null}
              />

              <PendingDocumentsSection
                requiredPendingDocs={requiredPendingDocs}
                requestedPendingDocs={requestedPendingDocs}
              />

              <RequiredDocumentsSection
                task={task}
                projectId={projectId}
                taskId={taskId}
                requiredDocuments={requiredDocuments}
                expandedDocId={expandedDocId}
                setExpandedDocId={setExpandedDocId}
                acknowledgingDocId={acknowledgingDocId}
                isAttendee={isAttendee}
                onAcknowledge={handleAcknowledgeDocument}
                onDisagreeClick={handleDisagreeClick}
                hasUserRespondedToDocument={hasUserRespondedToDocument}
                hasDocumentDisagreement={hasDocumentDisagreement}
                isDocumentResubmission={isDocumentResubmission}
              />
            </div>
          )
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        title={t("deleteDocumentTitle")}
        size="sm"
        actions={[
          {
            label: tCommon("cancel"),
            onClick: () => setDocumentToDelete(null),
            variant: "secondary",
          },
          {
            label: tCommon("delete"),
            onClick: handleDeleteDocument,
            variant: "danger",
            loading: isDeleting,
            disabled: isDeleting,
          },
        ]}
      >
        <p className="text-gray-600 dark:text-gray-400">{t("confirmDeleteDocument")}</p>
      </Modal>

      {/* Disagree Reason Modal */}
      <Modal
        isOpen={!!disagreeDocId}
        onClose={handleDisagreeCancel}
        title={t("disagreeTitle")}
        size="sm"
        actions={[
          {
            label: tCommon("cancel"),
            onClick: handleDisagreeCancel,
            variant: "secondary",
          },
          {
            label: t("submitDisagree"),
            onClick: handleDisagreeSubmit,
            variant: "danger",
            loading: isSubmittingDisagree,
            disabled: isSubmittingDisagree || !disagreementReason.trim(),
          },
        ]}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">{t("disagreeDescription")}</p>
          <textarea
            value={disagreementReason}
            onChange={(e) => setDisagreementReason(e.target.value)}
            placeholder={t("disagreePlaceholder")}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}
