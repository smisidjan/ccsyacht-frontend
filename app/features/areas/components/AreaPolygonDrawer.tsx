"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  ImageOverlay,
  Rectangle,
  Polygon,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AreaPolygonPoint } from "@/lib/api/types";

const FIT_DELAY_MS = 50;
/** Minimum vertices any polygon must have. Backend rejects fewer, and the
 *  Shift+click delete helper enforces it so the user can't accidentally
 *  break a closed polygon. */
const MIN_VERTICES = 3;

/** Deck bounds use the existing percentage convention (0..100) — that's how
 *  the deck-define UI stores them. Polygons use the backend's 0..1 normalized
 *  convention (matches GaPin). Conversion happens at the boundary. */
interface DeckBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ExistingArea {
  id: string;
  name: string;
  polygon: AreaPolygonPoint[];
}

interface AreaPolygonDrawerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Deck region the user is allowed to draw inside (percentage 0..100). When
   *  omitted (deck has no bounds defined yet) the full GA is shown and the
   *  user can draw anywhere on it. */
  deckBounds?: DeckBounds | null;
  /** Other areas in the same deck — rendered as faded outlines for context. */
  existingAreas?: ExistingArea[];
  /** Current polygon being drawn (normalized 0..1 coords). */
  polygon: AreaPolygonPoint[];
  /** Whether the polygon has been closed (>= 3 vertices, user finished). */
  isClosed: boolean;
  onChange: (polygon: AreaPolygonPoint[], isClosed: boolean) => void;
  /** History-aware actions. The drawer wires Ctrl+Z / Ctrl+Shift+Z to these
   *  and renders explicit toolbar buttons; the parent owns the history. */
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Normalized point → Leaflet [lat, lng] (lat = y, lng = x).
const normToLatLng = (
  point: AreaPolygonPoint,
  imageWidth: number,
  imageHeight: number
): [number, number] => [point.y * imageHeight, point.x * imageWidth];

const latLngToNorm = (
  latlng: L.LatLng,
  imageWidth: number,
  imageHeight: number
): AreaPolygonPoint => ({
  x: latlng.lng / imageWidth,
  y: latlng.lat / imageHeight,
});

const isInsideDeck = (point: AreaPolygonPoint, deck: DeckBounds): boolean => {
  // Deck bounds are 0..100, normalize to 0..1 for comparison.
  const x1 = deck.x1 / 100;
  const x2 = deck.x2 / 100;
  const y1 = deck.y1 / 100;
  const y2 = deck.y2 / 100;
  return point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2;
};

// Convert a deck-bounds rectangle (0..100) to Leaflet bounds.
const deckToLeafletBounds = (
  deck: DeckBounds,
  imageWidth: number,
  imageHeight: number
): L.LatLngBoundsExpression => [
  [(deck.y1 / 100) * imageHeight, (deck.x1 / 100) * imageWidth],
  [(deck.y2 / 100) * imageHeight, (deck.x2 / 100) * imageWidth],
];

// Fit pattern lifted from GAPreviewMarker (the Add Pin modal): fit the full
// image first so Leaflet recalculates container size, then on the next tick
// fitBounds to the deck with breathing room around it. Runs once on mount —
// further re-fits would steal the user's pan/zoom while they're working.
const DECK_FIT_PADDING: [number, number] = [20, 20];

function FitToDeck({
  fullBounds,
  deckBounds,
  imageWidth,
  imageHeight,
}: {
  fullBounds: L.LatLngBoundsExpression;
  deckBounds: DeckBounds;
  imageWidth: number;
  imageHeight: number;
}) {
  const map = useMap();
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const bounds = deckToLeafletBounds(deckBounds, imageWidth, imageHeight);
    map.fitBounds(fullBounds, { padding: [10, 10], animate: false });
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: DECK_FIT_PADDING, animate: false });
    }, FIT_DELAY_MS);
  }, [map, fullBounds, deckBounds, imageWidth, imageHeight]);
  return null;
}

