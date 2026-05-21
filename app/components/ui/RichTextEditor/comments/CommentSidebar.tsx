"use client";

import { useTranslations } from "next-intl";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import CommentThread from "./CommentThread";
import type { CommentSidebarProps } from "./types";

export default function CommentSidebar({
  comments,
  currentUserId,
  activeCommentId,
  onCommentClick,
  onReply,
  onDelete,
  onResolve,
}: CommentSidebarProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting.document");

  const activeComments = comments.filter((c) => !c.isResolved);
  const resolvedComments = comments.filter((c) => c.isResolved);

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ChatBubbleLeftIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("noComments")}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("selectTextToComment")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active comments */}
      {activeComments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t("comments")} ({activeComments.length})
          </h4>
          <div className="space-y-2">
            {activeComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isActive={activeCommentId === comment.id}
                onReply={onReply}
                onDelete={onDelete}
                onResolve={onResolve}
                onClick={() => onCommentClick?.(comment.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved comments */}
      {resolvedComments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t("resolved")} ({resolvedComments.length})
          </h4>
          <div className="space-y-2">
            {resolvedComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isActive={activeCommentId === comment.id}
                onDelete={onDelete}
                onClick={() => onCommentClick?.(comment.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
