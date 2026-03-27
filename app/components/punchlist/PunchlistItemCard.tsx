"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ClockIcon,
  UserGroupIcon,
  PaperClipIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  MapPinIcon,
  PlayIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import Tooltip from "@/app/components/ui/Tooltip";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import CancelPunchlistItemModal from "@/app/components/modals/CancelPunchlistItemModal";
import AuthenticatedImage from "@/app/components/ui/AuthenticatedImage";
import { punchlistItemsApi, usePunchlistItemAttachments } from "@/lib/api/punchlist-items";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/app/context/ToastContext";
import ImageViewerModal from "@/app/components/modals/ImageViewerModal";
import DocumentViewerModal from "@/app/components/modals/DocumentViewerModal";
import type { PunchlistItem, PunchlistItemStatus, StageStatus, PunchlistItemAttachment } from "@/lib/api/types";

interface PunchlistItemCardProps {
  item: PunchlistItem;
  projectId: string;
  stageStatus?: StageStatus;
  onUpdate?: () => void;
  readonly?: boolean;
  showLocation?: boolean;
}

export default function PunchlistItemCard({
  item,
  projectId,
  stageStatus,
  onUpdate,
  readonly = false,
  showLocation = false,
}: PunchlistItemCardProps) {
  const t = useTranslations("punchlist");
  const { hasPermission } = usePermission();
  const { showToast } = useToast();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PunchlistItemAttachment | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PunchlistItemAttachment | null>(null);

  // Fetch attachments if item has any
  const { data: attachments } = usePunchlistItemAttachments(
    projectId,
    item.identifier,
    item.attachmentCount > 0
  );

  const canEdit = !readonly && hasPermission(PERMISSIONS.EDIT_PUNCHLIST_ITEMS);

  const priorityColors = {
    low: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    medium: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    high: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };

  const statusColors = {
    open: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    in_progress: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    done: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    cancelled: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  };

  const handleStatusChange = async (status: PunchlistItemStatus) => {
    setIsUpdating(true);
    try {
      await punchlistItemsApi.updateStatus(projectId, item.identifier, { status });
      showToast("success", t("updateSuccess"));
      onUpdate?.();
    } catch (error: any) {
      showToast("error", error.message || t("updateError"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async (reason: string) => {
    setIsUpdating(true);
    try {
      await punchlistItemsApi.updateStatus(projectId, item.identifier, {
        status: "cancelled",
        reason
      });
      showToast("success", t("cancelSuccess"));
      onUpdate?.();
    } catch (error: any) {
      showToast("error", error.message || t("updateError"));
      throw error; // Re-throw to let modal handle it
    } finally {
      setIsUpdating(false);
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

    // Format as date and time for older items
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to check if attachment is a document
  const isDocumentFile = (attachment: PunchlistItemAttachment) => {
    const mimeType = attachment.encodingFormat?.toLowerCase() || '';
    const fileName = attachment.name?.toLowerCase() || '';

    // Check MIME type first
    const documentTypes = ['application/', 'text/', 'video/', 'audio/'];
    const isDocumentByMime = documentTypes.some(type => mimeType.startsWith(type));

    // Also check file extension as fallback
    const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip', '.rar'];
    const isDocumentByExtension = documentExtensions.some(ext => fileName.endsWith(ext));

    return isDocumentByMime || isDocumentByExtension;
  };

  // Helper function to check if attachment is an image
  const isImageFile = (attachment: PunchlistItemAttachment) => {
    const mimeType = attachment.encodingFormat?.toLowerCase() || '';
    const fileName = attachment.name?.toLowerCase() || '';

    // First check: is it a document? If yes, it's DEFINITELY NOT an image
    if (isDocumentFile(attachment)) return false;

    // STRICT CHECK: Only return true if we're CERTAIN it's an image
    // Check MIME type for EXACT image types (no wildcards)
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
    const hasValidImageMime = imageTypes.includes(mimeType);

    // Check file extension as secondary confirmation
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => fileName.endsWith(ext));

    // BOTH must be true, OR if no MIME type, at least extension must be valid
    if (hasValidImageMime && hasImageExtension) return true;
    if (!mimeType && hasImageExtension) return true;

    // If MIME type exists but doesn't match, or no extension, it's NOT an image
    return false;
  };

  const handleAttachmentClick = (attachment: PunchlistItemAttachment) => {
    // First close any open modals to prevent conflicts
    setSelectedImage(null);
    setSelectedDocument(null);

    // Then open the correct modal after a small delay to ensure state reset
    setTimeout(() => {
      if (isImageFile(attachment)) {
        setSelectedImage(attachment);
      } else {
        // Open document viewer modal for everything else
        setSelectedDocument(attachment);
      }
    }, 0);
  };

  // First filter documents
  const documents = attachments?.filter(a => isDocumentFile(a)) || [];

  // Only show as image if it passes the image check
  const images = attachments?.filter(a => isImageFile(a)) || [];

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
        {/* Header with images and delete button */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {item.name}
              </h4>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  priorityColors[item.priority]
                }`}
              >
                {t(`priority${item.priority.charAt(0).toUpperCase()}${item.priority.slice(1)}`)}
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  statusColors[item.status]
                }`}
              >
                {t(`status${item.status.split("_").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("")}`)}
              </span>
            </div>
            {item.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {item.description}
              </p>
            )}
            {/* Location Info */}
            {showLocation && item.stage.area && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPinIcon className="w-4 h-4" />
                <span>
                  {item.stage.area.deck && `${item.stage.area.deck.name} / `}
                  {item.stage.area.name} / {item.stage.name}
                </span>
              </div>
            )}
            {/* Cancellation Info */}
            {item.status === "cancelled" && item.cancellation?.cancelledBy && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {t("cancelledBy")}:
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                      {item.cancellation.cancelledBy.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(item.cancellation.cancelledAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                      "{item.cancellation.reason}"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Image thumbnails next to delete button */}
          {images.length > 0 && (
            <div className="flex gap-2 flex-shrink-0">
              {images.slice(0, 2).map((img) => {
                const imgUrl = punchlistItemsApi.getDownloadUrl(projectId, item.identifier, img.identifier);
                return (
                  <button
                    key={img.identifier}
                    onClick={() => handleAttachmentClick(img)}
                    className="relative group w-28 h-28 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                    title={img.name}
                  >
                    <AuthenticatedImage
                      src={imgUrl}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <MagnifyingGlassIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
              {images.length > 2 && (
                <div className="w-28 h-28 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    +{images.length - 2}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action icons */}
          {canEdit && (!stageStatus || stageStatus === "in_progress") && item.status !== "done" && item.status !== "cancelled" && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {item.status === "open" && (
                <Tooltip content={t("markAsInProgress")} position="left">
                  <button
                    onClick={() => handleStatusChange("in_progress")}
                    disabled={isUpdating}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlayIcon className="w-5 h-5" />
                  </button>
                </Tooltip>
              )}
              {item.status === "in_progress" && (
                <Tooltip content={t("markAsDone")} position="left">
                  <button
                    onClick={() => handleStatusChange("done")}
                    disabled={isUpdating}
                    className="p-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckIcon className="w-5 h-5" />
                  </button>
                </Tooltip>
              )}
              <Tooltip content={t("markAsCancelled")} position="left">
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={isUpdating}
                  className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4 pl-1">
          <span className="flex items-center gap-1.5">
            <UserCircleIcon className="w-4 h-4" />
            <span className="font-medium text-gray-700 dark:text-gray-300">{item.creator.name}</span>
            <span className="text-gray-500 dark:text-gray-500">•</span>
            <span>{formatCreatedAt(item.dateCreated)}</span>
          </span>
          {item.dueDate && (
            <span className={`flex items-center gap-1.5 ${item.isOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}`}>
              <ClockIcon className="w-4 h-4" />
              {formatDueDate(item.dueDate)}
            </span>
          )}
          {item.assignees.length > 0 && (
            <span className="flex items-center gap-1.5">
              <UserGroupIcon className="w-4 h-4" />
              {item.assignees.map((a) => a.name).join(", ")}
            </span>
          )}
          {item.attachmentCount > 0 && (
            <span className="flex items-center gap-1.5">
              <PaperClipIcon className="w-4 h-4" />
              {t("attachmentsCount", { count: item.attachmentCount })}
            </span>
          )}
        </div>

        {/* Documents list */}
        {documents.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {documents.map((doc) => (
              <button
                key={doc.identifier}
                onClick={() => handleAttachmentClick(doc)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                title={doc.name}
              >
                <DocumentIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white truncate max-w-[200px]">
                  {doc.name}
                </span>
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Cancel Item Modal */}
      <CancelPunchlistItemModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        itemName={item.name}
      />

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewerModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          attachment={selectedImage}
          downloadUrl={punchlistItemsApi.getDownloadUrl(projectId, item.identifier, selectedImage.identifier)}
          allAttachments={images}
          onNavigate={setSelectedImage}
        />
      )}

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
          attachment={selectedDocument}
          downloadUrl={punchlistItemsApi.getDownloadUrl(projectId, item.identifier, selectedDocument.identifier)}
        />
      )}
    </>
  );
}
