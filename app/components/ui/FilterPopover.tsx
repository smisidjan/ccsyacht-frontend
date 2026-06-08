"use client";

import { useEffect, useRef, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

/** A single selectable option inside a section. */
export interface FilterOption {
  /** Stable identifier used as the value the section's `selected`
   *  array stores. */
  value: string;
  /** Visible row label. */
  label: string;
  /** Optional hex colour drawn as a small dot in front of the label —
   *  used for stage / status indicators. */
  swatch?: string;
}

/** One axis of filtering. The component is purely presentational: the
 *  caller derives `options` from its data, owns `selected`, and
 *  reacts to `onChange` to update state — no domain knowledge lives
 *  inside the popover. */
export interface FilterSection {
  /** Stable id used as the rail key. */
  id: string;
  /** Rail label and pane heading. */
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Placeholder for the per-section text search. Defaults to a
   *  generic "Search…". */
  searchPlaceholder?: string;
  /** Copy shown when the section has no options (e.g. nobody is
   *  assigned to anything yet). */
  emptyLabel?: string;
}

interface FilterPopoverProps {
  sections: FilterSection[];
  /** Label rendered next to the trigger icon. */
  triggerLabel: string;
  /** Called when the user clicks "Clear all" in the footer. Footer is
   *  only shown when at least one section has a selection AND a
   *  handler is wired up — surfaces that don't want the clear affordance
   *  just leave this off. */
  onClearAll?: () => void;
  /** Footer copy. Defaults to a generic count + clear pair. */
  activeCountLabel?: (count: number) => string;
  clearAllLabel?: string;
}

/** Jira-style filter popover — left rail of category sections, right
 *  pane with multi-select checkboxes for the active section.
 *
 *  This component holds no domain knowledge: every list it renders
 *  comes from the `sections` prop. Per-feature wrappers
 *  (`PunchlistFilterPopover`, `MyTasksFilterPopover`) build those
 *  sections out of their items and apply the filter to their data.
 *  The popover only handles open/close, the active-rail tab, the
 *  per-section text search, and the checkbox UI. */
export default function FilterPopover({
  sections,
  triggerLabel,
  onClearAll,
  activeCountLabel,
  clearAllLabel = "Clear all",
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>(
    sections[0]?.id ?? ""
  );
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Dismiss on outside click / Esc. Lightweight on purpose — pulling
  // in a portal library for one popover doesn't pay off here.
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

  // Resolved section the right pane shows. Falls back to the first
  // section when the active id no longer matches anything — handles
  // both the initial render (no sections yet) and the case where the
  // caller swaps sections out from under us. Resetting state via an
  // effect for those cases is overkill; the render already adapts.
  const activeSection =
    sections.find((s) => s.id === activeSectionId) ?? sections[0];

  const activeCount = sections.reduce((sum, s) => sum + s.selected.length, 0);

  const toggleValue = (section: FilterSection, value: string) => {
    const next = section.selected.includes(value)
      ? section.selected.filter((v) => v !== value)
      : [...section.selected, value];
    section.onChange(next);
  };

  const filteredOptions = activeSection
    ? activeSection.options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
          activeCount > 0 || open
            ? "border-blue-500 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
        aria-expanded={open}
      >
        <AdjustmentsHorizontalIcon className="w-4 h-4" />
        {triggerLabel}
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-blue-600 text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && activeSection && (
        // High z-index so the popover sits above the GA Leaflet map
        // (which uses its own stacking context with values up to 1000
        // for its panes / controls).
        <div className="absolute left-0 mt-2 z-[1100] w-[520px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="flex">
            {/* Category rail — Jira's filter popover has the same
                left-rail / right-pane split. */}
            <div className="w-32 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 py-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setActiveSectionId(section.id);
                    // Reset the per-section search at the source of
                    // the change — no effect needed and the new
                    // section's options aren't filtered against a
                    // stale query.
                    setQuery("");
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm border-l-2 transition-colors ${
                    section.id === activeSectionId
                      ? "border-l-blue-500 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-medium"
                      : "border-l-transparent text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{section.label}</span>
                    {section.selected.length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-semibold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {section.selected.length}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 p-3 min-h-[260px]">
              {/* Per-section search field. Always rendered so the
                  popover keeps a consistent shape when switching
                  between sections with short option lists. */}
              <div className="relative mb-3">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    activeSection.searchPlaceholder ?? "Search…"
                  }
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {activeSection.options.length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                    {activeSection.emptyLabel ?? "Nothing to filter on."}
                  </p>
                )}
                {filteredOptions.map((option) => {
                  const selected = activeSection.selected.includes(
                    option.value
                  );
                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/60 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleValue(activeSection, option.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      {option.swatch && (
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white dark:border-gray-800 shadow-sm"
                          style={{ backgroundColor: option.swatch }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-gray-900 dark:text-white">
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {activeCount > 0 && onClearAll && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {activeCountLabel
                  ? activeCountLabel(activeCount)
                  : `${activeCount} active`}
              </span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {clearAllLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
