"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TrashIcon, CheckCircleIcon, ArrowUturnRightIcon } from "@heroicons/react/24/outline";
import type { CommentThreadProps } from "./types";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500",
];

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
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
      className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
        comment.isResolved
          ? "border-gray-100 dark:border-gray-800 opacity-60"
          : isActive
          ? "border-blue-300 dark:border-blue-700 shadow-sm shadow-blue-100/60 dark:shadow-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
      }`}
      onClick={onClick}
    >
      {/* Quoted text */}
      {comment.selectedText && (
        <div className={`flex items-start gap-2.5 px-4 py-2.5 border-b text-xs ${
          isActive
            ? "border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-900/10"
            : "border-gray-100 dark:border-gray-700/50 bg-gray-50/40 dark:bg-gray-800/20"
        }`}>
          <div className="w-0.5 self-stretch flex-shrink-0 bg-blue-300 dark:bg-blue-600 rounded-full" />
          <p className="text-gray-500 dark:text-gray-400 italic truncate">
            &ldquo;{comment.selectedText}&rdquo;
          </p>
        </div>
      )}

      <div className="px-4 py-3">
        {/* Author + actions row */}
        <div className="flex items-start gap-2.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${getAvatarColor(comment.author.name)}`}>
            {getInitials(comment.author.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {comment.author.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {onResolve && !comment.isResolved && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }}
                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-green-500 dark:hover:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    title={t("resolve")}
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                  </button>
                )}
                {isOwner && onDelete && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title={t("delete")}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Comment body */}
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {comment.text}
            </p>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 pl-3 border-l-2 border-gray-100 dark:border-gray-700 space-y-2.5">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0 mt-0.5 ${getAvatarColor(reply.author.name)}`}>
                      {getInitials(reply.author.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {reply.author.name}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {formatRelativeTime(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {reply.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input / button */}
            {isReplying ? (
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitReply(); }
                    if (e.key === "Escape") { e.preventDefault(); setIsReplying(false); setReplyText(""); }
                  }}
                  placeholder={t("replyPlaceholder")}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => { setIsReplying(false); setReplyText(""); }}
                    className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim()}
                    className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {t("reply")}
                  </button>
                </div>
              </div>
            ) : (
              onReply && !comment.isResolved && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsReplying(true); }}
                  className="mt-2.5 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  <ArrowUturnRightIcon className="w-3 h-3" />
                  {t("reply")}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
