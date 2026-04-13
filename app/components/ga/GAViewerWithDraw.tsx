"use client";

import dynamic from "next/dynamic";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";

// Dynamic import - Leaflet doesn't work with SSR
const GAViewerWithDrawContent = dynamic(() => import("./GAViewerWithDrawContent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
      <LoadingSkeleton type="list" rows={3} />
    </div>
  ),
});

export interface DeckBounds {
  x1: number; // Top-left X (percentage 0-100)
  y1: number; // Top-left Y (percentage 0-100)
  x2: number; // Bottom-right X (percentage 0-100)
  y2: number; // Bottom-right Y (percentage 0-100)
}

export interface ExistingDeck {
  id: string;
  name: string;
  color: string;
  bounds: DeckBounds;
}

export interface GAViewerWithDrawProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  color: string;
  bounds?: DeckBounds | null;
  onBoundsChange: (bounds: DeckBounds | null) => void;
  existingDecks?: ExistingDeck[];
  selectedDeckId?: string | null;
  onDeckClick?: (deckId: string) => void;
}

export default function GAViewerWithDraw(props: GAViewerWithDrawProps) {
  return <GAViewerWithDrawContent {...props} />;
}
