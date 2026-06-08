"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import type {
  PunchlistItem,
  PunchlistItemPriority,
  PunchlistItemStatus,
} from "@/lib/api/types";

export interface PunchlistFilters {
  statuses: PunchlistItemStatus[];
  assigneeIds: string[];
  priorities: PunchlistItemPriority[];
  /** Location filters — sourced from each item's stage.area.deck /
   *  stage.area / stage. Empty arrays match all (no constraint). */
  deckIds: string[];
  areaIds: string[];
  stageIds: string[];
}

export const EMPTY_FILTERS: PunchlistFilters = {
  statuses: [],
  assigneeIds: [],
  priorities: [],
  deckIds: [],
  areaIds: [],
  stageIds: [],
};

/** Apply the popover filters + a free-text search to an item list.
 *  Empty axes match everything so callers don't have to special-case
 *  partial filter sets. Lives next to the popover so both surfaces
 *  (punchlist tab, GA tab) read from one source of truth. */
export function applyPunchlistFilters(
  items: PunchlistItem[],
  searchQuery: string,
  filters: PunchlistFilters
): PunchlistItem[] {
  const q = searchQuery.trim().toLowerCase();
  return items.filter((item) => {
    if (q && !item.name.toLowerCase().includes(q)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(item.status))
      return false;
    if (
      filters.priorities.length > 0 &&
      !filters.priorities.includes(item.priority)
    )
      return false;
    if (filters.assigneeIds.length > 0) {
      const has = item.assignees.some((a) =>
        filters.assigneeIds.includes(a.identifier)
      );
      if (!has) return false;
    }
    if (filters.deckIds.length > 0) {
      const deckId = item.stage.area?.deck?.identifier;
      if (!deckId || !filters.deckIds.includes(deckId)) return false;
    }
    if (filters.areaIds.length > 0) {
      const areaId = item.stage.area?.identifier;
      if (!areaId || !filters.areaIds.includes(areaId)) return false;
    }
    if (
      filters.stageIds.length > 0 &&
      !filters.stageIds.includes(item.stage.identifier)
    )
      return false;
    return true;
  });
}

interface PunchlistFilterPopoverProps {
  /** Items currently loaded — used to build the assignee picker so we
   *  only offer people who actually appear in the list. */
  items: PunchlistItem[];
  value: PunchlistFilters;
  onChange: (next: PunchlistFilters) => void;
}

type Category =
  | "status"
  | "assignee"
  | "priority"
  | "deck"
  | "area"
  | "stage";

const STATUS_OPTIONS: PunchlistItemStatus[] = [
  "open",
  "in_progress",
  "done",
  "cancelled",
];

const PRIORITY_OPTIONS: PunchlistItemPriority[] = ["high", "medium", "low"];

/** Jira-style filter popover: left rail for categories, right pane
 *  with multi-select checkboxes for the active category. State lives
 *  in the parent so multiple chips elsewhere can read the same
 *  filters. */
