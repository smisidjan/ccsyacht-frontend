"use client";

import { useEffect, useState } from "react";
import { XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { PunchlistItemAttachment } from "@/lib/api/types";
import { useTranslations } from "next-intl";
import { getAuthToken, getTenantUrl } from "@/lib/api/client";

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: PunchlistItemAttachment;
  downloadUrl: string;
}

export default function DocumentViewerModal({
  isOpen,
  onClose,
  attachment,
  downloadUrl,
}: DocumentViewerModalProps) {
  const t = useTranslations("punchlist");
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isPDF = attachment.encodingFormat.toLowerCase() === "application/pdf";

  // Fetch document with authentication
  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchDocument = async () => {
      if (!isPDF) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        const token = getAuthToken();
        const tenantUrl = getTenantUrl();

        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        if (tenantUrl) {
          headers["X-Tenant-ID"] = tenantUrl;
        }

        const response = await fetch(downloadUrl, { headers });

        if (!response.ok) {
          throw new Error("Failed to load document");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load document:", err);
        setError(true);
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchDocument();
    }

    // Cleanup object URL on unmount
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, downloadUrl, isPDF]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = attachment.name;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Modal container */}
      <div
        className="max-w-5xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {attachment.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {attachment.contentSizeHuman} • {attachment.encodingFormat}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* Download button */}
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={t("downloadAttachment")}
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-100 dark:bg-gray-900">
          {isPDF ? (
            loading ? (
              <div className="flex items-center justify-center h-[70vh]">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Document laden...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-[70vh]">
                <div className="text-center max-w-md">
                  <p className="text-red-600 dark:text-red-400 mb-4">
                    Fout bij het laden van het document
                  </p>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Download bestand
                  </button>
                </div>
              </div>
            ) : (
              // PDF viewer using iframe with blob URL (toolbar disabled)
              <iframe
                src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-[70vh] border-0"
                title={attachment.name}
              />
            )
          ) : (
            // For non-PDF documents, show info and download option
            <div className="flex flex-col items-center justify-center p-12 h-[70vh]">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {attachment.name}
                </h4>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {attachment.contentSizeHuman} • {attachment.encodingFormat}
                </p>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Preview niet beschikbaar voor dit bestandstype. Klik op de download knop om het bestand te openen.
                </p>

                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Download bestand
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Toegevoegd door {attachment.uploadedBy.name}
            </span>
            <span className="text-gray-500 dark:text-gray-500">
              {new Date(attachment.dateCreated).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