// Captures clicks on the map. Adds a vertex while drawing.
function ClickToAddVertex({
  isClosed,
  onAddVertex,
}: {
  isClosed: boolean;
  onAddVertex: (latlng: L.LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (isClosed) return;
      onAddVertex(e.latlng);
    },
  });
  return null;
}

const FILL_COLOR = "#2563eb";
const FILL_OPACITY_OPEN = 0.15;
const FILL_OPACITY_CLOSED = 0.25;
const STROKE_COLOR = "#1d4ed8";
const VERTEX_COLOR = "#1d4ed8";
const FIRST_VERTEX_HINT_COLOR = "#16a34a";

export default function AreaPolygonDrawer({
  imageUrl,
  imageWidth,
  imageHeight,
  deckBounds,
  existingAreas,
  polygon,
  isClosed,
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: AreaPolygonDrawerProps) {
  const fullBounds = useMemo<L.LatLngBoundsExpression>(
    () => [
      [0, 0],
      [imageHeight, imageWidth],
    ],
    [imageWidth, imageHeight]
  );

  const polygonLatLngs = useMemo(
    () => polygon.map((p) => normToLatLng(p, imageWidth, imageHeight)),
    [polygon, imageWidth, imageHeight]
  );

  const handleAddVertex = (latlng: L.LatLng) => {
    const point = latLngToNorm(latlng, imageWidth, imageHeight);
    if (deckBounds && !isInsideDeck(point, deckBounds)) return;
    onChange([...polygon, point], false);
  };

  const handleVertexClick = (index: number, shiftKey: boolean) => {
    // Shift+click → remove this vertex. Bail out at the minimum so the
    // polygon never collapses below a valid shape; the user can hit
    // "Reset" if they want to fully start over.
    if (shiftKey) {
      if (polygon.length <= MIN_VERTICES) return;
      const next = polygon.filter((_, i) => i !== index);
      onChange(next, isClosed);
      return;
    }
    if (isClosed) return;
    if (index === 0 && polygon.length >= MIN_VERTICES) {
      onChange(polygon, true);
    }
  };

  const handleVertexDrag = (index: number, latlng: L.LatLng) => {
    const point = latLngToNorm(latlng, imageWidth, imageHeight);
    if (deckBounds && !isInsideDeck(point, deckBounds)) return;
    const next = [...polygon];
    next[index] = point;
    onChange(next, isClosed);
  };

  // Insert a vertex on an existing edge (clicked midpoint handle). The new
  // vertex slots in *after* the edge's start index, pushing later vertices
  // one slot to the right.
  const handleInsertVertex = (afterIndex: number, latlng: L.LatLng) => {
    const point = latLngToNorm(latlng, imageWidth, imageHeight);
    if (deckBounds && !isInsideDeck(point, deckBounds)) return;
    const next = [...polygon];
    next.splice(afterIndex + 1, 0, point);
    onChange(next, isClosed);
  };

  const canClose = !isClosed && polygon.length >= MIN_VERTICES;
  const handleClose = () => {
    if (!canClose) return;
    onChange(polygon, true);
  };

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) =
  // redo, Enter = close the polygon when valid. Skipped whenever the focus
  // is inside a text field so we don't steal browser undo/redo or trap
  // Enter submissions from the form on the right.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      const meta = e.ctrlKey || e.metaKey;
      if (meta && (e.key === "z" || e.key === "Z")) {
        if (e.shiftKey) {
          if (!canRedo) return;
          e.preventDefault();
          onRedo();
        } else {
          if (!canUndo) return;
          e.preventDefault();
          onUndo();
        }
        return;
      }
      if (meta && (e.key === "y" || e.key === "Y")) {
        if (!canRedo) return;
        e.preventDefault();
        onRedo();
        return;
      }
      if (e.key === "Enter" && canClose) {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // handleClose is recomputed every render — but it's only referenced
    // synchronously inside the keydown handler, so the closure pinning to
    // each render is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo, canRedo, canClose, onUndo, onRedo]);

  const deckRect = deckBounds
    ? deckToLeafletBounds(deckBounds, imageWidth, imageHeight)
    : null;

  return (
    <div className="relative h-full w-full">
    <MapContainer
      crs={L.CRS.Simple}
      bounds={fullBounds}
      maxBounds={fullBounds}
      maxBoundsViscosity={1.0}
      minZoom={-5}
      maxZoom={4}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={30}
      scrollWheelZoom
      doubleClickZoom={false}
      attributionControl={false}
      style={{ height: "100%", width: "100%", background: "#f3f4f6" }}
    >
      <ImageOverlay url={imageUrl} bounds={fullBounds} />
      {deckBounds && (
        <>
          <FitToDeck
            fullBounds={fullBounds}
            deckBounds={deckBounds}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
          />
          <Rectangle
            bounds={deckRect!}
            pathOptions={{
              color: "#9ca3af",
              weight: 1,
              dashArray: "4 4",
              fillOpacity: 0,
              interactive: false,
            }}
          />
        </>
      )}

      {existingAreas?.map((a) => (
        <Polygon
          key={a.id}
          positions={a.polygon.map((p) =>
            normToLatLng(p, imageWidth, imageHeight)
          )}
          pathOptions={{
            color: "#9ca3af",
            weight: 1,
            fillColor: "#9ca3af",
            fillOpacity: 0.1,
            interactive: false,
          }}
        />
      ))}

      <ClickToAddVertex isClosed={isClosed} onAddVertex={handleAddVertex} />

      {polygonLatLngs.length >= 2 && !isClosed && (
        <Polyline
          positions={polygonLatLngs}
          pathOptions={{ color: STROKE_COLOR, weight: 2 }}
        />
      )}
      {polygonLatLngs.length >= 3 && (
        <Polygon
          positions={polygonLatLngs}
          pathOptions={{
            color: STROKE_COLOR,
            weight: 2,
            fillColor: FILL_COLOR,
            fillOpacity: isClosed ? FILL_OPACITY_CLOSED : FILL_OPACITY_OPEN,
          }}
        />
      )}

      {/* Rubber-band: dashed line from the last placed vertex to the cursor
          while the polygon is still open. Gives instant feedback for where
          the next click will land. */}
      <RubberBandPreview
        isDrawing={!isClosed && polygon.length >= 1}
        lastVertex={
          polygonLatLngs.length > 0
            ? polygonLatLngs[polygonLatLngs.length - 1]
            : null
        }
      />

      {/* Midpoint insert handles — only while editing a closed polygon. The
          half-transparent dots between consecutive vertices accept clicks
          to insert a new vertex on that edge. */}
      <MidpointHandles
        polygonLatLngs={polygonLatLngs}
        isClosed={isClosed}
        onInsert={handleInsertVertex}
      />

      <VertexHandles
        polygonLatLngs={polygonLatLngs}
        polygonLength={polygon.length}
        isClosed={isClosed}
        onVertexClick={handleVertexClick}
        onVertexDrag={handleVertexDrag}
      />
    </MapContainer>

      <DrawerToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        canClose={canClose}
        onUndo={onUndo}
        onRedo={onRedo}
        onClose={handleClose}
      />
    </div>
  );
}

// Floating overlay on the GA: explicit Undo / Redo buttons, plus a primary
// "Close polygon" CTA that supersedes the green-vertex-click trick. The
// shortcuts still work for power users; this gives everyone else a visible
// button to aim at.
function DrawerToolbar({
  canUndo,
  canRedo,
  canClose,
  onUndo,
  onRedo,
  onClose,
}: {
  canUndo: boolean;
  canRedo: boolean;
  canClose: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClose: () => void;
}) {
  const iconBtn =
    "inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className={iconBtn}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className={iconBtn}
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3"
          />
        </svg>
      </button>
      {canClose && (
        <>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            Close polygon
          </button>
        </>
      )}
    </div>
  );
}

