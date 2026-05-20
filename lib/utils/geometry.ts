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
