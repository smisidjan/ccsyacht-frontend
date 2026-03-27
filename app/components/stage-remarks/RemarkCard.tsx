"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChatBubbleLeftIcon,
  TrashIcon,
  PencilIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PaperClipIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import FormTextarea from "@/app/components/ui/FormTextarea";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import { stageRemarksApi, useStageRemarkAttachments } from "@/lib/api/stage-remarks";
import AuthenticatedImage from "@/app/components/ui/AuthenticatedImage";
import ImageViewerModal from "@/app/components/modals/ImageViewerModal";
import DocumentViewerModal from "@/app/components/modals/DocumentViewerModal";
import { useToast } from "@/app/context/ToastContext";
import { useCurrentUser } from "@/lib/api/hooks";
import type { StageRemark, StageRemarkAttachment } from "@/lib/api/types";

interface RemarkCardProps {
  remark: StageRemark;
  projectId: string;
  onUpdate?: () => void;
  depth?: number; // Track nesting depth for styling
}

export default function RemarkCard({
  remark,
  projectId,
  onUpdate,
  depth = 0,
}: RemarkCardProps) {
  const t = useTranslations("stageRemarks");
  const { showToast } = useToast();
  const { data: user } = useCurrentUser();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [editContent, setEditContent] = useState(remark.text);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<StageRemarkAttachment | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<StageRemarkAttachment | null>(null);

  // Fetch attachments if remark has any
  const { data: attachments } = useStageRemarkAttachments(
    projectId,
    remark.identifier,
    remark.attachmentCount > 0
  );

  // Check if user is the author (for edit/delete)
  const isAuthor = user?.identifier === remark.author.identifier;

  const maxDepth = 3; // Maximum nesting level for replies

  // Helper function to check if attachment is a document
  const isDocumentFile = (attachment: StageRemarkAttachment) => {
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
  const isImageFile = (attachment: StageRemarkAttachment) => {
    const mimeType = attachment.encodingFormat?.toLowerCase() || '';
    const fileName = attachment.name?.toLowerCase() || '';

    // First check: is it a document? If yes, it's DEFINITELY NOT an image
    if (isDocumentFile(attachment)) return false;

    // STRICT CHECK: Only return true if we're CERTAIN it's an image
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
    const hasValidImageMime = imageTypes.includes(mimeType);

    // Check file extension as secondary confirmation
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => fileName.endsWith(ext));

    // BOTH must be true, OR if no MIME type, at least extension must be valid
    if (hasValidImageMime && hasImageExtension) return true;
    if (!mimeType && hasImageExtension) return true;

    return false;
  };

  const handleAttachmentClick = (attachment: StageRemarkAttachment) => {
    // First close any open modals to prevent conflicts
    setSelectedImage(null);
    setSelectedDocument(null);

    // Then open the correct modal after a small delay to ensure state reset
    setTimeout(() => {
      if (isImageFile(attachment)) {
        setSelectedImage(attachment);
      } else {
        setSelectedDocument(attachment);
      }
    }, 0);
  };

  // Filter documents and images
  const documents = attachments?.filter(a => isDocumentFile(a)) || [];
  const images = attachments?.filter(a => isImageFile(a)) || [];

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      await stageRemarksApi.create(projectId, remark.stage.identifier, {
        content: replyContent,
        parent_id: remark.identifier,
      });
      showToast("success", t("replySuccess"));
      setReplyContent("");
      setShowReplyForm(false);
      onUpdate?.();
    } catch (error: any) {
      showToast("error", error.message || t("replyError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    setIsSubmitting(true);
    try {
      await stageRemarksApi.update(projectId, remark.identifier, {
        content: editContent,
      });
      showToast("success", t("editSuccess"));
      setShowEditForm(false);
      onUpdate?.();
    } catch (error: any) {
      showToast("error", error.message || t("editError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await stageRemarksApi.delete(projectId, remark.identifier);
      showToast("success", t("deleteSuccess"));
      onUpdate?.();
    } catch (error: any) {
      showToast("error", error.message || t("deleteError"));
    }
  };

  const formatTimestamp = (dateCreated: string, dateModified: string) => {
    const created = new Date(dateCreated);
    const modified = new Date(dateModified);
    const now = new Date();
    const date = modified > created ? modified : created;
    const isEdited = modified > created;

    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeString = "";
    if (diffMinutes < 1) timeString = t("justNow");
    else if (diffMinutes < 60) timeString = t("minutesAgo", { minutes: diffMinutes });
    else if (diffHours < 24) timeString = t("hoursAgo", { hours: diffHours });
    else if (diffDays < 7) timeString = t("daysAgo", { days: diffDays });
    else timeString = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return isEdited ? `${timeString} (${t("edited")})` : timeString;
  };

  // Calculate left margin based on depth for nested replies
  const marginLeft = depth > 0 ? `${Math.min(depth, maxDepth) * 2}rem` : "0";

  return (
    <div style={{ marginLeft }} className="group">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        {/* Header with author info and action buttons */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <UserCircleIcon className="w-5 h-5 text-gray-400" />
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                {remark.author.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {formatTimestamp(remark.dateCreated, remark.dateModified)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAuthor && (
              <button
                onClick={() => {
                  setShowEditForm(!showEditForm);
                  setShowReplyForm(false);
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={t("edit")}
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
            {isAuthor && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={t("delete")}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content or Edit Form with Images on the right */}
        {showEditForm ? (
          <div className="space-y-4">
            <FormTextarea
              id={`edit-${remark.identifier}`}
              label={t("remarkContent")}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleEdit}
                disabled={isSubmitting || !editContent.trim()}
              >
                {t("save")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowEditForm(false);
                  setEditContent(remark.text);
                }}
                disabled={isSubmitting}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-4 items-start">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap flex-1">
                {remark.text}
              </p>

              {/* Image thumbnails on the right */}
              {images.length > 0 && (
                <div className="flex gap-2 flex-shrink-0">
                  {images.slice(0, 2).map((img) => {
                    const imgUrl = stageRemarksApi.getDownloadUrl(projectId, remark.identifier, img.identifier);
                    return (
                      <button
                        key={img.identifier}
                        onClick={() => handleAttachmentClick(img)}
                        className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                        title={img.name}
                      >
                        <AuthenticatedImage
                          src={imgUrl}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <MagnifyingGlassIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    );
                  })}
                  {images.length > 2 && (
                    <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        +{images.length - 2}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attachments - Documents */}
            {documents.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {documents.map((doc) => (
                  <button
                    key={doc.identifier}
                    onClick={() => handleAttachmentClick(doc)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                    title={doc.name}
                  >
                    <DocumentIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white truncate max-w-[150px]">
                      {doc.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Attachment count indicator */}
            {remark.attachmentCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-2">
                <PaperClipIcon className="w-3.5 h-3.5" />
                <span>{remark.attachmentCount} {remark.attachmentCount === 1 ? t("attachment") : t("attachments")}</span>
              </div>
            )}

            {/* Reply button and View Replies button */}
            <div className="mt-4 flex items-center gap-5">
              {/* Reply button - only show on top-level remarks (depth === 0) */}
              {depth === 0 && (
                <button
                  onClick={() => {
                    setShowReplyForm(!showReplyForm);
                    setShowEditForm(false);
                  }}
                  className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  {t("reply")}
                </button>
              )}

              {/* View replies button - only show if there are replies */}
              {remark.replyCount > 0 && (
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  {showReplies ? (
                    <>
                      <ChevronUpIcon className="w-4 h-4" />
                      {t("hideReplies", { count: remark.replyCount })}
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="w-4 h-4" />
                      {t("viewReplies", { count: remark.replyCount })}
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}

        {/* Reply Form */}
        {showReplyForm && (
          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <FormTextarea
              id={`reply-${remark.identifier}`}
              label={t("writeReply")}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={t("replyPlaceholder")}
              rows={3}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleReply}
                disabled={isSubmitting || !replyContent.trim()}
              >
                {t("submitReply")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent("");
                }}
                disabled={isSubmitting}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies - only show when showReplies is true */}
      {showReplies && remark.replies && remark.replies.length > 0 && (
        <div className="mt-5 space-y-5">
          {remark.replies.map((reply) => (
            <RemarkCard
              key={reply.identifier}
              remark={reply}
              projectId={projectId}
              onUpdate={onUpdate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={t("deleteRemark")}
        message={t("confirmDelete")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        confirmVariant="danger"
      />

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewerModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          attachment={selectedImage}
          downloadUrl={stageRemarksApi.getDownloadUrl(projectId, remark.identifier, selectedImage.identifier)}
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
          downloadUrl={stageRemarksApi.getDownloadUrl(projectId, remark.identifier, selectedDocument.identifier)}
        />
      )}
    </div>
  );
}
