"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import PunchlistItemRow from "./PunchlistItemRow";
import type {
  PunchlistItem,
  PunchlistItemPriority,
  PunchlistItemStatus,
  StageStatus,
} from "@/lib/api/types";

interface PunchlistTreeListProps {
  /** Top-level items (each may carry an inlined `children` array).
   *  Tree-aware groupings should be pre-built by the caller — this
   *  component just renders the parent + its children with a chevron
   *  toggle in between. */
  items: PunchlistItem[];
  projectId: string;
  selectedItemId?: string | null;
  onSelectItem: (id: string) => void;
  onChangeStatus: (id: string, status: PunchlistItemStatus) => void;
  onChangePriority: (id: string, priority: PunchlistItemPriority) => void;
  /** Triggered when a row's status dropdown picks "Cancelled" — the
   *  caller owns the cancel-reason modal (it's shared with the detail
   *  card). */
  onRequestCancel: (item: { id: string; name: string }) => void;
  onAssigneesChange: () => void;
  canEdit: boolean;
  /** Forwarded to the status dropdown so it can disable transitions
   *  that don't match the stage state. Only stage-level surfaces have
   *  this. */
  stageStatus?: StageStatus;
  /** Project-wide rows surface their deck / area / stage breadcrumb
   *  inline. Off for stage-level lists where the location is implicit. */
  showLocation?: boolean;
  /** Compact mode hides the reporter column so a detail panel beside
   *  the list can take more width. */
  compact?: boolean;
  /** `id → "3"` / `"3.1"` lookup for the row's `#N` prefix. Same
   *  source on every surface so the same item shows the same number
   *  wherever it appears. */
  getDisplayNumber?: (id: string) => string | undefined;
  /** Optional dot rendered in front of the title — callers feed the
   *  stage / pin colour here so the row visually anchors back to the
   *  drawing. Receives the parent context too so callers can fall
   *  back to the parent's stage when a child sub-item ships without
   *  the `stage` relation loaded (the backend's children[] payload
   *  often omits it). Return `null`/`undefined` to skip the dot. */
  getRowColor?: (
    item: PunchlistItem,
    parent?: PunchlistItem
  ) => string | null | undefined;
  /** Sync row hover with an external highlight target (e.g. the GA
   *  viewer's pin marker). The shared component drives `onMouseEnter`
   *  per row; the parent decides what to highlight. */
  onRowHover?: (item: PunchlistItem | null) => void;
}

/** Tree-aware punchlist list shared by the project-, stage- and
 *  GA-level surfaces. Top-level items render as full `PunchlistItemRow`s;
 *  any inlined children appear as indented sub-rows under a chevron
 *  toggle. Mutations are delegated to the parent through callbacks so
 *  every host stays in charge of its own data-refresh strategy
 *  (refetch, refresh-key bump, sibling toast, etc.).
 *
 *  Auto-expands the parent whenever the selected id matches one of its
 *  children so the user never lands on a hidden detail. Manual
 *  expand/collapse via the chevron still works the rest of the time. */
