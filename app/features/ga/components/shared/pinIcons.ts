import L from "leaflet";

/** Marker icon for pins whose punchlist item is in the "done" state.
 *  Rendered as a green circle with a white checkmark inside so it
 *  shares the dot shape of the other pins but reads as completed at
 *  a glance.
 *
 *  Used in three surfaces (the GA tab, the create/edit pin modal, the
 *  area-detail header preview) — change here once, applies everywhere. */
export function createDonePinIcon(
  size: number,
  options: { emphasised?: boolean } = {}
): L.DivIcon {
  const { emphasised = false } = options;
  const borderWidth = size >= 20 ? 3 : 2;
  // Checkmark fills ~55% of the circle — leaves enough green ring
  // around it that the shape still reads as "pin".
  const tickSize = Math.max(8, Math.round(size * 0.55));

  return L.divIcon({
    className: "custom-pin-marker custom-pin-marker--done",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: #10B981;
        border: ${borderWidth}px solid white;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease;
        ${emphasised ? "transform: scale(1.15);" : ""}
      ">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="width: ${tickSize}px; height: ${tickSize}px;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}
