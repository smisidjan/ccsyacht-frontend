"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type L from "leaflet";

/** Full image bounds in Leaflet's pixel coordinates: `[[0, 0], [h, w]]`.
 *  This is the canonical "show the entire GA" rectangle every viewer
 *  was building from scratch. */
export const getFullImageBounds = (
  imageWidth: number,
  imageHeight: number
): L.LatLngBoundsExpression => [
  [0, 0],
  [imageHeight, imageWidth],
];

interface FitBoundsProps {
  bounds: L.LatLngBoundsExpression;
  padding?: [number, number];
  /** Re-fit whenever `bounds` changes, vs. only on mount. Mount-only is
   *  the right choice for any viewer where the user can pan/zoom — re-
   *  fitting steals their work. Re-fit-on-change is right when the
   *  parent intentionally swaps the focus rect (e.g. switching decks). */
  refitOnChange?: boolean;
  /** Animation off by default — the snap matches the existing GA
   *  surfaces. Pass `true` for the rare animated fit. */
  animate?: boolean;
  /** Delay the fit by this many ms. Needed when the map mounts inside a
   *  freshly-opened modal or a flex container that hasn't settled its
   *  size yet — Leaflet would otherwise read the wrong dimensions and
   *  the fit would land at the wrong zoom. Pairs with `invalidateSize`
   *  at the delayed callback. Default is no delay. */
  delayMs?: number;
  /** Pin the zoom-out floor to the post-fit zoom level. Leaflet then
   *  disables the minus button at exactly the fit level — the user can
   *  zoom in and back out, but never past the initial framing. Common
   *  on embedded GA previews where panning around outside the focus
   *  rect would just show empty canvas. */
  lockMinZoomToFit?: boolean;
}

/** Drop-in replacement for the five copies of FitBounds / FitFullImage
 *  / FitToBounds scattered across the GA viewers. Each one was the same
 *  pattern: useMap + fitBounds inside a useEffect, optionally with a
 *  setTimeout for the not-yet-settled container case and a
 *  `setMinZoom` after the fit. */
export function FitBounds({
  bounds,
  padding,
  refitOnChange = false,
  animate = false,
  delayMs,
  lockMinZoomToFit = false,
}: FitBoundsProps) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (didFit.current && !refitOnChange) return;
    didFit.current = true;

    const run = () => {
      // Defensive: a delayed fit can fire after the consumer unmounts.
      // `getContainer` throws if the map is gone — bail before touching it.
      if (!map.getContainer()) return;
      map.invalidateSize();
      map.fitBounds(bounds, { padding: padding ?? [0, 0], animate });
      if (lockMinZoomToFit) {
        map.setMinZoom(map.getZoom());
      }
    };

    if (delayMs && delayMs > 0) {
      const t = setTimeout(run, delayMs);
      return () => clearTimeout(t);
    }
    run();
  }, [map, bounds, padding, refitOnChange, animate, delayMs, lockMinZoomToFit]);

  return null;
}
