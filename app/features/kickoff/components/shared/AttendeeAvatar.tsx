"use client";

interface AttendeeAvatarProps {
  name: string;
  status: "available" | "unavailable" | "pending";
  tooltipSuffix?: string;
}

const statusStyles = {
  available: "bg-green-500 text-white",
  unavailable: "bg-red-500 text-white",
  pending: "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300",
};

const tooltipIcons = {
  available: "✓",
  unavailable: "✗",
  pending: "?",
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
}: AttendeeAvatarProps) {
  const initials = getInitials(name);
  const suffix = tooltipSuffix ?? tooltipIcons[status];

  return (
    <div className="group relative">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${statusStyles[status]}`}
      >
        {initials}
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {name} {suffix}
      </div>
    </div>
  );
}