// Live preview of the next edge while drawing. Subscribes to map mousemove
// so the dashed line tracks the cursor between clicks.
function RubberBandPreview({
  isDrawing,
  lastVertex,
}: {
  isDrawing: boolean;
  lastVertex: [number, number] | null;
}) {
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  useMapEvents({
    mousemove(e) {
      if (!isDrawing) return;
      setCursor([e.latlng.lat, e.latlng.lng]);
    },
    mouseout() {
      setCursor(null);
    },
  });
  if (!isDrawing || !lastVertex || !cursor) return null;
  return (
    <Polyline
      positions={[lastVertex, cursor]}
      pathOptions={{
        color: STROKE_COLOR,
        weight: 2,
        dashArray: "6 4",
        opacity: 0.6,
        interactive: false,
      }}
    />
  );
}

// Half-transparent dots on every edge midpoint of a closed polygon. Clicking
// one inserts a new vertex there — primary path for refining the polygon
// after it's been closed.
function MidpointHandles({
  polygonLatLngs,
  isClosed,
  onInsert,
}: {
  polygonLatLngs: [number, number][];
  isClosed: boolean;
  onInsert: (afterIndex: number, latlng: L.LatLng) => void;
}) {
  if (!isClosed || polygonLatLngs.length < MIN_VERTICES) return null;
  return (
    <>
      {polygonLatLngs.map((a, i) => {
        const b = polygonLatLngs[(i + 1) % polygonLatLngs.length];
        const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        return (
          <CircleMarker
            key={`mid-${i}`}
            center={mid}
            radius={5}
            pathOptions={{
              color: STROKE_COLOR,
              fillColor: "#ffffff",
              fillOpacity: 0.6,
              weight: 1,
              opacity: 0.7,
            }}
            eventHandlers={{
              click: () => onInsert(i, L.latLng(mid[0], mid[1])),
            }}
          />
        );
      })}
    </>
  );
}

