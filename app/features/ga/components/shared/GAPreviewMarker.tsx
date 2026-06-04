"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, ImageOverlay, Marker, Polygon, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./ga-smooth-zoom.css";
import type { Deck, Area, AreaPolygonPoint, GAPin } from "@/lib/api/types";
import { isInsidePolygon, polygonBbox } from "@/lib/utils/geometry";
import {
  normToLatLng,
  pctToLatLng,
  pctToNorm,
  latLngToPct,
} from "@/lib/utils/gaCoordinates";
import { getFullImageBounds } from "@/lib/utils/gaLeaflet";
import { createDonePinIcon } from "./pinIcons";

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
  /** When supplied, the marker may only land inside this polygon — drops
   *  outside snap back to the previous valid position. Coords are 0..1
   *  normalized. */
  constrainPolygon?: AreaPolygonPoint[];
  /** Existing pins to render as non-draggable reference markers, with
   *  the label exposed as a hover tooltip. Used by the create/edit
   *  modal so the user can see neighbouring pins while dropping a new
   *  one. */
  existingPins?: GAPin[];
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

// Smaller, semi-transparent dot used for existing pins on the same GA
// — keeps them visible as spatial context without competing with the
// active draggable marker.
function createExistingPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "custom-pin-marker existing-pin-marker",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        opacity: 0.75;
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
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
  constrainPolygon,
  existingPins,
}: GAPreviewMarkerProps) {
  const mapRef = useRef<L.Map | null>(null);

  const bounds = useMemo<L.LatLngBoundsExpression>(
    () => getFullImageBounds(imageWidth, imageHeight),
    [imageWidth, imageHeight]
  );

  const markerPosition = useMemo<[number, number]>(
    () => pctToLatLng({ x, y }, imageWidth, imageHeight),
    [x, y, imageWidth, imageHeight]
  );

  // Compute the axis-aligned bounding box of the deck's primary polygon
  // (points are normalized 0..1) and convert to Leaflet pixel bounds.
  const deckBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (!initialDeck?.deckPolygon) return null;
    const bbox = polygonBbox(initialDeck.deckPolygon.points);
    if (!bbox) return null;
    const x1 = bbox.bbox_x * imageWidth;
    const y1 = bbox.bbox_y * imageHeight;
    const x2 = (bbox.bbox_x + bbox.bbox_width) * imageWidth;
    const y2 = (bbox.bbox_y + bbox.bbox_height) * imageHeight;
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
    const pct = latLngToPct(position, imageWidth, imageHeight);
    const clampedX = Math.max(0, Math.min(100, pct.x));
    const clampedY = Math.max(0, Math.min(100, pct.y));

    // When a constraint polygon is supplied, the drop must land inside
    // it. React's `position` prop alone won't snap the marker back
    // (parent state didn't change), so reset the Leaflet marker
    // imperatively to the last committed position.
    if (constrainPolygon) {
      const normalized = pctToNorm({ x: clampedX, y: clampedY });
      if (!isInsidePolygon(normalized, constrainPolygon)) {
        marker.setLatLng(markerPosition);
        return;
      }
    }

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
          const positions: [number, number][] = area.polygon.map((p) =>
            normToLatLng(p, imageWidth, imageHeight)
          );
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

        {/* Existing pins — rendered before the active marker so the
            draggable one stays on top, with the punchlist label shown
            on hover so the user can tell what's already there. */}
        {existingPins?.map((pin) => {
          const pinPosition = pctToLatLng(
            { x: pin.x, y: pin.y },
            imageWidth,
            imageHeight
          );
          const isDone = pin.punchlistItem?.status === "done";
          return (
            <Marker
              key={pin.identifier}
              position={pinPosition}
              icon={
                isDone
                  ? createDonePinIcon(18)
                  : createExistingPinIcon(pin.color || "#6B7280")
              }
              interactive={true}
              draggable={false}
            >
              {pin.label && (
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  {pin.label}
                </Tooltip>
              )}
            </Marker>
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
