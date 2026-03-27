"use client";

import { useState, useEffect } from "react";
import { getAuthToken, getTenantUrl } from "@/lib/api/client";

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export default function AuthenticatedImage({
  src,
  alt,
  className = "",
  onLoad,
  onError,
}: AuthenticatedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchImage = async () => {
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

        const response = await fetch(src, { headers });

        if (!response.ok) {
          throw new Error("Failed to load image");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
        setLoading(false);
        if (onLoad) onLoad();
      } catch (err) {
        console.error("Failed to load authenticated image:", err);
        setError(true);
        setLoading(false);
        if (onError) onError();
      }
    };

    fetchImage();

    // Cleanup object URL on unmount
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center`}>
        <span className="text-xs text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-800 flex items-center justify-center`}>
        <span className="text-xs text-gray-500">Failed to load</span>
      </div>
    );
  }

  return <img src={imageSrc} alt={alt} className={className} />;
}
