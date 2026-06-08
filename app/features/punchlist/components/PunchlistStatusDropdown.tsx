"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import type {
  PunchlistItemStatus,
  StageStatus,
} from "@/lib/api/types";

interface PunchlistStatusDropdownProps {
  status: PunchlistItemStatus;
  stageStatus?: StageStatus;
  canEdit: boolean;
  size?: "sm" | "md";
  onChange: (next: PunchlistItemStatus) => void;
  /** Cancel needs a reason — the caller owns the modal that collects
   *  it, the dropdown just signals intent. */
  onRequestCancel: () => void;
}

const statusChipColors: Record<PunchlistItemStatus, string> = {
  open: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  in_progress:
    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  done: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  cancelled:
    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

// Valid transitions per current status. Cancellation is reached via
// the More-actions menu in the detail panel (it needs a reason +
// confirmation), not the workflow dropdown — keeping it out here
// prevents the user from accidentally killing an item with one click.
//
// Backward transitions are intentionally allowed (re-opening a done
// item, dropping an in-progress item back to open) — the workflow is
// a graph, not a one-way ratchet, and users routinely correct
// mis-clicks.
const ALLOWED_NEXT: Record<PunchlistItemStatus, PunchlistItemStatus[]> = {
  open: ["in_progress"],
  in_progress: ["open", "done"],
  done: ["in_progress"],
  cancelled: [],
};

/** Compact dropdown for a punchlist item's status. Reads as a chip
 *  in the locked state (terminal / no permission / stage not in
 *  progress); becomes a clickable popover otherwise so the user can
 *  step through the workflow in one place — mirrors Jira's status
 *  dropdown both in the row and the detail panel. */
export default function PunchlistStatusDropdown({
  status,
  stageStatus,
  canEdit,
  size = "sm",
  onChange,
  onRequestCancel,
}: PunchlistStatusDropdownProps) {
  const t = useTranslations("punchlist");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Dismiss on outside-click and on Esc. Trivial popover so we don't
  // pull a portal-based menu library in just for this one surface.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const statusLabel = (s: PunchlistItemStatus) =>
    t(
      `status${s
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("")}`
    );

  const allowed = ALLOWED_NEXT[status];
  // Stage must be in progress for the user to drive punchlist work
  // forward — once the stage is signed off the items freeze too.
  const stageAllowsEdits = !stageStatus || stageStatus === "in_progress";
  const canChange = canEdit && stageAllowsEdits && allowed.length > 0;

  const paddingClass = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const textClass = size === "md" ? "text-xs" : "text-[11px]";

  // Locked state — just the chip, nothing clickable.
  if (!canChange) {
    return (
      <span
        className={`inline-block rounded font-medium ${paddingClass} ${textClass} ${statusChipColors[status]}`}
      >
        {statusLabel(status)}
      </span>
    );
  }

  return (
    // `inline-block` so the wrapper hugs the chip — otherwise the
    // popover would align to the parent cell's edge instead of the
    // trigger itself.
    <div className="relative inline-block" ref={wrapperRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`inline-flex items-center gap-1 rounded font-medium transition-opacity hover:opacity-80 ${paddingClass} ${textClass} ${statusChipColors[status]}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{statusLabel(status)}</span>
        <ChevronDownIcon className="w-3 h-3" aria-hidden="true" />
      </button>
      {open && (
        <div
          className="absolute left-0 mt-1 z-30 min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
          role="menu"
        >
          <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">
            {t("statusMoveTo")}
          </p>
          {allowed.map((next) => (
            <button
              key={next}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (next === "cancelled") {
                  onRequestCancel();
                } else {
                  onChange(next);
                }
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
              role="menuitem"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${statusDotClass(
                    next
                  )}`}
                  aria-hidden="true"
                />
                <span className="text-gray-900 dark:text-white">
                  {statusLabel(next)}
                </span>
              </span>
              {next === status && (
                <CheckIcon className="w-3.5 h-3.5 text-gray-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const statusDotClass = (s: PunchlistItemStatus): string => {
  switch (s) {
    case "open":
      return "bg-gray-400";
    case "in_progress":
      return "bg-blue-500";
    case "done":
      return "bg-green-500";
    case "cancelled":
      return "bg-red-500";
  }
};
