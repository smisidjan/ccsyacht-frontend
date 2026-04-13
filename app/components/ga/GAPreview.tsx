"use client";

import dynamic from "next/dynamic";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import type { Deck } from "@/lib/api/types";

// Dynamic import - Leaflet doesn't work with SSR
const GAPreviewMarker = dynamic(() => import("./GAPreviewMarker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
      <LoadingSkeleton type="list" rows={3} />
    </div>
  ),
});

export interface GAPreviewProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  x: number;
  y: number;
  color: string;
  onPositionChange: (x: number, y: number) => void;
  // Optional: deck to zoom to initially (for zoom-to-deck feature)
  initialDeck?: Deck | null;
}

export default function GAPreview(props: GAPreviewProps) {
  return <GAPreviewMarker {...props} />;
}
