"use client";

import { useEffect, useMemo, useRef } from "react";
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
const MAX_VERTICES = 5;

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
    if (polygon.length >= MAX_VERTICES) return;
    const point = latLngToNorm(latlng, imageWidth, imageHeight);
    if (deckBounds && !isInsideDeck(point, deckBounds)) return;
    onChange([...polygon, point], false);
  };

  const handleVertexClick = (index: number) => {
    if (isClosed) return;
    if (index === 0 && polygon.length >= 3) {
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

  const deckRect = deckBounds
    ? deckToLeafletBounds(deckBounds, imageWidth, imageHeight)
    : null;

  return (
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

      <VertexHandles
        polygonLatLngs={polygonLatLngs}
        polygonLength={polygon.length}
        isClosed={isClosed}
        onVertexClick={handleVertexClick}
        onVertexDrag={handleVertexDrag}
      />
    </MapContainer>
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
  onVertexClick: (index: number) => void;
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
              // taps without dragging.
              click: () => onVertexClick(i),
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
