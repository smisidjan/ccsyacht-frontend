"use client";

import { useMemo } from "react";
import StageTimelineItem, { type TimelineMode } from "./StageTimelineItem";
import type { Stage } from "@/lib/api/types";

interface StageTimelineProps {
  stages: Stage[];
  projectId: string;
  canEdit: boolean;
  onUpdate: (stageId: string, data: { name?: string }) => Promise<void>;
  onRefetch: () => Promise<void>;
}

/** The "active" stage is the first one the team is currently working on:
 *  anything that isn't completed yet, in document order. Everything before
 *  it is treated as completed (whether it actually is or not — the user
 *  has moved past it), everything after is upcoming. */
function pickActiveIndex(stages: Stage[]): number {
  return stages.findIndex((s) => s.status.name !== "completed");
}

export default function StageTimeline({
  stages,
  projectId,
  canEdit,
  onUpdate,
  onRefetch,
}: StageTimelineProps) {
  const activeIndex = useMemo(() => pickActiveIndex(stages), [stages]);

  return (
    <div className="space-y-0">
      {stages.map((stage, i) => {
        let mode: TimelineMode;
        if (activeIndex === -1 || i < activeIndex) {
          mode = "completed";
        } else if (i === activeIndex) {
          mode = "active";
        } else {
          mode = "upcoming";
        }

        return (
          <StageTimelineItem
            key={stage.identifier}
            stage={stage}
            mode={mode}
            isLast={i === stages.length - 1}
            projectId={projectId}
            canEdit={canEdit}
            onUpdate={(data) => onUpdate(stage.identifier, data)}
            onRefetch={onRefetch}
          />
        );
      })}
    </div>
  );
}
