import type { AreaPolygonPoint } from "@/lib/api/types";

/** Standard ray-casting point-in-polygon test. Works on any coordinate
 *  system as long as the point and the polygon share units. */
export const isInsidePolygon = (
  point: AreaPolygonPoint,
  polygon: AreaPolygonPoint[]
): boolean => {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

// Standard orientation test for 3 points: > 0 = counter-clockwise,
// < 0 = clockwise, 0 = collinear. The sign is what we actually care
// about — used by the segment-intersection check below.
const orientation = (
  a: AreaPolygonPoint,
  b: AreaPolygonPoint,
  c: AreaPolygonPoint
): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

// True iff open segments AB and CD properly cross. Endpoints touching
// (one segment's tip lying on the other) are intentionally not counted
// — adjacent areas may legitimately share a vertex, and we don't want
// to flag that as an overlap.
const segmentsIntersect = (
  a: AreaPolygonPoint,
  b: AreaPolygonPoint,
  c: AreaPolygonPoint,
  d: AreaPolygonPoint
): boolean => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
};

/** True iff two polygons share interior area. Catches three cases:
 *  (a) a vertex of one polygon sits inside the other, or
 *  (b) any pair of edges properly intersect.
 *  Both polygons must use the same coordinate space (we use the area
 *  drawer's normalized 0..1 convention). Returns false for degenerate
 *  inputs (< 3 vertices). Endpoints that merely touch don't count — two
 *  areas may legitimately share a vertex or an edge. */
export const polygonsOverlap = (
  a: AreaPolygonPoint[],
  b: AreaPolygonPoint[]
): boolean => {
  if (a.length < 3 || b.length < 3) return false;
  for (const point of a) if (isInsidePolygon(point, b)) return true;
  for (const point of b) if (isInsidePolygon(point, a)) return true;
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j];
      const b2 = b[(j + 1) % b.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
};

/** Plain average of polygon vertices — close enough to a centroid for
 *  picking a sensible "drop the pin somewhere inside this area" default.
 *  Not the geometric centroid (would need the area-weighted formula) but
 *  cheap and good for convex-ish shapes typical on a GA. */
export const polygonCentroid = (
  polygon: AreaPolygonPoint[]
): AreaPolygonPoint | null => {
  if (polygon.length === 0) return null;
  let sumX = 0;
  let sumY = 0;
  for (const p of polygon) {
    sumX += p.x;
    sumY += p.y;
  }
  return { x: sumX / polygon.length, y: sumY / polygon.length };
};

/** Axis-aligned bounding box for a polygon, in the same bbox shape the UI
 *  drawing components use (x/y/width/height, all normalized 0..1). Returns
 *  null for empty inputs. Used to render a rectangular silhouette of a
 *  deck/side-profile polygon — the actual outline is still the polygon. */
export const polygonBbox = (
  polygon: AreaPolygonPoint[]
): { bbox_x: number; bbox_y: number; bbox_width: number; bbox_height: number } | null => {
  if (polygon.length === 0) return null;
  let minX = polygon[0].x;
  let minY = polygon[0].y;
  let maxX = polygon[0].x;
  let maxY = polygon[0].y;
  for (let i = 1; i < polygon.length; i++) {
    const { x, y } = polygon[i];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return {
    bbox_x: minX,
    bbox_y: minY,
    bbox_width: maxX - minX,
    bbox_height: maxY - minY,
  };
};

/** 4-vertex axis-aligned polygon (clockwise from top-left) — the shape we
 *  send to the backend when the user drew a rectangle for a deck or side
 *  profile. Decks/profiles store polygons; the drawing UI still works in
 *  bboxes, so we expand them at the wire boundary. */
export const bboxToPolygon = (b: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}): AreaPolygonPoint[] => [
  { x: b.x1, y: b.y1 },
  { x: b.x2, y: b.y1 },
  { x: b.x2, y: b.y2 },
  { x: b.x1, y: b.y2 },
];
