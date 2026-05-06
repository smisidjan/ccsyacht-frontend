"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  DocumentTextIcon,
  DocumentIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  LockClosedIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

// Lazy: TipTap (~200 ESM modules) only loads when this section actually renders.
// Keeps it out of every dashboard route's compile graph in dev.
const CollaborativeDocument = dynamic(
  () => import("./CollaborativeDocument").then((m) => m.CollaborativeDocument),
  { ssr: false }
);
import { setupTasksApi } from "@/lib/api";
import { useToast } from "@/app/context/ToastContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import type { SetupTask, KickoffDocument, DocumentComment } from "@/lib/api/types";

interface DocumentSigner {
  identifier: string;
  name: string;
  hasSigned: boolean;
  signedAt: string | null;
}

interface SigningStatus {
  count: number;
  total: number;
  signers: DocumentSigner[];
}

interface CollaborativeDocumentSectionProps {
  task: SetupTask;
  projectId: string;
  taskId: string;
  currentUser: {
    identifier: string;
    name: string;
  } | null;
  isAttendee: boolean;
  onUpdate?: () => void;
  onSigningStatusChange?: (status: SigningStatus | null) => void;
}

export default function CollaborativeDocumentSection({
  task,
  projectId,
  taskId,
  currentUser,
  isAttendee,
  onUpdate,
  onSigningStatusChange,
}: CollaborativeDocumentSectionProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");
  const { showToast } = useToast();
  const { hasPermission } = usePermission();

  // Check if user can finalize the document
  const canFinalize = hasPermission(PERMISSIONS.MANAGE_KICKOFF_MEETING);

  // Build document download URL
  const getDocumentUrl = (docId: string, inline = false) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    const tenantUrl = typeof window !== "undefined" ? localStorage.getItem("tenantUrl") || "" : "";
    return `${process.env.NEXT_PUBLIC_API_URL || "/api"}/projects/${projectId}/setup-task/${taskId}/documents/${docId}/download?token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(tenantUrl)}${inline ? "&inline=true" : ""}`;
  };

  const [kickoffDocument, setKickoffDocument] = useState<KickoffDocument | null>(null);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if we should show the document section
  const isPending = task.actionStatus === "pending";

  // Fetch kickoff document and comments
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // getKickoffDocument returns null on 404 (no document exists)
      const doc = await setupTasksApi.getKickoffDocument(projectId, taskId);
      setKickoffDocument(doc);

      // Only fetch comments if document exists
      if (doc) {
        try {
          const commentsResponse = await setupTasksApi.getDocumentComments(
            projectId,
            taskId,
            doc.identifier
          );
          setComments(commentsResponse.data || []);
        } catch {
          // Comments fetch failed, but document is still available
          setComments([]);
        }
      }
    } catch (err) {
      // Only set error for unexpected errors, not 404s
      const message = err instanceof Error ? err.message : "Failed to load document";
      // Don't show error for "not found" type errors
      if (!message.toLowerCase().includes("not found") && !message.includes("404")) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    // Don't fetch if task is still pending
    if (isPending) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [projectId, taskId, isPending, fetchData]);

  // Handle finalize document
  const handleFinalize = async () => {
    if (!kickoffDocument) return;

    try {
      setIsFinalizing(true);
      const response = await setupTasksApi.finalizeKickoffDocument(
        projectId,
        taskId,
        kickoffDocument.identifier
      );
      // Extract the updated document from response.result or use response directly
      const updatedDoc = (response as { result?: KickoffDocument }).result || response;
      if (updatedDoc && 'identifier' in updatedDoc) {
        setKickoffDocument(updatedDoc as KickoffDocument);
      }
      showToast("success", t("document.finalizeSuccess"));
      setShowFinalizeModal(false);
      onUpdate?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("document.finalizeError");
      showToast("error", message);
    } finally {
      setIsFinalizing(false);
    }
  };

  // Handle sign document (agree)
  const handleSign = async (agreed: boolean, reason?: string) => {
    if (!kickoffDocument) return;

    try {
      setIsSigning(true);
      const response = await setupTasksApi.signKickoffDocument(
        projectId,
        taskId,
        kickoffDocument.identifier,
        agreed,
        reason
      );
      // Extract the updated document from response.result
      const updatedDoc = (response as { result?: KickoffDocument }).result;
      if (updatedDoc) {
        setKickoffDocument(updatedDoc);
      }
      showToast("success", t("document.signSuccess"));
      onUpdate?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("document.signError");
      showToast("error", message);
    } finally {
      setIsSigning(false);
    }
  };

  // Only show after meeting is scheduled (not pending)
  if (isPending) return null;
  
  // Check if current user has already signed
  const currentUserSigner = kickoffDocument?.signers?.find(
    (s) => s.identifier === currentUser?.identifier
  );
  const hasUserSigned = currentUserSigner?.hasSigned === true;

  // Get effective signers - use task assignees as fallback if signers array is empty
  const effectiveSigners = kickoffDocument?.signers?.length
    ? kickoffDocument.signers
    : task.assignees?.map(a => ({
        identifier: a.identifier,
        name: a.name,
        hasSigned: a.hasSigned || false,
        signedAt: null,
      })) || [];

  // Calculate counts from actual signers data (more reliable than backend fields)
  const signedCount = kickoffDocument?.signedCount
    ?? effectiveSigners.filter(s => s.hasSigned === true).length;
  const totalAssignees = kickoffDocument?.totalAssignees ?? task.assignees?.length ?? 0;

  // Notify parent of signing status changes
  useEffect(() => {
    if (kickoffDocument?.isFinalDocument && totalAssignees > 0) {
      const signers: DocumentSigner[] = effectiveSigners.map(s => ({
        identifier: s.identifier,
        name: s.name,
        hasSigned: s.hasSigned === true,
        signedAt: s.signedAt || null,
      }));
      onSigningStatusChange?.({ count: signedCount, total: totalAssignees, signers });
    } else {
      onSigningStatusChange?.(null);
    }
  }, [kickoffDocument?.isFinalDocument, signedCount, totalAssignees, effectiveSigners, onSigningStatusChange]);

  // Separate content editing from commenting
  // Content is only editable if kickoffDocument.isEditable is true and document is not finalized
  const contentEditable = isAttendee &&
    task.actionStatus !== "completed" &&
    kickoffDocument?.isEditable === true &&
    !kickoffDocument?.isFinalDocument;
  // Comments are allowed for attendees when document is not finalized
  const canComment = isAttendee && task.actionStatus !== "completed" && !kickoffDocument?.isFinalDocument;

  // Unresolved comment count
  const unresolvedCount = comments.filter((c) => !c.isResolved).length;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4 text-gray-400" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4" />
          {t("meetingDocument")}
        </h4>
        <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!kickoffDocument) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4" />
          {t("meetingDocument")}
        </h4>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("document.noDocument")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <DocumentTextIcon className="w-4 h-4" />
          {kickoffDocument.name || t("meetingDocument")}
          {kickoffDocument.isFinalDocument && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              <LockClosedIcon className="w-3 h-3" />
              {t("document.finalized")}
            </span>
          )}
        </h4>
        <div className="flex items-center gap-2">
          {!kickoffDocument.isFinalDocument && unresolvedCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {unresolvedCount} {t("document.comments").toLowerCase()}
            </span>
          )}
          {/* Finalize button */}
          {!kickoffDocument.isFinalDocument && canFinalize && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowFinalizeModal(true)}
              disabled={isFinalizing}
            >
              <LockClosedIcon className="w-4 h-4" />
              {t("document.finalize")}
            </Button>
          )}
        </div>
      </div>

      {/* Finalized document accordion */}
      {kickoffDocument.isFinalDocument && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Accordion header */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
              kickoffDocument.allSigned ? "bg-green-50/50 dark:bg-green-900/10" : ""
            }`}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            )}
            <DocumentIcon className={`w-4 h-4 ${
              kickoffDocument.allSigned ? "text-green-600" : "text-gray-400"
            }`} />
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
              {kickoffDocument.name || t("meetingDocument")}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              kickoffDocument.allSigned
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
            }`}>
              {kickoffDocument.allSigned && <CheckIcon className="w-3 h-3 inline mr-1" />}
              {signedCount}/{totalAssignees}
            </span>
          </button>

          {/* Accordion content */}
          {isExpanded && (
            <div className="px-4 pb-4 pt-2 bg-gray-50 dark:bg-gray-800/30 space-y-3">
              {/* View document link */}
              <a
                href={getDocumentUrl(kickoffDocument.identifier, true)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <EyeIcon className="w-4 h-4" />
                {t("viewDocument")}
              </a>

              {/* Signer list */}
              <div className="space-y-2">
                {/* Signed */}
                {effectiveSigners
                  .filter((signer) => signer.hasSigned === true)
                  .map((signer) => (
                    <div key={signer.identifier} className="flex items-center gap-2 text-xs">
                      <CheckIcon className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      <span className="font-medium text-green-700 dark:text-green-400">
                        {signer.name}
                      </span>
                    </div>
                  ))}
                {/* Pending */}
                {effectiveSigners
                  .filter((signer) => signer.hasSigned !== true)
                  .map((signer) => (
                    <div key={signer.identifier} className="flex items-center gap-2 text-xs">
                      <ClockIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-400">{signer.name}</span>
                    </div>
                  ))}
              </div>

              {/* Sign button for current user (attendee) */}
              {isAttendee && !hasUserSigned && task.actionStatus !== "completed" && (
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSign(true)}
                    loading={isSigning}
                    disabled={isSigning}
                  >
                    <CheckIcon className="w-4 h-4" />
                    {t("agreeDocument")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* File download card when hasFile is true (for non-finalized documents) */}
      {!kickoffDocument.isFinalDocument && kickoffDocument.hasFile && kickoffDocument.fileName && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <DocumentIcon className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {kickoffDocument.fileName}
              </p>
              {kickoffDocument.contentSize && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {kickoffDocument.contentSize}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={getDocumentUrl(kickoffDocument.identifier, true)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title={t("document.view")}
            >
              <EyeIcon className="w-5 h-5" />
            </a>
            <a
              href={getDocumentUrl(kickoffDocument.identifier)}
              download
              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title={t("document.download")}
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </a>
          </div>
        </div>
      )}

      {/* Collaborative editor for content (only when not finalized) */}
      {!kickoffDocument.isFinalDocument && kickoffDocument.content && (
        <CollaborativeDocument
          projectId={projectId}
          taskId={taskId}
          documentId={kickoffDocument.identifier}
          initialContent={kickoffDocument.content}
          initialComments={comments}
          currentUser={currentUser}
          editable={contentEditable}
          canComment={canComment}
          onCommentsChange={setComments}
        />
      )}

      {/* Finalize Confirmation Modal */}
      <Modal
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        title={t("document.finalizeTitle")}
        size="sm"
        actions={[
          {
            label: t("cancel"),
            variant: "secondary",
            onClick: () => setShowFinalizeModal(false),
          },
          {
            label: t("document.confirmFinalize"),
            variant: "primary",
            onClick: async () => {
              setShowFinalizeModal(false);
              await handleFinalize();
            },
            loading: isFinalizing,
          },
        ]}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t("document.finalizeDescription")}
        </p>
      </Modal>
    </div>
  );
}
