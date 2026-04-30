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

export default function CommentInputPanel({
  isOpen,
  currentUser,
  selectedText,
  onSubmit,
  onCancel,
}: CommentInputPanelProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting.document");
  const [text, setText] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't auto-focus to preserve editor selection
  // User can click to focus the input

  useEffect(() => {
    if (!isOpen) {
      setText("");
    }
  }, [isOpen]);

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

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("startConversation")}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

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
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="px-4 py-2 bg-gray-600 text-gray-300 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500 transition-colors"
            >
              {t("comment")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
