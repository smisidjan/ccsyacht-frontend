"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import type { CommentInputPanelProps } from "./types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
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
  const [mounted, setMounted] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't auto-focus to preserve editor selection
  // User can click to focus the input

  useEffect(() => {
    if (!isOpen) {
      setText("");
      setReplyingTo(null);
      setReplyText("");
    }
  }, [isOpen]);

  const handleSubmitReply = (commentId: string) => {
    const trimmed = replyText.trim();
    if (!trimmed || !onReply) return;
    onReply(commentId, trimmed);
    setReplyText("");
    setReplyingTo(null);
  };

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  if (!isOpen || !currentUser || !mounted) return null;

  const initials = getInitials(currentUser.name);
  const avatarColor = getAvatarColor(currentUser.name);
  const hasExistingComments = !!(existingComments && existingComments.length > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] pointer-events-none"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute left-[calc(50%+340px)] top-1/2 -translate-y-1/2 pointer-events-auto">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-5 w-96 animate-in slide-in-from-right-4 duration-200">
          {/* User info */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${avatarColor}`}
            >
              {initials}
            </div>
            <span className="text-white font-medium">{currentUser.name}</span>
          </div>

          {/* Selected text preview */}
          {selectedText && (
            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg border-l-2 border-blue-400 max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-400 mb-1">{t("commentingOn")}</p>
              <p className="text-sm text-gray-200 italic">&ldquo;{selectedText}&rdquo;</p>
            </div>
          )}

          {/* Existing comments on this range */}
          {existingComments && existingComments.length > 0 && (
            <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
              {existingComments.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-lg bg-gray-700/40 border border-gray-700 ${
                    c.isResolved ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium ${getAvatarColor(c.author.name)}`}
                    >
                      {getInitials(c.author.name)}
                    </div>
                    <span className="text-xs font-medium text-gray-200 flex-1 truncate">
                      {c.author.name}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {formatRelativeTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{c.text}</p>
                  {c.replies && c.replies.length > 0 && (
                    <div className="mt-2 pl-2 border-l border-gray-600 space-y-1.5">
                      {c.replies.map((r) => (
                        <div key={r.id}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-300">
                              {r.author.name}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {formatRelativeTime(r.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input / button */}
                  {onReply && !c.isResolved && (
                    replyingTo === c.id ? (
                      <div className="mt-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmitReply(c.id);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              setReplyingTo(null);
                              setReplyText("");
                            }
                          }}
                          placeholder={t("replyPlaceholder")}
                          className="w-full px-2 py-1.5 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-1.5">
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                            }}
                            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200"
                          >
                            {t("cancel")}
                          </button>
                          <button
                            onClick={() => handleSubmitReply(c.id)}
                            disabled={!replyText.trim()}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t("reply")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(c.id)}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        {t("reply")}
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input — hidden when comments already exist on this range, so the
              user is funneled into replying to one of them via the per-comment
              Reply action instead of starting a parallel top-level comment. */}
          {!hasExistingComments && (
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("startConversation")}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="px-4 py-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {t("cancel")}
            </button>
            {!hasExistingComments && (
              <button
                onClick={handleSubmit}
                disabled={!text.trim()}
                className="px-4 py-2 bg-gray-600 text-gray-300 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500 transition-colors"
              >
                {t("comment")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
