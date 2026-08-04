"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ClockIcon,
  PaperClipIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  CheckIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import CancelPunchlistItemModal from "./CancelPunchlistItemModal";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
import PunchlistStatusDropdown from "./PunchlistStatusDropdown";
import PunchlistPriorityDropdown from "./PunchlistPriorityDropdown";
import PunchlistAssigneePicker from "./PunchlistAssigneePicker";
import PunchlistActivityCollapse from "./PunchlistActivityCollapse";
import PunchlistCommentsSection from "./PunchlistCommentsSection";
import AuthenticatedImage from "@/app/components/ui/AuthenticatedImage";
import {
  punchlistItemsApi,
  usePunchlistItemAttachments,
} from "@/lib/api/punchlist-items";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/app/context/ToastContext";
import ImageViewerModal from "@/app/components/modals/ImageViewerModal";
import { DocumentViewerModal } from "@/app/features/documents";
import {
  isDocumentAttachment,
  isImageAttachment,
} from "@/lib/utils/attachmentUtils";
import type {
  PunchlistItem,
  PunchlistItemPriority,
  PunchlistItemStatus,
  StageStatus,
  PunchlistItemAttachment,
} from "@/lib/api/types";
import { handleError } from "@/lib/utils/errors";

interface PunchlistItemCardProps {
  item: PunchlistItem;
  projectId: string;
  stageStatus?: StageStatus;
  onUpdate?: () => void;
  readonly?: boolean;
  showLocation?: boolean;
  /** Close (X) button in the card header. Optional so the stage-level
   *  detail (which lives inline) can render without it. */
  onClose?: () => void;
  /** External-link button in the card header — used by the GA and
   *  project punchlist tabs to deep-link back to the stage page. */
  onGoToStage?: () => void;
  /** Open the GA pin editor — present only on the GA tab where the
   *  item has a backing pin. Shown as the first entry in the
   *  More-actions menu. */
  onEditPinLocation?: () => void;
  /** Project-wide display number — rendered as `#N` or `#N.M` next
   *  to the title so the user can refer to the item by a short
   *  number. Same convention as `PunchlistItemRow.displayNumber`. */
  displayNumber?: string | number;
  /** Sub-items to render in the Jira-style "Sub-tasks" section.
   *  When omitted (or empty), the section is skipped. Each row has
   *  its own priority / assignee / status controls so the user can
   *  drive sub-items forward without leaving the parent's detail. */
  subItems?: PunchlistItem[];
  /** Click handler for a sub-task row's title — the caller swaps the
   *  detail panel to the child. Omit to make sub-task titles
   *  non-interactive. */
  onSubItemSelect?: (id: string) => void;
  /** Resolve the `#N.M` display number for a sub-item id. Same
   *  contract as `displayNumber` on the parent row. */
  getSubItemDisplayNumber?: (id: string) => string | undefined;
}

/** Detail panel for a single punchlist item — modelled on Jira's
 *  task detail view. Sections (description, attachments, details) are
 *  flat with bold underlines instead of a card-in-card stack, and the
 *  workflow lives in the status dropdown at the top so the user has
 *  one consistent place to drive the item forward in both the list
 *  row and this panel. */
