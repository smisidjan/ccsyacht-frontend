// Status conversion utilities

import type { Invitation } from "@/lib/api/types";

export type InvitationStatusKey = "pending" | "accepted" | "declined" | "expired";

/**
 * Convert backend invitation actionStatus to frontend status key
 */
export function getInvitationStatusKey(invitation: Invitation): InvitationStatusKey {
  if (invitation.isExpired) return "expired";

  switch (invitation.actionStatus) {
    case "CompletedActionStatus":
      return "accepted";
    case "FailedActionStatus":
      return "declined";
    case "PotentialActionStatus":
    default:
      return "pending";
  }
}

/**
 * Check if an invitation can be deleted (only pending invitations)
 */
export function canDeleteInvitation(invitation: Invitation): boolean {
  return (
    invitation.actionStatus === "PotentialActionStatus" &&
    !invitation.isExpired
  );
}

/**
 * Check if an invitation can be resent (pending or expired)
 */
export function canResendInvitation(invitation: Invitation): boolean {
  const statusKey = getInvitationStatusKey(invitation);
  return statusKey === "pending" || statusKey === "expired";
}
