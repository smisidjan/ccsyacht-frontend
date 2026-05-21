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
import { isInsidePolygon } from "@/lib/utils/geometry";

const FIT_DELAY_MS_FAST = 100;
const FIT_DELAY_MS_SLOW = 300;
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

/** A GA pin already placed inside the area being edited. The polygon
 *  must keep containing every one of these — moving an edge past a pin
 *  would orphan it (the pin still belongs to this area on the server,
 *  but visually lives outside the new outline). */
interface ExistingPin {
  id: string;
  label: string | null;
  /** Normalized 0..1 coordinates — parent converts from the GAPin
   *  percentage convention before passing in. */
  point: AreaPolygonPoint;
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
  /** GA pins already placed inside the area being edited. Rendered on
   *  the canvas; the polygon must keep enclosing each of them. */
  existingPins?: ExistingPin[];
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
  /** Wipe the polygon and start over. Parent decides what "reset" means
   *  (clearing history + present state). Button disabled when nothing to
   *  reset. */
  onReset: () => void;
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

const isInsideAnyArea = (
  point: AreaPolygonPoint,
  areas: ExistingArea[] | undefined
): boolean => {
  if (!areas || areas.length === 0) return false;
  return areas.some((a) => isInsidePolygon(point, a.polygon));
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
  // Track the bbox values themselves rather than the object identity, since
  // a fresh `DeckBounds` object is built every render. We re-fit only when
  // the user actually switches to a different deck — not on every parent
  // re-render (which would yank the map back and steal their pan/zoom).
  const lastFitKey = useRef<string>("");
  useEffect(() => {
    const key = `${deckBounds.x1},${deckBounds.y1},${deckBounds.x2},${deckBounds.y2}`;
    if (lastFitKey.current === key) return;
    // First fit on mount is fast — the container is already sized. A
    // subsequent deck switch needs longer because Leaflet has to settle the
    // viewport after the intermediate fullBounds fit before the deck fit
    // lands cleanly; the shorter delay leaves the map zoomed out.
    const isFirstFit = lastFitKey.current === "";
    lastFitKey.current = key;

    // Relax the floor before the intermediate full-GA fit — a previous
    // deck may have raised minZoom above the level needed to lay down
    // fullBounds, which would silently clamp the fit.
    map.setMinZoom(-5);
    const bounds = deckToLeafletBounds(deckBounds, imageWidth, imageHeight);
    map.fitBounds(fullBounds, { padding: [10, 10], animate: false });
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: DECK_FIT_PADDING, animate: false });
      // Pin the zoom-out floor to the deck-preview zoom. Leaflet then
      // disables the minus button at exactly the preview level — the
      // user can zoom in and back out, but never past the preview.
      map.setMinZoom(map.getZoom());
    }, isFirstFit ? FIT_DELAY_MS_FAST : FIT_DELAY_MS_SLOW);
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

