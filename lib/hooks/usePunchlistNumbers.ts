"use client";

import { useEffect, useMemo, useState } from "react";
import { punchlistItemsApi } from "@/lib/api/punchlist-items";
import type { PunchlistItem } from "@/lib/api/types";

/** Pull every punchlist item in the project once and return a
 *  `Map<itemId, number>` based on creation-date ASC. The number is
 *  stable across views as long as the project's item set doesn't
 *  shift between renders — the same item carries the same `#N` in
 *  list rows, the detail card, and any other surface using this
 *  hook. Recomputes when `projectId` changes or `refreshKey` bumps.
 *
 *  The number is a UX nicety, not a real id — render failures here
 *  are swallowed silently so a transient API blip doesn't break the
 *  page. Consumers fall back to "no number" when the lookup misses. */
export function usePunchlistNumbers(
  projectId: string | undefined,
  refreshKey: number = 0
): Map<string, number> {
  const [items, setItems] = useState<PunchlistItem[]>([]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        // High per_page so a single call covers everything for
        // reasonable project sizes. If projects grow beyond this
        // the number will start at 1 within the first page only —
        // worth promoting numbering to the backend at that point.
        const res = await punchlistItemsApi.getAllForProject(projectId, {
          per_page: 1000,
        });
        if (!cancelled) setItems(res.data || []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  return useMemo(() => {
    // Tiebreaker on identifier keeps the order deterministic when two
    // items share a `dateCreated` (or it's empty) — otherwise their
    // `#N` values would swap on every refetch.
    const sorted = [...items].sort((a, b) => {
      const cmp = (a.dateCreated ?? "").localeCompare(b.dateCreated ?? "");
      if (cmp !== 0) return cmp;
      return a.identifier.localeCompare(b.identifier);
    });
    const out = new Map<string, number>();
    sorted.forEach((p, i) => out.set(p.identifier, i + 1));
    return out;
  }, [items]);
}
