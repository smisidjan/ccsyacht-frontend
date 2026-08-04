"use client";

import { useEffect, useMemo, useRef } from "react";
import { Polygon, Rectangle, CircleMarker, useMap } from "react-leaflet";
import type { AreaPolygonPoint, DeckBounds } from "@/lib/api/types";
import { isInsidePolygon } from "@/lib/utils/geometry";
import {
  deckBoundsToLeaflet,
  isPointInsideDeckBounds,
  normToLatLng,
  normToPct,
} from "@/lib/utils/gaCoordinates";
import { getFullImageBounds } from "@/lib/utils/gaLeaflet";
import PolygonDrawer, {
  type VertexValidator,
} from "@/app/features/ga/components/shared/PolygonDrawer";

const FIT_DELAY_MS_FAST = 100;
const FIT_DELAY_MS_SLOW = 300;
const DECK_FIT_PADDING: [number, number] = [20, 20];
const MIN_VERTICES = 3;

interface ExistingArea {
  id: string;
  name: string;
  polygon: AreaPolygonPoint[];
}

/** A GA pin already placed inside the area being edited. The polygon
 *  must keep containing every one — moving an edge past a pin would
 *  orphan it (the pin still belongs to this area on the server, but
 *  visually lives outside the new outline). */
interface ExistingPin {
  id: string;
  label: string | null;
  point: AreaPolygonPoint;
}

interface AreaPolygonDrawerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  /** Deck region the user is allowed to draw inside (percentage 0..100).
   *  When omitted the full GA is shown and the user can draw anywhere. */
  deckBounds?: DeckBounds | null;
  /** Stroke/fill color for the `deckBounds` outline — the same per-deck
   *  or per-side-profile shade shown on the GA tab, so the view the
   *  user is drawing on is clearly identifiable instead of a generic
   *  gray box. Falls back to gray when not supplied. */
  deckOutlineColor?: string;
  /** Other areas in the same deck — rendered as faded outlines so the
   *  user can see them, and used to reject vertices that would land
   *  inside one. */
  existingAreas?: ExistingArea[];
  /** GA pins already placed inside the area being edited. Rendered on
   *  the canvas; the polygon must keep enclosing each of them. */
  existingPins?: ExistingPin[];
  /** Current polygon (normalized 0..1). */
  polygon: AreaPolygonPoint[];
  isClosed: boolean;
  onChange: (polygon: AreaPolygonPoint[], isClosed: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onReset: () => void;
  /** Whether the drawer's container is actually visible right now.
   *  Defaults to `true` — callers that never hide this component (e.g.
   *  a fixed-layout viewer) don't need to think about it. The
   *  area-creation modal's mobile tab switcher passes `false` while
   *  its "GA" pane is behind a `display:none` tab, so `FitToDeck` can
   *  redo the deck fit once it becomes visible again — see the
   *  `FitToDeck` doc comment for why. */
  isVisible?: boolean;
}

/** Fit-to-deck on first mount and on deck switch, but never on parent
 *  re-renders that produce a fresh `DeckBounds` object with the same
 *  values — that would yank the map back and steal the user's pan/zoom
 *  mid-edit. Tracks the bbox values themselves rather than object
 *  identity.
 *
 *  `visible` additionally covers the area-creation modal's mobile tab
 *  switcher: on mobile the map mounts as soon as a deck is picked on
 *  the "Details" tab, while the "GA" pane still sits behind a
 *  `display:none` tab. Leaflet measures a 0×0 container at that point
 *  and never re-checks on its own, so switching back to the GA tab
 *  flips the CSS but leaves the fit wrong. Re-running the fit once
 *  `visible` flips true fixes it without polling the DOM (a
 *  ResizeObserver here previously caused a resize/measure loop that
 *  crashed the tab on a real device — this is deliberately just a
 *  plain effect on a boolean prop instead). */
