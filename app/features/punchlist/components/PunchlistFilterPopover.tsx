"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import FilterPopover, {
  type FilterOption,
  type FilterSection,
} from "@/app/components/ui/FilterPopover";
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
  /** Items currently loaded — used to build the options for each
   *  section so we only offer values that actually appear in the
   *  current dataset. */
  items: PunchlistItem[];
  value: PunchlistFilters;
  onChange: (next: PunchlistFilters) => void;
}

const STATUS_OPTIONS: PunchlistItemStatus[] = [
  "open",
  "in_progress",
  "done",
  "cancelled",
];

const PRIORITY_OPTIONS: PunchlistItemPriority[] = ["high", "medium", "low"];

/** Thin wrapper around the generic `FilterPopover` that knows how to
 *  derive sections from a `PunchlistItem[]`. The popover itself is
 *  purely presentational — this component owns the punchlist-shaped
 *  filter state and the per-axis option building. */
export default function PunchlistFilterPopover({
  items,
  value,
  onChange,
}: PunchlistFilterPopoverProps) {
  const t = useTranslations("punchlist");

  const statusLabel = (s: PunchlistItemStatus) =>
    t(
      `status${s
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("")}`
    );
  const priorityLabel = (p: PunchlistItemPriority) =>
    t(`priority${p.charAt(0).toUpperCase()}${p.slice(1)}`);

  // De-dupe `(id, name)` pairs and sort alphabetically so the
  // assignee / deck / area / stage pickers read stably across renders.
  const dedupe = (
    pairs: Iterable<[string, string]>
  ): { id: string; name: string }[] =>
    Array.from(new Map(pairs).entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

  const assigneeOptions = useMemo<FilterOption[]>(
    () =>
      dedupe(
        items.flatMap((item) =>
          item.assignees.map(
            (a) => [a.identifier, a.name] as [string, string]
          )
        )
      ).map(({ id, name }) => ({ value: id, label: name })),
    [items]
  );

  const deckOptions = useMemo<FilterOption[]>(
    () =>
      dedupe(
        items.flatMap((item) => {
          const deck = item.stage.area?.deck;
          return deck
            ? [[deck.identifier, deck.name] as [string, string]]
            : [];
        })
      ).map(({ id, name }) => ({ value: id, label: name })),
    [items]
  );

  const areaOptions = useMemo<FilterOption[]>(
    () =>
      dedupe(
        items.flatMap((item) => {
          const area = item.stage.area;
          return area
            ? [[area.identifier, area.name] as [string, string]]
            : [];
        })
      ).map(({ id, name }) => ({ value: id, label: name })),
    [items]
  );

  const stageOptions = useMemo<FilterOption[]>(
    () =>
      dedupe(
        items.map(
          (item) =>
            [item.stage.identifier, item.stage.name] as [string, string]
        )
      ).map(({ id, name }) => ({ value: id, label: name })),
    [items]
  );

  const sections: FilterSection[] = [
    {
      id: "status",
      label: t("filterCategoryStatus"),
      searchPlaceholder: t("filterSearch.status"),
      options: STATUS_OPTIONS.map((s) => ({
        value: s,
        label: statusLabel(s),
      })),
      selected: value.statuses,
      onChange: (next) =>
        onChange({ ...value, statuses: next as PunchlistItemStatus[] }),
    },
    {
      id: "assignee",
      label: t("filterCategoryAssignee"),
      searchPlaceholder: t("filterSearch.assignee"),
      emptyLabel: t("filterNoAssignees"),
      options: assigneeOptions,
      selected: value.assigneeIds,
      onChange: (next) => onChange({ ...value, assigneeIds: next }),
    },
    {
      id: "priority",
      label: t("filterCategoryPriority"),
      searchPlaceholder: t("filterSearch.priority"),
      options: PRIORITY_OPTIONS.map((p) => ({
        value: p,
        label: priorityLabel(p),
      })),
      selected: value.priorities,
      onChange: (next) =>
        onChange({ ...value, priorities: next as PunchlistItemPriority[] }),
    },
    {
      id: "deck",
      label: t("filterCategoryDeck"),
      searchPlaceholder: t("filterSearch.deck"),
      emptyLabel: t("filterNoDecks"),
      options: deckOptions,
      selected: value.deckIds,
      onChange: (next) => onChange({ ...value, deckIds: next }),
    },
    {
      id: "area",
      label: t("filterCategoryArea"),
      searchPlaceholder: t("filterSearch.area"),
      emptyLabel: t("filterNoAreas"),
      options: areaOptions,
      selected: value.areaIds,
      onChange: (next) => onChange({ ...value, areaIds: next }),
    },
    {
      id: "stage",
      label: t("filterCategoryStage"),
      searchPlaceholder: t("filterSearch.stage"),
      emptyLabel: t("filterNoStages"),
      options: stageOptions,
      selected: value.stageIds,
      onChange: (next) => onChange({ ...value, stageIds: next }),
    },
  ];

  const activeCount =
    value.statuses.length +
    value.assigneeIds.length +
    value.priorities.length +
    value.deckIds.length +
    value.areaIds.length +
    value.stageIds.length;

  return (
    <FilterPopover
      triggerLabel={t("filterLabel")}
      sections={sections}
      onClearAll={
        activeCount > 0 ? () => onChange(EMPTY_FILTERS) : undefined
      }
      activeCountLabel={(count) => t("filterActiveCount", { count })}
      clearAllLabel={t("filterClear")}
    />
  );
}
