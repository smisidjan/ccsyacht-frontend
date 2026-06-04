"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  ImageOverlay,
  Polygon,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AreaPolygonPoint } from "@/lib/api/types";
import {
  normToLatLng as normToLatLngHelper,
  latLngToNorm as latLngToNormHelper,
} from "@/lib/utils/gaCoordinates";
import { bboxToPolygon, polygonBbox } from "@/lib/utils/geometry";
import { FitBounds, getFullImageBounds } from "@/lib/utils/gaLeaflet";

/** Minimum vertices any polygon must have. Backend rejects fewer, and
 *  the Shift+click delete helper enforces it so the user can't break a
 *  closed polygon. */
const MIN_VERTICES = 3;

const STROKE_COLOR = "#1d4ed8";
const FILL_COLOR = "#2563eb";
const FILL_OPACITY_OPEN = 0.15;
const FILL_OPACITY_CLOSED = 0.25;
const VERTEX_COLOR = "#1d4ed8";

/** Result of validating where a new (or moved) vertex would land. Use
 *  `accept: false` to silently reject the action — typical for "vertex
 *  outside allowed region" cases. */
export type VertexValidator = (point: AreaPolygonPoint) => boolean;

export interface PolygonDrawerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Current polygon (normalized 0..1). */
  polygon: AreaPolygonPoint[];
  /** Whether the polygon has been closed (>= 3 vertices, user finished). */
  isClosed: boolean;
  onChange: (polygon: AreaPolygonPoint[], isClosed: boolean) => void;
  /** History-aware actions. Parent owns the stack. */
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onReset: () => void;
  /** Optional gate for "is this vertex position allowed". Called on add,
   *  drag, and edge-midpoint insert. Returning `false` silently drops
   *  the action — the drawer doesn't surface a reason; callers add their
   *  own visual feedback (e.g. red pin when an existing one would be
   *  orphaned) via `children`. */
  validateVertex?: VertexValidator;
  /** Extra Leaflet content rendered between the image overlay and the
   *  active polygon. Use this for read-only constraint overlays:
   *  neighbour outlines, deck boundary rectangles, existing pins, etc. */
  children?: React.ReactNode;
  /** Optional Leaflet component(s) controlling the initial fit. Pass
   *  `<FitBounds bounds={...} />` to fit the whole image, or a
   *  domain-specific fitter (e.g. fit-to-deck) for a tighter view. */
  fitter?: React.ReactNode;
  /** Stroke color for the active polygon. Defaults to blue. */
  strokeColor?: string;
  /** Fill color for the active polygon (any non-empty closed shape).
   *  Defaults to blue. */
  fillColor?: string;
}

type Bbox = { x1: number; y1: number; x2: number; y2: number };
type Corner = "nw" | "ne" | "sw" | "se";

/** Single map-interaction surface for both drawing modes. We collapse
 *  click-to-add-vertex and rectangle draw / move / resize into one
 *  component with refs so the Leaflet handlers always see the latest
 *  mode and anchor — Leaflet events fire outside React's batched
 *  state update window, so naive closures over `useState` go stale
 *  during a drag and wipe the committed polygon on the next click.
 *
 *  Rectangle mode keeps three sub-interactions:
 *    - draw: empty-canvas click+drag → replace polygon with new rect.
 *    - move: click inside the existing rect → translate it.
 *    - resize: click+drag a corner handle → grow/shrink it.
 *  All three share a single `preview` bbox; the actual polygon stays
 *  hidden behind the preview until the user releases, at which point
 *  the preview commits as a 4-vertex axis-aligned polygon. */
