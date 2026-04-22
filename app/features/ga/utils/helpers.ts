/**
 * GA Feature Utilities
 * Helper functions for General Arrangement feature
 */

import type { GeneralArrangement, StageStatus } from "@/lib/api/types";

/**
 * Check if GA exists (uploaded but maybe not yet converted)
 */
export function hasGA(ga: GeneralArrangement | undefined): boolean {
  return !!ga && !!ga.contentUrl;
}

/**
 * Check if we have valid GA image data (conversion complete)
 */
export function hasGAImageData(ga: GeneralArrangement | undefined): boolean {
  return (
    !!ga &&
    !!ga.imageUrl &&
    typeof ga.imageWidth === "number" &&
    typeof ga.imageHeight === "number"
  );
}

/**
 * Check if GA is still being converted
 */
export function isGAConverting(ga: GeneralArrangement | undefined): boolean {
  return hasGA(ga) && !hasGAImageData(ga);
}

/**
 * Fix image URL to use the correct API base
 */
export function getFixedImageUrl(imageUrl: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";

  if (imageUrl.startsWith("/")) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);
    const path = url.pathname;

    if (apiBase.startsWith("/")) {
      return path;
    }

    const apiUrl = new URL(apiBase);
    return `${apiUrl.origin}${path}`;
  } catch {
    return imageUrl;
  }
}

/**
 * Stage status configuration for badges
 */
export const STAGE_STATUS_CONFIG: Record<
  StageStatus,
  { bgColor: string; textColor: string; label: string }
> = {
  not_started: {
    bgColor: "bg-gray-100 dark:bg-gray-700",
    textColor: "text-gray-700 dark:text-gray-300",
    label: "Not Started",
  },
  in_progress: {
    bgColor: "bg-blue-100 dark:bg-blue-900",
    textColor: "text-blue-700 dark:text-blue-300",
    label: "In Progress",
  },
  pending_signoff: {
    bgColor: "bg-amber-100 dark:bg-amber-900",
    textColor: "text-amber-700 dark:text-amber-300",
    label: "Pending",
  },
  completed: {
    bgColor: "bg-green-100 dark:bg-green-900",
    textColor: "text-green-700 dark:text-green-300",
    label: "Completed",
  },
  rejected: {
    bgColor: "bg-red-100 dark:bg-red-900",
    textColor: "text-red-700 dark:text-red-300",
    label: "Rejected",
  },
};

/**
 * Default pin colors for GA pins
 */
export const DEFAULT_PIN_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];