export default function PunchlistTreeList({
  items,
  projectId,
  selectedItemId,
  onSelectItem,
  onChangeStatus,
  onChangePriority,
  onRequestCancel,
  onAssigneesChange,
  canEdit,
  stageStatus,
  showLocation = false,
  compact = false,
  getDisplayNumber,
  getRowColor,
  onRowHover,
}: PunchlistTreeListProps) {
  const tPunchlist = useTranslations("punchlist");
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(
    new Set()
  );

  // Map every child id back to its top-level parent so the
  // auto-expand effect (and the selection check below) doesn't need
  // to walk the tree per render.
  const parentByChildId = useMemo(() => {
    const map = new Map<string, string>();
    for (const top of items) {
      for (const child of top.children ?? []) {
        map.set(child.identifier, top.identifier);
      }
    }
    return map;
  }, [items]);

  // Force-expand the parent of a selected child while the selection
  // sits on that child — derived from the manual expansion set so
  // navigating from outside (e.g. clicking a pin that maps to a
  // child) never lands on a collapsed row. Toggling collapse while
  // the child is still selected won't stick, but flipping the
  // selection away frees the row to collapse again.
  const effectiveExpandedIds = useMemo(() => {
    if (!selectedItemId) return expandedItemIds;
    const parentId = parentByChildId.get(selectedItemId);
    if (!parentId || expandedItemIds.has(parentId)) return expandedItemIds;
    const next = new Set(expandedItemIds);
    next.add(parentId);
    return next;
  }, [expandedItemIds, selectedItemId, parentByChildId]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md divide-y divide-gray-100 dark:divide-gray-700"
      onMouseLeave={() => onRowHover?.(null)}
    >
      {items.map((parent) => {
        const children = parent.children ?? [];
        const hasChildren = children.length > 0;
        const isExpanded = effectiveExpandedIds.has(parent.identifier);
        const parentColor = getRowColor?.(parent) ?? null;

        return (
          <div key={parent.identifier}>
            <div
              onMouseEnter={() => onRowHover?.(parent)}
              className="flex items-stretch"
            >
              {/* Chevron toggle for parents with children. Singleton
                  items get a transparent spacer so the title column
                  still aligns vertically with the tree-aware rows. */}
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(parent.identifier);
                  }}
                  className="flex-shrink-0 px-2 flex items-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  title={
                    isExpanded
                      ? tPunchlist("collapseSubItems")
                      : tPunchlist("expandSubItems")
                  }
                  aria-label={
                    isExpanded
                      ? tPunchlist("collapseSubItems")
                      : tPunchlist("expandSubItems")
                  }
                  aria-expanded={isExpanded}
                >
                  <ChevronRightIcon
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </button>
              ) : (
                <span className="flex-shrink-0 w-8" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <PunchlistItemRow
                  item={parent}
                  projectId={projectId}
                  isSelected={selectedItemId === parent.identifier}
                  canEdit={canEdit}
                  stageStatus={stageStatus}
                  showLocation={showLocation}
                  compact={compact}
                  stageColor={parentColor}
                  displayNumber={getDisplayNumber?.(parent.identifier)}
                  onSelect={() => onSelectItem(parent.identifier)}
                  onChangeStatus={(next) =>
                    onChangeStatus(parent.identifier, next)
                  }
                  onChangePriority={(next) =>
                    onChangePriority(parent.identifier, next)
                  }
                  onRequestCancel={() =>
                    onRequestCancel({
                      id: parent.identifier,
                      name: parent.name,
                    })
                  }
                  onAssigneesChange={onAssigneesChange}
                />
              </div>
            </div>

            {hasChildren && isExpanded && (
              <div className="bg-gray-50 dark:bg-gray-900/40 divide-y divide-gray-100 dark:divide-gray-800">
                {children.map((child) => {
                  // Pass the parent so the caller can resolve the
                  // child's colour from the parent's stage when the
                  // child payload itself doesn't ship `stage`.
                  const childColor = getRowColor?.(child, parent) ?? null;
                  return (
                    <div
                      key={child.identifier}
                      onMouseEnter={() => onRowHover?.(child)}
                      className="flex items-stretch"
                    >
                      <span
                        className="flex-shrink-0 w-10"
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <PunchlistItemRow
                          item={child}
                          projectId={projectId}
                          isSelected={selectedItemId === child.identifier}
                          canEdit={canEdit}
                          stageStatus={stageStatus}
                          showLocation={showLocation}
                          compact={compact}
                          stageColor={childColor}
                          isSubRow
                          displayNumber={getDisplayNumber?.(child.identifier)}
                          onSelect={() => onSelectItem(child.identifier)}
                          onChangeStatus={(next) =>
                            onChangeStatus(child.identifier, next)
                          }
                          onChangePriority={(next) =>
                            onChangePriority(child.identifier, next)
                          }
                          onRequestCancel={() =>
                            onRequestCancel({
                              id: child.identifier,
                              name: child.name,
                            })
                          }
                          onAssigneesChange={onAssigneesChange}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