function FitToDeck({
  deckBounds,
  imageWidth,
  imageHeight,
  visible,
}: {
  deckBounds: DeckBounds;
  imageWidth: number;
  imageHeight: number;
  visible: boolean;
}) {
  const map = useMap();
  const lastFitKey = useRef<string>("");
  const wasVisible = useRef(visible);
  // The delayed half of `runFit` fires via `setTimeout` — if the user
  // switches placements/tabs again before it fires (or closes the
  // modal), an uncancelled timeout either piles up redundant
  // invalidateSize/fitBounds work on top of the newer fit (the
  // "breaks on fast switching, costs a lot of energy" symptom) or
  // calls into a Leaflet map that's already been torn down. Track the
  // pending one so a fresh call — or unmount — cancels it first.
  const pendingFitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `forceInvalidate` is only for the visibility-transition path below
  // — the container was genuinely hidden (0×0) so Leaflet's cached
  // size needs an immediate refresh before the first `fitBounds` call.
  // The regular deck-switch path never needs it (the container was
  // already visible and correctly sized); adding it there too made
  // every placement switch call `invalidateSize()` synchronously,
  // which crashed the tab on a real device.
  const runFit = (fast: boolean, forceInvalidate: boolean) => {
    if (pendingFitRef.current) {
      clearTimeout(pendingFitRef.current);
      pendingFitRef.current = null;
    }
    // Relax the floor before the intermediate full-GA fit — a previous
    // deck may have raised minZoom above the level needed to lay down
    // fullBounds, which would silently clamp the fit.
    map.setMinZoom(-5);
    const full = getFullImageBounds(imageWidth, imageHeight);
    const target = deckBoundsToLeaflet(deckBounds, imageWidth, imageHeight);
    if (forceInvalidate) map.invalidateSize();
    map.fitBounds(full, { padding: [10, 10], animate: false });
    pendingFitRef.current = setTimeout(() => {
      pendingFitRef.current = null;
      map.invalidateSize();
      map.fitBounds(target, { padding: DECK_FIT_PADDING, animate: false });
      map.setMinZoom(map.getZoom());
    }, fast ? FIT_DELAY_MS_FAST : FIT_DELAY_MS_SLOW);
  };

  useEffect(() => {
    const key = `${deckBounds.x1},${deckBounds.y1},${deckBounds.x2},${deckBounds.y2}`;
    if (lastFitKey.current === key) return;
    const isFirstFit = lastFitKey.current === "";
    lastFitKey.current = key;
    runFit(isFirstFit, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, deckBounds, imageWidth, imageHeight]);

  useEffect(() => {
    const becameVisible = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (!becameVisible) return;
    runFit(true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    return () => {
      if (pendingFitRef.current) clearTimeout(pendingFitRef.current);
    };
  }, []);

  return null;
}

export default function AreaPolygonDrawer({
  imageUrl,
  imageWidth,
  imageHeight,
  deckBounds,
  deckOutlineColor,
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
  isVisible = true,
}: AreaPolygonDrawerProps) {
  // Area-specific validation: must stay inside the deck rectangle, must
  // not land inside another area. The generic drawer treats this as an
  // opaque gate; reasons aren't surfaced (silently dropped), matching
  // the original UX.
  const validateVertex = useMemo<VertexValidator>(
    () => (point) => {
      if (deckBounds) {
        const pct = normToPct(point);
        if (!isPointInsideDeckBounds(pct, deckBounds)) return false;
      }
      if (existingAreas && existingAreas.length > 0) {
        for (const a of existingAreas) {
          if (isInsidePolygon(point, a.polygon)) return false;
        }
      }
      return true;
    },
    [deckBounds, existingAreas]
  );

  const deckRect = deckBounds
    ? deckBoundsToLeaflet(deckBounds, imageWidth, imageHeight)
    : null;

  // Pins turn red when the active polygon no longer contains them —
  // visual-only feedback; the polygon can still be saved (parent handles
  // the actual block). We need the *displayed* polygon (committed +
  // drag preview) for an accurate check, but the drag preview lives
  // inside PolygonDrawer. The committed polygon is close enough — the
  // red flash on mouseup is the desired feedback anyway.
  const pinOverlays = (
    <>
      {existingPins?.map((pin) => {
        const outside =
          polygon.length >= MIN_VERTICES && !isInsidePolygon(pin.point, polygon);
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
    </>
  );

  return (
    <PolygonDrawer
      imageUrl={imageUrl}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      polygon={polygon}
      isClosed={isClosed}
      onChange={onChange}
      onUndo={onUndo}
      onRedo={onRedo}
      canUndo={canUndo}
      canRedo={canRedo}
      onReset={onReset}
      validateVertex={validateVertex}
      fitter={
        deckBounds ? (
          <FitToDeck
            deckBounds={deckBounds}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            visible={isVisible}
          />
        ) : undefined
      }
    >
      {/* Deck boundary the user must stay inside. Colored to match the
          same deck/side-profile shade used on the GA tab (falls back to
          gray when the caller hasn't resolved one yet) so the active
          view reads clearly instead of a faint generic box. */}
      {deckRect && (
        <Rectangle
          bounds={deckRect}
          pathOptions={{
            color: deckOutlineColor ?? "#9ca3af",
            weight: 2,
            fillColor: deckOutlineColor ?? "#9ca3af",
            fillOpacity: 0.1,
            dashArray: "5, 5",
            interactive: false,
          }}
        />
      )}

      {/* Faded outlines for neighbour areas. Renders before the active
          polygon so it stays underneath. */}
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

      {pinOverlays}
    </PolygonDrawer>
  );
}
