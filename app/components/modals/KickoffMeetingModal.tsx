"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { CalendarIcon, CheckIcon, UserGroupIcon, PlusIcon, XMarkIcon, DocumentIcon, EyeIcon, TrashIcon, PencilIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import Modal from "@/app/components/ui/Modal";
import FormInput from "@/app/components/ui/FormInput";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import DocumentViewerModal from "./DocumentViewerModal";
import { setupTasksApi, useProjectMembers, useCurrentUser } from "@/lib/api";
import type { SetupTask, SetupTaskDocument } from "@/lib/api/types";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAddingAssignees, setIsAddingAssignees] = useState(false);

  // Notes & Documents state
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<SetupTaskDocument | null>(null);

  // Permissions
  const canEditProject = hasPermission(PERMISSIONS.EDIT_PROJECTS);

  // Fetch project members for assignee selection
  const { data: projectMembers } = useProjectMembers(projectId);

  // Check if current user is an attendee
  const currentUserAttendee = useMemo(() => {
    if (!task || !currentUser || !task.assignees) return null;
    return task.assignees.find(a => a.identifier === currentUser.identifier);
  }, [task, currentUser]);

  const isAttendee = !!currentUserAttendee;

  // Calculate progress
  const progress = useMemo(() => {
    if (!task || !task.assignees) return null;

    const totalAttendees = task.assignees.length;
    const signedAttendees = task.assignees.filter(a => a.hasSigned).length;
    const totalItems = task.checklistItems?.length || 0;
    const completedItems = task.checklistItems?.filter(item => item.isCompleted).length || 0;

    return {
      signatures: {
        count: signedAttendees,
        total: totalAttendees,
        percentage: totalAttendees > 0 ? (signedAttendees / totalAttendees) * 100 : 0,
        text: `${signedAttendees}/${totalAttendees}`,
      },
      checklist: {
        count: completedItems,
        total: totalItems,
        percentage: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
        text: `${completedItems}/${totalItems}`,
      },
    };
  }, [task]);

  // Fetch task details when modal opens
  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
    }
  }, [isOpen, taskId]);

  // Fetch task details - silent mode skips loading state to prevent UI jumping
  const fetchTaskDetails = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      const response = await setupTasksApi.getById(projectId, taskId);

      // The API returns the task directly wrapped in { data: SetupTask }
      const taskData = response.data || response;

      if (!taskData) {
        throw new Error(t("loadError"));
      }

      setTask(taskData);
      setScheduledDate(taskData.scheduledDate || "");
    } catch (err) {
      console.error("Error fetching task details:", err);
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Silent refresh - updates data without showing loading state
  const refreshTaskDetails = () => fetchTaskDetails(true);

  const handleScheduleDateUpdate = async () => {
    if (!task) return;

    try {
      setIsUpdatingDate(true);
      setError(null);
      await setupTasksApi.update(projectId, taskId, {
        scheduled_date: scheduledDate || undefined,
      });
      showToast("success", t("dateUpdated"));
      onUpdate?.();
      await refreshTaskDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("updateError"));
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    // Only attendees can toggle checklist items
    if (!isAttendee) {
      setError(t("onlyAttendeesCanCheck"));
      return;
    }

    try {
      setError(null);
      await setupTasksApi.toggleChecklistItem(projectId, taskId, itemId);
      await refreshTaskDetails();
      onUpdate?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t("updateError");
      setError(errorMsg);
      // Show toast for permission errors
      if (errorMsg.includes("Only attendees")) {
        showToast("error", t("onlyAttendeesCanCheck"));
      }
    }
  };

  const handleAddAssignees = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      setIsAddingAssignees(true);
      setError(null);

      // Add all selected users in parallel
      await Promise.all(
        selectedUserIds.map(userId =>
          setupTasksApi.addAssignee(projectId, taskId, { user_id: userId })
        )
      );

      showToast("success", t("assigneesAdded", { count: selectedUserIds.length }));
      setSelectedUserIds([]);
      onUpdate?.();
      await refreshTaskDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("updateError"));
    } finally {
      setIsAddingAssignees(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleRemoveAssignee = async (userId: string) => {
    try {
      setError(null);
      await setupTasksApi.removeAssignee(projectId, taskId, userId);
      showToast("success", t("assigneeRemoved"));
      onUpdate?.();
      await refreshTaskDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("updateError"));
    }
  };

  const handleSign = async () => {
    // Only attendees can sign
    if (!isAttendee) {
      setError(t("onlyAttendeesCanSign"));
      return;
    }

    try {
      setIsSigning(true);
      setError(null);
      await setupTasksApi.sign(projectId, taskId);
      showToast("success", t("signSuccess"));
      onUpdate?.();
      await refreshTaskDetails();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t("signError");
      setError(errorMsg);
      // Show toast for permission errors
      if (errorMsg.includes("No query results")) {
        showToast("error", t("onlyAttendeesCanSign"));
      }
    } finally {
      setIsSigning(false);
    }
  };

  // ============ Notes Handlers ============
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      setIsAddingNote(true);
      await setupTasksApi.addNote(projectId, taskId, { content: newNoteContent });
      setNewNoteContent("");
      showToast("success", t("noteAdded"));
      await refreshTaskDetails();
    } catch (err) {
      showToast("error", t("noteAddError"));
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editNoteContent.trim()) return;

    try {
      await setupTasksApi.updateNote(projectId, taskId, noteId, { content: editNoteContent });
      setEditingNoteId(null);
      setEditNoteContent("");
      showToast("success", t("noteUpdated"));
      await refreshTaskDetails();
    } catch (err) {
      showToast("error", t("noteUpdateError"));
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm(t("confirmDeleteNote"))) return;

    try {
      await setupTasksApi.deleteNote(projectId, taskId, noteId);
      showToast("success", t("noteDeleted"));
      await refreshTaskDetails();
    } catch (err) {
      showToast("error", t("noteDeleteError"));
    }
  };

  const startEditingNote = (noteId: string, currentContent: string) => {
    setEditingNoteId(noteId);
    setEditNoteContent(currentContent);
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditNoteContent("");
  };

  // ============ Documents Handlers ============
  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      showToast("error", t("fileTooLarge"));
      return;
    }

    try {
      setIsUploadingDocument(true);
      await setupTasksApi.uploadDocument(projectId, taskId, file);
      showToast("success", t("documentUploaded"));
      await refreshTaskDetails();
      // Reset file input
      e.target.value = "";
    } catch (err) {
      showToast("error", t("documentUploadError"));
    } finally {
      setIsUploadingDocument(false);
    }
  };


  const handleDeleteDocument = async (docId: string) => {
    if (!confirm(t("confirmDeleteDocument"))) return;

    try {
      await setupTasksApi.deleteDocument(projectId, taskId, docId);
      showToast("success", t("documentDeleted"));
      await refreshTaskDetails();
    } catch (err) {
      showToast("error", t("documentDeleteError"));
    }
  };

  // Check if current user can sign
  const canSign = task &&
    task.actionStatus === "scheduled" &&
    isAttendee &&
    currentUserAttendee &&
    !currentUserAttendee.hasSigned &&
    task.allItemsCompleted;

  // Determine which actions to show based on status and permissions
  const actions = useMemo(() => {
    const baseActions: Array<{
      label: string;
      onClick: () => void;
      variant: "primary" | "secondary" | "danger" | "success" | "ghost";
      loading?: boolean;
      disabled?: boolean;
    }> = [];

    // Show sign button only if user can sign
    if (canSign) {
      baseActions.push({
        label: t("sign"),
        onClick: handleSign,
        variant: "success",
        loading: isSigning,
        disabled: isSigning,
      });
    }

    // Always show close button
    baseActions.push({
      label: tCommon("close"),
      onClick: onClose,
      variant: "secondary",
    });

    return baseActions;
  }, [canSign, isSigning, t, tCommon, onClose]);

  // Render status badge
  const renderStatusBadge = () => {
    if (!task) return null;

    const statusConfig = {
      pending: {
        bg: "bg-amber-100 dark:bg-amber-900/20",
        text: "text-amber-700 dark:text-amber-400",
        label: t("statusPending"),
      },
      scheduled: {
        bg: "bg-blue-100 dark:bg-blue-900/20",
        text: "text-blue-700 dark:text-blue-400",
        label: t("statusScheduled"),
      },
      completed: {
        bg: "bg-green-100 dark:bg-green-900/20",
        text: "text-green-700 dark:text-green-400",
        label: t("statusCompleted"),
      },
    };

    const config = statusConfig[task.actionStatus as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {task.actionStatus === "completed" && <CheckIcon className="w-4 h-4" />}
        {config.label}
      </span>
    );
  };

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
      {loading && (
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
        </div>
      )}

      {!loading && task && (
        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            {renderStatusBadge()}
            {task.scheduledDate && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                📅 {new Date(task.scheduledDate).toLocaleString()}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {task.description}
            </p>
          </div>

          {/* Completed State */}
          {task.actionStatus === "completed" && (
            <Alert
              type="success"
              message={`${t("taskCompleted")} ${task.completedAt ? `on ${new Date(task.completedAt).toLocaleString()}` : ""}`}
            />
          )}

          {/* Progress Indicators (for scheduled status) */}
          {task.actionStatus === "scheduled" && progress && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t("signatures")}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${progress.signatures.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {progress.signatures.text}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t("checklistProgress")}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${progress.checklist.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {progress.checklist.text}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Attendees (only show heading and add form if no scheduled date yet) */}
          {!task.scheduledDate && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
                    1
                  </span>
                  <UserGroupIcon className="w-4 h-4" />
                  {t("attendees")}
                </h4>
              </div>

              {/* Add Assignees Form */}
              {canEditProject && task.actionStatus !== "completed" && projectMembers && projectMembers.length > 0 && (
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2 max-h-60 overflow-y-auto">
                    {projectMembers
                      .filter((member) => !task.assignees?.some((a) => a.identifier === member.member.identifier))
                      .map((member) => (
                        <label
                          key={member.member.identifier}
                          className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(member.member.identifier)}
                            onChange={() => toggleUserSelection(member.member.identifier)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {member.member.name}
                          </span>
                        </label>
                      ))}
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleAddAssignees}
                    loading={isAddingAssignees}
                    disabled={selectedUserIds.length === 0 || isAddingAssignees}
                    className="w-full"
                  >
                    <PlusIcon className="w-4 h-4" />
                    {t("addSelected", { count: selectedUserIds.length })}
                  </Button>
                </div>
              )}

              {/* Assignee List - only show if no scheduled date */}
              {task.assignees && task.assignees.length > 0 ? (
                <div className="space-y-2">
                  {task.assignees.map((assignee) => (
                    <div
                      key={assignee.identifier}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {assignee.name}
                        </span>
                        {currentUser && assignee.identifier === currentUser.identifier && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">(you)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {assignee.hasSigned && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                            <CheckIcon className="w-3 h-3" />
                            {t("signed")}
                          </span>
                        )}
                        {canEditProject && task.actionStatus !== "completed" && (
                          <button
                            onClick={() => handleRemoveAssignee(assignee.identifier)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title={t("remove")}
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {t("noAttendeesYet")}
                </p>
              )}
            </div>
          )}

          {/* Attendee List (always show after scheduled) */}
          {task.scheduledDate && task.assignees && task.assignees.length > 0 && (
            <div className="space-y-2">
              {task.assignees.map((assignee) => (
                <div
                  key={assignee.identifier}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {assignee.name}
                    </span>
                    {currentUser && assignee.identifier === currentUser.identifier && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">(you)</span>
                    )}
                  </div>
                  {assignee.hasSigned && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                      <CheckIcon className="w-3 h-3" />
                      {t("signed")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Schedule Date (only show if no date is set yet) */}
          {!task.scheduledDate && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
                    2
                  </span>
                  <CalendarIcon className="w-4 h-4" />
                  {t("scheduledDate")}
                </h4>
              </div>

              {task.assignees && task.assignees.length > 0 ? (
                canEditProject && task.actionStatus !== "completed" ? (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <FormInput
                        id="scheduled-date"
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        label=""
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={handleScheduleDateUpdate}
                      loading={isUpdatingDate}
                      disabled={isUpdatingDate || !scheduledDate}
                    >
                      {t("updateDate")}
                    </Button>
                  </div>
                ) : null
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {t("addAttendeesFirst")}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Checklist (only visible when not completed) */}
          {task.checklistItems && task.checklistItems.length > 0 && task.actionStatus !== "completed" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
                    3
                  </span>
                  <CheckIcon className="w-4 h-4" />
                  {t("checklist")}
                </h4>
              </div>

              {task.actionStatus !== "scheduled" && (
                <Alert type="info" message={t("checklistAvailableAfterScheduling")} />
              )}

              {!isAttendee && task.actionStatus === "scheduled" && (
                <Alert type="info" message={t("onlyAttendeesCanCheck")} />
              )}

              <div className="space-y-2">
                {task.checklistItems.map((item) => (
                  <label
                    key={item.identifier}
                    className={`flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors ${
                      isAttendee && task.actionStatus === "scheduled" ? "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => handleToggleChecklistItem(item.identifier)}
                      disabled={!isAttendee || task.actionStatus !== "scheduled"}
                      className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {item.description}
                      </span>
                      {item.checks && item.checks.length > 0 && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Checked by: {item.checks.map(c => c.agent.name).join(", ")}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {progress?.checklist.text} {t("itemsCompleted")}
              </div>
            </div>
          )}

          {/* Completed checklist (read-only view) */}
          {task.actionStatus === "completed" && task.checklistItems && task.checklistItems.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                {t("checklist")}
              </h4>
              <div className="space-y-2">
                {task.checklistItems.map((item) => (
                  <div
                    key={item.identifier}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section - Only visible when scheduled or completed */}
          {task.actionStatus !== "pending" && (
            <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <DocumentIcon className="w-4 h-4" />
                  {t("documents")}
                </h4>
                {canEditProject && task.actionStatus !== "completed" && (
                  <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isUploadingDocument
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  } text-white`}>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleUploadDocument}
                      disabled={isUploadingDocument}
                    />
                    <PlusIcon className="w-4 h-4" />
                    {isUploadingDocument ? t("uploading") : t("uploadDocument")}
                  </label>
                )}
              </div>

              {task.documents && task.documents.length > 0 ? (
                <div className="space-y-2">
                  {task.documents.map((doc) => (
                    <div
                      key={doc.identifier}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {doc.name || "Untitled"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {doc.author?.name || "Unknown"} • {
                              doc.dateCreated
                                ? new Date(doc.dateCreated).toLocaleDateString()
                                : "Unknown date"
                            } • {doc.contentSize || "Unknown size"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setViewingDocument(doc)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t("viewDocument")}
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {canEditProject && currentUser && doc.author?.identifier === currentUser.identifier && task.actionStatus !== "completed" && (
                          <button
                            onClick={() => handleDeleteDocument(doc.identifier)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={t("deleteDocument")}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                  {t("noDocuments")}
                </p>
              )}
            </div>
          )}

          {/* Notes Section - Only visible when scheduled or completed */}
          {task.actionStatus !== "pending" && (
            <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  {t("notes")}
                </h4>
              </div>

              {/* Add Note Form */}
              {task.actionStatus !== "completed" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddNote();
                      }
                    }}
                    placeholder={t("addNotePlaceholder")}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddNote}
                    loading={isAddingNote}
                    disabled={isAddingNote || !newNoteContent.trim()}
                  >
                    <PlusIcon className="w-4 h-4" />
                    {t("addNote")}
                  </Button>
                </div>
              )}

              {/* Notes List */}
              {task.notes && task.notes.length > 0 ? (
                <div className="space-y-3">
                  {task.notes.map((note) => (
                    <div
                      key={note.identifier}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                    >
                      {editingNoteId === note.identifier ? (
                        <div className="space-y-2">
                          <textarea
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleUpdateNote(note.identifier)}
                            >
                              {t("saveNote")}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={cancelEditingNote}
                            >
                              {tCommon("cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300 flex-1 whitespace-pre-wrap">
                              {note.text}
                            </p>
                            {currentUser && note.author.identifier === currentUser.identifier && task.actionStatus !== "completed" && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => startEditingNote(note.identifier, note.text)}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title={t("editNote")}
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(note.identifier)}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title={t("deleteNote")}
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {note.author.name} • {new Date(note.dateCreated).toLocaleString()}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                  {t("noNotes")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewerModal
          isOpen={true}
          onClose={() => setViewingDocument(null)}
          attachment={viewingDocument}
          downloadUrl={`${process.env.NEXT_PUBLIC_API_URL || "/api"}/projects/${projectId}/setup-task/${taskId}/documents/${viewingDocument.identifier}/download`}
        />
      )}
    </>
  );
}
