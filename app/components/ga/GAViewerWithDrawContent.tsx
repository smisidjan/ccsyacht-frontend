"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapContainer, ImageOverlay, Rectangle, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DeckBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ExistingDeck {
  id: string;
  name: string;
  color: string;
  bounds: DeckBounds;
}

interface GAViewerWithDrawContentProps {
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

type ResizeCorner = "nw" | "ne" | "sw" | "se" | null;

// Component to fit the full image in the view
function FitFullImage({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    // Initial fit
    map.invalidateSize();
    map.fitBounds(bounds, {
      padding: [0, 0],
      animate: false,
    });

    // Fit again after short delay (for modal opening)
    const timer1 = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, {
        padding: [0, 0],
        animate: false,
      });
    }, 100);

    // Fit again after longer delay (for slower renders)
    const timer2 = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, {
        padding: [0, 0],
        animate: false,
      });
    }, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [map, bounds]);

  return null;
}

// Check if a point is inside a rectangle bounds
function isPointInsideBounds(
  latlng: L.LatLng,
  bounds: DeckBounds,
  imageWidth: number,
  imageHeight: number
): boolean {
  const x = (latlng.lng / imageWidth) * 100;
  const y = (latlng.lat / imageHeight) * 100;
  return x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2;
}

// Check if a point is near any corner (for preventing drag when clicking corners)
function isPointNearCorner(
  latlng: L.LatLng,
  bounds: DeckBounds,
  imageWidth: number,
  imageHeight: number,
  threshold: number = 3 // percentage threshold
): boolean {
  const x = (latlng.lng / imageWidth) * 100;
  const y = (latlng.lat / imageHeight) * 100;

  // Check each corner
  const corners = [
    { x: bounds.x1, y: bounds.y1 }, // nw
    { x: bounds.x2, y: bounds.y1 }, // ne
    { x: bounds.x1, y: bounds.y2 }, // sw
    { x: bounds.x2, y: bounds.y2 }, // se
  ];

  return corners.some(corner =>
    Math.abs(x - corner.x) < threshold && Math.abs(y - corner.y) < threshold
  );
}

// Component to handle drawing, dragging, and resizing rectangles
function DrawHandler({
  imageWidth,
  imageHeight,
  bounds,
  onBoundsChange,
  isDrawing,
  setIsDrawing,
  drawStart,
  setDrawStart,
  isDragging,
  setIsDragging,
  dragOffset,
  setDragOffset,
  isResizing,
  setIsResizing,
  resizeCorner,
  setResizeCorner,
}: {
  imageWidth: number;
  imageHeight: number;
  bounds: DeckBounds | null;
  onBoundsChange: (bounds: DeckBounds | null) => void;
  isDrawing: boolean;
  setIsDrawing: (v: boolean) => void;
  drawStart: L.LatLng | null;
  setDrawStart: (v: L.LatLng | null) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  dragOffset: { x: number; y: number } | null;
  setDragOffset: (v: { x: number; y: number } | null) => void;
  isResizing: boolean;
  setIsResizing: (v: boolean) => void;
  resizeCorner: ResizeCorner;
  setResizeCorner: (v: ResizeCorner) => void;
}) {
  const map = useMapEvents({
    mousedown(e) {
      // Skip if resizing (handled by corner markers)
      if (isResizing) return;

      // Check if clicking near a corner - don't start drag, let corner handle it
      if (bounds && isPointNearCorner(e.latlng, bounds, imageWidth, imageHeight)) {
        return;
      }

      // Check if clicking inside existing rectangle (not near corners) - start dragging
      if (bounds && isPointInsideBounds(e.latlng, bounds, imageWidth, imageHeight)) {
        const clickX = (e.latlng.lng / imageWidth) * 100;
        const clickY = (e.latlng.lat / imageHeight) * 100;
        setIsDragging(true);
        setDragOffset({
          x: clickX - bounds.x1,
          y: clickY - bounds.y1,
        });
        map.dragging.disable();
        return;
      }

      // Only allow drawing if no rectangle exists yet
      // Otherwise, let the map pan normally
      if (!bounds) {
        setIsDrawing(true);
        setDrawStart(e.latlng);
        map.dragging.disable();
      }
    },
    mousemove(e) {
      // Handle resizing
      if (isResizing && bounds && resizeCorner) {
        const mouseX = Math.max(0, Math.min(100, (e.latlng.lng / imageWidth) * 100));
        const mouseY = Math.max(0, Math.min(100, (e.latlng.lat / imageHeight) * 100));

        let newBounds = { ...bounds };

        switch (resizeCorner) {
          case "nw":
            newBounds.x1 = Math.min(mouseX, bounds.x2 - 1);
            newBounds.y1 = Math.min(mouseY, bounds.y2 - 1);
            break;
          case "ne":
            newBounds.x2 = Math.max(mouseX, bounds.x1 + 1);
            newBounds.y1 = Math.min(mouseY, bounds.y2 - 1);
            break;
          case "sw":
            newBounds.x1 = Math.min(mouseX, bounds.x2 - 1);
            newBounds.y2 = Math.max(mouseY, bounds.y1 + 1);
            break;
          case "se":
            newBounds.x2 = Math.max(mouseX, bounds.x1 + 1);
            newBounds.y2 = Math.max(mouseY, bounds.y1 + 1);
            break;
        }

        onBoundsChange(newBounds);
        return;
      }

      // Handle dragging existing rectangle
      if (isDragging && bounds && dragOffset) {
        const newX1 = (e.latlng.lng / imageWidth) * 100 - dragOffset.x;
        const newY1 = (e.latlng.lat / imageHeight) * 100 - dragOffset.y;
        const width = bounds.x2 - bounds.x1;
        const height = bounds.y2 - bounds.y1;

        // Clamp to image bounds
        const clampedX1 = Math.max(0, Math.min(100 - width, newX1));
        const clampedY1 = Math.max(0, Math.min(100 - height, newY1));

        onBoundsChange({
          x1: clampedX1,
          y1: clampedY1,
          x2: clampedX1 + width,
          y2: clampedY1 + height,
        });
        return;
      }

      // Handle drawing new rectangle
      if (isDrawing && drawStart) {
        const x1 = Math.max(0, Math.min(100, (drawStart.lng / imageWidth) * 100));
        const y1 = Math.max(0, Math.min(100, (drawStart.lat / imageHeight) * 100));
        const x2 = Math.max(0, Math.min(100, (e.latlng.lng / imageWidth) * 100));
        const y2 = Math.max(0, Math.min(100, (e.latlng.lat / imageHeight) * 100));

        onBoundsChange({
          x1: Math.min(x1, x2),
          y1: Math.min(y1, y2),
          x2: Math.max(x1, x2),
          y2: Math.max(y1, y2),
        });
      }
    },
    mouseup() {
      // Finish resizing
      if (isResizing) {
        setIsResizing(false);
        setResizeCorner(null);
        map.dragging.enable();
        return;
      }

      // Finish dragging
      if (isDragging) {
        setIsDragging(false);
        setDragOffset(null);
        map.dragging.enable();
        return;
      }

      // Finish drawing
      if (isDrawing && drawStart) {
        setIsDrawing(false);
        setDrawStart(null);
        map.dragging.enable();
      }
    },
  });

  return null;
}

