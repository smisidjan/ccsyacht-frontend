"use client";

import { AttendeeAvatar } from "../shared";
import type { AttendeesProps } from "./types";

export default function AttendeesSection({ assignees, signers }: AttendeesProps) {
  if (!assignees || assignees.length === 0) return null;

  // Helper to check if an attendee has signed the meeting document
  const hasAttendeeSignedDocument = (assigneeId: string): boolean => {
    if (!signers) return false;
    const signer = signers.find((s) => s.identifier === assigneeId);
    return signer?.hasSigned === true;
  };

  // Use signers data when available, fallback to task assignees
  const signedCount = signers
    ? signers.filter((s) => s.hasSigned).length
    : assignees.filter((a) => a.hasSigned).length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {assignees.map((assignee) => {
          // Use signers data when available for more accurate status
          const isSigned = signers
            ? hasAttendeeSignedDocument(assignee.identifier)
            : assignee.hasSigned;

          return (
            <AttendeeAvatar
              key={assignee.identifier}
              name={assignee.name}
              email={assignee.email}
              status={isSigned ? "signed" : "unsigned"}
              size="md"
            />
          );
        })}
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {signedCount} of {assignees.length} signed
      </span>
    </div>
  );
}