// Child component so we can use useMap() to access the Leaflet instance for
// drag handling — the map ref isn't publicly exposed on a CircleMarker.
function VertexHandles({
  polygonLatLngs,
  polygonLength,
  isClosed,
  onVertexClick,
  onVertexDrag,
}: {
  polygonLatLngs: [number, number][];
  polygonLength: number;
  isClosed: boolean;
  onVertexClick: (index: number, shiftKey: boolean) => void;
  onVertexDrag: (index: number, latlng: L.LatLng) => void;
}) {
  const map = useMap();
  return (
    <>
      {polygonLatLngs.map((latlng, i) => {
        const isFirstAndClosable = i === 0 && !isClosed && polygonLength >= 3;
        return (
          <CircleMarker
            key={i}
            center={latlng}
            radius={isFirstAndClosable ? 8 : 6}
            pathOptions={{
              color: isFirstAndClosable ? FIRST_VERTEX_HINT_COLOR : VERTEX_COLOR,
              fillColor: "#ffffff",
              fillOpacity: 1,
              weight: 2,
            }}
            eventHandlers={{
              // Click only fires when there's no significant pointer movement
              // between mousedown and mouseup, so this still triggers the
              // close-polygon-by-clicking-first-vertex action when the user
              // taps without dragging. Shift+click on any vertex deletes it
              // instead (handled by the parent).
              click: (e) =>
                onVertexClick(
                  i,
                  (e.originalEvent as MouseEvent | undefined)?.shiftKey ?? false
                ),
              mousedown: () => {
                map.dragging.disable();
                const onMove = (ev: L.LeafletMouseEvent) =>
                  onVertexDrag(i, ev.latlng);
                const onUp = () => {
                  map.off("mousemove", onMove);
                  map.off("mouseup", onUp);
                  map.dragging.enable();
                };
                map.on("mousemove", onMove);
                map.on("mouseup", onUp);
              },
            }}
          />
        );
      })}
    </>
  );
}
