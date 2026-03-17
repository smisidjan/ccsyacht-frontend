/**
 * Format role name: capitalize first letter and replace underscores with spaces
 * Examples: "admin" -> "Admin", "main_user" -> "Main User"
 */
export function formatRoleName(roleName: string): string {
  return roleName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
