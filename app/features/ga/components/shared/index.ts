/**
 * GA Shared Components
 * Barrel export for all shared GA UI components
 *
 * Note: Components that use Leaflet (GALeafletContent, GAPreviewMarker,
 * PinMarker, PolygonDrawer) are NOT exported here because Leaflet
 * requires browser APIs. They should only be imported dynamically with
 * { ssr: false }, or rendered as a child of an already-dynamic surface.
 */

export { default as GAViewer } from "./GAViewer";
export { default as GALeafletViewer } from "./GALeafletViewer";
export type { AreaPolygonOverlay, DeckColorPair } from "./GALeafletViewer";
export { default as GAPreview } from "./GAPreview";
export { default as AreaGAPreview } from "./AreaGAPreview";
