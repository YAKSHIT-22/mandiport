/**
 * Mandi data dates are calendar dates in India. Never label data "today" unless its
 * arrival date is today's date in IST (SPEC §6.1); otherwise show the actual date.
 */

const IST_TIME_ZONE = "Asia/Kolkata";

/** Today's date in IST as YYYY-MM-DD. */
export function todayInIst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-17" → "17 Sep 2026" (SPEC §13 date label format). */
export function formatDataDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day || month > 12) throw new Error(`Invalid ISO date: ${isoDate}`);
  return `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`;
}

/** "today" only when the data is from today in IST; otherwise the formatted date. */
export function describeDataDate(isoDate: string, now: Date = new Date()): string {
  return isoDate === todayInIst(now) ? "today" : formatDataDate(isoDate);
}
