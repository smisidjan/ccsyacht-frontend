/** Centralized coordinate conversions for everything that renders on the
 *  General Arrangement (GA) image. Three coordinate systems live in this
 *  app, and they kept getting reimplemented inline:
 *
 *   - Normalized 0..1   — polygons (areas, decks). Backend storage format.
 *   - Percentage 0..100 — pins, deck-drawer bounds. UI/legacy format.
 *   - Leaflet [lat, lng] in pixels — what react-leaflet wants.
 *
 *  All functions assume the GA image origin is top-left and the Leaflet
 *  map uses CRS.Simple with `imageHeight` as the lat axis (rows) and
 *  `imageWidth` as the lng axis (cols). Conversions are pure — no
 *  clamping. Clamp at the caller if the value can come from a mouse
 *  event outside the image. */

import type { AreaPolygonPoint, DeckBounds } from "@/lib/api/types";
import type L from "leaflet";

// ============ Normalized 0..1 ↔ Leaflet pixels ============

export const normToLatLng = (
  point: AreaPolygonPoint,
  imageWidth: number,
  imageHeight: number
): [number, number] => [point.y * imageHeight, point.x * imageWidth];

export const latLngToNorm = (
  latlng: L.LatLng,
  imageWidth: number,
  imageHeight: number
): AreaPolygonPoint => ({
  x: latlng.lng / imageWidth,
  y: latlng.lat / imageHeight,
});

// ============ Percentage 0..100 ↔ Leaflet pixels ============

export const pctToLatLng = (
  point: { x: number; y: number },
  imageWidth: number,
  imageHeight: number
): [number, number] => [(point.y / 100) * imageHeight, (point.x / 100) * imageWidth];

export const latLngToPct = (
  latlng: L.LatLng,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } => ({
  x: (latlng.lng / imageWidth) * 100,
  y: (latlng.lat / imageHeight) * 100,
});

// ============ Scale conversion ============

export const normToPct = (point: AreaPolygonPoint): { x: number; y: number } => ({
  x: point.x * 100,
  y: point.y * 100,
});

export const pctToNorm = (point: { x: number; y: number }): AreaPolygonPoint => ({
  x: point.x / 100,
  y: point.y / 100,
});

// ============ DeckBounds (percentage 0..100) helpers ============

/** Pixel Leaflet bounds for a `DeckBounds` rectangle (percentage 0..100).
 *  `[[lat_sw, lng_sw], [lat_ne, lng_ne]]` — Leaflet's preferred order. */
export const deckBoundsToLeaflet = (
  bounds: DeckBounds,
  imageWidth: number,
  imageHeight: number
): L.LatLngBoundsExpression => [
  [(bounds.y1 / 100) * imageHeight, (bounds.x1 / 100) * imageWidth],
  [(bounds.y2 / 100) * imageHeight, (bounds.x2 / 100) * imageWidth],
];

/** Point-in-rect test for a `DeckBounds` rectangle. The point is taken
 *  in the same percentage scale as the bounds — call `latLngToPct`
 *  first if you have a Leaflet latlng. */
export const isPointInsideDeckBounds = (
  point: { x: number; y: number },
  bounds: DeckBounds
): boolean =>
  point.x >= bounds.x1 &&
  point.x <= bounds.x2 &&
  point.y >= bounds.y1 &&
  point.y <= bounds.y2;
