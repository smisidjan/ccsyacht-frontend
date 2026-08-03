"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
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
import { getAreaPolygonForDeck } from "@/app/features/ga/utils/helpers";
import { createDonePinIcon } from "./pinIcons";
import SmoothModifierZoom, {
  SMOOTH_MAP_DEFAULTS,
} from "./SmoothModifierZoom";

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
  /** The polygon to zoom to on open, resolved by the caller from the
   *  area it already has in hand (e.g. the area the user clicked on
   *  the GA tab) rather than derived here from `areas` + `selectedAreaId`.
   *  That derived lookup depends on this component's own `areas` prop,
   *  which in the create-pin modal comes from a deck-scoped fetch that
   *  hasn't resolved yet on first open — so relying on it alone left
   *  the initial zoom falling back to the deck. Takes top priority
   *  over every other zoom source when supplied. */
  focusPolygon?: AreaPolygonPoint[] | null;
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

// Initial-zoom controller. Mirrors the original working pattern (a
// single effect, single 100ms timeout for invalidateSize + fitBounds)
// and extends it with refit-on-change so async data arrivals (e.g.
// the modal opens before `useArea` resolves) still land the map on
// the right target.
//
// Behaviour:
//   - Always shows the full image on the very first run so the user
//     sees something coherent immediately.
//   - 100ms later, after the map has a chance to settle into its real
//     size (`invalidateSize`), fits to `zoomBounds`. If no zoom
//     target was supplied, settles on a marker-centred view instead.
//   - On any subsequent change to `zoomBounds` (identity-based), it
//     refits to the new target — skipping the full-image step so the
//     transition is a direct snap to the new focus instead of a
//     visible "zoom out / zoom in" flash.
function FitToMarker({
  bounds,
  initialMarkerPosition,
  zoomBounds,
}: {
  bounds: L.LatLngBoundsExpression;
  initialMarkerPosition: [number, number];
  zoomBounds?: L.LatLngBoundsExpression | null;
}) {
  const map = useMap();
  // What we last fit to. Null until the first fit fires. The ref
  // doubles as the "first fit?" flag — checking against null is the
  // same question as "have we initialized".
  const lastFittedTarget = useRef<L.LatLngBoundsExpression | "marker" | null>(
    null
  );

  // Latest values for the things we *read* at fire-time but don't
  // want to *trigger* on. The fit only cares about the zoom target
  // changing — pulling `bounds` / `initialMarkerPosition` /  `map`
  // into the dep array would re-run the effect when the modal's init
  // pass nudges `x` / `y` (which flows through `useMemo` into a fresh
  // `initialMarkerPosition` reference), and that cleanup-then-bail
  // race silently swallows the pending fit timer.
  const mapRef = useRef(map);
  const boundsRef = useRef(bounds);
  const markerRef = useRef(initialMarkerPosition);
  // useLayoutEffect keeps the refs in sync with the latest render
  // synchronously, before paint, while satisfying the lint rule that
  // bans mutating refs during render. The timer body reads through
  // these refs so it always sees the freshest values without forcing
  // the fit effect to re-run when only those values change.
  useLayoutEffect(() => {
    mapRef.current = map;
    boundsRef.current = bounds;
    markerRef.current = initialMarkerPosition;
  }, [map, bounds, initialMarkerPosition]);

  useEffect(() => {
    const target: L.LatLngBoundsExpression | "marker" = zoomBounds ?? "marker";
    if (lastFittedTarget.current === target) return;
    const isFirstFit = lastFittedTarget.current === null;
    lastFittedTarget.current = target;

    // Show the full image immediately so the user has *something* to
    // look at while the deferred fit runs. Only on the very first
    // pass — subsequent refits (e.g. area data arrives later) jump
    // straight to the new target without a flash.
    if (isFirstFit) {
      mapRef.current.fitBounds(boundsRef.current, {
        padding: [10, 10],
        animate: false,
      });
    }

    // Defer invalidateSize + the real fit by one tick so the map has
    // its actual viewport size by the time fitBounds computes the
    // zoom level. Without this, the modal-mount frame can have a
    // zero-sized map and fitBounds resolves to a meaningless level.
    const t = setTimeout(() => {
      const m = mapRef.current;
      m.invalidateSize();
      if (target === "marker") {
        m.setView(markerRef.current, 1, { animate: false });
      } else {
        m.fitBounds(target, { padding: [20, 20], animate: false });
      }
    }, 100);
    return () => clearTimeout(t);
  }, [zoomBounds]);

  return null;
}

