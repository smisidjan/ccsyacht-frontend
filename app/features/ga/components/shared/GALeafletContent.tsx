"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MapContainer, ImageOverlay, Polygon, Rectangle, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GAPin, Deck, Area } from "@/lib/api/types";
import type { AreaPolygonOverlay, DeckColorPair } from "./GALeafletViewer";
import { polygonBbox } from "@/lib/utils/geometry";
import {
  normToLatLng,
  pctToLatLng,
  latLngToPct,
} from "@/lib/utils/gaCoordinates";
import { FitBounds, getFullImageBounds, getSafeMaxZoom } from "@/lib/utils/gaLeaflet";
import PinMarker from "./PinMarker";
import SmoothModifierZoom, {
  SMOOTH_MAP_DEFAULTS,
} from "./SmoothModifierZoom";

// Fix Leaflet default marker icon issue in Next.js
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface GALeafletContentProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  pins: GAPin[];
  selectedPinId?: string | null;
  /** Pin ids whose markers should pop in lockstep with the pins-list
   *  hover. A set so a parent row can highlight every child pin. */
  hoveredPinIds?: ReadonlySet<string> | null;
  onPinClick?: (pin: GAPin) => void;
  onPinHover?: (pin: GAPin | null) => void;
  onImageClick?: (x: number, y: number) => void;
  /** Fires when the user clicks an area polygon in edit mode — pin
   *  placement is area-only, so `area` is always set here (never
   *  `null`; the parameter stays optional for API compatibility with
   *  the wider create-pin flow). */
  onDeckClick?: (deck: Deck, x: number, y: number, area?: Area | null) => void;
  canEdit?: boolean;
  decks?: Deck[];
  /** All areas in the project. Used to resolve the full `Area` record
   *  for an edit-mode overlay's click (see `areaPolygons`'s `areaId`). */
  areas?: Area[];
  areaPolygons?: AreaPolygonOverlay[];
  /** Draw deck (+ side profile) outlines even when `canEdit` is off —
   *  a pure display filter independent of edit mode, which always
   *  shows them regardless of this flag. */
  showDecks?: boolean;
  /** Per-deck color pair, keyed by deck id. Falls back to the default
   *  blue/violet when a deck has no entry. */
  deckColors?: Map<string, DeckColorPair>;
  className?: string;
}


// Component to handle map clicks for adding pins
function MapClickHandler({
  imageWidth,
  imageHeight,
  onImageClick,
  canEdit,
}: {
  imageWidth: number;
  imageHeight: number;
  onImageClick?: (x: number, y: number) => void;
  canEdit?: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (!canEdit || !onImageClick) return;
      const { x, y } = latLngToPct(e.latlng, imageWidth, imageHeight);
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        onImageClick(x, y);
      }
    },
  });

  return null;
}

