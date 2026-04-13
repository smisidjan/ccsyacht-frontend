"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, ImageOverlay, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GAPin } from "@/lib/api/types";
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
  canEdit?: boolean;
  className?: string;
}

// Component to fit bounds when image loads
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    // Fit bounds exactly to the image (no padding)
    map.fitBounds(bounds, {
      padding: [0, 0],
      animate: false,
    });

    // Invalidate size after a short delay to handle container resize
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, {
        padding: [0, 0],
        animate: false,
      });
    }, 100);
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
  canEdit = false,
  className = "",
}: GALeafletContentProps) {
  const mapRef = useRef<L.Map | null>(null);

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
      </MapContainer>

      {/* Zoom controls info */}
      <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-lg text-xs text-gray-600 dark:text-gray-400 pointer-events-none">
        <span className="hidden sm:inline">Scroll to zoom | Drag to pan</span>
        <span className="sm:hidden">Pinch to zoom</span>
      </div>
    </div>
  );
}
