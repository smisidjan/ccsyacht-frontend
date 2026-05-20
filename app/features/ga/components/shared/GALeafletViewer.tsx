"use client";

import dynamic from "next/dynamic";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import type { GAPin, Deck, Area, AreaPolygonPoint } from "@/lib/api/types";

/** Read-only polygon to render on top of the GA. Points are normalized
 *  0..1 of the GA image (same convention `AreaPolygonDrawer` writes). */
export interface AreaPolygonOverlay {
  id: string;
  name: string;
  polygon: AreaPolygonPoint[];
  color: string;
}

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
  /** Pin id that the matching table row is being hovered for — the
   *  marker for this pin scales up to mirror the row highlight. */
  hoveredPinId?: string | null;
  onPinClick?: (pin: GAPin) => void;
  /** Fired when the user hovers a pin on the GA so the matching table
   *  row can be highlighted in lockstep. */
  onPinHover?: (pin: GAPin | null) => void;
  onImageClick?: (x: number, y: number) => void;
  /** Fires when the user clicks inside a deck rectangle in edit mode. The
   *  `area` is set when the click landed inside one of that deck's area
   *  polygons (used to pre-select the area in the create-pin modal). */
  onDeckClick?: (deck: Deck, x: number, y: number, area?: Area | null) => void;
  canEdit?: boolean;
  decks?: Deck[];
  /** All areas in the project — used for point-in-polygon hit-testing so a
   *  click can pre-select the area, even when the active-stages overlay
   *  isn't on. */
  areas?: Area[];
  /** Area polygons to draw on top of the GA, each pre-colored. Empty / omitted
   *  hides them entirely. */
  areaPolygons?: AreaPolygonOverlay[];
  className?: string;
}

export default function GALeafletViewer(props: GALeafletViewerProps) {
  return <GALeafletContent {...props} />;
}
