"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MapContainer, ImageOverlay, Marker, Polygon, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./ga-smooth-zoom.css";
import { useProject } from "@/lib/api";
import { useDecks } from "@/lib/api/decks";
import { useAreas } from "@/lib/api/areas";
import { useGAPins } from "@/lib/api/ga-pins";
import { useGAImage } from "@/lib/hooks/useGAImage";
import { createDonePinIcon } from "./pinIcons";
import { getFixedImageUrl, hasGAImageData } from "@/app/features/ga/utils/helpers";
import { polygonBbox } from "@/lib/utils/geometry";
import { normToLatLng, pctToLatLng } from "@/lib/utils/gaCoordinates";
import { FitBounds, getFullImageBounds } from "@/lib/utils/gaLeaflet";
import type { Area } from "@/lib/api/types";

interface AreaGAPreviewContentProps {
  projectId: string;
  areaId: string;
  /** Color to fill the current area's polygon with — typically the
   *  active stage's color. Null falls back to a neutral blue. */
  activeStageColor: string | null;
  /** Tailwind height utility for the wrapper (e.g. "h-72"). Defaults
   *  to a reasonable embedded size. */
  heightClassName?: string;
  /** The area being shown. When supplied the polygon comes directly
   *  from this prop instead of the internal `useAreas` fetch — keeps
   *  the highlighted outline in sync after the parent's refetch
   *  (otherwise this component holds its own stale copy). */
  area?: Area | null;
  /** When supplied, GA pins linked to this stage are rendered on the
   *  preview as hover-labelled dots. */
  activeStageId?: string;
  /** Re-fetch the pins when this value changes (parent bumps it on
   *  punchlist mutations). */
  refreshTrigger?: number;
}

// Smaller, semi-transparent dot for read-only pin overlays — matches
// the styling used in CreateGAPinModal's GAPreview so the visual
// language is consistent across the two surfaces.
function createPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "custom-pin-marker existing-pin-marker",
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const FALLBACK_COLOR = "#3B82F6";


