"use client";

import { useEffect, useMemo, useState } from "react";
import { punchlistItemsApi } from "@/lib/api/punchlist-items";
import type { PunchlistItem } from "@/lib/api/types";

/** Lookup entry from the flat id map — gives consumers fast access
 *  to an item plus its top-level ancestor (which is the item itself
 *  for parents). Used by the GA tab to fold pins onto their parent
 *  rows even when the pin is attached to a child sub-item. */
export interface PunchlistTreeLookup {
  item: PunchlistItem;
  /** Top-level ancestor — equals `item` when the item itself is
   *  top-level. Lets the consumer group by parent without walking
   *  the tree again. */
  topLevel: PunchlistItem;
}

/** Fetch every top-level punchlist item in the project (with their
 *  children inlined) once and expose:
 *   - `items` — array of top-level items
 *   - `lookup` — `Map<id, { item, topLevel }>` covering parents + children
 *   - `numbers` — display numbers (`"1"` for parents, `"1.2"` for
 *     children) keyed by item id, derived from creation order ASC
 *
 *  Refetches when `projectId` changes or `refreshKey` bumps. Errors
 *  swallow silently — the display number is a UX nicety and a
 *  transient API blip shouldn't break the page. */
export function usePunchlistProjectItems(
  projectId: string | undefined,
  refreshKey: number = 0
): {
  items: PunchlistItem[];
  lookup: Map<string, PunchlistTreeLookup>;
  numbers: Map<string, string>;
  loading: boolean;
} {
  const [items, setItems] = useState<PunchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await punchlistItemsApi.getAllForProject(projectId, {
          per_page: 1000,
        });
        if (!cancelled) setItems(res.data || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  const lookup = useMemo(() => {
    const out = new Map<string, PunchlistTreeLookup>();
    for (const top of items) {
      out.set(top.identifier, { item: top, topLevel: top });
      for (const child of top.children ?? []) {
        out.set(child.identifier, { item: child, topLevel: top });
      }
    }
    return out;
  }, [items]);

  const numbers = useMemo(() => {
    // Sort by creation date with a UUID tiebreaker. Without the
    // tiebreaker the order is non-deterministic whenever two items
    // share a timestamp (or the field is empty) AND the backend
    // returns the array in a different order between requests —
    // which would visibly swap `#N.1` ↔ `#N.2` on every refetch.
    // The identifier is immutable per item, so the numbering stays
    // pinned to the same item across mutations and refreshes.
    const byCreatedThenId = (
      a: { dateCreated?: string; identifier: string },
      b: { dateCreated?: string; identifier: string }
    ) => {
      const cmp = (a.dateCreated ?? "").localeCompare(b.dateCreated ?? "");
      if (cmp !== 0) return cmp;
      return a.identifier.localeCompare(b.identifier);
    };
    const sorted = [...items].sort(byCreatedThenId);
    const out = new Map<string, string>();
    sorted.forEach((parent, i) => {
      const parentNum = String(i + 1);
      out.set(parent.identifier, parentNum);
      const children = [...(parent.children ?? [])].sort(byCreatedThenId);
      children.forEach((child, j) => {
        out.set(child.identifier, `${parentNum}.${j + 1}`);
      });
    });
    return out;
  }, [items]);

  return { items, lookup, numbers, loading };
}
