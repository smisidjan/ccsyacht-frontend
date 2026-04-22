"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { getAuthToken, getTenantUrl } from "@/lib/api/client";
import { handleError } from "@/lib/utils/errors";

// Split context to prevent unnecessary re-renders
interface GADataContextValue {
  pdfData: Uint8Array | null;
  blobUrl: string | null;
  error: string | null;
  fileType: string | null;
}

interface GALoadingContextValue {
  isDownloading: boolean;
  downloadProgress: number;
  loadGA: (projectId: string, gaUrl?: string) => Promise<void>;
  resetGA: () => void;
}

const GADataContext = createContext<GADataContextValue | undefined>(undefined);
const GALoadingContext = createContext<GALoadingContextValue | undefined>(undefined);

export function GAProvider({ children }: { children: ReactNode }) {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [loadedGAUrl, setLoadedGAUrl] = useState<string | null>(null);

  const resetGA = useCallback(() => {
    // Use functional setState to avoid dependencies on state values
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPdfData(null);
    setIsDownloading(false);
    setDownloadProgress(0);
    setError(null);
    setFileType(null);
    setLoadedProjectId(null);
    setLoadedGAUrl(null);
  }, []); // No dependencies!

  const loadGA = useCallback(async (projectId: string, gaUrl?: string) => {
    // Don't reload if already loaded for this project AND same GA URL
    if (loadedProjectId === projectId && loadedGAUrl === gaUrl) {
      return;
    }

    // If GA URL changed, revoke old blob URL before loading new one
    if (loadedProjectId === projectId && loadedGAUrl !== gaUrl) {
      resetGA();
    }

    // Declare progressInterval in outer scope for cleanup
    let progressInterval: NodeJS.Timeout | undefined;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setError(null);

      // Track start time for minimum display duration
      const startTime = Date.now();
      const minimumDuration = 4000; // 4 seconds total

      // Small delay to ensure UI shows 0% before starting download
      await new Promise(resolve => setTimeout(resolve, 50));

      // Start simulated progress (grows from 0 to 90% over 2.5 seconds)
      // This ensures visible progression even on fast connections
      let simulatedProgress = 0;
      progressInterval = setInterval(() => {
        simulatedProgress += 5; // Increment by 5%
        if (simulatedProgress <= 90) {
          setDownloadProgress(simulatedProgress);
        }
      }, 140); // ~18 steps over 2.5 seconds

      const token = getAuthToken();
      const tenantUrl = getTenantUrl();

      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (tenantUrl) {
        headers["X-Tenant-ID"] = tenantUrl;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "/api"}/projects/${projectId}/general-arrangement`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // No GA document exists
          setIsDownloading(false);
          setLoadedProjectId(projectId);
          return;
        }
        throw new Error(`HTTP error ${response.status}`);
      }

      // Get content type
      const contentType = response.headers.get("content-type") || "";
      setFileType(contentType);

      // Get content length for progress tracking
      const contentLength = response.headers.get("content-length");
      const total = parseInt(contentLength || "0", 10);

      let loaded = 0;
      const chunks: Uint8Array[] = [];

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      // Throttle progress updates to make progression visible (min 150ms between updates)
      let lastProgressUpdate = Date.now();
      const minProgressInterval = 150;

      // Stream and track progress
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        // Throttle progress updates for smoother visual progression
        const now = Date.now();
        const timeSinceLastUpdate = now - lastProgressUpdate;

        if (timeSinceLastUpdate >= minProgressInterval) {
          // Update progress (use estimate if content-length not available)
          if (total > 0) {
            setDownloadProgress(Math.round((loaded / total) * 100));
          } else {
            // Show incremental progress without total (max 90% until complete)
            const estimatedProgress = Math.min(90, Math.floor(loaded / 200000)); // ~1% per 200KB
            setDownloadProgress(estimatedProgress);
          }
          lastProgressUpdate = now;
        }
      }

      // Combine chunks into single Uint8Array
      const combinedChunks = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        combinedChunks.set(chunk, offset);
        offset += chunk.length;
      }

      // Set pdfData FIRST before loading with PDF.js
      setPdfData(combinedChunks);
      setLoadedProjectId(projectId);
      setLoadedGAUrl(gaUrl || null);

      // Create blob URL for rendering (works for both PDF and images)
      const blob = new Blob([combinedChunks], { type: contentType });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      // Stop simulated progress
      clearInterval(progressInterval);

      // Set progress to 100%
      setDownloadProgress(100);

      // Ensure minimum total duration of 4 seconds
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minimumDuration - elapsed);

      setTimeout(() => {
        setIsDownloading(false);
      }, remainingTime);
    } catch (err) {
      // Stop simulated progress on error
      if (typeof progressInterval !== 'undefined') {
        clearInterval(progressInterval);
      }
      setError(err instanceof Error ? err.message : "Failed to load GA");
      setIsDownloading(false);
      handleError(err, { severity: "console", context: "Loading GA" });
    }
  }, [loadedProjectId, loadedGAUrl, resetGA]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Memoize context values separately to minimize re-renders
  const dataValue = useMemo(
    () => ({
      pdfData,
      blobUrl,
      error,
      fileType,
    }),
    [pdfData, blobUrl, error, fileType]
  );

  const loadingValue = useMemo(
    () => ({
      isDownloading,
      downloadProgress,
      loadGA,
      resetGA,
    }),
    [isDownloading, downloadProgress, loadGA, resetGA]
  );

  return (
    <GADataContext.Provider value={dataValue}>
      <GALoadingContext.Provider value={loadingValue}>
        {children}
      </GALoadingContext.Provider>
    </GADataContext.Provider>
  );
}

// Hook to get GA data (blobUrl, pdfDocument, etc.) - rarely changes
export function useGAData() {
  const context = useContext(GADataContext);
  if (!context) {
    throw new Error("useGAData must be used within GAProvider");
  }
  return context;
}

// Hook to get loading state - changes during download
export function useGALoading() {
  const context = useContext(GALoadingContext);
  if (!context) {
    throw new Error("useGALoading must be used within GAProvider");
  }
  return context;
}

// Combined hook for convenience (but causes more re-renders)
export function useGA() {
  const data = useGAData();
  const loading = useGALoading();
  return { ...data, ...loading };
}
