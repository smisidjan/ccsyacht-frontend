"use client";

import { AttendeeAvatar } from "../shared";
import type { AttendeesProps } from "./types";

export default function AttendeesSection({ assignees }: AttendeesProps) {
  if (!assignees || assignees.length === 0) return null;

  const signedCount = assignees.filter((a) => a.hasSigned).length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {assignees.map((assignee) => (
          <AttendeeAvatar
            key={assignee.identifier}
            name={assignee.name}
            email={assignee.email}
            status={assignee.hasSigned ? "signed" : "unsigned"}
            size="md"
          />
        ))}
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {signedCount} of {assignees.length} signed
      </span>
    </div>
  );
}