export default function AreaPolygonDrawer({
  imageUrl,
  imageWidth,
  imageHeight,
  deckBounds,
  existingAreas,
  existingPins,
  polygon,
  isClosed,
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onReset,
}: AreaPolygonDrawerProps) {
  const fullBounds = useMemo<L.LatLngBoundsExpression>(
    () => [
      [0, 0],
      [imageHeight, imageWidth],
    ],
    [imageWidth, imageHeight]
  );

  // Live drag preview — while a vertex is being dragged we keep the new
  // position in local state instead of calling `onChange` per mousemove.
  // That prevents the history stack from being flooded with one entry per
  // pixel of movement, which made Undo / Redo step through the drag frame
  // by frame instead of treating the whole drag as a single action. The
  // committed position lands in history once on mouseup.
  const [dragPreview, setDragPreview] = useState<
    { index: number; point: AreaPolygonPoint } | null
  >(null);

  // Polygon shown on the map = committed polygon, optionally with the
  // dragged vertex overridden by its live preview position.
  const displayedPolygon = useMemo(() => {
    if (!dragPreview) return polygon;
    return polygon.map((p, i) =>
      i === dragPreview.index ? dragPreview.point : p
    );
  }, [polygon, dragPreview]);

  const polygonLatLngs = useMemo(
    () => displayedPolygon.map((p) => normToLatLng(p, imageWidth, imageHeight)),
    [displayedPolygon, imageWidth, imageHeight]
  );

  const handleAddVertex = (latlng: L.LatLng) => {
    const point = latLngToNorm(latlng, imageWidth, imageHeight);
    if (deckBounds && !isInsideDeck(point, deckBounds)) return;
    // Areas can't overlap — silently reject vertices that would land inside
    // an already-drawn area on the same deck.
    if (isInsideAnyArea(point, existingAreas)) return;
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
    // Closing the polygon is done from the toolbar's "Close polygon" CTA;
    // a plain vertex click stays a no-op here so the user can drag without
    // accidentally finishing the shape.
  };

  const handleVertexDrag = (index: number, latlng: L.LatLng) => {
    const point = latLngToNorm(latlng, imageWidth, imageHeight);
    if (deckBounds && !isInsideDeck(point, deckBounds)) return;
    if (isInsideAnyArea(point, existingAreas)) return;
    // Local preview only — history stays clean until mouseup.
    setDragPreview({ index, point });
  };

  // The vertex-drag-end handler is wired into Leaflet via map.on(...)
  // inside the CircleMarker's mousedown handler. That mousedown closure
  // captures `handleVertexDragEnd` once, when the drag starts — by the
  // time mouseup fires, the React state (`dragPreview`, `polygon`) it
  // closed over is already stale, so the commit silently no-ops. Keep
  // the live values in refs and read from them in the handler so it
  // always sees the latest snapshot.
  const polygonRef = useRef(polygon);
  const isClosedRef = useRef(isClosed);
  const dragPreviewRef = useRef(dragPreview);
  useEffect(() => {
    polygonRef.current = polygon;
    isClosedRef.current = isClosed;
    dragPreviewRef.current = dragPreview;
  });

  // Drag finished. Commit the preview as a single history entry, or bail
  // out if nothing actually moved (e.g. the user just tapped the vertex).
  const handleVertexDragEnd = () => {
    const preview = dragPreviewRef.current;
    if (!preview) return;
    const currentPolygon = polygonRef.current;
    const current = currentPolygon[preview.index];
    const moved =
      !current ||
      current.x !== preview.point.x ||
      current.y !== preview.point.y;
    if (moved) {
      const next = currentPolygon.map((p, i) =>
        i === preview.index ? preview.point : p
      );
      onChange(next, isClosedRef.current);
    }
    setDragPreview(null);
  };

  // Insert a vertex on an existing edge (clicked midpoint handle). The new
  // vertex slots in *after* the edge's start index, pushing later vertices
  // one slot to the right.
  const handleInsertVertex = (afterIndex: number, latlng: L.LatLng) => {
    const point = latLngToNorm(latlng, imageWidth, imageHeight);
    if (deckBounds && !isInsideDeck(point, deckBounds)) return;
    if (isInsideAnyArea(point, existingAreas)) return;
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
            color: "#374151",
            weight: 2,
            dashArray: "6 4",
            fillColor: "#6b7280",
            fillOpacity: 0.3,
            interactive: false,
          }}
        />
      ))}

      {existingPins?.map((pin) => {
        const outside =
          displayedPolygon.length >= MIN_VERTICES &&
          !isInsidePolygon(pin.point, displayedPolygon);
        const fill = outside ? "#dc2626" : "#1d4ed8";
        return (
          <CircleMarker
            key={pin.id}
            center={normToLatLng(pin.point, imageWidth, imageHeight)}
            radius={6}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: fill,
              fillOpacity: 1,
              interactive: false,
            }}
          />
        );
      })}

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
        onVertexDragEnd={handleVertexDragEnd}
      />
    </MapContainer>

      <DrawerToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        canClose={canClose}
        canReset={polygon.length > 0 || isClosed}
        onUndo={onUndo}
        onRedo={onRedo}
        onClose={handleClose}
        onReset={onReset}
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
  canReset,
  onUndo,
  onRedo,
  onClose,
  onReset,
}: {
  canUndo: boolean;
  canRedo: boolean;
  canClose: boolean;
  canReset: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClose: () => void;
  onReset: () => void;
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
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" aria-hidden="true" />
      <button
        type="button"
        onClick={onReset}
        disabled={!canReset}
        className={`${iconBtn} hover:text-red-600 dark:hover:text-red-400`}
        title="Reset polygon"
        aria-label="Reset polygon"
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
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
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
  onVertexDragEnd,
}: {
  polygonLatLngs: [number, number][];
  polygonLength: number;
  isClosed: boolean;
  onVertexClick: (index: number, shiftKey: boolean) => void;
  onVertexDrag: (index: number, latlng: L.LatLng) => void;
  onVertexDragEnd: () => void;
}) {
  const map = useMap();
  return (
    <>
      {polygonLatLngs.map((latlng, i) => {
        return (
          <CircleMarker
            key={i}
            center={latlng}
            radius={6}
            pathOptions={{
              color: VERTEX_COLOR,
              fillColor: "#ffffff",
              fillOpacity: 1,
              weight: 2,
            }}
            eventHandlers={{
              // Plain click is reserved for Shift+click delete; closing the
              // polygon is the toolbar's job. Drag-to-move still works
              // because the mousedown handler below intercepts movement.
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
                  // Commit the drag as a single history entry on release.
                  onVertexDragEnd();
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