// Get cursor style for resize corner
function getResizeCursor(corner: ResizeCorner): string {
  switch (corner) {
    case "nw":
    case "se":
      return "nwse-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    default:
      return "pointer";
  }
}

// Resize handle component
function ResizeHandle({
  position,
  corner,
  color,
  onResizeStart,
}: {
  position: [number, number];
  corner: ResizeCorner;
  color: string;
  onResizeStart: (corner: ResizeCorner) => void;
}) {
  const cursorStyle = getResizeCursor(corner);

  return (
    <CircleMarker
      center={position}
      radius={8}
      pathOptions={{
        color: color,
        fillColor: "#ffffff",
        fillOpacity: 1,
        weight: 2,
        className: `resize-handle resize-handle-${corner}`,
      }}
      eventHandlers={{
        mousedown: (e) => {
          L.DomEvent.stopPropagation(e.originalEvent);
          L.DomEvent.preventDefault(e.originalEvent);
          onResizeStart(corner);
        },
        mouseover: (e) => {
          const target = e.target as L.CircleMarker;
          const element = target.getElement() as HTMLElement | null;
          element?.style.setProperty("cursor", cursorStyle);
        },
      }}
    />
  );
}

export default function GAViewerWithDrawContent({
  imageUrl,
  imageWidth,
  imageHeight,
  color,
  bounds,
  onBoundsChange,
  existingDecks = [],
  selectedDeckId,
  onDeckClick,
}: GAViewerWithDrawContentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<L.LatLng | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<ResizeCorner>(null);

  // Convert existing deck bounds to Leaflet bounds
  const convertToLeafletBounds = useCallback((deckBounds: DeckBounds): L.LatLngBoundsExpression => {
    const lat1 = (deckBounds.y1 / 100) * imageHeight;
    const lng1 = (deckBounds.x1 / 100) * imageWidth;
    const lat2 = (deckBounds.y2 / 100) * imageHeight;
    const lng2 = (deckBounds.x2 / 100) * imageWidth;
    return [[lat1, lng1], [lat2, lng2]];
  }, [imageWidth, imageHeight]);

  // Calculate bounds based on image dimensions
  const imageBounds = useMemo<L.LatLngBoundsExpression>(
    () => [
      [0, 0],
      [imageHeight, imageWidth],
    ],
    [imageWidth, imageHeight]
  );

  // Convert percentage bounds to Leaflet bounds
  const rectangleBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (!bounds) return null;

    const lat1 = (bounds.y1 / 100) * imageHeight;
    const lng1 = (bounds.x1 / 100) * imageWidth;
    const lat2 = (bounds.y2 / 100) * imageHeight;
    const lng2 = (bounds.x2 / 100) * imageWidth;

    return [
      [lat1, lng1],
      [lat2, lng2],
    ];
  }, [bounds, imageWidth, imageHeight]);

  // Corner positions for resize handles
  const cornerPositions = useMemo(() => {
    if (!bounds) return null;

    const lat1 = (bounds.y1 / 100) * imageHeight;
    const lng1 = (bounds.x1 / 100) * imageWidth;
    const lat2 = (bounds.y2 / 100) * imageHeight;
    const lng2 = (bounds.x2 / 100) * imageWidth;

    return {
      nw: [lat1, lng1] as [number, number],
      ne: [lat1, lng2] as [number, number],
      sw: [lat2, lng1] as [number, number],
      se: [lat2, lng2] as [number, number],
    };
  }, [bounds, imageWidth, imageHeight]);

  // Clear rectangle
  const handleClear = useCallback(() => {
    onBoundsChange(null);
  }, [onBoundsChange]);

  // Handle resize start from corner markers
  const handleResizeStart = useCallback((corner: ResizeCorner) => {
    setIsResizing(true);
    setResizeCorner(corner);
    if (mapRef.current) {
      mapRef.current.dragging.disable();
    }
  }, []);

  // Determine cursor based on state
  const getCursor = () => {
    if (isResizing) return "nwse-resize";
    if (isDragging) return "grabbing";
    if (!bounds) return "crosshair";
    return "grab"; // Default grab for panning when rectangle exists
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative">
      <MapContainer
        ref={mapRef}
        crs={L.CRS.Simple}
        bounds={imageBounds}
        maxBounds={imageBounds}
        maxBoundsViscosity={1.0}
        minZoom={-5}
        maxZoom={4}
        zoomSnap={0.25}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        touchZoom={true}
        dragging={!isDrawing && !isDragging && !isResizing}
        attributionControl={false}
        zoomControl={true}
        style={{
          height: "100%",
          width: "100%",
          background: "#f3f4f6",
          cursor: getCursor(),
        }}
      >
        <FitFullImage bounds={imageBounds} />
        <ImageOverlay url={imageUrl} bounds={imageBounds} />

        <DrawHandler
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          bounds={bounds || null}
          onBoundsChange={onBoundsChange}
          isDrawing={isDrawing}
          setIsDrawing={setIsDrawing}
          drawStart={drawStart}
          setDrawStart={setDrawStart}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          dragOffset={dragOffset}
          setDragOffset={setDragOffset}
          isResizing={isResizing}
          setIsResizing={setIsResizing}
          resizeCorner={resizeCorner}
          setResizeCorner={setResizeCorner}
        />

        {/* Draw existing deck rectangles */}
        {existingDecks.map((deck) => (
          <Rectangle
            key={deck.id}
            bounds={convertToLeafletBounds(deck.bounds)}
            pathOptions={{
              color: deck.color,
              weight: selectedDeckId === deck.id ? 4 : 2,
              fillColor: deck.color,
              fillOpacity: selectedDeckId === deck.id ? 0.3 : 0.15,
              dashArray: selectedDeckId === deck.id ? undefined : "5, 5",
            }}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent);
                onDeckClick?.(deck.id);
              },
            }}
          />
        ))}

        {/* Draw the current rectangle being edited */}
        {rectangleBounds && (
          <Rectangle
            bounds={rectangleBounds}
            pathOptions={{
              color: color,
              weight: 3,
              fillColor: color,
              fillOpacity: 0.2,
            }}
          />
        )}

        {/* Resize handles at corners */}
        {cornerPositions && !isDrawing && (
          <>
            <ResizeHandle
              position={cornerPositions.nw}
              corner="nw"
              color={color}
              onResizeStart={handleResizeStart}
            />
            <ResizeHandle
              position={cornerPositions.ne}
              corner="ne"
              color={color}
              onResizeStart={handleResizeStart}
            />
            <ResizeHandle
              position={cornerPositions.sw}
              corner="sw"
              color={color}
              onResizeStart={handleResizeStart}
            />
            <ResizeHandle
              position={cornerPositions.se}
              corner="se"
              color={color}
              onResizeStart={handleResizeStart}
            />
          </>
        )}
      </MapContainer>

      {/* Instructions overlay */}
      <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-lg text-xs text-gray-600 dark:text-gray-400 pointer-events-none">
        {bounds ? "Drag rectangle to move, corners to resize" : "Click and drag to mark deck area"}
      </div>

      {/* Clear button */}
      {bounds && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-3 right-3 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
