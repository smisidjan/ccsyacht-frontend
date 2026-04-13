"use client";

import { useState, useEffect } from "react";
import { getAuthToken, getTenantUrl } from "@/lib/api/client";

interface UseGAImageResult {
  imageBlobUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch the GA image with authentication and return a blob URL.
 * This is needed because Leaflet's ImageOverlay doesn't include auth headers.
 */
export function useGAImage(imageUrl: string | undefined): UseGAImageResult {
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setImageBlobUrl(null);
      return;
    }

    let isCancelled = false;
    let blobUrl: string | null = null;

    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = getAuthToken();
        const tenantUrl = getTenantUrl();

        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        if (tenantUrl) {
          headers["X-Tenant-ID"] = tenantUrl;
        }

        const response = await fetch(imageUrl, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();

        if (isCancelled) {
          return;
        }

        blobUrl = URL.createObjectURL(blob);
        setImageBlobUrl(blobUrl);
      } catch (err) {
        if (!isCancelled) {
          const errorMsg = err instanceof Error ? err.message : "Failed to load image";
          setError(errorMsg);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    // Cleanup: revoke blob URL and mark as cancelled
    return () => {
      isCancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [imageUrl]);

  return { imageBlobUrl, isLoading, error };
}