// Component to keep the pin visible after zooming or after the parent
// swaps which pin is the active draggable one (multi-pin create flow).
// The zoom-end branch covers the user zooming until the marker leaves
// the viewport; the effect on `markerPosition` covers the marker
// "teleporting" — e.g. selecting a different pin from the side list,
// which can drop the active position far outside the current view.
function KeepPinInView({ markerPosition }: { markerPosition: [number, number] }) {
  const map = useMap();

  useMapEvents({
    zoomend: () => {
      const bounds = map.getBounds();
      const markerLatLng = L.latLng(markerPosition[0], markerPosition[1]);
      if (!bounds.contains(markerLatLng)) {
        map.panTo(markerLatLng, { animate: true, duration: 0.3, easeLinearity: 0.25 });
      }
    },
  });

  useEffect(() => {
    const bounds = map.getBounds();
    const markerLatLng = L.latLng(markerPosition[0], markerPosition[1]);
    if (!bounds.contains(markerLatLng)) {
      map.panTo(markerLatLng, { animate: true, duration: 0.3, easeLinearity: 0.25 });
    }
  }, [map, markerPosition]);

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
  focusPolygon,
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

  // Compute the axis-aligned bounding box of the polygon we want the
  // user to focus on, tightest-available first:
  //   1. `focusPolygon` — resolved by the caller synchronously from the
  //      area it already has in hand (e.g. the area the user clicked),
  //      so it's available on the very first render instead of waiting
  //      on this component's own `areas` prop to arrive.
  //   2. The selected area's own polygon, derived here from `areas` +
  //      `selectedAreaId` — a fallback for callers that don't pass
  //      `focusPolygon` explicitly.
  //   3. `constrainPolygon` — an explicit scope (e.g. stage-level pin
  //      creation, where drops are constrained to one area). In that
  //      flow it already resolves to the same shape as the area's own
  //      polygon, so this only matters when no area is known yet.
  //   4. The deck's primary polygon — the free-roam GA flow fallback,
  //      when no area is known yet.
  const zoomBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    const selectedArea = selectedAreaId
      ? areas?.find((a) => a.identifier === selectedAreaId)
      : null;
    const areaPoints = getAreaPolygonForDeck(selectedArea, initialDeck);
    const points =
      (focusPolygon && focusPolygon.length >= 3
        ? focusPolygon
        : areaPoints && areaPoints.length >= 3
        ? areaPoints
        : constrainPolygon && constrainPolygon.length >= 3
        ? constrainPolygon
        : initialDeck?.deckPolygon?.points) ?? null;
    if (!points || points.length < 3) return null;
    const bbox = polygonBbox(points);
    if (!bbox) return null;
    const x1 = bbox.bbox_x * imageWidth;
    const y1 = bbox.bbox_y * imageHeight;
    const x2 = (bbox.bbox_x + bbox.bbox_width) * imageWidth;
    const y2 = (bbox.bbox_y + bbox.bbox_height) * imageHeight;
    return [
      [y1, x1], // Southwest [lat, lng]
      [y2, x2], // Northeast [lat, lng]
    ];
  }, [
    focusPolygon,
    constrainPolygon,
    initialDeck,
    areas,
    selectedAreaId,
    imageWidth,
    imageHeight,
  ]);

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
        // Cmd/Ctrl+wheel zoom + bubble plain wheel — see
        // SmoothModifierZoom child below.
        {...SMOOTH_MAP_DEFAULTS}
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
        <SmoothModifierZoom />
        <FitToMarker
          bounds={bounds}
          initialMarkerPosition={markerPosition}
          zoomBounds={zoomBounds}
        />

        <KeepPinInView markerPosition={markerPosition} />

        <ImageOverlay url={imageUrl} bounds={bounds} />

        {/* Deck polygon — dashed gray outline of the deck the modal is
            scoped to. Renders before areas so neighbour polygons sit on
            top of it. Non-interactive; the pin's drop is constrained to
            this shape via `constrainPolygon`. */}
        {initialDeck?.deckPolygon &&
          initialDeck.deckPolygon.points.length >= 3 && (
            <Polygon
              positions={initialDeck.deckPolygon.points.map((p) =>
                normToLatLng(p, imageWidth, imageHeight)
              )}
              pathOptions={{
                color: "#4b5563",
                weight: 2,
                dashArray: "6 4",
                fillColor: "#9ca3af",
                fillOpacity: 0.05,
                interactive: false,
              }}
            />
          )}

        {/* Area outlines for context. Selected area gets a solid blue
            stroke so the user can spot which one they've picked; the rest
            stay dashed gray. Non-interactive so they never steal events
            from the draggable marker.
            Source of the points: prefer the per-placement entry that
            matches the primary deck polygon (new shape), fall back to
            the legacy single `area.polygon` field for records the
            backend hasn't backfilled yet. */}
        {areas?.map((area) => {
          const primaryPolygonId = initialDeck?.deckPolygon?.identifier;
          const perPlacement = primaryPolygonId
            ? area.polygons?.find(
                (p) => p.parentPolygonId === primaryPolygonId
              )?.points
            : undefined;
          const points =
            perPlacement && perPlacement.length >= 3
              ? perPlacement
              : Array.isArray(area.polygon) && area.polygon.length >= 3
              ? area.polygon
              : null;
          if (!points) return null;
          const positions: [number, number][] = points.map((p) =>
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
