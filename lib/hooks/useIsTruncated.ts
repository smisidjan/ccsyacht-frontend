"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Detects whether the referenced element's text is currently clipped
 * (e.g. by `truncate`/`text-overflow: ellipsis`). Re-checks on resize
 * so it stays accurate as the layout changes.
 *
 * Pass `paused: true` while the caller is temporarily changing the
 * element's own box size (e.g. un-truncating it on hover) — otherwise
 * the resulting resize would be re-measured as "no longer truncated",
 * flipping the caller's state back and forth in a feedback loop.
 */
export function useIsTruncated<T extends HTMLElement>(paused = false) {
  const ref = useRef<T | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || paused) return;

    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    check();

    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [paused]);

  return { ref, isTruncated };
}