export default function GALeafletContent({
  imageUrl,
  imageWidth,
  imageHeight,
  pins,
  selectedPinId,
  hoveredPinIds,
  onPinClick,
  onPinHover,
  onImageClick,
  onDeckClick,
  canEdit = false,
  decks = [],
  areas = [],
  areaPolygons = [],
  showDecks = false,
  deckColors,
  className = "",
}: GALeafletContentProps) {
  const t = useTranslations("gaViewer");
  const mapRef = useRef<L.Map | null>(null);
  // Decks/side-profiles are visual-only in edit mode (see the rectangle
  // blocks below), so only areas have a hover state to track.
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);

  const bounds = useMemo<L.LatLngBoundsExpression>(
    () => getFullImageBounds(imageWidth, imageHeight),
    [imageWidth, imageHeight]
  );

  const aspectRatio = imageWidth / imageHeight;

  const convertPinToLeaflet = (pin: GAPin): [number, number] =>
    pctToLatLng({ x: pin.x, y: pin.y }, imageWidth, imageHeight);

  // Polygon (normalized 0..1) → Leaflet pixel bounds of its axis-aligned
  // bbox. Decks and side profiles are rendered as rectangles for now
  // even though the polygon may carry more detail.
  const polygonToLeafletBounds = (
    points: { x: number; y: number }[]
  ): L.LatLngBoundsExpression | null => {
    const bbox = polygonBbox(points);
    if (!bbox) return null;
    const x1 = bbox.bbox_x * imageWidth;
    const y1 = bbox.bbox_y * imageHeight;
    const x2 = (bbox.bbox_x + bbox.bbox_width) * imageWidth;
    const y2 = (bbox.bbox_y + bbox.bbox_height) * imageHeight;
    return [
      [y1, x1],
      [y2, x2],
    ];
  };

  // Decks with a primary GA polygon (skip ones still in setup with no polygon).
  const decksWithBounds = decks.filter((d) => d.deckPolygon);

  // Flatten all side-profile polygons across decks so we can render
  // them as clickable additional drop zones. Each entry carries its
  // parent deck so the click handler can fall back to the same
  // `onDeckClick` callback used by the primary polygon.
  const sideProfiles = decks.flatMap((deck) =>
    (deck.sideProfilePolygons ?? []).map((sp) => ({ deck, sideProfile: sp }))
  );

  return (
    <div
      className={`relative ${className}`}
      style={{
        height: "100vh",
        width: `calc(100vh * ${aspectRatio})`,
        maxWidth: "100%",
      }}
    >
      <MapContainer
        ref={mapRef}
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        minZoom={-5}
        maxZoom={getSafeMaxZoom(imageWidth, imageHeight)}
        // Cmd/Ctrl+wheel zoom + bubble plain wheel — see
        // SmoothModifierZoom child below.
        {...SMOOTH_MAP_DEFAULTS}
        doubleClickZoom={true}
        touchZoom={true}
        dragging={true}
        // Off so Leaflet doesn't put tabindex=0 on the container. With the
        // map sized at 100vh, the first click would otherwise focus the
        // container and the browser would scroll it into view — swallowing
        // the click and forcing the user to click a second time.
        keyboard={false}
        attributionControl={false}
        className="w-full rounded-lg"
        style={{
          height: "100%",
          background: "#f3f4f6",
          cursor: canEdit ? "crosshair" : "grab",
        }}
      >
        {/* Fit-to-image on load. `lockMinZoomToFit` prevents the user
            from zooming out beyond the image — the empty canvas around it
            isn't useful. `delayMs` waits for the flex container to settle
            before the second fit. */}
        <FitBounds bounds={bounds} delayMs={100} lockMinZoomToFit />
        <SmoothModifierZoom />

        {/* GA Image as overlay */}
        <ImageOverlay
          url={imageUrl}
          bounds={bounds}
          eventHandlers={{
            error: (e) => console.error("ImageOverlay failed to load:", imageUrl, e),
          }}
        />

        {/* Click handler for adding pins */}
        <MapClickHandler
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          onImageClick={onImageClick}
          canEdit={canEdit}
        />

        {/* Render pins — hidden while placing a new one (`canEdit` here
            means "pin-placement mode is on", see the prop wiring in
            GeneralArrangementTab). Existing pin markers sit in
            Leaflet's markerPane, which paints above the overlayPane
            that decks/areas live in regardless of JSX order, so
            they'd otherwise block hovering/clicking the shape
            underneath them. */}
        {!canEdit &&
          pins.map((pin) => (
            <PinMarker
              key={pin.identifier}
              pin={pin}
              position={convertPinToLeaflet(pin)}
              isSelected={selectedPinId === pin.identifier}
              isHovered={hoveredPinIds?.has(pin.identifier) ?? false}
              onClick={onPinClick}
              onHover={onPinHover}
            />
          ))}

        {/* Deck bounding boxes — visual context, shown whenever edit mode
            or the "Deck outlines" filter is on. Pin placement is
            area-only (see the area overlay block below): a spot inside
            a deck but outside every area isn't a valid target, so the
            rectangle never hover-highlights or reacts to clicks in edit
            mode — it just shows where the deck is. Outside edit mode a
            hover tooltip gives on-demand name lookup too. Each deck
            gets its own color (falls back to the default blue) so it
            matches its entry in the "Decks" legend. */}
        {(canEdit || showDecks) && decksWithBounds.map((deck) => {
          const deckBounds = polygonToLeafletBounds(deck.deckPolygon!.points);
          if (!deckBounds) return null;
          const color = deckColors?.get(deck.identifier)?.deck ?? "#3B82F6";

          return (
            <Rectangle
              key={deck.identifier}
              bounds={deckBounds}
              pathOptions={{
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.1,
                dashArray: "5, 5",
              }}
              interactive={!canEdit}
            >
              {!canEdit && (
                <Tooltip sticky direction="top">
                  {t("deckTooltipLabel", { name: deck.name })}
                </Tooltip>
              )}
            </Rectangle>
          );
        })}

        {/* Side-profile rectangles — same treatment as the primary deck
            rectangle above, using the paired violet shade from
            `deckColors` so a deck and its side profile read as
            belonging together. */}
        {(canEdit || showDecks) && sideProfiles.map(({ deck, sideProfile }) => {
          const bounds = polygonToLeafletBounds(sideProfile.points);
          if (!bounds) return null;
          const color = deckColors?.get(deck.identifier)?.sideProfile ?? "#8B5CF6";

          return (
            <Rectangle
              key={`side-${sideProfile.identifier}`}
              bounds={bounds}
              pathOptions={{
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.1,
                dashArray: "5, 5",
              }}
              interactive={!canEdit}
            >
              {!canEdit && (
                <Tooltip sticky direction="top">
                  {t("sideProfileTooltipLabel", { name: sideProfile.name })}
                </Tooltip>
              )}
            </Rectangle>
          );
        })}

        {/* Area polygon overlays — rendered after decks/side-profiles so
            they sit on top and can actually receive clicks/hovers in
            edit mode (Leaflet resolves overlapping shapes to whichever
            is topmost in paint order, i.e. last in this JSX — areas are
            usually nested inside a deck's rectangle, so they'd never
            get a hover/click otherwise). Coords are 0..1 normalized →
            pixels for Leaflet's lat/lng.
            Edit-mode overlays carry `areaId`/`deckId` (see
            `GeneralArrangementTab`'s `editModeAreaPolygons`) so the
            click resolves straight back to the source records — no
            point-in-polygon hit-test needed, we already know exactly
            which area's shape was clicked. Non-edit overlays (the
            "Show active stages" visualization) keep the old
            hover-tooltip-only behaviour. */}
        {areaPolygons.map((area) => {
          if (!area.polygon || area.polygon.length < 3) return null;
          const positions: [number, number][] = area.polygon.map((p) =>
            normToLatLng(p, imageWidth, imageHeight)
          );
          const isEditTarget = canEdit && !!area.areaId && !!area.deckId;
          const isHovered = isEditTarget && hoveredAreaId === area.areaId;

          return (
            <Polygon
              key={`area-poly-${area.id}`}
              positions={positions}
              pathOptions={{
                color: area.color,
                weight: isEditTarget ? (isHovered ? 3 : 2) : 2,
                fillColor: area.color,
                fillOpacity: isEditTarget ? (isHovered ? 0.45 : 0.2) : 0.4,
                dashArray: isEditTarget && !isHovered ? "5, 5" : undefined,
              }}
              interactive={!canEdit || isEditTarget}
              eventHandlers={
                isEditTarget
                  ? {
                      mouseover: () => setHoveredAreaId(area.areaId!),
                      mouseout: () => setHoveredAreaId(null),
                      click: (e) => {
                        L.DomEvent.stopPropagation(e.originalEvent);
                        if (!onDeckClick) return;
                        const deck = decks.find(
                          (d) => d.identifier === area.deckId
                        );
                        if (!deck) return;
                        const fullArea =
                          areas.find((a) => a.identifier === area.areaId) ??
                          null;
                        const pct = latLngToPct(
                          e.latlng,
                          imageWidth,
                          imageHeight
                        );
                        onDeckClick(deck, pct.x, pct.y, fullArea);
                      },
                    }
                  : undefined
              }
            >
              {!canEdit && (
                <Tooltip sticky direction="top">
                  {t("areaTooltipLabel", { name: area.name })}
                </Tooltip>
              )}
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Area hover tooltip — decks are visual-only now (see the
          rectangles above), so this only ever fires for an area. */}
      {canEdit && hoveredAreaId && (() => {
        const hoveredName = areaPolygons.find(
          (a) => a.areaId === hoveredAreaId
        )?.name;
        if (!hoveredName) return null;
        return (
          <div className="absolute top-4 left-4 z-[1000] text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none bg-emerald-600">
            {t("addPinIn", { name: hoveredName })}
          </div>
        );
      })()}

      {/* Zoom controls info */}
      <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-lg text-xs text-gray-600 dark:text-gray-400 pointer-events-none">
        <span className="hidden sm:inline">Scroll to zoom | Drag to pan</span>
        <span className="sm:hidden">Pinch to zoom</span>
      </div>
    </div>
  );
}
