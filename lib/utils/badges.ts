// Badge color utilities for consistent styling across the app

export type BadgeVariant = "purple" | "blue" | "green" | "red" | "amber" | "gray";

const badgeColors: Record<BadgeVariant, string> = {
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
};

export function getBadgeColor(variant: BadgeVariant): string {
  return badgeColors[variant];
}

// Role badge colors
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "admin":
      return badgeColors.purple;
    case "manager":
    case "main user":
      return badgeColors.blue;
    default:
      return badgeColors.gray;
  }
}

// Status badge colors
export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "pending":
      return badgeColors.amber;
    case "accepted":
    case "approved":
    case "active":
    case "completed":
      return badgeColors.green;
    case "declined":
    case "rejected":
    case "inactive":
      return badgeColors.red;
    case "expired":
    default:
      return badgeColors.gray;
  }
}

// Priority badge colors (for punchlist etc)
export function getPriorityBadgeColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case "high":
    case "urgent":
      return badgeColors.red;
    case "medium":
    case "normal":
      return badgeColors.amber;
    case "low":
      return badgeColors.green;
    default:
      return badgeColors.gray;
  }
}
