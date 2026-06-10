/**
 * Kickoff Scheduling Date/Time Formatters
 * Shared utility functions for formatting dates and times
 */

/**
 * Format a date string for display
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "Mon, Jan 15, 2024")
 */
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a time string for display
 * @param timeStr - Time string in HH:MM format
 * @returns Formatted time string (e.g., "09:00 AM")
 */
export function formatTimeDisplay(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a time range for display
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @returns Formatted time range (e.g., "09:00 AM - 10:30 AM")
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTimeDisplay(startTime)} - ${formatTimeDisplay(endTime)}`;
}

/**
 * Get today's date in YYYY-MM-DD format for min date inputs
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Build a full ISO datetime string from a separate date + time the
 * user picked in their local timezone. The earlier naive
 * concatenation (`${date}T${time}:00`) shipped without a timezone
 * designator, so the backend treated it as UTC and the read-back via
 * `new Date(...).toLocaleTimeString(...)` rendered the wrong clock
 * time in any non-UTC zone. Parsing as a local Date and serialising
 * with `.toISOString()` (UTC + `Z`) lets the round-trip preserve the
 * clock time the user actually picked.
 *
 * @param date - Date in YYYY-MM-DD format
 * @param time - Time in HH:MM format
 * @returns ISO datetime string with UTC offset (e.g., "2026-06-12T13:00:00.000Z")
 */
export function createISODateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}