export default function AreaGAPreviewContent({
  projectId,
  areaId,
  activeStageColor,
  heightClassName = "h-72",
  area: areaProp,
  activeStageId,
  refreshTrigger,
}: AreaGAPreviewContentProps) {
  const tAreas = useTranslations("areas");
  const { data: project } = useProject(projectId);
  const { data: decks } = useDecks(projectId);
  const { data: areas } = useAreas(projectId, undefined);
  const { data: allPins, refetch: refetchPins } = useGAPins(projectId);

  // Refetch when the parent signals a punchlist mutation. Skip the
  // initial render — the hook already fetches on mount.
  useEffect(() => {
    if (refreshTrigger === undefined || refreshTrigger === 0) return;
    refetchPins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const stagePins = useMemo(() => {
    if (!activeStageId) return [];
    return allPins.filter((p) => p.stage.identifier === activeStageId);
  }, [allPins, activeStageId]);

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

  // Resolve the current area + its deck. Prefer the area prop (kept
  // fresh by the parent) over the internal areas fetch — the fetch is
  // cached and won't update when the parent refetches after an edit.
  const currentArea = areaProp ?? areas?.find((a) => a.identifier === areaId);
  const deck = decks?.find(
    (d) => d.identifier === currentArea?.containedInPlace?.identifier
  );

  // Per-view selector: primary deck rectangle first, then each side
  // profile. Default = primary. Hidden when the deck only has one
  // placement.
  type PlacementView = {
    id: string;
    name: string;
    bbox: { x: number; y: number; w: number; h: number };
  };
  const placements = useMemo<PlacementView[]>(() => {
    if (!deck) return [];
    const out: PlacementView[] = [];
    // Polygons live in normalized 0..1; the rest of this file works in
    // percentages 0..100 (legacy bbox scale). Scale through here once so
    // downstream math stays unchanged.
    if (deck.deckPolygon) {
      const bbox = polygonBbox(deck.deckPolygon.points);
      if (bbox) {
        out.push({
          id: deck.deckPolygon.identifier,
          name: tAreas("placementDeckView"),
          bbox: {
            x: bbox.bbox_x * 100,
            y: bbox.bbox_y * 100,
            w: bbox.bbox_width * 100,
            h: bbox.bbox_height * 100,
          },
        });
      }
    }
    for (const sp of deck.sideProfilePolygons ?? []) {
      const bbox = polygonBbox(sp.points);
      if (!bbox) continue;
      out.push({
        id: sp.identifier,
        name: sp.name,
        bbox: {
          x: bbox.bbox_x * 100,
          y: bbox.bbox_y * 100,
          w: bbox.bbox_width * 100,
          h: bbox.bbox_height * 100,
        },
      });
    }
    return out;
  }, [deck, tAreas]);

  const primaryPlacementId = deck?.deckPolygon?.identifier ?? null;

  const [activePlacementId, setActivePlacementId] = useState<string | null>(
    null
  );
  // Keep active pointed at a valid placement — default to primary.
  useEffect(() => {
    if (placements.length === 0) return;
    if (
      !activePlacementId ||
      !placements.some((p) => p.id === activePlacementId)
    ) {
      setActivePlacementId(placements[0].id);
    }
  }, [placements, activePlacementId]);

  const fullBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (!ga?.imageWidth || !ga.imageHeight) return null;
    return getFullImageBounds(ga.imageWidth, ga.imageHeight);
  }, [ga?.imageWidth, ga?.imageHeight]);

  // Bounds for whichever view is active. Falls back to the deck's
  // primary bbox while `activePlacementId` resolves on the first
  // render.
  const viewBounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (!ga?.imageWidth || !ga.imageHeight) return null;
    const placement =
      placements.find((p) => p.id === activePlacementId) ?? placements[0];
    if (!placement) return null;
    const sw = pctToLatLng(
      { x: placement.bbox.x, y: placement.bbox.y },
      ga.imageWidth,
      ga.imageHeight
    );
    const ne = pctToLatLng(
      { x: placement.bbox.x + placement.bbox.w, y: placement.bbox.y + placement.bbox.h },
      ga.imageWidth,
      ga.imageHeight
    );
    return [sw, ne];
  }, [ga?.imageWidth, ga?.imageHeight, placements, activePlacementId]);

  /** Resolve an area's polygon for the active view. Per-placement
   *  `area.polygons` is the source of truth; legacy `area.polygon` is
   *  only used when the active view is the primary deck. Returns
   *  undefined when the area has nothing drawn for this view. */
  const polygonForActiveView = (
    a: Pick<Area, "polygon" | "polygons">
  ) => {
    if (!activePlacementId) return undefined;
    const perPlacement = a.polygons?.find(
      (p) => p.parentPolygonId === activePlacementId
    )?.points;
    if (perPlacement && perPlacement.length >= 3) return perPlacement;
    if (
      activePlacementId === primaryPlacementId &&
      Array.isArray(a.polygon) &&
      a.polygon.length >= 3
    ) {
      return a.polygon;
    }
    return undefined;
  };

  // Other areas on the same deck — drawn dashed gray so the user can see
  // what else is on the deck without them stealing visual attention from
  // the highlighted area. Filtered to those with a polygon on the
  // currently-active view so a side-profile only shows neighbours that
  // were actually drawn on that view.
  const siblingAreas = useMemo(() => {
    if (!areas || !deck) return [];
    return areas
      .filter(
        (a) =>
          a.containedInPlace?.identifier === deck.identifier &&
          a.identifier !== areaId
      )
      .map((a) => ({ area: a, polygon: polygonForActiveView(a) }))
      .filter((entry): entry is { area: Area; polygon: typeof entry.polygon } =>
        !!entry.polygon
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas, deck, areaId, activePlacementId, primaryPlacementId]);

  const currentAreaPolygon = currentArea
    ? polygonForActiveView(currentArea)
    : undefined;

  if (!ga || !ga.imageWidth || !ga.imageHeight || !fullBounds || !viewBounds) {
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
  const isPrimaryView = activePlacementId === primaryPlacementId;

  return (
    <div
      className={`${heightClassName} w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col`}
    >
      {placements.length > 1 && (
        // View switcher: top view + each side profile. Only shown when
        // the deck has more than one placement so the single-view case
        // stays uncluttered.
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {placements.map((p) => {
            const isActive = p.id === activePlacementId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePlacementId(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="relative flex-1 min-h-0">
        <MapContainer
          // `key` forces a fresh map on placement switch so Leaflet
          // re-runs the initial fit instead of holding the old bounds.
          key={activePlacementId ?? "primary"}
          crs={L.CRS.Simple}
          bounds={viewBounds}
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
          {/* Re-fit when the user switches between the deck and a side
              profile. `key` on the parent already re-mounts, but the
              delay + minZoom-lock dance is still needed for the initial
              paint with the wrong container size. */}
          <FitBounds
            bounds={viewBounds}
            padding={[20, 20]}
            delayMs={100}
            lockMinZoomToFit
          />
          <ImageOverlay url={imageBlobUrl} bounds={fullBounds} />

          {siblingAreas.map(({ area: a, polygon }) => {
            const positions: [number, number][] = polygon!.map((p) =>
              normToLatLng(p, ga.imageWidth!, ga.imageHeight!)
            );
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

          {currentAreaPolygon && (
            <Polygon
              positions={currentAreaPolygon.map((p) =>
                normToLatLng(p, ga.imageWidth!, ga.imageHeight!)
              )}
              pathOptions={{
                color: highlightColor,
                weight: 2.5,
                fillColor: highlightColor,
                fillOpacity: 0.45,
                interactive: false,
              }}
            />
          )}

          {/* Pins on the active stage — only rendered on the primary
              top-down view. Pin (x, y) is in top-down coordinates and
              doesn't map to a side-profile view. */}
          {isPrimaryView && stagePins.map((pin) => {
          const position = pctToLatLng(
            { x: pin.x, y: pin.y },
            ga.imageWidth!,
            ga.imageHeight!
          );
          const isDone = pin.punchlistItem?.status === "done";
          return (
            <Marker
              key={pin.identifier}
              position={position}
              icon={
                isDone
                  ? createDonePinIcon(14)
                  : createPinIcon(pin.color || highlightColor)
              }
              interactive={true}
              draggable={false}
            >
              {pin.label && (
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  {pin.label}
                </Tooltip>
              )}
            </Marker>
          );
        })}
        </MapContainer>
      </div>
    </div>
  );
}
