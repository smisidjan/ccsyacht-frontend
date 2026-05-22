"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { PunchlistItemPriority } from "@/lib/api/types";

interface PunchlistPriorityDropdownProps {
  priority: PunchlistItemPriority;
  canEdit: boolean;
  size?: "sm" | "md";
  onChange: (next: PunchlistItemPriority) => void;
}

const priorityChipColors: Record<PunchlistItemPriority, string> = {
  low: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  medium: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  high: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const PRIORITY_OPTIONS: PunchlistItemPriority[] = ["high", "medium", "low"];

const priorityDotClass = (p: PunchlistItemPriority): string => {
  switch (p) {
    case "high":
      return "bg-red-500";
    case "medium":
      return "bg-blue-500";
    case "low":
      return "bg-gray-400";
  }
};

/** Mirrors the status dropdown — same chip + chevron + popover
 *  pattern, but for an item's priority. Locked state (no permission)
 *  renders as a static pill; editable state opens a small menu with
 *  high / medium / low. */
export default function PunchlistPriorityDropdown({
  priority,
  canEdit,
  size = "sm",
  onChange,
}: PunchlistPriorityDropdownProps) {
  const t = useTranslations("punchlist");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

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

  const priorityLabel = (p: PunchlistItemPriority) =>
    t(`priority${p.charAt(0).toUpperCase()}${p.slice(1)}`);

  const paddingClass = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
  const textClass = size === "md" ? "text-xs" : "text-[11px]";

  if (!canEdit) {
    return (
      <span
        className={`inline-block rounded font-medium ${paddingClass} ${textClass} ${priorityChipColors[priority]}`}
      >
        {priorityLabel(priority)}
      </span>
    );
  }

  return (
    // `inline-block` so the wrapper hugs the chip — otherwise `right-0`
    // on the popover would align to the parent cell's right edge
    // (which is wider than the chip in the detail panel), causing the
    // menu to float far to the right of the trigger.
    <div className="relative inline-block" ref={wrapperRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`inline-flex items-center gap-1 rounded font-medium transition-opacity hover:opacity-80 ${paddingClass} ${textClass} ${priorityChipColors[priority]}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{priorityLabel(priority)}</span>
        <ChevronDownIcon className="w-3 h-3" aria-hidden="true" />
      </button>
      {open && (
        <div
          className="absolute left-0 mt-1 z-30 min-w-[140px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
          role="menu"
        >
          <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">
            {t("priorityChangeTo")}
          </p>
          {PRIORITY_OPTIONS.map((next) => (
            <button
              key={next}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (next !== priority) onChange(next);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
              role="menuitem"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${priorityDotClass(
                    next
                  )}`}
                  aria-hidden="true"
                />
                <span className="text-gray-900 dark:text-white">
                  {priorityLabel(next)}
                </span>
              </span>
              {next === priority && (
                <CheckIcon className="w-3.5 h-3.5 text-gray-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
