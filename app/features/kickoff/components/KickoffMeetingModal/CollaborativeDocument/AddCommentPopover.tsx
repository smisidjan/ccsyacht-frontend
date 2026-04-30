"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChatBubbleOvalLeftIcon } from "@heroicons/react/24/solid";
import type { AddCommentPopoverProps } from "./types";

export default function AddCommentPopover({
  position,
  onOpenCommentPanel,
}: AddCommentPopoverProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!position || !mounted) return null;

  return createPortal(
    <div
      className="fixed z-[1100] animate-in fade-in slide-in-from-top-1 duration-150"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <button
        onMouseDown={(e) => {
          // Prevent the button from stealing focus and clearing the selection
          e.preventDefault();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenCommentPanel();
        }}
        className="flex items-center justify-center w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-colors"
        title="Add comment"
      >
        <ChatBubbleOvalLeftIcon className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
}
