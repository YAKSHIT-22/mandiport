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

const MONTHS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  // Hindi month names as people read them on a calendar, not the Vikram Samvat months.
  hi: ["जन", "फ़र", "मार्च", "अप्रैल", "मई", "जून", "जुल", "अग", "सित", "अक्तू", "नव", "दिस"],
};

/** "2026-09-17" → "17 Sep 2026", or "17 सित 2026" (SPEC §13 date label format). */
export function formatDataDate(isoDate: string, locale = "en"): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day || month > 12) throw new Error(`Invalid ISO date: ${isoDate}`);
  const months = MONTHS[locale] ?? MONTHS.en;
  return `${String(day).padStart(2, "0")} ${months[month - 1]} ${year}`;
}

/** "today" only when the data is from today in IST; otherwise the formatted date. */
export function describeDataDate(isoDate: string, now: Date = new Date(), locale = "en"): string {
  if (isoDate === todayInIst(now)) return locale === "hi" ? "आज" : "today";
  return formatDataDate(isoDate, locale);
}

/** Days before `date` (YYYY-MM-DD), as YYYY-MM-DD. */
export function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Monday of the ISO week containing `date`. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}
