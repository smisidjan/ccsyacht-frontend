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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center mb-3">
          <ChatBubbleLeftIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("noComments")}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[220px] leading-relaxed">
          {t("selectTextToComment")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeComments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t("comments")}
            </h4>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {activeComments.length}
            </span>
          </div>
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

      {resolvedComments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t("resolved")}
            </h4>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {resolvedComments.length}
            </span>
          </div>
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
