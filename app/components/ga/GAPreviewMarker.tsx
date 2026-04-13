"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, ImageOverlay, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GAPreviewMarkerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  x: number;
  y: number;
  color: string;
  onPositionChange: (x: number, y: number) => void;
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

// Component to fit bounds and center on the marker position
function FitToMarker({
  bounds,
  markerPosition,
}: {
  bounds: L.LatLngBoundsExpression;
  markerPosition: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    // Fit the full image first
    map.fitBounds(bounds, { padding: [10, 10], animate: false });

    // Then zoom in and center on the marker position
    setTimeout(() => {
      map.invalidateSize();
      // Set a reasonable zoom level that shows context around the marker
      map.setView(markerPosition, 1, { animate: false });
    }, 100);
  }, [map, bounds, markerPosition]);

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
        zoomSnap={0.25}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        touchZoom={true}
        dragging={true}
        attributionControl={false}
        style={{
          height: "100%",
          width: "100%",
          background: "#f3f4f6",
        }}
      >
        <FitToMarker bounds={bounds} markerPosition={markerPosition} />

        <ImageOverlay url={imageUrl} bounds={bounds} />

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
