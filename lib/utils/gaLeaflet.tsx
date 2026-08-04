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

/** Every GA `MapContainer` used a flat `maxZoom={4}`. With `CRS.Simple`
 *  and `getFullImageBounds` mapping 1 unit = 1 image pixel at zoom 0,
 *  that lets the (untiled) `ImageOverlay` be scaled up to 2^4 = 16×
 *  its natural size — for a large source drawing, tens of thousands
 *  of pixels per side. Fitting the *whole* image rarely reaches that
 *  zoom, but fitting tightly to a small sub-region (e.g. a
 *  side-profile rectangle within a much bigger GA sheet) does, and
 *  asking a mobile GPU/compositor to rasterize a layer that large
 *  crashes the tab outright rather than just rendering slowly — this
 *  is what crashed area/deck creation on iOS Safari specifically when
 *  switching to a side-profile view. Cap the zoom so the image can
 *  never be asked to render past a size every mobile browser can
 *  actually composite, regardless of how small the region a caller
 *  fits to. */
const SAFE_MAX_RENDERED_PX = 8192;
const DEFAULT_MAX_ZOOM = 4;

export function getSafeMaxZoom(imageWidth: number, imageHeight: number): number {
  const largestDim = Math.max(imageWidth, imageHeight, 1);
  const safeZoom = Math.floor(Math.log2(SAFE_MAX_RENDERED_PX / largestDim));
  // Floor at 0 (native image size), not 1 — flooring at 1 would force
  // a further 2× blow-up on top of the image's own native size for
  // sources already close to (or over) the safe threshold, defeating
  // the whole point. A source image already larger than
  // `SAFE_MAX_RENDERED_PX` in its own right is a separate problem
  // (needs actual downsampling/tiling upstream) that capping zoom
  // alone can't fix — this only guarantees we never zoom further past
  // whatever size the image already is.
  return Math.min(DEFAULT_MAX_ZOOM, Math.max(0, safeZoom));
}

/** Tracks whether the map's container currently has an active touch
 *  or mouse-drag on it. Every GA viewer that mounts with a deferred
 *  re-fit (show the full image immediately, then `fitBounds`/`setView`
 *  to the real target ~100-300ms later, once the container has
 *  settled its size) has the same latent bug: if the user starts
 *  panning/pinching *during* that window, the deferred call forces
 *  the view out from under Leaflet's own in-progress gesture tracking
 *  (e.g. `TouchZoom`'s pinch math, which references the gesture's
 *  start point). That corrupts Leaflet's internal state badly enough
 *  to crash the tab outright on iOS Safari — not just interrupt an
 *  animation — if the user so much as touches the map before it's
 *  finished its own initial fit. `whenIdle` runs `fn` immediately if
 *  nothing is active, or waits for the current gesture to end
 *  otherwise, so a programmatic re-fit never lands mid-gesture. */
export function useFitWhenIdle(map: L.Map) {
  const interactingRef = useRef(false);
  useEffect(() => {
    const container = map.getContainer();
    const onStart = () => {
      interactingRef.current = true;
    };
    const onEnd = () => {
      interactingRef.current = false;
    };
    container.addEventListener("touchstart", onStart, { passive: true });
    container.addEventListener("touchend", onEnd, { passive: true });
    container.addEventListener("touchcancel", onEnd, { passive: true });
    container.addEventListener("mousedown", onStart);
    window.addEventListener("mouseup", onEnd);
    return () => {
      container.removeEventListener("touchstart", onStart);
      container.removeEventListener("touchend", onEnd);
      container.removeEventListener("touchcancel", onEnd);
      container.removeEventListener("mousedown", onStart);
      window.removeEventListener("mouseup", onEnd);
    };
  }, [map]);

  /** Returns a cancel function — call it if the caller's own effect
   *  cleans up before `fn` has run, so a stale closure doesn't fire
   *  into an unmounted map. */
  return (fn: () => void): (() => void) => {
    if (!interactingRef.current) {
      fn();
      return () => {};
    }
    const container = map.getContainer();
    const run = () => {
      cancel();
      fn();
    };
    const cancel = () => {
      container.removeEventListener("touchend", run);
      container.removeEventListener("touchcancel", run);
      window.removeEventListener("mouseup", run);
    };
    container.addEventListener("touchend", run, { passive: true });
    container.addEventListener("touchcancel", run, { passive: true });
    window.addEventListener("mouseup", run);
    return cancel;
  };
}

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
  const fitWhenIdle = useFitWhenIdle(map);
  const cancelRef = useRef<(() => void) | null>(null);

  // Callers often pass `bounds`/`padding` as fresh array literals on
  // every render (e.g. `padding={[40, 40]}`). With `refitOnChange`,
  // using those objects directly as effect deps meant the fit re-ran
  // on every unrelated re-render of the parent too — not just when the
  // focus rect actually changed. Concretely: dragging a polygon vertex
  // updates parent state, which re-renders this component with a new
  // `padding` array, which retriggered `fitBounds` and snapped the
  // view straight back to the focus rect on every single drag step.
  // Serializing for the dependency check (while still using the real
  // objects inside the effect) fixes that without callers needing to
  // memoize anything.
  const boundsKey = JSON.stringify(bounds);
  const paddingKey = JSON.stringify(padding);

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
      const t = setTimeout(() => {
        const cancelIdleWait = fitWhenIdle(run);
        cancelRef.current = cancelIdleWait;
      }, delayMs);
      return () => {
        clearTimeout(t);
        cancelRef.current?.();
      };
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey, paddingKey, refitOnChange, animate, delayMs, lockMinZoomToFit]);

  return null;
}
