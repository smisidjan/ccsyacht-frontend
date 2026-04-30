"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  DocumentTextIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { CollaborativeDocument } from "./CollaborativeDocument";
import { setupTasksApi } from "@/lib/api";
import type { SetupTask, KickoffDocument, DocumentComment } from "@/lib/api/types";

interface CollaborativeDocumentSectionProps {
  task: SetupTask;
  projectId: string;
  taskId: string;
  currentUser: {
    identifier: string;
    name: string;
  } | null;
  isAttendee: boolean;
}

export default function CollaborativeDocumentSection({
  task,
  projectId,
  taskId,
  currentUser,
  isAttendee,
}: CollaborativeDocumentSectionProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");

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

  // Check if we should show the document section
  const isPending = task.actionStatus === "pending";

  // Fetch kickoff document and comments
  useEffect(() => {
    // Don't fetch if task is still pending
    if (isPending) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
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
    };

    fetchData();
  }, [projectId, taskId, isPending]);

  // Only show after meeting is scheduled (not pending)
  if (isPending) return null;

  // Separate content editing from commenting
  // Content is only editable if kickoffDocument.isEditable is true
  // TODO: Remove the `&& false` when backend returns correct isEditable value
  const contentEditable = isAttendee && task.actionStatus !== "completed" && kickoffDocument?.isEditable === true && false;
  // Comments are always allowed for attendees (even if content is read-only)
  const canComment = isAttendee && task.actionStatus !== "completed";

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
        </h4>
        {unresolvedCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {unresolvedCount} {t("document.comments").toLowerCase()}
          </span>
        )}
      </div>

      {/* File download card when hasFile is true */}
      {kickoffDocument.hasFile && kickoffDocument.fileName && (
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

      {/* Collaborative editor for content */}
      {kickoffDocument.content && (
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
    </div>
  );
}
