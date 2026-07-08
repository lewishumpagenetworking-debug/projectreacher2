// Robust date parsing for log entries.
//
// Root cause of the "sessions not showing up this week" bug: the OLD app saved
// dates via `new Date().toLocaleDateString()` (no locale arg), which renders
// DD/MM/YYYY in a UK-locale browser (e.g. "06/07/2026" for 6 July 2026). But
// `new Date("06/07/2026")` — the native JS parser — reads slash-separated
// dates as MM/DD/YYYY, silently turning 6 July into 7 June. Every place that
// did `new Date(entry.date)` directly was affected. This project's dates are
// always DD/MM/YYYY when slash-separated (never MM/DD/YYYY) — parseLogDate()
// is the one place that decides how a stored date string becomes a Date, so
// every date comparison in the app must go through it instead of `new Date()`.

/** Parses a stored log date (ISO "YYYY-MM-DD" or legacy "DD/MM/YYYY") into a local-midnight Date. Returns null if unparseable. */
export function parseLogDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string" || !value.trim()) return null;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Last resort — only reached for formats we don't recognise (not slash-ambiguous).
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/** True if `value` is a slash-separated date string ("6/7/2026") — the ambiguous legacy format. */
export function isLegacySlashDate(value) {
  return typeof value === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value.trim());
}

/** Midnight Monday of the week containing `date` (local time). */
export function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

/** True if two Dates fall in the same Monday-Sunday calendar week. */
export function isSameWeek(a, b) {
  if (!a || !b) return false;
  return startOfWeek(a).getTime() === startOfWeek(b).getTime();
}

export function formatDMY(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}
