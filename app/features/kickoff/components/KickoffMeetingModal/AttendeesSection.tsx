"use client";

import Tooltip from "@/app/components/ui/Tooltip";
import type { AttendeesProps } from "./types";

export default function AttendeesSection({ assignees }: AttendeesProps) {
  if (!assignees || assignees.length === 0) return null;

  const signedCount = assignees.filter((a) => a.hasSigned).length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {assignees.map((assignee) => (
          <Tooltip
            key={assignee.identifier}
            content={`${assignee.name}\n${assignee.email}`}
            position="top"
            multiline
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ring-2 ring-white dark:ring-gray-900 cursor-default transition-transform duration-150 hover:scale-125 hover:z-10 ${
                assignee.hasSigned
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              {assignee.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </Tooltip>
        ))}
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {signedCount} of {assignees.length} signed
      </span>
    </div>
  );
}
