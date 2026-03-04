"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  DocumentTextIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";
import { documentsApi } from "@/lib/api/documents";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";

interface GeneralArrangementTabProps {
  projectId: string;
  generalArrangementUrl?: string;
}

export default function GeneralArrangementTab({
  projectId,
  generalArrangementUrl,
}: GeneralArrangementTabProps) {
  const t = useTranslations("projectDetail.generalArrangement");
  const [zoom, setZoom] = useState(100);
  const [gaUrl, setGaUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [rawLoading, setRawLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loading = useMinimumLoadingTime(rawLoading);

  // Fetch general arrangement on mount
  useEffect(() => {
    async function fetchGA() {
      try {
        setRawLoading(true);
        setError(null);
        const blob = await documentsApi.downloadGeneralArrangement(projectId);
        const url = window.URL.createObjectURL(blob);
        setGaUrl(url);
        setFileType(blob.type);
      } catch (err: any) {
        console.error("Failed to fetch general arrangement:", err);
        // If 404, it means no GA uploaded yet - don't show error, show empty state instead
        if (err.status === 404) {
          setGaUrl(null);
        } else {
          setError(err.message || "Failed to load general arrangement");
        }
      } finally {
        setRawLoading(false);
      }
    }

    fetchGA();

    // Cleanup: revoke object URL on unmount
    return () => {
      if (gaUrl) {
        window.URL.revokeObjectURL(gaUrl);
      }
    };
  }, [projectId]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoom(100);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSkeleton type="list" rows={3} />
      </div>
    );
  }

  // Error state
  if (error) {
    return <Alert type="error" message={error} />;
  }

  // No document state - check if gaUrl is null after loading
  if (!loading && !gaUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
        <DocumentTextIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t("noDocument")}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
          {t("noDocumentDescription")}
        </p>
      </div>
    );
  }


        {/* Toolbar */}  return (
    <div>
      {/* Toolbar - Only show for images with zoom controls */}
      {fileType !== "application/pdf" && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-1">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title={t("zoomOut")}
            >
              <MagnifyingGlassMinusIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <span className="px-3 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title={t("zoomIn")}
            >
              <MagnifyingGlassPlusIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title={t("resetZoom")}
            >
              <ArrowsPointingOutIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}

      {/* Document Viewer */}
    </div>
  );
}
