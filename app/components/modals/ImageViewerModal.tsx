"use client";

import { useEffect } from "react";
import { XMarkIcon, ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import AuthenticatedImage from "@/app/components/ui/AuthenticatedImage";
import type { PunchlistItemAttachment } from "@/lib/api/types";

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: PunchlistItemAttachment;
  downloadUrl: string;
  allAttachments?: PunchlistItemAttachment[];
  onNavigate?: (attachment: PunchlistItemAttachment) => void;
}

export default function ImageViewerModal({
  isOpen,
  onClose,
  attachment,
  downloadUrl,
  allAttachments = [],
  onNavigate,
}: ImageViewerModalProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Navigation
  const currentIndex = allAttachments.findIndex(a => a.identifier === attachment.identifier);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allAttachments.length - 1;

  const handlePrevious = () => {
    if (hasPrevious && onNavigate) {
      onNavigate(allAttachments[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(allAttachments[currentIndex + 1]);
    }
  };

  // Handle arrow keys for navigation
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrevious) handlePrevious();
      if (e.key === "ArrowRight" && hasNext) handleNext();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleArrowKeys);
    }
    return () => {
      document.removeEventListener("keydown", handleArrowKeys);
    };
  }, [isOpen, hasPrevious, hasNext, currentIndex]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = attachment.name;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 bg-black/50 rounded-lg transition-colors z-10"
        aria-label="Close"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      {/* Download button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
        className="absolute top-4 right-16 p-2 text-white hover:text-gray-300 bg-black/50 rounded-lg transition-colors z-10"
        aria-label="Download"
      >
        <ArrowDownTrayIcon className="w-6 h-6" />
      </button>

      {/* Previous button */}
      {hasPrevious && onNavigate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:text-gray-300 bg-black/50 rounded-lg transition-colors z-10"
          aria-label="Previous"
        >
          <ChevronLeftIcon className="w-8 h-8" />
        </button>
      )}

      {/* Next button */}
      {hasNext && onNavigate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:text-gray-300 bg-black/50 rounded-lg transition-colors z-10"
          aria-label="Next"
        >
          <ChevronRightIcon className="w-8 h-8" />
        </button>
      )}

      {/* Image container */}
      <div
        className="max-w-7xl max-h-[90vh] w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="flex items-center justify-center">
          <AuthenticatedImage
            src={downloadUrl}
            alt={attachment.name}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        </div>

        {/* Image info */}
        <div className="mt-4 text-center text-white">
          <p className="font-medium text-lg">{attachment.name}</p>
          <p className="text-sm text-gray-300 mt-1">
            {attachment.contentSizeHuman}
            {allAttachments.length > 1 && ` • ${currentIndex + 1} / ${allAttachments.length}`}
          </p>
        </div>
      </div>
    </div>
  );
}
