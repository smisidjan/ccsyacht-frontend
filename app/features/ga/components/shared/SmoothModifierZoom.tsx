"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/** Wheel-to-zoom sensitivity. Multiplies wheel deltaY → zoom-level
 *  delta. Trackpad pinch and mouse scroll both come through here, so
 *  the value is tuned for "fine-grained" rather than "fast". */
const WHEEL_ZOOM_SENSITIVITY = 0.006;

/**
 * Wheel-zoom behaviour shared across every GA viewer. Replaces
 * Leaflet's default `scrollWheelZoom` so plain wheel events bubble up
 * to the surrounding scroller (modal body, page, tab content) and
 * only `Cmd/Ctrl+wheel` zooms — the Figma/Google-Maps interaction
 * model. macOS trackpad pinch-to-zoom dispatches wheel events with
 * `ctrlKey=true`, so it works through the same path. Continuous
 * fractional zoom (anchored to the cursor) gives a smooth feel when
 * paired with `zoomSnap={0}` on the MapContainer.
 *
 * Drop in as a child of any `<MapContainer>` along with
 * `SMOOTH_MAP_DEFAULTS` to wire the rest of the props.
 */
export default function SmoothModifierZoom() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const onWheel = (event: WheelEvent) => {
      const isZoomGesture = event.ctrlKey || event.metaKey;
      if (!isZoomGesture) return; // let it bubble — page/modal scrolls

      event.preventDefault();
      event.stopPropagation();

      const zoomDelta = -event.deltaY * WHEEL_ZOOM_SENSITIVITY;
      const targetZoom = Math.max(
        map.getMinZoom(),
        Math.min(map.getMaxZoom(), map.getZoom() + zoomDelta)
      );
      const rect = container.getBoundingClientRect();
      const cursorPoint = L.point(
        event.clientX - rect.left,
        event.clientY - rect.top
      );
      const cursorLatLng = map.containerPointToLatLng(cursorPoint);
      map.setZoomAround(cursorLatLng, targetZoom, { animate: false });
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [map]);
  return null;
}

/**
 * Touch equivalent of `SmoothModifierZoom`'s modifier rule: a single
 * finger doesn't pan the map, so the surrounding page can still be
 * scrolled through it; two fingers pan/pinch-zoom as normal. Without
 * this, a map that fills (or nearly fills) the viewport claims every
 * single-finger drag for its own panning, and on a touchscreen —
 * unlike a mouse — there's no separate wheel event to fall back to,
 * so there's no way left to scroll the page past it at all.
 *
 * Only touches `map.dragging`, and only in response to touch events —
 * mouse-drag panning (desktop) is untouched. Leaflet's own pinch-zoom
 * handler (`touchZoom`) is a separate handler that doesn't depend on
 * `dragging`, so disabling it here doesn't affect two-finger
 * pinch/pan at all, only whether a *single* finger can start a pan.
 *
 * Registered on the capture phase so it disables dragging before
 * Leaflet's own touchstart handler (which starts single-finger pan
 * tracking) runs for the same event — otherwise Leaflet would already
 * have claimed the gesture by the time we react to it.
 *
 * Drop in as a child of any `<MapContainer>` that's embedded in a
 * scrollable page (the main GA tab, deck/side-profile preview panels)
 * — not needed inside modals with their own bounded canvas, where
 * losing single-finger pan isn't worth the tradeoff. */
export function TouchPanGate() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        map.dragging.disable();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        map.dragging.enable();
      }
    };
    container.addEventListener("touchstart", onTouchStart, {
      passive: true,
      capture: true,
    });
    container.addEventListener("touchend", onTouchEnd, {
      passive: true,
      capture: true,
    });
    container.addEventListener("touchcancel", onTouchEnd, {
      passive: true,
      capture: true,
    });
    return () => {
      container.removeEventListener("touchstart", onTouchStart, {
        capture: true,
      });
      container.removeEventListener("touchend", onTouchEnd, { capture: true });
      container.removeEventListener("touchcancel", onTouchEnd, {
        capture: true,
      });
      map.dragging.enable();
    };
  }, [map]);
  return null;
}

/** Spread onto every `<MapContainer>` paired with
 *  `<SmoothModifierZoom />` so the wheel + zoom behaviour is
 *  consistent. Callers can override individual props as needed. */
export const SMOOTH_MAP_DEFAULTS = {
  /** Off — `SmoothModifierZoom` handles wheel events itself. */
  scrollWheelZoom: false,
  /** Allow fractional zoom levels so the modifier handler can land
   *  on any value smoothly. Toolbar +/- buttons snap to `zoomDelta`. */
  zoomSnap: 0,
  /** Step size for the +/- buttons and arrow-key zoom. */
  zoomDelta: 0.25,
} as const;
