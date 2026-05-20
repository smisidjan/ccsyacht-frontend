"use client";

import dynamic from "next/dynamic";
import type { Area } from "@/lib/api/types";

interface AreaGAPreviewProps {
  projectId: string;
  areaId: string;
  /** Color to fill the current area's polygon with — typically the
   *  active stage's color. Null falls back to a neutral blue. */
  activeStageColor: string | null;
  heightClassName?: string;
  /** Forwarded to the inner content — see its props doc. */
  area?: Area | null;
}

// Dynamic import — Leaflet doesn't work with SSR.
const AreaGAPreviewContent = dynamic(() => import("./AreaGAPreviewContent"), {
  ssr: false,
  loading: () => (
    <div className="h-72 w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
  ),
});

export default function AreaGAPreview(props: AreaGAPreviewProps) {
  return <AreaGAPreviewContent {...props} />;
}
