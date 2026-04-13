"use client";

import dynamic from "next/dynamic";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import type { GAPin } from "@/lib/api/types";

// Dynamic import - Leaflet doesn't work with SSR
const GALeafletContent = dynamic(() => import("./GALeafletContent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px]">
      <LoadingSkeleton type="list" rows={5} />
    </div>
  ),
});

export interface GALeafletViewerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  pins: GAPin[];
  selectedPinId?: string | null;
  onPinClick?: (pin: GAPin) => void;
  onImageClick?: (x: number, y: number) => void;
  canEdit?: boolean;
  className?: string;
}

export default function GALeafletViewer(props: GALeafletViewerProps) {
  return <GALeafletContent {...props} />;
}
