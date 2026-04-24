"use client";

import Tooltip from "@/app/components/ui/Tooltip";

type AvatarStatus = "available" | "unavailable" | "pending" | "online" | "live" | "both" | "signed" | "unsigned";
type AvatarSize = "sm" | "md";

interface AttendeeAvatarProps {
  name: string;
  status: AvatarStatus;
  tooltipSuffix?: string;
  email?: string;
  size?: AvatarSize;
}

const statusStyles: Record<AvatarStatus, string> = {
  available: "bg-green-500 text-white",
  unavailable: "bg-red-500 text-white",
  pending: "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300",
  online: "bg-blue-500 text-white",
  live: "bg-purple-500 text-white",
  both: "bg-gradient-to-br from-blue-500 to-purple-500 text-white",
  signed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  unsigned: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
};

const sizeStyles: Record<AvatarSize, string> = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs ring-2 ring-white dark:ring-gray-900",
};

const tooltipLabels: Record<AvatarStatus, string> = {
  available: "(available)",
  unavailable: "(unavailable)",
  pending: "(pending)",
  online: "(online)",
  live: "(in person)",
  both: "(online + in person)",
  signed: "(signed)",
  unsigned: "(pending)",
};

/**
 * Get initials from a name (max 2 characters)
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AttendeeAvatar({
  name,
  status,
  tooltipSuffix,
  email,
  size = "sm",
}: AttendeeAvatarProps) {
  const initials = getInitials(name);
  const suffix = tooltipSuffix ?? tooltipLabels[status];
  const tooltipContent = email ? `${name} ${suffix}\n${email}` : `${name} ${suffix}`;

  const avatarElement = (
    <div
      className={`rounded-full flex items-center justify-center font-medium transition-all duration-150 hover:scale-125 hover:z-10 hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 ${sizeStyles[size]} ${statusStyles[status]} ${email ? "cursor-pointer" : ""}`}
    >
      {initials}
    </div>
  );

  if (email) {
    return (
      <Tooltip content={tooltipContent} position="top" multiline>
        <a href={`mailto:${email}`}>
          {avatarElement}
        </a>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={tooltipContent} position="top" multiline>
      {avatarElement}
    </Tooltip>
  );
}

/**
 * Helper function to determine avatar status from response
 */
export function getAvatarStatus(
  canAttendOnline: boolean,
  canAttendLive: boolean
): AttendeeAvatarProps["status"] {
  if (canAttendOnline && canAttendLive) return "both";
  if (canAttendOnline) return "online";
  if (canAttendLive) return "live";
  return "unavailable";
}
