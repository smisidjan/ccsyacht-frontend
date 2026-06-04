"use client";

import { Polygon } from "react-leaflet";
import type { AreaPolygonPoint } from "@/lib/api/types";
import { normToLatLng } from "@/lib/utils/gaCoordinates";

export interface DeckOverlay {
  key: string;
  points: AreaPolygonPoint[];
  color: string;
  /** Dashed stroke for "other deck context"; solid for the editing
   *  deck's non-active polygons. */
  dashed: boolean;
  onClick?: () => void;
}

interface DeckOverlayLayerProps {
  overlays: DeckOverlay[];
  imageWidth: number;
  imageHeight: number;
}

/** Static polygon overlays drawn alongside the active polygon in
 *  `PolygonDrawer`. Split out so the CreateDeckModal entry file stays
 *  SSR-safe — `Polygon` from react-leaflet pulls in Leaflet, which
 *  touches `window` at module top. */
export default function DeckOverlayLayer({
  overlays,
  imageWidth,
  imageHeight,
}: DeckOverlayLayerProps) {
  return (
    <>
      {overlays.map((o) => (
        <Polygon
          key={o.key}
          positions={o.points.map((p) => normToLatLng(p, imageWidth, imageHeight))}
          pathOptions={{
            color: o.color,
            weight: 2,
            dashArray: o.dashed ? "6 4" : undefined,
            fillColor: o.color,
            fillOpacity: o.dashed ? 0.1 : 0.2,
          }}
          eventHandlers={
            o.onClick
              ? {
                  click: (e) => {
                    e.originalEvent.stopPropagation();
                    o.onClick?.();
                  },
                }
              : undefined
          }
        />
      ))}
    </>
  );
}
