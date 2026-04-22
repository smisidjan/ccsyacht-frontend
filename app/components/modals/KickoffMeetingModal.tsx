"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { CalendarIcon, CheckIcon, DocumentIcon, EyeIcon, TrashIcon, ClockIcon, ChevronDownIcon, ChevronRightIcon, ArrowUpTrayIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import Tooltip from "@/app/components/ui/Tooltip";
import { setupTasksApi, useCurrentUser, useDocumentTypes } from "@/lib/api";
import type { SetupTask, SchedulingStatus, RequiredDocument, DocumentType } from "@/lib/api/types";
import { useToast } from "@/app/context/ToastContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";

interface KickoffMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  taskId: string;
  onUpdate?: () => void;
}

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
  const { data: currentUser } = useCurrentUser();

  const [task, setTask] = useState<SetupTask | null>(null);
  const [schedulingStatus, setSchedulingStatus] = useState<SchedulingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document state
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Required Documents state
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
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

  // Fetch document types to show pending required/requested documents
  const { data: documentTypes } = useDocumentTypes(projectId, { includeAssignees: true });

  // Check if current user is an attendee
  const currentUserAttendee = useMemo(() => {
    if (!task || !currentUser || !task.assignees) return null;
    return task.assignees.find(a => a.identifier === currentUser.identifier);
  }, [task, currentUser]);

  const isAttendee = !!currentUserAttendee;

  // Find the selected time slot
  const selectedTimeSlotInfo = useMemo(() => {
    if (schedulingStatus?.selectedTimeSlot) {
      return {
        date: schedulingStatus.selectedTimeSlot.date,
        startTime: schedulingStatus.selectedTimeSlot.startTime,
        endTime: schedulingStatus.selectedTimeSlot.endTime,
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
            };
          }
        }
      }
    }
    return null;
  }, [task?.proposedDates, schedulingStatus?.selectedTimeSlot]);

  // Get the meeting document (first uploaded document)
  const meetingDocument = useMemo(() => {
    return task?.documents?.[0] || null;
  }, [task?.documents]);

  // Get pending documents (required or requested but not yet uploaded)
  const pendingDocuments = useMemo(() => {
    if (!documentTypes) return [];

    // Filter document types that are required and have no documents uploaded yet
    return documentTypes.filter(dt => {
      // Must be required AND have no documents uploaded
      if (!dt.isRequired || dt.documentCount > 0) return false;
      return true;
    }).map(dt => ({
      ...dt,
      // Check if it's assigned (requested) vs just required
      isRequested: dt.assignees && dt.assignees.length > 0,
      // Due date is the meeting date
      dueDate: selectedTimeSlotInfo?.date || null,
    }));
  }, [documentTypes, selectedTimeSlotInfo]);

  // Separate into required (not assigned) and requested (assigned)
  const requiredPendingDocs = useMemo(() =>
    pendingDocuments.filter(d => !d.isRequested), [pendingDocuments]);
  const requestedPendingDocs = useMemo(() =>
    pendingDocuments.filter(d => d.isRequested), [pendingDocuments]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!task || !task.assignees) return null;

    const totalAttendees = task.assignees.length;
    const signedAttendees = task.assignees.filter(a => a.hasSigned).length;
    const totalDocs = requiredDocuments.length;
    const acknowledgedDocs = requiredDocuments.filter(doc => doc.allAcknowledged).length;

    return {
      signatures: { count: signedAttendees, total: totalAttendees },
      documents: { count: acknowledgedDocs, total: totalDocs },
    };
  }, [task, requiredDocuments]);

  // Fetch task details
  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
    }
  }, [isOpen, taskId]);

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

      // Normalize required documents to ensure acknowledgements is always an array
      // API returns acknowledgements as object with numeric keys, need to convert to array
      const normalizedDocs = (Array.isArray(requiredDocsResponse) ? requiredDocsResponse : []).map(doc => {
        let acknowledgements: Array<{
          identifier: string;
          name: string;
          acknowledgedAt: string | null;
          hasRead: boolean;
          readAt: string | null;
          hasAgreed: boolean | null;
          agreedAt: string | null;
          disagreementReason: string | null;
        }> = [];

        if (Array.isArray(doc.acknowledgements)) {
          acknowledgements = doc.acknowledgements;
        } else if (doc.acknowledgements && typeof doc.acknowledgements === 'object') {
          // Convert object with numeric keys to array, extracting agent data
          const ackValues = Object.values(doc.acknowledgements) as Array<{
            agent?: { identifier: string; name: string };
            dateCreated?: string;
            hasRead?: boolean;
            readAt?: string;
            hasAgreed?: boolean | null;
            agreedAt?: string;
            disagreementReason?: string;
          }>;
          acknowledgements = ackValues.map(ack => ({
            identifier: ack.agent?.identifier || '',
            name: ack.agent?.name || '',
            acknowledgedAt: ack.dateCreated || null,
            hasRead: ack.hasRead ?? false,
            readAt: ack.readAt || null,
            hasAgreed: ack.hasAgreed ?? null,
            agreedAt: ack.agreedAt || null,
            disagreementReason: ack.disagreementReason || null,
          }));
        }

        return {
          ...doc,
          acknowledgements,
        };
      });
      setRequiredDocuments(normalizedDocs);
    } catch (err) {
      console.error("Error fetching task details:", err);
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refreshTaskDetails = () => fetchTaskDetails(true);

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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
      await setupTasksApi.acknowledgeDocument(projectId, taskId, disagreeDocId, false, disagreementReason.trim());
      showToast("success", t("disagreeSuccess"));
      setDisagreeDocId(null);
      setDisagreementReason("");
      await refreshTaskDetails();
      onUpdate?.();
    } catch (err) {
      showToast("error", t("acknowledgeError"));
    } finally {
      setIsSubmittingDisagree(false);
    }
  };

  const handleDisagreeCancel = () => {
    setDisagreeDocId(null);
    setDisagreementReason("");
  };

  const getUserAcknowledgement = (doc: RequiredDocument) => {
    if (!currentUser || !Array.isArray(doc.acknowledgements)) return null;
    return doc.acknowledgements.find(ack => ack.identifier === currentUser.identifier) || null;
  };

  const hasUserAcknowledgedDocument = (doc: RequiredDocument): boolean => {
    const ack = getUserAcknowledgement(doc);
    return ack?.hasRead === true;
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
        ) : task && (
          <div className="space-y-6">
            {/* Header: Status + Date */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                task.actionStatus === "completed"
                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : task.actionStatus === "scheduled"
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                  : "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
              }`}>
                {task.actionStatus === "completed" && <CheckIcon className="w-4 h-4" />}
                {task.actionStatus === "completed" ? t("statusCompleted") : task.actionStatus === "scheduled" ? t("statusScheduled") : t("statusPending")}
              </span>
              {selectedTimeSlotInfo && (
                <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <CalendarIcon className="w-4 h-4" />
                  {new Date(selectedTimeSlotInfo.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, {selectedTimeSlotInfo.startTime} - {selectedTimeSlotInfo.endTime}
                </span>
              )}
            </div>

            {/* Completed Alert */}
            {task.actionStatus === "completed" && (
              <Alert type="success" message={t("taskCompleted")} />
            )}

            {/* Progress Bar - Compact */}
            {progress && (task.actionStatus === "scheduled" || requiredDocuments.length > 0) && (
              <div className="flex items-center gap-6 text-sm">
                {requiredDocuments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <DocumentIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{t("documentsProgress")}</span>
                    <span className={`font-semibold ${progress.documents.count === progress.documents.total ? "text-green-600" : "text-gray-900 dark:text-white"}`}>
                      {progress.documents.count}/{progress.documents.total}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{t("signatures")}</span>
                  <span className={`font-semibold ${progress.signatures.count === progress.signatures.total ? "text-green-600" : "text-gray-900 dark:text-white"}`}>
                    {progress.signatures.count}/{progress.signatures.total}
                  </span>
                </div>
              </div>
            )}

            {/* Attendees - Compact Avatar Row */}
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {task.assignees.map((assignee) => (
                    <Tooltip
                      key={assignee.identifier}
                      content={`${assignee.name}\n${assignee.email}`}
                      position="top"
                      multiline
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ring-2 ring-white dark:ring-gray-900 cursor-default transition-transform duration-150 hover:scale-125 hover:z-10 ${
                          assignee.hasSigned
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {assignee.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    </Tooltip>
                  ))}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {task.assignees.filter(a => a.hasSigned).length} of {task.assignees.length} signed
                </span>
              </div>
            )}

            {/* Meeting Document - Single Upload Area */}
            {task.actionStatus !== "pending" && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{t("meetingDocument")}</h4>

                {meetingDocument ? (
                  <div className="space-y-3">
                    {/* Document card */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <DocumentIcon className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{meetingDocument.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {meetingDocument.author?.name} • {meetingDocument.dateCreated && new Date(meetingDocument.dateCreated).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={(() => {
                            const token = localStorage.getItem("token") || "";
                            const tenantUrl = localStorage.getItem("tenantUrl") || "";
                            return `${process.env.NEXT_PUBLIC_API_URL || "/api"}/projects/${projectId}/setup-task/${taskId}/documents/${meetingDocument.identifier}/download?token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(tenantUrl)}&inline=true`;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </a>
                        {canEditProject && task.actionStatus !== "completed" && (
                          <button
                            onClick={() => setDocumentToDelete(meetingDocument.identifier)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Signature status */}
                    {task.assignees && task.assignees.length > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {task.assignees.map((assignee) => (
                              <Tooltip
                                key={assignee.identifier}
                                content={`${assignee.name}\n${assignee.hasSigned ? t("meetingDocumentSigned") : t("meetingDocumentPending")}`}
                                position="top"
                                multiline
                              >
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ring-2 ring-white dark:ring-gray-800 cursor-default transition-transform duration-150 hover:scale-125 hover:z-10 ${
                                    assignee.hasSigned
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                      : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                                  }`}
                                >
                                  {assignee.hasSigned ? (
                                    <CheckIcon className="w-4 h-4" />
                                  ) : (
                                    <ClockIcon className="w-4 h-4" />
                                  )}
                                </div>
                              </Tooltip>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {task.assignees.filter(a => a.hasSigned).length}/{task.assignees.length}
                          </span>
                        </div>

                        {/* Sign button for current user */}
                        {isAttendee && currentUserAttendee && !currentUserAttendee.hasSigned && task.actionStatus !== "completed" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {/* TODO: implement signing */}}
                          >
                            <CheckIcon className="w-4 h-4" />
                            {t("signMeetingDocument")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : canEditProject && task.actionStatus !== "completed" ? (
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleUploadDocument}
                      disabled={isUploadingDocument}
                      accept=".pdf,.doc,.docx"
                    />
                    <ArrowUpTrayIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {isUploadingDocument ? t("uploading") : t("uploadMeetingDocument")}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, DOC, DOCX</span>
                  </label>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4 text-center">
                    {t("noMeetingDocument")}
                  </p>
                )}
              </div>
            )}

            {/* Pending Documents - Required/Requested but not yet uploaded */}
            {pendingDocuments.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{t("pendingDocuments")}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("pendingDocumentsDescription")}</p>

                <div className="space-y-2">
                  {/* Required documents (not assigned - blocking) */}
                  {requiredPendingDocs.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
                        {t("requiredBlocking")}
                      </span>
                      {requiredPendingDocs.map((doc) => (
                        <div
                          key={doc.identifier}
                          className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">
                            {t("notUploaded")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Requested documents (assigned - not blocking) */}
                  {requestedPendingDocs.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        {t("requestedPending")}
                      </span>
                      {requestedPendingDocs.map((doc) => (
                        <div
                          key={doc.identifier}
                          className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ClockIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">{doc.name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {t("assignedTo", { name: doc.assignees?.[0]?.name || "" })}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                              {t("requested")}
                            </span>
                            {doc.dueDate && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {t("dueBy", { date: new Date(doc.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Required Documents - Compact Accordion */}
            {requiredDocuments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{t("requiredDocuments")}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("requiredDocumentsDescription")}</p>

                <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {requiredDocuments.map((doc) => {
                    const userHasAcknowledged = hasUserAcknowledgedDocument(doc);
                    const isExpanded = expandedDocId === doc.identifier;

                    return (
                      <div key={doc.identifier}>
                        <button
                          type="button"
                          onClick={() => setExpandedDocId(isExpanded ? null : doc.identifier)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                            doc.allAcknowledged ? "bg-green-50/50 dark:bg-green-900/10" : ""
                          }`}
                        >
                          {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                          <DocumentIcon className={`w-4 h-4 ${doc.allAcknowledged ? "text-green-600" : "text-gray-400"}`} />
                          <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.category?.name ? `${doc.category.name} - ${doc.name}` : doc.name}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            doc.allAcknowledged
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          }`}>
                            {doc.allAcknowledged && <CheckIcon className="w-3 h-3 inline mr-1" />}
                            {doc.acknowledgementCount}/{doc.totalAssignees}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 bg-gray-50 dark:bg-gray-800/30 space-y-3">
                            <a
                              href={(() => {
                                const token = localStorage.getItem("token") || "";
                                const tenantUrl = localStorage.getItem("tenantUrl") || "";
                                return `${process.env.NEXT_PUBLIC_API_URL || "/api"}/projects/${projectId}/documents/${doc.identifier}/download?token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(tenantUrl)}&inline=true`;
                              })()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <EyeIcon className="w-4 h-4" />
                              {t("viewDocument")}
                            </a>

                            {/* Acknowledgement status with agree/disagree */}
                            <div className="space-y-2">
                              {doc.acknowledgements.filter(ack => ack.hasRead).map((ack) => (
                                <div key={ack.identifier} className="flex items-start gap-2 text-xs">
                                  {ack.hasAgreed === true ? (
                                    <CheckIcon className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                                  ) : ack.hasAgreed === false ? (
                                    <XMarkIcon className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <ClockIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className={`font-medium ${
                                      ack.hasAgreed === true ? "text-green-700 dark:text-green-400" :
                                      ack.hasAgreed === false ? "text-red-700 dark:text-red-400" :
                                      "text-gray-700 dark:text-gray-300"
                                    }`}>
                                      {ack.name}
                                    </span>
                                    {ack.hasAgreed === false && ack.disagreementReason && (
                                      <p className="text-red-600 dark:text-red-400 mt-0.5 break-words">
                                        {t("disagreementReason")}: {ack.disagreementReason}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {task?.assignees?.filter(a => !doc.acknowledgements.some(ack => ack.identifier === a.identifier && ack.hasRead)).map((user) => (
                                <div key={user.identifier} className="flex items-center gap-2 text-xs">
                                  <ClockIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="text-gray-400">{user.name}</span>
                                </div>
                              ))}
                            </div>

                            {isAttendee && !userHasAcknowledged && (
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleAcknowledgeDocument(doc.identifier, true)}
                                  loading={acknowledgingDocId === doc.identifier}
                                  disabled={acknowledgingDocId === doc.identifier}
                                >
                                  <CheckIcon className="w-4 h-4" />
                                  {t("agreeDocument")}
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDisagreeClick(doc.identifier)}
                                  disabled={acknowledgingDocId === doc.identifier}
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                  {t("disagreeDocument")}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
        <p className="text-gray-600 dark:text-gray-400">
          {t("confirmDeleteDocument")}
        </p>
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
          <p className="text-gray-600 dark:text-gray-400">
            {t("disagreeDescription")}
          </p>
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