function MapInteraction({
  drawMode,
  isClosed,
  polygon,
  imageWidth,
  imageHeight,
  strokeColor,
  fillColor,
  onAddVertex,
  onCommitRectangle,
}: {
  drawMode: "polygon" | "rectangle";
  isClosed: boolean;
  polygon: AreaPolygonPoint[];
  imageWidth: number;
  imageHeight: number;
  strokeColor: string;
  fillColor: string;
  onAddVertex: (latlng: L.LatLng) => void;
  onCommitRectangle: (points: AreaPolygonPoint[]) => void;
}) {
  type Action =
    | { kind: "draw"; startX: number; startY: number }
    | { kind: "move"; offsetX: number; offsetY: number; original: Bbox }
    | { kind: "resize"; corner: Corner; original: Bbox };

  const [action, setAction] = useState<Action | null>(null);
  const [preview, setPreview] = useState<Bbox | null>(null);

  // Refs mirror every value the Leaflet handlers depend on so they
  // never read a stale closure mid-drag.
  const actionRef = useRef(action);
  const previewRef = useRef(preview);
  const drawModeRef = useRef(drawMode);
  const isClosedRef = useRef(isClosed);
  const polygonRef = useRef(polygon);
  useEffect(() => {
    actionRef.current = action;
    previewRef.current = preview;
    drawModeRef.current = drawMode;
    isClosedRef.current = isClosed;
    polygonRef.current = polygon;
  });

  // After a rectangle commit the browser synthesises a click on the
  // map (mousedown + mouseup on the same element). We must swallow
  // it — otherwise it slips through to `onAddVertex` and overwrites
  // the just-committed polygon with a single click point.
  const suppressNextClickRef = useRef(false);

  const currentBbox: Bbox | null =
    drawMode === "rectangle" && isClosed && polygon.length >= MIN_VERTICES
      ? (() => {
          const bb = polygonBbox(polygon);
          if (!bb) return null;
          return {
            x1: bb.bbox_x,
            y1: bb.bbox_y,
            x2: bb.bbox_x + bb.bbox_width,
            y2: bb.bbox_y + bb.bbox_height,
          };
        })()
      : null;

  const isInside = (p: AreaPolygonPoint, b: Bbox) =>
    p.x >= b.x1 && p.x <= b.x2 && p.y >= b.y1 && p.y <= b.y2;

  const map = useMapEvents({
    mousedown(e) {
      if (drawModeRef.current !== "rectangle") return;
      // If a corner handle already set up a resize action, leave it
      // alone — the handle's own mousedown ran first and stopPropped.
      if (actionRef.current?.kind === "resize") return;

      const p = latLngToNormHelper(e.latlng, imageWidth, imageHeight);
      const poly = polygonRef.current;
      const bb =
        isClosedRef.current && poly.length >= MIN_VERTICES
          ? polygonBbox(poly)
          : null;
      const original: Bbox | null = bb
        ? {
            x1: bb.bbox_x,
            y1: bb.bbox_y,
            x2: bb.bbox_x + bb.bbox_width,
            y2: bb.bbox_y + bb.bbox_height,
          }
        : null;

      if (original && isInside(p, original)) {
        setAction({
          kind: "move",
          offsetX: p.x - original.x1,
          offsetY: p.y - original.y1,
          original,
        });
        setPreview(original);
      } else {
        setAction({ kind: "draw", startX: p.x, startY: p.y });
        setPreview({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      }
      map.dragging.disable();
    },
    mousemove(e) {
      if (drawModeRef.current !== "rectangle") return;
      const a = actionRef.current;
      if (!a) return;
      const p = latLngToNormHelper(e.latlng, imageWidth, imageHeight);

      if (a.kind === "draw") {
        setPreview({
          x1: Math.min(a.startX, p.x),
          y1: Math.min(a.startY, p.y),
          x2: Math.max(a.startX, p.x),
          y2: Math.max(a.startY, p.y),
        });
      } else if (a.kind === "move") {
        const w = a.original.x2 - a.original.x1;
        const h = a.original.y2 - a.original.y1;
        const x1 = p.x - a.offsetX;
        const y1 = p.y - a.offsetY;
        setPreview({ x1, y1, x2: x1 + w, y2: y1 + h });
      } else if (a.kind === "resize") {
        const next = { ...a.original };
        switch (a.corner) {
          case "nw":
            next.x1 = Math.min(p.x, a.original.x2 - 0.005);
            next.y1 = Math.min(p.y, a.original.y2 - 0.005);
            break;
          case "ne":
            next.x2 = Math.max(p.x, a.original.x1 + 0.005);
            next.y1 = Math.min(p.y, a.original.y2 - 0.005);
            break;
          case "sw":
            next.x1 = Math.min(p.x, a.original.x2 - 0.005);
            next.y2 = Math.max(p.y, a.original.y1 + 0.005);
            break;
          case "se":
            next.x2 = Math.max(p.x, a.original.x1 + 0.005);
            next.y2 = Math.max(p.y, a.original.y1 + 0.005);
            break;
        }
        setPreview(next);
      }
    },
    mouseup() {
      if (drawModeRef.current !== "rectangle") return;
      const p = previewRef.current;
      if (p) {
        const w = Math.abs(p.x2 - p.x1);
        const h = Math.abs(p.y2 - p.y1);
        if (w > 0.001 && h > 0.001) {
          onCommitRectangle(bboxToPolygon(p));
          suppressNextClickRef.current = true;
        }
      }
      setAction(null);
      setPreview(null);
      map.dragging.enable();
    },
    click(e) {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        return;
      }
      if (drawModeRef.current === "polygon" && !isClosedRef.current) {
        onAddVertex(e.latlng);
      }
    },
  });

  const startResize = (corner: Corner, original: Bbox) => {
    const next = { kind: "resize" as const, corner, original };
    // Update the ref synchronously so the map's mousedown (which
    // fires right after the corner's, in the same event cycle) sees
    // the resize action already in flight and bails. Waiting for
    // React to propagate `setAction` would leave a one-tick window
    // where the map starts a "move" and overwrites the resize.
    actionRef.current = next;
    setAction(next);
    setPreview(original);
    map.dragging.disable();
  };

  // The rectangle shown on the canvas: live preview during an active
  // interaction, otherwise the committed bbox (when one exists).
  const visibleBbox = preview ?? currentBbox;
  const positions: [number, number][] | null = visibleBbox
    ? [
        [visibleBbox.y1 * imageHeight, visibleBbox.x1 * imageWidth],
        [visibleBbox.y1 * imageHeight, visibleBbox.x2 * imageWidth],
        [visibleBbox.y2 * imageHeight, visibleBbox.x2 * imageWidth],
        [visibleBbox.y2 * imageHeight, visibleBbox.x1 * imageWidth],
      ]
    : null;

  return (
    <>
      {/* Preview / committed rectangle, only in rectangle mode. The
          regular polygon underneath is hidden by the parent so the
          two don't double-render. */}
      {drawMode === "rectangle" && positions && (
        <Polygon
          positions={positions}
          pathOptions={{
            color: strokeColor,
            weight: 2,
            fillColor,
            fillOpacity: preview ? FILL_OPACITY_OPEN : FILL_OPACITY_CLOSED,
            interactive: false,
          }}
        />
      )}

      {/* Corner handles — only when a rectangle is committed (not
          mid-draw / mid-move) so they don't dance around during
          interaction. Their own mousedown sets the resize action
          before the map's mousedown fires. */}
      {drawMode === "rectangle" && currentBbox && !action && (
        <RectangleCorners
          bbox={currentBbox}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          color={strokeColor}
          onStartResize={startResize}
        />
      )}
    </>
  );
}

/** Four draggable circles at the corners of the committed rectangle.
 *  Each handle absorbs its mousedown (via Leaflet's `stopPropagation`)
 *  so the map's mousedown handler doesn't treat it as the start of a
 *  draw / move. */
function RectangleCorners({
  bbox,
  imageWidth,
  imageHeight,
  color,
  onStartResize,
}: {
  bbox: Bbox;
  imageWidth: number;
  imageHeight: number;
  color: string;
  onStartResize: (corner: Corner, original: Bbox) => void;
}) {
  const corners: { corner: Corner; pos: [number, number] }[] = [
    { corner: "nw", pos: [bbox.y1 * imageHeight, bbox.x1 * imageWidth] },
    { corner: "ne", pos: [bbox.y1 * imageHeight, bbox.x2 * imageWidth] },
    { corner: "sw", pos: [bbox.y2 * imageHeight, bbox.x1 * imageWidth] },
    { corner: "se", pos: [bbox.y2 * imageHeight, bbox.x2 * imageWidth] },
  ];
  return (
    <>
      {corners.map((c) => (
        <CircleMarker
          key={c.corner}
          center={c.pos}
          radius={7}
          pathOptions={{
            color,
            fillColor: "#ffffff",
            fillOpacity: 1,
            weight: 2,
          }}
          eventHandlers={{
            mousedown: (e) => {
              L.DomEvent.stopPropagation(e.originalEvent);
              L.DomEvent.preventDefault(e.originalEvent);
              onStartResize(c.corner, bbox);
            },
          }}
        />
      ))}
    </>
  );
}

export default function PolygonDrawer({
  imageUrl,
  imageWidth,
  imageHeight,
  polygon,
  isClosed,
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onReset,
  validateVertex,
  children,
  fitter,
  strokeColor = STROKE_COLOR,
  fillColor = FILL_COLOR,
}: PolygonDrawerProps) {
  const fullBounds = useMemo<L.LatLngBoundsExpression>(
    () => getFullImageBounds(imageWidth, imageHeight),
    [imageWidth, imageHeight]
  );

  // Drawing mode. Polygon = click vertices one by one (the default
  // freehand UX). Rectangle = click-drag to drop a 4-vertex axis-
  // aligned rectangle; on release the mode flips back to polygon so
  // the user can fine-tune the shape with the usual vertex handles.
  const [drawMode, setDrawMode] = useState<"polygon" | "rectangle">("polygon");

  // Live drag preview — while a vertex is being dragged we keep the new
  // position in local state instead of calling `onChange` per mousemove.
  // Otherwise history fills with one entry per pixel of movement.
  const [dragPreview, setDragPreview] = useState<
    { index: number; point: AreaPolygonPoint } | null
  >(null);

  const displayedPolygon = useMemo(() => {
    if (!dragPreview) return polygon;
    return polygon.map((p, i) =>
      i === dragPreview.index ? dragPreview.point : p
    );
  }, [polygon, dragPreview]);

  const polygonLatLngs = useMemo(
    () =>
      displayedPolygon.map((p) => normToLatLngHelper(p, imageWidth, imageHeight)),
    [displayedPolygon, imageWidth, imageHeight]
  );

  const handleAddVertex = (latlng: L.LatLng) => {
    const point = latLngToNormHelper(latlng, imageWidth, imageHeight);
    if (validateVertex && !validateVertex(point)) return;
    onChange([...polygon, point], false);
  };

  const handleVertexClick = (index: number, shiftKey: boolean) => {
    if (shiftKey) {
      if (polygon.length <= MIN_VERTICES) return;
      const next = polygon.filter((_, i) => i !== index);
      onChange(next, isClosed);
      return;
    }
    // Closing is via the toolbar CTA — plain click stays a no-op.
  };

  const handleVertexDrag = (index: number, latlng: L.LatLng) => {
    const point = latLngToNormHelper(latlng, imageWidth, imageHeight);
    if (validateVertex && !validateVertex(point)) return;
    setDragPreview({ index, point });
  };

  // Refs so the drag-end handler (wired via map.on) reads the latest
  // snapshot rather than the closure pinned at drag start.
  const polygonRef = useRef(polygon);
  const isClosedRef = useRef(isClosed);
  const dragPreviewRef = useRef(dragPreview);
  useEffect(() => {
    polygonRef.current = polygon;
    isClosedRef.current = isClosed;
    dragPreviewRef.current = dragPreview;
  });

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

  const handleInsertVertex = (afterIndex: number, latlng: L.LatLng) => {
    const point = latLngToNormHelper(latlng, imageWidth, imageHeight);
    if (validateVertex && !validateVertex(point)) return;
    const next = [...polygon];
    next.splice(afterIndex + 1, 0, point);
    onChange(next, isClosed);
  };

  const canClose = !isClosed && polygon.length >= MIN_VERTICES;
  const handleClose = () => {
    if (!canClose) return;
    onChange(polygon, true);
  };

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y)
  // = redo, Enter = close. Skipped inside text fields so we don't steal
  // browser undo/redo or trap Enter submissions from a sibling form.
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
    // handleClose is recomputed every render — only referenced
    // synchronously inside keydown, so closure pinning is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo, canRedo, canClose, onUndo, onRedo]);

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Map fills whatever vertical space the wrapper offers; in a
          flex column the sticky toolbar below pushes off its own
          height. */}
      <div className="flex-1 min-h-0 relative">
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
        // Off so Leaflet doesn't put `tabindex=0` on the container.
        // First click would otherwise focus it, the browser would
        // scrollIntoView the modal body to bring it flush, and the
        // map jumps — the user's vertex lands where the click was
        // captured but the visible map has shifted.
        keyboard={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: "#f3f4f6" }}
      >
        <ImageOverlay url={imageUrl} bounds={fullBounds} />
        {/* Default fitter — fits the full image to the canvas on mount
            and pins the zoom-out floor to the fit level so the user
            can't pan past the image edges into grey canvas. Consumers
            with a tighter focus rect (e.g. fit-to-deck for areas)
            override via the `fitter` prop. */}
        {fitter ?? (
          <FitBounds bounds={fullBounds} lockMinZoomToFit />
        )}
        {children}

        <MapInteraction
          drawMode={drawMode}
          isClosed={isClosed}
          polygon={polygon}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          strokeColor={strokeColor}
          fillColor={fillColor}
          onAddVertex={handleAddVertex}
          onCommitRectangle={(points) => {
            // Stay in rectangle mode after commit — the user can keep
            // moving, resizing, or drawing a fresh one. Toggling the
            // toolbar button off drops them back into polygon mode for
            // per-vertex editing.
            onChange(points, true);
          }}
        />

        {/* Polygon-mode shapes + handles. In rectangle mode the
            `MapInteraction` child renders its own preview /
            committed rectangle and corner handles instead — keeping
            them visible here would double-render the shape and the
            per-vertex handles would fight the corner-resize logic. */}
        {drawMode === "polygon" && (
          <>
            {polygonLatLngs.length >= 2 && !isClosed && (
              <Polyline
                positions={polygonLatLngs}
                pathOptions={{ color: strokeColor, weight: 2 }}
              />
            )}
            {polygonLatLngs.length >= 3 && (
              <Polygon
                positions={polygonLatLngs}
                pathOptions={{
                  color: strokeColor,
                  weight: 2,
                  fillColor,
                  fillOpacity: isClosed ? FILL_OPACITY_CLOSED : FILL_OPACITY_OPEN,
                }}
              />
            )}

            <RubberBandPreview
              isDrawing={!isClosed && polygon.length >= 1}
              lastVertex={
                polygonLatLngs.length > 0
                  ? polygonLatLngs[polygonLatLngs.length - 1]
                  : null
              }
              strokeColor={strokeColor}
            />

            <MidpointHandles
              polygonLatLngs={polygonLatLngs}
              isClosed={isClosed}
              onInsert={handleInsertVertex}
              strokeColor={strokeColor}
            />

            <VertexHandles
              polygonLatLngs={polygonLatLngs}
              onVertexClick={handleVertexClick}
              onVertexDrag={handleVertexDrag}
              onVertexDragEnd={handleVertexDragEnd}
            />
          </>
        )}
      </MapContainer>
      </div>

      {/* Sticky toolbar — when the canvas wrapper is taller than its
          scroll container (e.g. the modal body), this stays pinned to
          the bottom of the visible area instead of disappearing below
          the fold. `pointer-events-none` on the spacer lets clicks pass
          through to the canvas; only the toolbar itself is clickable. */}
      <div className="sticky bottom-3 z-[1000] flex justify-center pointer-events-none -mt-12">
        <div className="pointer-events-auto">
          <DrawerToolbar
            canUndo={canUndo}
            canRedo={canRedo}
            canClose={canClose}
            canReset={polygon.length > 0 || isClosed}
            onUndo={onUndo}
            onRedo={onRedo}
            onClose={handleClose}
            onReset={onReset}
            drawMode={drawMode}
            onToggleRectangle={() =>
              setDrawMode((m) => (m === "rectangle" ? "polygon" : "rectangle"))
            }
          />
        </div>
      </div>
    </div>
  );
}

