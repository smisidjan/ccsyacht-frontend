"use client";

import { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { GAPin, StageStatus } from "@/lib/api/types";
import { createDonePinIcon, createHighPriorityPinIcon } from "./pinIcons";

interface PinMarkerProps {
  pin: GAPin;
  position: [number, number]; // [lat, lng] / [y, x]
  isSelected?: boolean;
  /** Visually emphasised when the matching table row is being hovered
   *  on the right-hand pin list. Scales the dot the same way the
   *  selected state does so the two surfaces stay in sync. */
  isHovered?: boolean;
  onClick?: (pin: GAPin) => void;
  /** Fired with the pin on mouseover and `null` on mouseout, so the
   *  parent table can highlight the matching row. */
  onHover?: (pin: GAPin | null) => void;
}

// Status colors matching existing design
const STATUS_COLORS: Record<StageStatus, string> = {
  not_started: "#6B7280", // gray-500
  in_progress: "#3B82F6", // blue-500
  pending_signoff: "#F59E0B", // amber-500
  completed: "#10B981", // green-500
  rejected: "#EF4444", // red-500
};

// Create custom SVG marker icon. Sized to match the smaller dots used
// on the area-detail GA preview / inside the create-pin modal so the
// visual language stays consistent across surfaces.
function createPinIcon(color: string, isEmphasised: boolean): L.DivIcon {
  const size = isEmphasised ? 22 : 16;
  const borderWidth = isEmphasised ? 3 : 2;

  return L.divIcon({
    className: "custom-pin-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: ${borderWidth}px solid white;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.15s ease;
        ${isEmphasised ? "transform: scale(1.1);" : ""}
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

export default function PinMarker({
  pin,
  position,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
}: PinMarkerProps) {
  // Use pin color or fall back to status color
  const pinColor = useMemo(() => {
    if (pin.color) return pin.color;
    return STATUS_COLORS[pin.stage.status] || STATUS_COLORS.not_started;
  }, [pin.color, pin.stage.status]);

  // Selected and hovered share the same "emphasised" look — they're
  // never both meaningfully active at once and the visual cue is the
  // same in either case.
  const isEmphasised = isSelected || isHovered;
  const isDone = pin.punchlistItem?.status === "done";
  // High-priority gets a white `!` inside the dot. Done wins when
  // both apply — a finished item shouldn't still scream for triage.
  const isHighPriority =
    !isDone && pin.punchlistItem?.priority === "high";

  const icon = useMemo(() => {
    const size = isEmphasised ? 22 : 16;
    if (isDone) {
      return createDonePinIcon(size, { emphasised: isEmphasised });
    }
    if (isHighPriority) {
      return createHighPriorityPinIcon(size, pinColor, {
        emphasised: isEmphasised,
      });
    }
    return createPinIcon(pinColor, isEmphasised);
  }, [pinColor, isEmphasised, isDone, isHighPriority]);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(pin),
        mouseover: () => onHover?.(pin),
        mouseout: () => onHover?.(null),
      }}
    >
      {/* Hover summary — replaces the click popup so the user can scan
          pins without committing a click. Detail / actions still live
          in the right-hand panel (opened on click). */}
      <Tooltip
        direction="top"
        offset={[0, -8]}
        opacity={1}
        sticky={false}
      >
        <div className="min-w-[200px] p-1">
          {/* Location info — pin label is shown lower down as the
              punchlist item's name, so we skip a separate top title to
              keep the tooltip compact. */}
          <div className="text-xs text-gray-600 space-y-1 mb-3">
            <p>
              <span className="font-medium">Deck:</span> {pin.deck.name}
            </p>
            <p>
              <span className="font-medium">Area:</span> {pin.area.name}
            </p>
            <p>
              <span className="font-medium">Stage:</span> {pin.stage.name}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {pin.stage.remarksCount > 0 && (
              <span>{pin.stage.remarksCount} remarks</span>
            )}
            {pin.stage.punchlistItemsCount > 0 && (
              <span>{pin.stage.punchlistItemsCount} punchlist items</span>
            )}
          </div>

          {/* Punchlist item + its single status badge — stage status
              was redundant noise on top of this one. */}
          {pin.punchlistItem && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700">
                Punchlist: {pin.punchlistItem.name}
              </p>
              {pin.punchlistItem.description && (
                <p className="mt-1 text-xs text-gray-600 whitespace-normal max-w-[260px]">
                  {pin.punchlistItem.description}
                </p>
              )}
              <span
                className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  pin.punchlistItem.status === "done"
                    ? "bg-green-100 text-green-700"
                    : pin.punchlistItem.status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : pin.punchlistItem.status === "cancelled"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-amber-100 text-amber-700"
                }`}
              >
                {pin.punchlistItem.status.replace("_", " ")}
              </span>
            </div>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
}
