"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, ImageOverlay, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./ga-smooth-zoom.css";
import { useProject } from "@/lib/api";
import { useDecks } from "@/lib/api/decks";
import { useAreas } from "@/lib/api/areas";
import { useGAImage } from "@/lib/hooks/useGAImage";
import { getFixedImageUrl, hasGAImageData } from "@/app/features/ga/utils/helpers";

interface AreaGAPreviewContentProps {
  projectId: string;
  areaId: string;
  /** Color to fill the current area's polygon with — typically the
   *  active stage's color. Null falls back to a neutral blue. */
  activeStageColor: string | null;
  /** Tailwind height utility for the wrapper (e.g. "h-72"). Defaults
   *  to a reasonable embedded size. */
  heightClassName?: string;
}

const FALLBACK_COLOR = "#3B82F6";

// Re-fit to the deck after the container settles. The MapContainer already
// mounts with `bounds={deckBounds}`, but the first paint can land before
// Leaflet has the right container size — invalidateSize + a second fit
// nails the zoom level once the layout has resolved. We pin minZoom to
// that level so the user can't accidentally zoom out past the deck.
function FitToDeck({ deckBounds }: { deckBounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const timer = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(deckBounds, { padding: [20, 20], animate: false });
      map.setMinZoom(map.getZoom());
    }, 100);
    return () => clearTimeout(timer);
  }, [map, deckBounds]);

  return null;
}

export default function AreaGAPreviewContent({
  projectId,
  areaId,
  activeStageColor,
  heightClassName = "h-72",
}: AreaGAPreviewContentProps) {
  const { data: project } = useProject(projectId);
  const { data: decks } = useDecks(projectId);
  const { data: areas } = useAreas(projectId, undefined);

  // Resolve the GA image — `generalArrangement` is either a string (legacy)
  // or an object on the project. We need the object form for dimensions.
  const ga =
    project && typeof project.generalArrangement === "object"
      ? project.generalArrangement
      : null;
  const gaImageUrl =
    ga && hasGAImageData(ga) && ga.imageUrl
      ? getFixedImageUrl(ga.imageUrl)
      : undefined;
  const { imageBlobUrl, isLoading: isImageLoading } = useGAImage(gaImageUrl);

  // Resolve the current area + its deck. Both come back from independent
  // fetches so we tolerate the in-flight gap with a skeleton.
  const currentArea = areas?.find((a) => a.identifier === areaId);
  const deck = decks?.find(
    (d) => d.identifier === currentArea?.containedInPlace?.identifier
  );

  const fullBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (!ga?.imageWidth || !ga.imageHeight) return null;
    return [
      [0, 0],
      [ga.imageHeight, ga.imageWidth],
    ];
  }, [ga?.imageWidth, ga?.imageHeight]);

  const deckBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (!ga?.imageWidth || !ga.imageHeight || !deck?.deckPlacement) return null;
    const { bbox_x, bbox_y, bbox_width, bbox_height } = deck.deckPlacement;
    const x1 = (bbox_x / 100) * ga.imageWidth;
    const y1 = (bbox_y / 100) * ga.imageHeight;
    const x2 = ((bbox_x + bbox_width) / 100) * ga.imageWidth;
    const y2 = ((bbox_y + bbox_height) / 100) * ga.imageHeight;
    return [
      [y1, x1],
      [y2, x2],
    ];
  }, [ga?.imageWidth, ga?.imageHeight, deck?.deckPlacement]);

  // Other areas on the same deck — drawn dashed gray so the user can see
  // what else is on the deck without them stealing visual attention from
  // the highlighted area.
  const siblingAreas = useMemo(() => {
    if (!areas || !deck) return [];
    return areas.filter(
      (a) =>
        a.containedInPlace?.identifier === deck.identifier &&
        a.identifier !== areaId &&
        Array.isArray(a.polygon) &&
        a.polygon.length >= 3
    );
  }, [areas, deck, areaId]);

  if (!ga || !ga.imageWidth || !ga.imageHeight || !fullBounds || !deckBounds) {
    return (
      <div
        className={`${heightClassName} w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse`}
      />
    );
  }

  if (isImageLoading || !imageBlobUrl) {
    return (
      <div
        className={`${heightClassName} w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse`}
      />
    );
  }

  const highlightColor = activeStageColor || FALLBACK_COLOR;

  return (
    <div className={`${heightClassName} w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700`}>
      <MapContainer
        crs={L.CRS.Simple}
        bounds={deckBounds}
        maxBounds={fullBounds}
        maxBoundsViscosity={1.0}
        minZoom={-5}
        maxZoom={4}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        dragging={false}
        keyboard={false}
        className="smooth-zoom-map"
        style={{
          height: "100%",
          width: "100%",
          background: "#f3f4f6",
        }}
      >
        <FitToDeck deckBounds={deckBounds} />
        <ImageOverlay url={imageBlobUrl} bounds={fullBounds} />

        {siblingAreas.map((a) => {
          const positions: [number, number][] = a.polygon!.map((p) => [
            p.y * ga.imageHeight!,
            p.x * ga.imageWidth!,
          ]);
          return (
            <Polygon
              key={`sibling-${a.identifier}`}
              positions={positions}
              pathOptions={{
                color: "#9ca3af",
                weight: 1,
                dashArray: "4 4",
                fillColor: "#9ca3af",
                fillOpacity: 0.1,
                interactive: false,
              }}
            />
          );
        })}

        {currentArea?.polygon && currentArea.polygon.length >= 3 && (
          <Polygon
            positions={currentArea.polygon.map((p) => [
              p.y * ga.imageHeight!,
              p.x * ga.imageWidth!,
            ])}
            pathOptions={{
              color: highlightColor,
              weight: 2.5,
              fillColor: highlightColor,
              fillOpacity: 0.45,
              interactive: false,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