function DrawerToolbar({
  canUndo,
  canRedo,
  canClose,
  canReset,
  onUndo,
  onRedo,
  onClose,
  onReset,
  drawMode,
  onToggleRectangle,
}: {
  canUndo: boolean;
  canRedo: boolean;
  canClose: boolean;
  canReset: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClose: () => void;
  onReset: () => void;
  drawMode: "polygon" | "rectangle";
  onToggleRectangle: () => void;
}) {
  const iconBtn =
    "inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
  const rectActiveBtn =
    "inline-flex items-center justify-center w-9 h-9 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors";
  return (
    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1">
      <button
        type="button"
        onClick={onToggleRectangle}
        className={drawMode === "rectangle" ? rectActiveBtn : iconBtn}
        title={
          drawMode === "rectangle"
            ? "Cancel rectangle (back to click-to-add-vertex)"
            : "Draw rectangle (click and drag)"
        }
        aria-label="Draw rectangle"
        aria-pressed={drawMode === "rectangle"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <rect x="4" y="6" width="16" height="12" rx="1" />
        </svg>
      </button>
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" aria-hidden="true" />
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

function RubberBandPreview({
  isDrawing,
  lastVertex,
  strokeColor,
}: {
  isDrawing: boolean;
  lastVertex: [number, number] | null;
  strokeColor: string;
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
        color: strokeColor,
        weight: 2,
        dashArray: "6 4",
        opacity: 0.6,
        interactive: false,
      }}
    />
  );
}

function MidpointHandles({
  polygonLatLngs,
  isClosed,
  onInsert,
  strokeColor,
}: {
  polygonLatLngs: [number, number][];
  isClosed: boolean;
  onInsert: (afterIndex: number, latlng: L.LatLng) => void;
  strokeColor: string;
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
              color: strokeColor,
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

function VertexHandles({
  polygonLatLngs,
  onVertexClick,
  onVertexDrag,
  onVertexDragEnd,
}: {
  polygonLatLngs: [number, number][];
  onVertexClick: (index: number, shiftKey: boolean) => void;
  onVertexDrag: (index: number, latlng: L.LatLng) => void;
  onVertexDragEnd: () => void;
}) {
  const map = useMap();
  return (
    <>
      {polygonLatLngs.map((latlng, i) => (
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
                onVertexDragEnd();
              };
              map.on("mousemove", onMove);
              map.on("mouseup", onUp);
            },
          }}
        />
      ))}
    </>
  );
}
