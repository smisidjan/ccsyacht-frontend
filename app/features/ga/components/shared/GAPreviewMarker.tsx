"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, ImageOverlay, Marker, Polygon, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./ga-smooth-zoom.css";
import type { Deck, Area } from "@/lib/api/types";

interface GAPreviewMarkerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  x: number;
  y: number;
  color: string;
  onPositionChange: (x: number, y: number) => void;
  // Optional: deck to zoom to initially (for zoom-to-deck feature)
  initialDeck?: Deck | null;
  /** Areas to outline on the preview so the user can see where they're
   *  dropping the pin relative to existing areas. Each area's `polygon`
   *  is 0..1 normalized; entries without a polygon are skipped. */
  areas?: Area[];
  /** Identifier of the area the form currently has selected — drawn with
   *  a solid blue outline to mark "this is the one you picked". */
  selectedAreaId?: string;
}

// Create a custom colored marker icon
function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "custom-pin-marker",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: grab;
      "></div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Component to fit bounds on initial mount only (not on marker position changes)
function FitToMarker({
  bounds,
  initialMarkerPosition,
  deckBounds,
}: {
  bounds: L.LatLngBoundsExpression;
  initialMarkerPosition: [number, number];
  deckBounds?: L.LatLngBoundsExpression | null;
}) {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Fit the full image first
    map.fitBounds(bounds, { padding: [10, 10], animate: false });

    setTimeout(() => {
      map.invalidateSize();

      if (deckBounds) {
        // Zoom to fit the deck bounds with some padding
        map.fitBounds(deckBounds, { padding: [20, 20], animate: false });
      } else {
        // Set a reasonable zoom level that shows context around the marker
        map.setView(initialMarkerPosition, 1, { animate: false });
      }
    }, 100);
  }, [map, bounds, initialMarkerPosition, deckBounds]);

  return null;
}

// Component to keep the pin visible after zooming
function KeepPinInView({ markerPosition }: { markerPosition: [number, number] }) {
  const map = useMap();

  useMapEvents({
    zoomend: () => {
      // Check if marker is in the visible bounds
      const bounds = map.getBounds();
      const markerLatLng = L.latLng(markerPosition[0], markerPosition[1]);

      if (!bounds.contains(markerLatLng)) {
        // Pan smoothly to center on the marker while keeping current zoom
        map.panTo(markerLatLng, { animate: true, duration: 0.3, easeLinearity: 0.25 });
      }
    },
  });

  return null;
}

export default function GAPreviewMarker({
  imageUrl,
  imageWidth,
  imageHeight,
  x,
  y,
  color,
  onPositionChange,
  initialDeck,
  areas,
  selectedAreaId,
}: GAPreviewMarkerProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Calculate bounds based on image dimensions
  const bounds = useMemo<L.LatLngBoundsExpression>(
    () => [
      [0, 0],
      [imageHeight, imageWidth],
    ],
    [imageWidth, imageHeight]
  );

  // Convert percentage to Leaflet coordinates
  const markerPosition = useMemo<[number, number]>(() => {
    const leafletY = (y / 100) * imageHeight;
    const leafletX = (x / 100) * imageWidth;
    return [leafletY, leafletX];
  }, [x, y, imageWidth, imageHeight]);

  // Convert deck placement (percentage 0–100) to Leaflet bounds (if any).
  const deckBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (!initialDeck?.deckPlacement) return null;
    const { bbox_x, bbox_y, bbox_width, bbox_height } = initialDeck.deckPlacement;
    // Convert percentage to pixel coordinates
    const x1 = (bbox_x / 100) * imageWidth;
    const y1 = (bbox_y / 100) * imageHeight;
    const x2 = ((bbox_x + bbox_width) / 100) * imageWidth;
    const y2 = ((bbox_y + bbox_height) / 100) * imageHeight;
    return [
      [y1, x1], // Southwest [lat, lng]
      [y2, x2], // Northeast [lat, lng]
    ];
  }, [initialDeck, imageWidth, imageHeight]);

  // Create icon with current color
  const icon = useMemo(() => createColoredIcon(color), [color]);

  // Handle marker drag
  const handleDragEnd = (e: L.DragEndEvent) => {
    const marker = e.target;
    const position = marker.getLatLng();

    // Convert Leaflet coordinates back to percentage
    const newX = (position.lng / imageWidth) * 100;
    const newY = (position.lat / imageHeight) * 100;

    // Clamp to valid range
    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));

    onPositionChange(clampedX, clampedY);
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer
        ref={mapRef}
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        minZoom={-5}
        maxZoom={4}
        // zoomSnap={0}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={30}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        touchZoom={true}
        dragging={true}
        inertia={true}
        inertiaDeceleration={3000}
        attributionControl={false}
        className="smooth-zoom-map"
        style={{
          height: "100%",
          width: "100%",
          background: "#f3f4f6",
        }}
      >
        <FitToMarker
          bounds={bounds}
          initialMarkerPosition={markerPosition}
          deckBounds={deckBounds}
        />

        <KeepPinInView markerPosition={markerPosition} />

        <ImageOverlay url={imageUrl} bounds={bounds} />

        {/* Area outlines for context. Selected area gets a solid blue
            stroke so the user can spot which one they've picked; the rest
            stay dashed gray. Non-interactive so they never steal events
            from the draggable marker. */}
        {areas?.map((area) => {
          if (!area.polygon || area.polygon.length < 3) return null;
          const positions: [number, number][] = area.polygon.map((p) => [
            p.y * imageHeight,
            p.x * imageWidth,
          ]);
          const isSelected = area.identifier === selectedAreaId;
          return (
            <Polygon
              key={area.identifier}
              positions={positions}
              pathOptions={{
                color: isSelected ? "#2563eb" : "#374151",
                weight: 2,
                dashArray: isSelected ? undefined : "6 4",
                fillColor: isSelected ? "#2563eb" : "#6b7280",
                fillOpacity: isSelected ? 0.2 : 0.15,
                interactive: false,
              }}
            />
          );
        })}

        <Marker
          position={markerPosition}
          icon={icon}
          draggable={true}
          eventHandlers={{
            dragend: handleDragEnd,
          }}
        />
      </MapContainer>
    </div>
  );
}
