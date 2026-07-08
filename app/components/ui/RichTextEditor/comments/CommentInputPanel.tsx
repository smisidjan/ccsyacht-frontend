"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { CommentInputPanelProps } from "./types";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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

export default function CommentInputPanel({
  isOpen,
  currentUser,
  selectedText,
  existingComments,
  onSubmit,
  onCancel,
  onReply,
}: CommentInputPanelProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting.document");
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  if (!isOpen || !currentUser) return null;

  const hasExistingComments = !!(existingComments && existingComments.length > 0);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setText("");
    }
  };

  const handleSubmitReply = (commentId: string) => {
    const trimmed = replyText.trim();
    if (!trimmed || !onReply) return;
    onReply(commentId, trimmed);
    setReplyText("");
    setReplyingTo(null);
  };

  return (
    <div
      className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-white dark:bg-gray-800 shadow-md overflow-hidden animate-in slide-in-from-top-2 duration-150"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {hasExistingComments ? t("comments") : t("addComment")}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Selected text quote */}
        {selectedText && (
          <div className="flex items-start gap-2.5">
            <div className="w-0.5 flex-shrink-0 self-stretch bg-blue-400 dark:bg-blue-500 rounded-full" />
            <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed line-clamp-2">
              &ldquo;{selectedText}&rdquo;
            </p>
          </div>
        )}

        {/* Existing comment threads */}
        {existingComments && existingComments.length > 0 && (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {existingComments.map((c) => (
              <div key={c.id} className={c.isResolved ? "opacity-50" : ""}>
                <div className="flex items-start gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 mt-0.5 ${getAvatarColor(c.author.name)}`}>
                    {getInitials(c.author.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {c.author.name}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {formatRelativeTime(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {c.text}
                    </p>

                    {/* Replies */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="mt-2.5 pl-3 border-l-2 border-gray-100 dark:border-gray-700 space-y-2">
                        {c.replies.map((r) => (
                          <div key={r.id} className="flex items-start gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0 mt-0.5 ${getAvatarColor(r.author.name)}`}>
                              {getInitials(r.author.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                  {r.author.name}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {formatRelativeTime(r.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                {r.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply action */}
                    {onReply && !c.isResolved && (
                      replyingTo === c.id ? (
                        <div className="mt-2.5">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitReply(c.id); }
                              if (e.key === "Escape") { e.preventDefault(); setReplyingTo(null); setReplyText(""); }
                            }}
                            placeholder={t("replyPlaceholder")}
                            className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-1.5">
                            <button
                              type="button"
                              onClick={() => { setReplyingTo(null); setReplyText(""); }}
                              className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                              {t("cancel")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSubmitReply(c.id)}
                              disabled={!replyText.trim()}
                              className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {t("reply")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReplyingTo(c.id)}
                          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                        >
                          {t("reply")}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New comment input */}
        {!hasExistingComments && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 ${getAvatarColor(currentUser.name)}`}>
                {getInitials(currentUser.name)}
              </div>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
                  if (e.key === "Escape") { e.preventDefault(); onCancel(); }
                }}
                placeholder={t("startConversation")}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between pl-8">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{t("submitHint")}</span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim()}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t("comment")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
