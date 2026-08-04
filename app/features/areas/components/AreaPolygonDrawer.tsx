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
import { getFullImageBounds, useFitWhenIdle } from "@/lib/utils/gaLeaflet";
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
}

/** Fit-to-deck on first mount and on deck switch, but never on parent
 *  re-renders that produce a fresh `DeckBounds` object with the same
 *  values — that would yank the map back and steal the user's pan/zoom
 *  mid-edit. Tracks the bbox values themselves rather than object
 *  identity.
 *
 *  IMPORTANT: this assumes the map's container is already visible
 *  (real, non-zero size) whenever it fires. `fitBounds`/zoom math
 *  against a `display:none` (0×0) container can produce NaN/Infinity
 *  internal state — on a real mobile device this corrupted state
 *  crashed the tab outright once the container later became visible.
 *  Rather than try to detect and repair that after the fact, the
 *  caller (`DefineAreaModal`) only mounts this component once its
 *  pane is actually shown, so a 0×0 fit can't happen in the first
 *  place. Don't reintroduce a hidden-mount path without re-adding that
 *  guarantee.
 *
 *  Mirrors the proven pattern in `GAPreviewMarker`'s `FitToMarker`:
 *  the "flash the full image, then settle on the target" two-step
 *  only runs on the very first fit (so the user sees *something*
 *  immediately instead of a blank/wrong view). Every later switch
 *  (deck ↔ side profile) snaps straight to its target with a single
 *  `fitBounds` call — half the Leaflet work of doing the full-image
 *  detour every time. The pending timer is cancelled via the effect's
 *  own cleanup (return value) — React runs that automatically before
 *  the next fit *and* on unmount, so a superseded or late-arriving fit
 *  never piles work on top of a newer one or calls into an
 *  already-destroyed map. */
function FitToDeck({
  deckBounds,
  imageWidth,
  imageHeight,
}: {
  deckBounds: DeckBounds;
  imageWidth: number;
  imageHeight: number;
}) {
  const map = useMap();
  const lastFitKey = useRef<string>("");
  const fitWhenIdle = useFitWhenIdle(map);
  const cancelIdleWaitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const key = `${deckBounds.x1},${deckBounds.y1},${deckBounds.x2},${deckBounds.y2}`;
    if (lastFitKey.current === key) return;
    const isFirstFit = lastFitKey.current === "";
    lastFitKey.current = key;

    // Relax the floor before any full-image fit — a previous deck may
    // have raised minZoom above the level needed to lay down
    // fullBounds, which would silently clamp the fit.
    map.setMinZoom(-5);
    if (isFirstFit) {
      const full = getFullImageBounds(imageWidth, imageHeight);
      map.fitBounds(full, { padding: [10, 10], animate: false });
    }

    const target = deckBoundsToLeaflet(deckBounds, imageWidth, imageHeight);
    // `fitWhenIdle` guards against the user touching the map
    // (dragging/pinching) inside this deferred window — forcing this
    // view change out from under an in-progress Leaflet gesture
    // corrupted its internal state badly enough to crash the tab
    // outright on iOS Safari, not just interrupt the animation.
    const t = setTimeout(() => {
      cancelIdleWaitRef.current = fitWhenIdle(() => {
        map.invalidateSize();
        map.fitBounds(target, { padding: DECK_FIT_PADDING, animate: false });
        map.setMinZoom(map.getZoom());
      });
    }, isFirstFit ? FIT_DELAY_MS_FAST : FIT_DELAY_MS_SLOW);
    return () => {
      clearTimeout(t);
      cancelIdleWaitRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, deckBounds, imageWidth, imageHeight]);

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
