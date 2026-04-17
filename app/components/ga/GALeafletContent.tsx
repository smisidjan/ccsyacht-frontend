"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, ImageOverlay, Rectangle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GAPin, Deck } from "@/lib/api/types";
import PinMarker from "./PinMarker";

// Fix Leaflet default marker icon issue in Next.js
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface GALeafletContentProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  pins: GAPin[];
  selectedPinId?: string | null;
  onPinClick?: (pin: GAPin) => void;
  onImageClick?: (x: number, y: number) => void;
  onDeckClick?: (deck: Deck, x: number, y: number) => void;
  canEdit?: boolean;
  decks?: Deck[];
  className?: string;
}

// Component to fit bounds when image loads and set minZoom to prevent zooming out beyond initial fit
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    // Fit bounds exactly to the image (no padding)
    map.fitBounds(bounds, {
      padding: [0, 0],
      animate: false,
    });

    // Invalidate size after a short delay to handle container resize
    const timeoutId = setTimeout(() => {
      // Check if map container still exists (prevents errors after unmount)
      if (!map.getContainer()) return;

      map.invalidateSize();
      map.fitBounds(bounds, {
        padding: [0, 0],
        animate: false,
      });

      // Set minZoom to the current zoom level (the level that fits the image)
      // This prevents zooming out beyond the initial fit
      const fitZoom = map.getBoundsZoom(bounds as L.LatLngBoundsExpression);
      map.setMinZoom(fitZoom);
    }, 100);

    // Cleanup timeout on unmount to prevent errors
    return () => clearTimeout(timeoutId);
  }, [map, bounds]);

  return null;
}

// Component to handle map clicks for adding pins
function MapClickHandler({
  imageWidth,
  imageHeight,
  onImageClick,
  canEdit,
}: {
  imageWidth: number;
  imageHeight: number;
  onImageClick?: (x: number, y: number) => void;
  canEdit?: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (!canEdit || !onImageClick) return;

      // Convert Leaflet coordinates to percentage (0-100)
      const x = (e.latlng.lng / imageWidth) * 100;
      const y = (e.latlng.lat / imageHeight) * 100;

      // Only trigger if click is within bounds
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        onImageClick(x, y);
      }
    },
  });

  return null;
}

export default function GALeafletContent({
  imageUrl,
  imageWidth,
  imageHeight,
  pins,
  selectedPinId,
  onPinClick,
  onImageClick,
  onDeckClick,
  canEdit = false,
  decks = [],
  className = "",
}: GALeafletContentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [hoveredDeckId, setHoveredDeckId] = useState<string | null>(null);

  // Calculate bounds based on image dimensions
  // Leaflet uses [y, x] / [lat, lng] order
  const bounds = useMemo<L.LatLngBoundsExpression>(
    () => [
      [0, 0], // Southwest corner
      [imageHeight, imageWidth], // Northeast corner
    ],
    [imageWidth, imageHeight]
  );

  // Calculate aspect ratio for proper sizing
  const aspectRatio = imageWidth / imageHeight;

  // Convert pin percentage coordinates to Leaflet coordinates
  const convertPinToLeaflet = (pin: GAPin): [number, number] => {
    const leafletY = (pin.y / 100) * imageHeight;
    const leafletX = (pin.x / 100) * imageWidth;
    return [leafletY, leafletX]; // [lat, lng] order
  };

  // Convert deck bounding box (percentage) to Leaflet bounds
  const convertDeckToLeafletBounds = (deck: Deck): L.LatLngBoundsExpression | null => {
    if (!deck.boundingBox) return null;
    const { x, y, width, height } = deck.boundingBox;
    // Convert percentage to pixel coordinates
    const x1 = (x / 100) * imageWidth;
    const y1 = (y / 100) * imageHeight;
    const x2 = ((x + width) / 100) * imageWidth;
    const y2 = ((y + height) / 100) * imageHeight;
    return [
      [y1, x1], // Southwest [lat, lng]
      [y2, x2], // Northeast [lat, lng]
    ];
  };

  // Get decks with valid bounding boxes
  const decksWithBounds = decks.filter((d) => d.boundingBox);

  return (
    <div
      className={`relative ${className}`}
      style={{
        height: "100vh",
        width: `calc(100vh * ${aspectRatio})`,
        maxWidth: "100%",
      }}
    >
      <MapContainer
        ref={mapRef}
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        minZoom={-5}
        maxZoom={4}
        zoomSnap={0.25}
        zoomDelta={0.5}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        dragging={true}
        attributionControl={false}
        className="w-full rounded-lg"
        style={{
          height: "100%",
          background: "#f3f4f6",
          cursor: canEdit ? "crosshair" : "grab",
        }}
      >
        {/* Fit bounds on load */}
        <FitBounds bounds={bounds} />

        {/* GA Image as overlay */}
        <ImageOverlay
          url={imageUrl}
          bounds={bounds}
          eventHandlers={{
            error: (e) => console.error("❌ ImageOverlay failed to load:", imageUrl, e),
            load: () => console.log("✅ ImageOverlay loaded successfully:", imageUrl),
          }}
        />

        {/* Click handler for adding pins */}
        <MapClickHandler
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          onImageClick={onImageClick}
          canEdit={canEdit}
        />

        {/* Render pins */}
        {pins.map((pin) => (
          <PinMarker
            key={pin.identifier}
            pin={pin}
            position={convertPinToLeaflet(pin)}
            isSelected={selectedPinId === pin.identifier}
            onClick={onPinClick}
          />
        ))}

        {/* Render deck bounding boxes on hover when in edit mode */}
        {canEdit && decksWithBounds.map((deck) => {
          const deckBounds = convertDeckToLeafletBounds(deck);
          if (!deckBounds) return null;
          const isHovered = hoveredDeckId === deck.identifier;

          return (
            <Rectangle
              key={deck.identifier}
              bounds={deckBounds}
              pathOptions={{
                color: "#3B82F6",
                weight: isHovered ? 3 : 2,
                fillColor: "#3B82F6",
                fillOpacity: isHovered ? 0.3 : 0.1,
                dashArray: isHovered ? undefined : "5, 5",
              }}
              eventHandlers={{
                mouseover: () => setHoveredDeckId(deck.identifier),
                mouseout: () => setHoveredDeckId(null),
                click: (e) => {
                  L.DomEvent.stopPropagation(e.originalEvent);
                  if (onDeckClick) {
                    // Convert click position to percentage
                    const x = (e.latlng.lng / imageWidth) * 100;
                    const y = (e.latlng.lat / imageHeight) * 100;
                    onDeckClick(deck, x, y);
                  }
                },
              }}
            />
          );
        })}
      </MapContainer>

      {/* Deck hover tooltip */}
      {canEdit && hoveredDeckId && (
        <div className="absolute top-4 left-4 z-[1000] bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none">
          Add pin in {decks.find(d => d.identifier === hoveredDeckId)?.name}
        </div>
      )}

      {/* Zoom controls info */}
      <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-lg text-xs text-gray-600 dark:text-gray-400 pointer-events-none">
        <span className="hidden sm:inline">Scroll to zoom | Drag to pan</span>
        <span className="sm:hidden">Pinch to zoom</span>
      </div>
    </div>
  );
}