export default function PunchlistFilterPopover({
  items,
  value,
  onChange,
}: PunchlistFilterPopoverProps) {
  const t = useTranslations("punchlist");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("status");
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Dismiss on outside click / Esc — same pattern as the status
  // dropdown. We keep it lightweight to avoid pulling in a portal.
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

  // Reset the per-category search every time the user switches tabs.
  useEffect(() => {
    setQuery("");
  }, [category]);

  // Options derived from the currently loaded items — same trick the
  // old per-tab filters used, deduped by id and sorted alphabetically
  // so the picker reads stably.
  const dedupe = (
    pairs: Iterable<[string, string]>
  ): { id: string; name: string }[] =>
    Array.from(new Map(pairs).entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

  const assigneeOptions = useMemo(
    () =>
      dedupe(
        items.flatMap((item) =>
          item.assignees.map(
            (a) => [a.identifier, a.name] as [string, string]
          )
        )
      ),
    [items]
  );

  const deckOptions = useMemo(
    () =>
      dedupe(
        items.flatMap((item) => {
          const deck = item.stage.area?.deck;
          return deck
            ? [[deck.identifier, deck.name] as [string, string]]
            : [];
        })
      ),
    [items]
  );

  const areaOptions = useMemo(
    () =>
      dedupe(
        items.flatMap((item) => {
          const area = item.stage.area;
          return area
            ? [[area.identifier, area.name] as [string, string]]
            : [];
        })
      ),
    [items]
  );

  const stageOptions = useMemo(
    () =>
      dedupe(
        items.map(
          (item) => [item.stage.identifier, item.stage.name] as [string, string]
        )
      ),
    [items]
  );

  const activeCount =
    value.statuses.length +
    value.assigneeIds.length +
    value.priorities.length +
    value.deckIds.length +
    value.areaIds.length +
    value.stageIds.length;

  const statusLabel = (s: PunchlistItemStatus) =>
    t(
      `status${s
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("")}`
    );
  const priorityLabel = (p: PunchlistItemPriority) =>
    t(`priority${p.charAt(0).toUpperCase()}${p.slice(1)}`);

  const toggleStatus = (s: PunchlistItemStatus) => {
    const next = value.statuses.includes(s)
      ? value.statuses.filter((v) => v !== s)
      : [...value.statuses, s];
    onChange({ ...value, statuses: next });
  };
  const toggleAssignee = (id: string) => {
    const next = value.assigneeIds.includes(id)
      ? value.assigneeIds.filter((v) => v !== id)
      : [...value.assigneeIds, id];
    onChange({ ...value, assigneeIds: next });
  };
  const togglePriority = (p: PunchlistItemPriority) => {
    const next = value.priorities.includes(p)
      ? value.priorities.filter((v) => v !== p)
      : [...value.priorities, p];
    onChange({ ...value, priorities: next });
  };
  const toggleDeck = (id: string) => {
    const next = value.deckIds.includes(id)
      ? value.deckIds.filter((v) => v !== id)
      : [...value.deckIds, id];
    onChange({ ...value, deckIds: next });
  };
  const toggleArea = (id: string) => {
    const next = value.areaIds.includes(id)
      ? value.areaIds.filter((v) => v !== id)
      : [...value.areaIds, id];
    onChange({ ...value, areaIds: next });
  };
  const toggleStage = (id: string) => {
    const next = value.stageIds.includes(id)
      ? value.stageIds.filter((v) => v !== id)
      : [...value.stageIds, id];
    onChange({ ...value, stageIds: next });
  };

  const renderOption = (
    key: string,
    label: React.ReactNode,
    selected: boolean,
    onToggle: () => void
  ) => (
    <label
      key={key}
      className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/60 rounded"
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <span className="text-gray-900 dark:text-white">{label}</span>
    </label>
  );

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
        {t("filterLabel")}
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-blue-600 text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        // High z-index so the popover sits above the GA Leaflet map
        // (which uses its own stacking context with values up to 1000
        // for its panes / controls).
        <div className="absolute left-0 mt-2 z-[1100] w-[520px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="flex">
            {/* Category rail — Jira's filter popover has the same
                left-rail / right-pane split. */}
            <div className="w-32 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 py-2">
              {([
                ["status", t("filterCategoryStatus")],
                ["assignee", t("filterCategoryAssignee")],
                ["priority", t("filterCategoryPriority")],
                ["deck", t("filterCategoryDeck")],
                ["area", t("filterCategoryArea")],
                ["stage", t("filterCategoryStage")],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`w-full text-left px-3 py-1.5 text-sm border-l-2 transition-colors ${
                    category === key
                      ? "border-l-blue-500 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 font-medium"
                      : "border-l-transparent text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 p-3 min-h-[260px]">
              {/* Per-category search field — only useful for assignee
                  in practice but we render it everywhere so the popover
                  has a consistent shape and the user doesn't see it
                  appear/disappear when switching tabs. */}
              <div className="relative mb-3">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t(`filterSearch.${category}`)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {category === "status" &&
                  STATUS_OPTIONS.filter((s) =>
                    statusLabel(s)
                      .toLowerCase()
                      .includes(query.toLowerCase())
                  ).map((s) =>
                    renderOption(
                      s,
                      statusLabel(s),
                      value.statuses.includes(s),
                      () => toggleStatus(s)
                    )
                  )}
                {category === "assignee" && (
                  <>
                    {assigneeOptions.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        {t("filterNoAssignees")}
                      </p>
                    )}
                    {assigneeOptions
                      .filter((a) =>
                        a.name.toLowerCase().includes(query.toLowerCase())
                      )
                      .map((a) =>
                        renderOption(
                          a.id,
                          a.name,
                          value.assigneeIds.includes(a.id),
                          () => toggleAssignee(a.id)
                        )
                      )}
                  </>
                )}
                {category === "priority" &&
                  PRIORITY_OPTIONS.filter((p) =>
                    priorityLabel(p)
                      .toLowerCase()
                      .includes(query.toLowerCase())
                  ).map((p) =>
                    renderOption(
                      p,
                      priorityLabel(p),
                      value.priorities.includes(p),
                      () => togglePriority(p)
                    )
                  )}
                {category === "deck" && (
                  <>
                    {deckOptions.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        {t("filterNoDecks")}
                      </p>
                    )}
                    {deckOptions
                      .filter((o) =>
                        o.name.toLowerCase().includes(query.toLowerCase())
                      )
                      .map((o) =>
                        renderOption(
                          o.id,
                          o.name,
                          value.deckIds.includes(o.id),
                          () => toggleDeck(o.id)
                        )
                      )}
                  </>
                )}
                {category === "area" && (
                  <>
                    {areaOptions.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        {t("filterNoAreas")}
                      </p>
                    )}
                    {areaOptions
                      .filter((o) =>
                        o.name.toLowerCase().includes(query.toLowerCase())
                      )
                      .map((o) =>
                        renderOption(
                          o.id,
                          o.name,
                          value.areaIds.includes(o.id),
                          () => toggleArea(o.id)
                        )
                      )}
                  </>
                )}
                {category === "stage" && (
                  <>
                    {stageOptions.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        {t("filterNoStages")}
                      </p>
                    )}
                    {stageOptions
                      .filter((o) =>
                        o.name.toLowerCase().includes(query.toLowerCase())
                      )
                      .map((o) =>
                        renderOption(
                          o.id,
                          o.name,
                          value.stageIds.includes(o.id),
                          () => toggleStage(o.id)
                        )
                      )}
                  </>
                )}
              </div>
            </div>
          </div>

          {activeCount > 0 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t("filterActiveCount", { count: activeCount })}
              </span>
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t("filterClear")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
