"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TrashIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { CommentThreadProps } from "./types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function CommentThread({
  comment,
  currentUserId,
  isActive,
  onReply,
  onDelete,
  onResolve,
  onClick,
}: CommentThreadProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting.document");
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const isOwner = currentUserId === comment.author.identifier;

  const handleSubmitReply = () => {
    if (replyText.trim() && onReply) {
      onReply(comment.id, replyText.trim());
      setReplyText("");
      setIsReplying(false);
    }
  };

  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        isActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      } ${comment.isResolved ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      {/* Main comment */}
      <div className="flex gap-2">
        <div className="flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
            {getInitials(comment.author.name)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {comment.author.name}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onResolve && !comment.isResolved && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve(comment.id);
                  }}
                  className="p-1 text-gray-400 hover:text-green-500 rounded"
                  title={t("resolve")}
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
              )}
              {isOwner && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(comment.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 rounded"
                  title={t("delete")}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Selected text preview */}
          {comment.selectedText && (
            <div className="mt-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border-l-2 border-yellow-400 text-xs text-gray-600 dark:text-gray-400 italic truncate">
              &ldquo;{comment.selectedText}&rdquo;
            </div>
          )}

          {/* Comment text */}
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {comment.text}
          </p>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2 pl-2 border-l-2 border-gray-200 dark:border-gray-600">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                    {getInitials(reply.author.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                        {reply.author.name}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatRelativeTime(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {reply.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          {isReplying ? (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t("replyPlaceholder")}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-1.5">
                <button
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText("");
                  }}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyText.trim()}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("reply")}
                </button>
              </div>
            </div>
          ) : (
            onReply && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsReplying(true);
                }}
                className="mt-2 text-xs text-blue-500 hover:text-blue-600"
              >
                {t("reply")}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
