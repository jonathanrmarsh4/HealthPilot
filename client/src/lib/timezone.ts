import { parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export function formatTimestamp(
  date: string | Date,
  timezone: string,
  formatStr: string = "PPp"
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return formatInTimeZone(dateObj, timezone, formatStr);
}

export function formatTime(
  date: string | Date,
  timezone: string,
  formatStr: string = "h:mm a"
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return formatInTimeZone(dateObj, timezone, formatStr);
}

export function formatDate(
  date: string | Date,
  timezone: string,
  formatStr: string = "MMM d, yyyy"
): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return formatInTimeZone(dateObj, timezone, formatStr);
}

export function toUserTimezone(date: string | Date, timezone: string): Date {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(dateObj, timezone);
}
