"use client";

import { useMemo, useRef, useState } from "react";
import { MapContainer, ImageOverlay, Polygon, Rectangle, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GAPin, Deck, Area } from "@/lib/api/types";
import type { AreaPolygonOverlay } from "./GALeafletViewer";
import { isInsidePolygon, polygonBbox } from "@/lib/utils/geometry";
import {
  normToLatLng,
  pctToLatLng,
  latLngToPct,
  pctToNorm,
} from "@/lib/utils/gaCoordinates";
import { FitBounds, getFullImageBounds } from "@/lib/utils/gaLeaflet";
import PinMarker from "./PinMarker";

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
  hoveredPinId?: string | null;
  onPinClick?: (pin: GAPin) => void;
  onPinHover?: (pin: GAPin | null) => void;
  onImageClick?: (x: number, y: number) => void;
  /** Fires when the user clicks inside a deck rectangle in edit mode. The
   *  `area` is set when the click landed inside one of that deck's area
   *  polygons (used to pre-select the area in the create-pin modal). */
  onDeckClick?: (deck: Deck, x: number, y: number, area?: Area | null) => void;
  canEdit?: boolean;
  decks?: Deck[];
  /** All areas in the project. Used for point-in-polygon hit-testing in
   *  the deck-rectangle click handler — independent from `areaPolygons`,
   *  which is just the active-stages visualization overlay. */
  areas?: Area[];
  areaPolygons?: AreaPolygonOverlay[];
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
  hoveredPinId,
  onPinClick,
  onPinHover,
  onImageClick,
  onDeckClick,
  canEdit = false,
  decks = [],
  areas = [],
  areaPolygons = [],
  className = "",
}: GALeafletContentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [hoveredDeckId, setHoveredDeckId] = useState<string | null>(null);

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
        maxZoom={4}
        zoomSnap={0.25}
        zoomDelta={0.5}
        scrollWheelZoom={true}
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

        {/* Area polygon overlays — rendered below pins so markers stay on top.
            Coords are 0..1 normalized → pixels for Leaflet's lat/lng. The
            stroke + fill use the pre-computed color (typically the area's
            active stage color). */}
        {areaPolygons.map((area) => {
          if (!area.polygon || area.polygon.length < 3) return null;
          const positions: [number, number][] = area.polygon.map((p) =>
            normToLatLng(p, imageWidth, imageHeight)
          );
          return (
            <Polygon
              key={`area-poly-${area.id}`}
              positions={positions}
              pathOptions={{
                color: area.color,
                weight: 2,
                fillColor: area.color,
                fillOpacity: 0.4,
              }}
              // In edit mode the deck rectangle owns the click — the
              // hit-test below resolves which area was clicked. Letting
              // the overlay capture clicks would swallow them and break
              // pin placement when the active-stages overlay is on.
              interactive={!canEdit}
            >
              {!canEdit && (
                <Tooltip sticky direction="top">
                  {area.name}
                </Tooltip>
              )}
            </Polygon>
          );
        })}

        {/* Render pins */}
        {pins.map((pin) => (
          <PinMarker
            key={pin.identifier}
            pin={pin}
            position={convertPinToLeaflet(pin)}
            isSelected={selectedPinId === pin.identifier}
            isHovered={hoveredPinId === pin.identifier}
            onClick={onPinClick}
            onHover={onPinHover}
          />
        ))}

        {/* Render deck bounding boxes on hover when in edit mode */}
        {canEdit && decksWithBounds.map((deck) => {
          const deckBounds = polygonToLeafletBounds(deck.deckPolygon!.points);
          if (!deckBounds) return null;
          const isHovered = hoveredDeckId === deck.identifier;

          return (
            <Rectangle
              key={deck.identifier}
              bounds={deckBounds}
              pathOptions={{
                color: "#3B82F6",
                weight: isHovered ? 3 : 2,
                fillColor: "#3B82F6",
                fillOpacity: isHovered ? 0.3 : 0.1,
                dashArray: isHovered ? undefined : "5, 5",
              }}
              eventHandlers={{
                mouseover: () => setHoveredDeckId(deck.identifier),
                mouseout: () => setHoveredDeckId(null),
                click: (e) => {
                  L.DomEvent.stopPropagation(e.originalEvent);
                  if (!onDeckClick) return;
                  const pct = latLngToPct(e.latlng, imageWidth, imageHeight);
                  const normalized = pctToNorm(pct);
                  const hitArea =
                    areas.find(
                      (a) =>
                        a.containedInPlace?.identifier === deck.identifier &&
                        a.polygon &&
                        isInsidePolygon(normalized, a.polygon)
                    ) ?? null;
                  onDeckClick(deck, pct.x, pct.y, hitArea);
                },
              }}
            />
          );
        })}

        {/* Render side-profile rectangles. Same click semantics as the
            primary deck rectangle — drops the user into create-pin
            scoped to that deck. Side profiles typically sit outside
            any area polygon, so the hit-test will usually return
            `null` and the area stays unselected. Purple matches the
            convention from CreateDeckModal so the two markers read
            as different kinds of placement at a glance. */}
        {canEdit && sideProfiles.map(({ deck, sideProfile }) => {
          const bounds = polygonToLeafletBounds(sideProfile.points);
          if (!bounds) return null;
          const isHovered = hoveredDeckId === deck.identifier;

          return (
            <Rectangle
              key={`side-${sideProfile.identifier}`}
              bounds={bounds}
              pathOptions={{
                color: "#8B5CF6",
                weight: isHovered ? 3 : 2,
                fillColor: "#8B5CF6",
                fillOpacity: isHovered ? 0.3 : 0.1,
                dashArray: isHovered ? undefined : "5, 5",
              }}
              eventHandlers={{
                mouseover: () => setHoveredDeckId(deck.identifier),
                mouseout: () => setHoveredDeckId(null),
                click: (e) => {
                  L.DomEvent.stopPropagation(e.originalEvent);
                  if (!onDeckClick) return;
                  const pct = latLngToPct(e.latlng, imageWidth, imageHeight);
                  const normalized = pctToNorm(pct);
                  const hitArea =
                    areas.find(
                      (a) =>
                        a.containedInPlace?.identifier === deck.identifier &&
                        a.polygon &&
                        isInsidePolygon(normalized, a.polygon)
                    ) ?? null;
                  onDeckClick(deck, pct.x, pct.y, hitArea);
                },
              }}
            />
          );
        })}
      </MapContainer>

      {/* Deck hover tooltip */}
      {canEdit && hoveredDeckId && (
        <div className="absolute top-4 left-4 z-[1000] bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none">
          Add pin in {decks.find(d => d.identifier === hoveredDeckId)?.name}
        </div>
      )}

      {/* Zoom controls info */}
      <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-lg shadow-lg text-xs text-gray-600 dark:text-gray-400 pointer-events-none">
        <span className="hidden sm:inline">Scroll to zoom | Drag to pan</span>
        <span className="sm:hidden">Pinch to zoom</span>
      </div>
    </div>
  );
}