export default function PunchlistItemCard({
  item,
  projectId,
  stageStatus,
  onUpdate,
  readonly = false,
  showLocation = false,
  onClose,
  onGoToStage,
  onEditPinLocation,
  displayNumber,
  subItems,
  onSubItemSelect,
  getSubItemDisplayNumber,
}: PunchlistItemCardProps) {
  const t = useTranslations("punchlist");
  const { hasPermission } = usePermission();
  const { showToast } = useToast();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  // Sub-task cancellation: the row's status dropdown asks for a
  // reason via this target, then the shared modal at the bottom of
  // the card hands the value to the backend. Same shape as the row
  // surfaces above us.
  const [subItemCancelTarget, setSubItemCancelTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<PunchlistItemAttachment | null>(null);
  const [selectedDocument, setSelectedDocument] =
    useState<PunchlistItemAttachment | null>(null);
  // Comments log their own logbook entries (e.g.
  // `punchlist_item_comment_added`) server-side, but posting one
  // doesn't touch `item.dateModified` — the Activity feed's own
  // refresh trigger — so without this it never learns a comment
  // landed. Bumped by `PunchlistCommentsSection` on every mutation and
  // folded into the Activity feed's trigger below.
  const [commentActivityTick, setCommentActivityTick] = useState(0);
  // Inline edit state — same UX as Jira: click → input + save/cancel.
  // Only one field can be in edit mode at a time.
  const [editingField, setEditingField] = useState<
    "name" | "description" | null
  >(null);
  const [draftValue, setDraftValue] = useState("");
  const [isSavingField, setIsSavingField] = useState(false);

  const canEdit = !readonly && hasPermission(PERMISSIONS.EDIT_STAGES);

  // Keep the attachments hook alive whenever the user can edit, even
  // if the item starts at 0 attachments — otherwise the post-upload
  // refetch short-circuits to an empty array.
  const {
    data: attachments,
    uploadAttachment,
    deleteAttachment,
  } = usePunchlistItemAttachments(
    projectId,
    item.identifier,
    canEdit || item.attachmentCount > 0
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] =
    useState<PunchlistItemAttachment | null>(null);

  const handlePickAttachment = () => {
    fileInputRef.current?.click();
  };
  const handleAttachmentSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be re-uploaded later.
    if (e.target) e.target.value = "";
    if (!file) return;
    setIsUploadingAttachment(true);
    try {
      await uploadAttachment(file);
      showToast("success", t("attachmentUploaded", { name: file.name }));
      onUpdate?.();
    } catch (err) {
      handleError(err, {
        showToast,
        fallbackMessage: t("attachmentUploadError"),
      });
    } finally {
      setIsUploadingAttachment(false);
    }
  };
  const handleConfirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    try {
      await deleteAttachment(attachmentToDelete.identifier);
      showToast(
        "success",
        t("attachmentDeleted", { name: attachmentToDelete.name })
      );
      setAttachmentToDelete(null);
      onUpdate?.();
    } catch (err) {
      handleError(err, {
        showToast,
        fallbackMessage: t("attachmentDeleteError"),
      });
      throw err;
    }
  };

  const handleStatusChange = async (status: PunchlistItemStatus) => {
    try {
      await punchlistItemsApi.updateStatus(projectId, item.identifier, {
        status,
      });
      showToast("success", t("updateSuccess"));
      onUpdate?.();
    } catch (error) {
      handleError(error, { showToast, fallbackMessage: t("updateError") });
    }
  };

  const handlePriorityChange = async (priority: PunchlistItemPriority) => {
    try {
      await punchlistItemsApi.update(projectId, item.identifier, { priority });
      showToast(
        "success",
        t("priorityUpdated", {
          priority: t(
            `priority${priority.charAt(0).toUpperCase()}${priority.slice(1)}`
          ),
        })
      );
      onUpdate?.();
    } catch (error) {
      handleError(error, { showToast, fallbackMessage: t("updateError") });
    }
  };

  // Dismiss the More-actions menu on outside-click / Esc — same
  // lightweight pattern used for the other dropdowns in this panel.
  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!moreMenuRef.current?.contains(e.target as Node))
        setIsMoreMenuOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isMoreMenuOpen]);

  // Hard delete — only offered for items the user has already
  // cancelled. The parent gets `onUpdate` so the list refetches and
  // drops the now-missing row; the selection bubbles up to null via
  // the existing "clear stale selection" effect on the parent.
  const handleDeleteItem = async () => {
    try {
      await punchlistItemsApi.delete(projectId, item.identifier);
      showToast("success", t("deleteItemSuccess"));
      setShowDeleteItemModal(false);
      onUpdate?.();
      onClose?.();
    } catch (err) {
      handleError(err, {
        showToast,
        fallbackMessage: t("deleteItemError"),
      });
      throw err;
    }
  };

  const beginEdit = (field: "name" | "description") => {
    if (!canEdit) return;
    setEditingField(field);
    setDraftValue(field === "name" ? item.name : item.description ?? "");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setDraftValue("");
  };

  // Save the in-progress edit. Name maps to `title` server-side; an
  // empty title is rejected client-side because the row + list both
  // rely on `item.name` having content. An empty description is
  // explicitly allowed (clears the field).
  const saveEdit = async () => {
    if (!editingField) return;
    const next = draftValue.trim();
    if (editingField === "name" && next.length === 0) {
      showToast("error", t("titleRequired"));
      return;
    }
    setIsSavingField(true);
    try {
      await punchlistItemsApi.update(projectId, item.identifier, {
        [editingField === "name" ? "title" : "description"]:
          editingField === "name" ? next : draftValue,
      });
      showToast("success", t("updateSuccess"));
      setEditingField(null);
      setDraftValue("");
      onUpdate?.();
    } catch (error) {
      handleError(error, { showToast, fallbackMessage: t("updateError") });
    } finally {
      setIsSavingField(false);
    }
  };

  const handleCancel = async (reason: string) => {
    try {
      await punchlistItemsApi.updateStatus(projectId, item.identifier, {
        status: "cancelled",
        reason,
      });
      showToast("success", t("cancelSuccess"));
      onUpdate?.();
    } catch (error) {
      handleError(error, { showToast, fallbackMessage: t("updateError") });
      throw error;
    }
  };

  // Cancel a sub-task — same endpoint as the parent, just targeting
  // the sub-item id captured in the cancel-target state.
  const handleSubItemCancel = async (reason: string) => {
    if (!subItemCancelTarget) return;
    try {
      await punchlistItemsApi.updateStatus(
        projectId,
        subItemCancelTarget.id,
        { status: "cancelled", reason }
      );
      showToast("success", t("cancelSuccess"));
      setSubItemCancelTarget(null);
      onUpdate?.();
    } catch (error) {
      handleError(error, { showToast, fallbackMessage: t("updateError") });
      throw error;
    }
  };

  // Sub-task status / priority mutations — fire the same backend
  // endpoints as the parent and call `onUpdate` so the host refetches
  // the tree (children come back with the new values).
  const handleSubItemStatusChange = async (
    id: string,
    status: PunchlistItemStatus
  ) => {
    try {
      await punchlistItemsApi.updateStatus(projectId, id, { status });
      showToast("success", t("updateSuccess"));
      onUpdate?.();
    } catch (error) {
      handleError(error, { showToast, fallbackMessage: t("updateError") });
    }
  };

  const handleSubItemPriorityChange = async (
    id: string,
    priority: PunchlistItemPriority
  ) => {
    try {
      await punchlistItemsApi.update(projectId, id, { priority });
      showToast(
        "success",
        t("priorityUpdated", {
          priority: t(
            `priority${priority.charAt(0).toUpperCase()}${priority.slice(1)}`
          ),
        })
      );
      onUpdate?.();
    } catch (error) {
      handleError(error, { showToast, fallbackMessage: t("updateError") });
    }
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return t("overdue");
    if (diffDays === 0) return t("dueToday");
    return t("dueIn", { days: diffDays });
  };

  const formatCreatedAt = (dateCreated: string) => {
    const date = new Date(dateCreated);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMinutes < 1) return t("justNow");
    if (diffMinutes < 60) return t("minutesAgo", { minutes: diffMinutes });
    if (diffHours < 24) return t("hoursAgo", { hours: diffHours });
    if (diffDays < 7) return t("daysAgo", { days: diffDays });
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const handleAttachmentClick = (attachment: PunchlistItemAttachment) => {
    setSelectedImage(null);
    setSelectedDocument(null);
    setTimeout(() => {
      if (isImageAttachment(attachment)) {
        setSelectedImage(attachment);
      } else {
        setSelectedDocument(attachment);
      }
    }, 0);
  };

  const documents = attachments?.filter((a) => isDocumentAttachment(a)) || [];
  const images = attachments?.filter((a) => isImageAttachment(a)) || [];
  const hasAttachments = images.length > 0 || documents.length > 0;

  return (
    <>
      <div className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md p-6">
        {/* Header action icons — external-link to jump to the
            originating stage page (only set on the GA / project
            punchlist tabs) and close (X) when the panel is dismissable.
            Same stacking we had outside the card previously, now lives
            inside so the two icons sit together. */}
        {(onGoToStage || onClose || canEdit) && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
            {onGoToStage && (
              <button
                type="button"
                onClick={onGoToStage}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t("goToStage")}
                title={t("goToStage")}
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </button>
            )}
            {/* More-actions menu — cancel (with reason) for active
                items, hard delete for already-cancelled items. Keeps
                the destructive paths out of the workflow dropdown. */}
            {canEdit && (
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen((v) => !v)}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={isMoreMenuOpen}
                  aria-label={t("moreActions")}
                  title={t("moreActions")}
                >
                  <EllipsisHorizontalIcon className="w-4 h-4" />
                </button>
                {isMoreMenuOpen && (
                  // High z so the menu stacks above the Leaflet GA
                  // viewer (Leaflet uses up to ~1000 for its panes).
                  <div
                    className="absolute right-0 mt-1 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-[1100]"
                    role="menu"
                  >
                    {onEditPinLocation && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          onEditPinLocation();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                        role="menuitem"
                      >
                        <MapPinIcon className="w-4 h-4" />
                        {t("editPinLocation")}
                      </button>
                    )}
                    {item.status === "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          setShowDeleteItemModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        role="menuitem"
                      >
                        <TrashIcon className="w-4 h-4" />
                        {t("deleteItemTitle")}
                      </button>
                    ) : (
                      item.status !== "done" && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setShowCancelModal(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          role="menuitem"
                        >
                          <XMarkIcon className="w-4 h-4" />
                          {t("markAsCancelled")}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t("closeDetail")}
                title={t("closeDetail")}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {/* Top bar — status dropdown + priority pill. Mirrors Jira's
            workflow row above the title. `flex-wrap` so the dropdowns
            drop to a second line on narrow screens instead of being
            squeezed under the fixed `pr-20` reserved for the header's
            more-menu/close buttons. */}
        <div className="flex items-center flex-wrap gap-2 mb-4 pr-20">
          <PunchlistStatusDropdown
            status={item.status}
            stageStatus={stageStatus}
            canEdit={canEdit}
            size="md"
            onChange={handleStatusChange}
            onRequestCancel={() => setShowCancelModal(true)}
          />
          <PunchlistPriorityDropdown
            priority={item.priority}
            canEdit={canEdit}
            size="md"
            onChange={handlePriorityChange}
          />
          {item.isOverdue && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              <ClockIcon className="w-3.5 h-3.5" />
              {t("overdue")}
            </span>
          )}
        </div>

        {/* Title — click to edit. Save / cancel buttons appear next
            to the input while editing; Enter saves, Esc cancels. */}
        <div className="mb-6">
          {editingField === "name" ? (
            <InlineEdit
              value={draftValue}
              onChange={setDraftValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={isSavingField}
              multiline={false}
              inputClassName="w-full text-2xl font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-blue-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <h2
              className={`flex items-baseline gap-3 text-2xl font-bold text-gray-900 dark:text-white leading-tight rounded-md px-3 py-2 -mx-3 ${
                canEdit
                  ? "cursor-text hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  : ""
              }`}
              onClick={() => beginEdit("name")}
              title={canEdit ? t("clickToEdit") : undefined}
            >
              {(typeof displayNumber === "number" || typeof displayNumber === "string") && (
                <span className="font-mono text-base text-gray-400 dark:text-gray-500 flex-shrink-0">
                  #{displayNumber}
                </span>
              )}
              <span className="min-w-0">{item.name}</span>
            </h2>
          )}
        </div>

        {/* Description — same inline-edit pattern; clicking on the
            empty-state placeholder also opens the editor so the user
            doesn't need a separate "Add description" affordance. */}
        <Section title={t("descriptionHeader")}>
          {editingField === "description" ? (
            <InlineEdit
              value={draftValue}
              onChange={setDraftValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={isSavingField}
              multiline
              inputClassName="w-full text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-blue-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[88px]"
            />
          ) : item.description ? (
            <p
              className={`text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line rounded-md px-3 py-2 -mx-3 ${
                canEdit
                  ? "cursor-text hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  : ""
              }`}
              onClick={() => beginEdit("description")}
              title={canEdit ? t("clickToEdit") : undefined}
            >
              {item.description}
            </p>
          ) : (
            <p
              className={`text-sm italic text-gray-400 dark:text-gray-500 rounded-md px-3 py-2 -mx-3 ${
                canEdit
                  ? "cursor-text hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  : ""
              }`}
              onClick={() => beginEdit("description")}
              title={canEdit ? t("clickToEdit") : undefined}
            >
              {canEdit ? t("addDescription") : t("noDescription")}
            </p>
          )}
        </Section>

        {/* Attachments — always renders for editable items so the
            user can upload even from a zero state. Each thumbnail /
            chip has a hover-revealed delete control. */}
        {(canEdit || hasAttachments) && (
          <Section
            title={t("attachmentsHeader")}
            count={
              images.length + documents.length > 0
                ? images.length + documents.length
                : undefined
            }
            action={
              canEdit ? (
                <button
                  type="button"
                  onClick={handlePickAttachment}
                  disabled={isUploadingAttachment}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperClipIcon className="w-3.5 h-3.5" />
                  {isUploadingAttachment
                    ? t("attachmentUploading")
                    : t("attachmentAdd")}
                </button>
              ) : null
            }
          >
            {/* Hidden input drives the picker. Accept the same
                file types the upload modals already accept. */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleAttachmentSelected}
            />

            {images.length === 0 && documents.length === 0 && canEdit && (
              <button
                type="button"
                onClick={handlePickAttachment}
                disabled={isUploadingAttachment}
                className="w-full flex flex-col items-center justify-center gap-1 py-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/40 disabled:opacity-50 transition-colors"
              >
                <PaperClipIcon className="w-5 h-5" />
                <span>{t("attachmentEmpty")}</span>
              </button>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
                {images.map((img) => {
                  const imgUrl = punchlistItemsApi.getDownloadUrl(
                    projectId,
                    item.identifier,
                    img.identifier
                  );
                  return (
                    <div
                      key={img.identifier}
                      className="relative group aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleAttachmentClick(img)}
                        className="block w-full h-full"
                        title={img.name}
                      >
                        <AuthenticatedImage
                          src={imgUrl}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
                          <MagnifyingGlassIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachmentToDelete(img);
                          }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 transition-all flex items-center justify-center"
                          aria-label={t("attachmentRemove")}
                          title={t("attachmentRemove")}
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {documents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {documents.map((doc) => (
                  <div
                    key={doc.identifier}
                    className="relative group inline-flex"
                  >
                    <button
                      type="button"
                      onClick={() => handleAttachmentClick(doc)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm pr-8"
                      title={doc.name}
                    >
                      <DocumentIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white truncate max-w-[180px]">
                        {doc.name}
                      </span>
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachmentToDelete(doc);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                        aria-label={t("attachmentRemove")}
                        title={t("attachmentRemove")}
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Sub-tasks — Jira-style row per child sub-item. Each row
            carries its own priority / assignee / status dropdowns so
            the user can drive sub-tasks forward without switching to
            their dedicated detail panel; clicking the title hands off
            to the parent (e.g. the GA tab) via `onSubItemSelect`. */}
        {subItems && subItems.length > 0 && (
          <Section title={t("subTasksHeader")} count={subItems.length}>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
              {subItems.map((child) => (
                <SubTaskRow
                  key={child.identifier}
                  child={child}
                  projectId={projectId}
                  canEdit={canEdit}
                  displayNumber={getSubItemDisplayNumber?.(child.identifier)}
                  onSelect={
                    onSubItemSelect
                      ? () => onSubItemSelect(child.identifier)
                      : undefined
                  }
                  onChangeStatus={(next) =>
                    handleSubItemStatusChange(child.identifier, next)
                  }
                  onChangePriority={(next) =>
                    handleSubItemPriorityChange(child.identifier, next)
                  }
                  onRequestCancel={() =>
                    setSubItemCancelTarget({
                      id: child.identifier,
                      name: child.name,
                    })
                  }
                  onAssigneesChange={() => onUpdate?.()}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Cancellation notice — only when applicable. */}
        {item.status === "cancelled" && item.cancellation?.cancelledBy && (
          <Section title={t("cancellationHeader")}>
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-md">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {item.cancellation.cancelledBy.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date(item.cancellation.cancelledAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                &ldquo;{item.cancellation.reason}&rdquo;
              </p>
            </div>
          </Section>
        )}

        {/* Details — Jira's lower section with structured key/value
            rows. Skips fields that have no value so the panel doesn't
            advertise empty slots. */}
        <Section title={t("detailsHeader")} dense>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2 text-sm">
            <DetailRow label={t("detailAssignees")}>
              <PunchlistAssigneePicker
                projectId={projectId}
                itemId={item.identifier}
                assignees={item.assignees}
                canEdit={canEdit}
                display="pills"
                onChange={() => onUpdate?.()}
              />
            </DetailRow>
            <DetailRow label={t("detailPriority")}>
              <PunchlistPriorityDropdown
                priority={item.priority}
                canEdit={canEdit}
                onChange={handlePriorityChange}
              />
            </DetailRow>
            {item.dueDate && (
              <DetailRow label={t("detailDueDate")}>
                <span
                  className={
                    item.isOverdue
                      ? "text-red-600 dark:text-red-400 font-medium"
                      : "text-gray-900 dark:text-white"
                  }
                >
                  {new Date(item.dueDate).toLocaleDateString()}{" "}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({formatDueDate(item.dueDate)})
                  </span>
                </span>
              </DetailRow>
            )}
            {item.attachmentCount > 0 && (
              <DetailRow label={t("detailAttachments")}>
                <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <PaperClipIcon className="w-3.5 h-3.5" />
                  {t("attachmentsCount", { count: item.attachmentCount })}
                </span>
              </DetailRow>
            )}
            {/* Inline children of a parent ship without the `stage`
                relation loaded (the backend's children[] payload
                only carries the item-level fields). Guard the
                access so opening a sub-task's detail doesn't crash;
                the breadcrumb is hidden when the location isn't
                available. */}
            {showLocation && item.stage?.area && (
              <DetailRow label={t("detailLocation")}>
                <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <MapPinIcon className="w-3.5 h-3.5" />
                  {item.stage.area.deck && `${item.stage.area.deck.name} / `}
                  {item.stage.area.name} / {item.stage.name}
                </span>
              </DetailRow>
            )}
            {item.creator?.name && (
              <DetailRow label={t("detailCreator")}>
                <span className="text-gray-900 dark:text-white">
                  {item.creator.name}
                </span>
              </DetailRow>
            )}
            <DetailRow label={t("detailCreated")}>
              <span className="text-gray-700 dark:text-gray-300">
                {formatCreatedAt(item.dateCreated)}
              </span>
            </DetailRow>
          </dl>
        </Section>

        <PunchlistCommentsSection
          projectId={projectId}
          itemId={item.identifier}
          onActivityChange={() => setCommentActivityTick((v) => v + 1)}
        />

        <PunchlistActivityCollapse
          projectId={projectId}
          itemId={item.identifier}
          refreshTrigger={
            (item.dateModified ? Date.parse(item.dateModified) : 0) +
            commentActivityTick
          }
        />
      </div>

      <CancelPunchlistItemModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        itemName={item.name}
      />

      {/* Cancel-reason modal for sub-task rows. Reuses the same
          modal as the parent — the only difference is the target id
          captured in `subItemCancelTarget`. */}
      <CancelPunchlistItemModal
        isOpen={!!subItemCancelTarget}
        onClose={() => setSubItemCancelTarget(null)}
        onConfirm={handleSubItemCancel}
        itemName={subItemCancelTarget?.name ?? ""}
      />

      {/* Hard delete confirmation — only reachable from the More
          menu when the item is already cancelled. */}
      <DeleteConfirmModal
        isOpen={showDeleteItemModal}
        onClose={() => setShowDeleteItemModal(false)}
        onConfirm={handleDeleteItem}
        title={t("deleteItemTitle")}
        message={t("deleteItemMessage", { name: item.name })}
        successMessage={t("deleteItemSuccess")}
        errorMessage={t("deleteItemError")}
      />

      {/* Delete-confirm for attachments. The modal lazy-mounts when
          `attachmentToDelete` is set so we get the standard reused
          delete UX (modal title, confirm/cancel, success toast). */}
      <DeleteConfirmModal
        isOpen={!!attachmentToDelete}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={handleConfirmDeleteAttachment}
        title={t("attachmentDeleteTitle")}
        message={t("attachmentDeleteMessage", {
          name: attachmentToDelete?.name ?? "",
        })}
        successMessage={t("attachmentDeleteSuccess")}
        errorMessage={t("attachmentDeleteError")}
      />

      {selectedImage && (
        <ImageViewerModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          attachment={selectedImage}
          downloadUrl={punchlistItemsApi.getDownloadUrl(
            projectId,
            item.identifier,
            selectedImage.identifier
          )}
          allAttachments={images}
          onNavigate={setSelectedImage}
        />
      )}

      {selectedDocument && (
        <DocumentViewerModal
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
          attachment={selectedDocument}
          downloadUrl={punchlistItemsApi.getDownloadUrl(
            projectId,
            item.identifier,
            selectedDocument.identifier
          )}
        />
      )}
    </>
  );
}

/** Jira-style inline editor: text or textarea + save (✓) and cancel
 *  (✕) icon buttons below the input. Enter saves a single-line field
 *  (Shift+Enter in textarea inserts a newline instead); Esc cancels
 *  from either flavour. */
function InlineEdit({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  multiline,
  inputClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  multiline: boolean;
  inputClassName: string;
}) {
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSave();
    }
  };
  return (
    <div className="space-y-2">
      {multiline ? (
        <textarea
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          className={inputClassName}
        />
      ) : (
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={inputClassName}
        />
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Save"
        >
          <CheckIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Cancel"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Section heading + body pair. The bold underlined header gives the
 *  panel the Jira-style "Description / Attachments / Details" rhythm
 *  without committing to a full card per section. `dense` tightens
 *  the top margin for the trailing Details block. */
function Section({
  title,
  count,
  action,
  children,
  dense = false,
}: {
  title: string;
  count?: number;
  /** Trailing slot in the header — used by the Attachments section
   *  for its upload affordance. */
  action?: React.ReactNode;
  children: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <div className={dense ? "mt-5 pt-5 border-t border-gray-100 dark:border-gray-700/60" : "mt-6"}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <span>{title}</span>
          {typeof count === "number" && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {count}
            </span>
          )}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="col-span-1 text-xs text-gray-500 dark:text-gray-400 pt-0.5">
        {label}
      </dt>
      <dd className="col-span-1 sm:col-span-2 text-sm mb-2 sm:mb-0">{children}</dd>
    </>
  );
}

/** Single sub-task row inside the parent's detail card. Modelled on
 *  Jira's compact sub-task table — `#N.M` prefix, clickable title,
 *  then priority / assignee / status dropdowns aligned to the right.
 *  Mutation handlers are passed in so the parent card stays in charge
 *  of the post-update refresh. */
function SubTaskRow({
  child,
  projectId,
  canEdit,
  displayNumber,
  onSelect,
  onChangeStatus,
  onChangePriority,
  onRequestCancel,
  onAssigneesChange,
}: {
  child: PunchlistItem;
  projectId: string;
  canEdit: boolean;
  displayNumber?: string;
  onSelect?: () => void;
  onChangeStatus: (next: PunchlistItemStatus) => void;
  onChangePriority: (next: PunchlistItemPriority) => void;
  onRequestCancel: () => void;
  onAssigneesChange: () => void;
}) {
  return (
    <div className="flex items-center flex-wrap gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
      {displayNumber && (
        <span className="font-mono text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          #{displayNumber}
        </span>
      )}
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 min-w-0 text-left text-sm font-medium text-gray-900 dark:text-white truncate hover:underline"
        >
          {child.name}
        </button>
      ) : (
        <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white truncate">
          {child.name}
        </span>
      )}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <PunchlistPriorityDropdown
          priority={child.priority}
          canEdit={canEdit}
          onChange={onChangePriority}
        />
      </div>
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <PunchlistAssigneePicker
          projectId={projectId}
          itemId={child.identifier}
          assignees={child.assignees}
          canEdit={canEdit}
          display="stack"
          onChange={onAssigneesChange}
        />
      </div>
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <PunchlistStatusDropdown
          status={child.status}
          canEdit={canEdit}
          onChange={onChangeStatus}
          onRequestCancel={onRequestCancel}
        />
      </div>
    </div>
  );
}

