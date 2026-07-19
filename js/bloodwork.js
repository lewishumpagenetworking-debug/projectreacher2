// Bloodwork module (Peptide Recovery Tracking, Phase 2): CRUD + pure calculation helpers
// for user-entered bloodwork reports/markers and user-defined test reminders.
//
// Hard rule (spec sections 21-25): the app never prescribes a testing interval, never
// extracts/OCRs a value from an uploaded file, and never diagnoses a condition — every
// marker value is typed in by the user, and comparison wording stays neutral
// (increased/decreased/stable/no comparable data, inside/outside the LAB's own range).
import { uid } from "./data.js";
import { parseLogDate } from "./dates.js";
import { deleteBloodworkFileBlob } from "./bloodwork-files.js";

export const CYCLE_PHASES = ["pre_cycle", "during_cycle", "near_end", "recovery_period", "none"];
export const CYCLE_PHASE_LABELS = {
  pre_cycle: "Before cycle", during_cycle: "During cycle", near_end: "Near cycle end",
  recovery_period: "Recovery period", none: "Not linked to a cycle phase"
};

export const MARKER_CATEGORIES = [
  "Full blood count", "Liver markers", "Kidney markers", "Lipids", "Glucose regulation",
  "Hormonal markers", "Thyroid markers", "Inflammation markers", "Electrolytes",
  "Vitamins and minerals", "Custom category"
];

export const RECURRENCE_OPTIONS = ["none", "monthly", "every_n_weeks", "every_n_months", "custom"];
export const RECURRENCE_LABELS = {
  none: "One-off (no recurrence)", monthly: "Monthly", every_n_weeks: "Every N weeks",
  every_n_months: "Every N months", custom: "Custom (I'll manage the date myself)"
};

// ==================== BLOODWORK REPORT CRUD ====================

export function getBloodworkReport(data, id) {
  return (data.bloodworkReports || []).find(r => r.id === id) || null;
}

export function createBloodworkReport(data, fields) {
  const now = new Date().toISOString();
  const report = {
    id: uid(), testDate: null, title: "", laboratoryName: "", orderingClinician: "",
    fastingStatus: null, collectionTime: null, notes: "",
    linkedPeptideIds: [], linkedCyclePhase: null,
    fileAttachmentId: null, fileName: "", fileType: "", fileSize: null,
    createdAt: now, updatedAt: now,
    ...fields
  };
  data.bloodworkReports.push(report);
  return report;
}

export function updateBloodworkReport(data, id, patch) {
  const report = getBloodworkReport(data, id);
  if (!report) return null;
  Object.assign(report, patch, { updatedAt: new Date().toISOString() });
  return report;
}

/** Cascades to the report's own markers and (if present) its stored file blob. */
export async function deleteBloodworkReport(data, id) {
  const report = getBloodworkReport(data, id);
  if (report?.fileAttachmentId) {
    try { await deleteBloodworkFileBlob(report.fileAttachmentId); }
    catch (err) { console.warn("[Project Reacher] Could not delete bloodwork file blob.", err); }
  }
  data.bloodworkReports = (data.bloodworkReports || []).filter(r => r.id !== id);
  data.bloodworkMarkers = (data.bloodworkMarkers || []).filter(m => m.reportId !== id);
}

// ==================== BLOODWORK MARKER CRUD ====================

export function getMarkersForReport(data, reportId) {
  return (data.bloodworkMarkers || []).filter(m => m.reportId === reportId);
}

export function createBloodworkMarker(data, fields) {
  const now = new Date().toISOString();
  const marker = {
    id: uid(), reportId: null, category: "", markerName: "", result: null, unit: "",
    referenceLow: null, referenceHigh: null, laboratoryFlag: "", userConfirmed: true, notes: "",
    createdAt: now,
    ...fields
  };
  data.bloodworkMarkers.push(marker);
  return marker;
}

export function updateBloodworkMarker(data, id, patch) {
  const marker = (data.bloodworkMarkers || []).find(m => m.id === id);
  if (!marker) return null;
  Object.assign(marker, patch);
  return marker;
}

export function deleteBloodworkMarker(data, id) {
  data.bloodworkMarkers = (data.bloodworkMarkers || []).filter(m => m.id !== id);
}

// ==================== QUERIES ====================

export function getReportsForPeptide(data, peptideId) {
  return (data.bloodworkReports || [])
    .filter(r => (r.linkedPeptideIds || []).includes(peptideId))
    .slice()
    .sort((a, b) => (b.testDate || "").localeCompare(a.testDate || ""));
}

/** Groups a peptide's linked reports by cycle phase (spec section 25). */
export function reportsByCyclePhase(reports) {
  const groups = {};
  CYCLE_PHASES.forEach(p => { groups[p] = []; });
  reports.forEach(r => { (groups[r.linkedCyclePhase || "none"] ||= []).push(r); });
  return groups;
}

export function allMarkerNames(data) {
  return [...new Set((data.bloodworkMarkers || []).map(m => m.markerName).filter(Boolean))].sort();
}

function reportDateFor(data, marker) {
  return getBloodworkReport(data, marker.reportId)?.testDate || null;
}

/** Every entry for a marker name, oldest first, alongside its report's own test date — every entry shown, missing periods never interpolated (spec section 24). */
export function markerHistory(data, markerName) {
  return (data.bloodworkMarkers || [])
    .filter(m => m.markerName === markerName)
    .map(m => ({ ...m, testDate: reportDateFor(data, m) }))
    .filter(m => m.testDate)
    .sort((a, b) => (a.testDate || "").localeCompare(b.testDate || ""));
}

/** Numeric-only points for graphing (spec section 24) — text-only results can't plot on a line chart. */
export function markerNumericSeries(data, markerName) {
  return markerHistory(data, markerName)
    .map(m => ({ label: (m.testDate || "").slice(5), value: Number(m.result), unit: m.unit, testDate: m.testDate }))
    .filter(p => !Number.isNaN(p.value));
}

/** Neutral comparison wording (spec sections 25/30) — never a diagnosis, never causal. */
export function compareLatestTwo(numericSeries) {
  if (!numericSeries.length) return { trend: "No comparable data", latest: null, previous: null };
  const latest = numericSeries[numericSeries.length - 1];
  if (numericSeries.length < 2) return { trend: "No comparable data", latest, previous: null };
  const previous = numericSeries[numericSeries.length - 2];
  let trend = "Stable";
  if (latest.value > previous.value) trend = "Increased";
  else if (latest.value < previous.value) trend = "Decreased";
  return { trend, latest, previous };
}

/** Neutral in/outside-range wording using ONLY the laboratory's own supplied reference range. */
export function referenceRangeStatus(marker) {
  const value = Number(marker.result);
  if (Number.isNaN(value) || marker.referenceLow == null || marker.referenceHigh == null) return "No comparable data";
  return (value >= marker.referenceLow && value <= marker.referenceHigh)
    ? "Inside the laboratory-supplied reference range"
    : "Outside the laboratory-supplied reference range";
}

// ==================== BLOODWORK REMINDERS ====================

export function getBloodworkReminder(data, id) {
  return (data.bloodworkReminders || []).find(r => r.id === id) || null;
}

export function createBloodworkReminder(data, fields) {
  const now = new Date().toISOString();
  const reminder = {
    id: uid(), reminderDate: null, recurrence: "none", recurrenceN: null, notes: "",
    peptideId: null, linkedCyclePhase: null,
    createdAt: now, updatedAt: now,
    ...fields
  };
  data.bloodworkReminders.push(reminder);
  return reminder;
}

export function updateBloodworkReminder(data, id, patch) {
  const reminder = getBloodworkReminder(data, id);
  if (!reminder) return null;
  Object.assign(reminder, patch, { updatedAt: new Date().toISOString() });
  return reminder;
}

export function deleteBloodworkReminder(data, id) {
  data.bloodworkReminders = (data.bloodworkReminders || []).filter(r => r.id !== id);
}

/** Advances a recurring reminder's anchor date to the first occurrence on/after referenceDate. "custom" recurrence never auto-advances — the user manages that date themselves. */
export function nextReminderOccurrence(reminder, referenceDate = new Date()) {
  const anchor = parseLogDate(reminder.reminderDate);
  if (!anchor) return null;
  if (reminder.recurrence === "none" || reminder.recurrence === "custom") return anchor;

  let occurrence = anchor;
  let guard = 0;
  while (occurrence < referenceDate && guard < 240) {
    const next = new Date(occurrence);
    if (reminder.recurrence === "monthly") next.setMonth(next.getMonth() + 1);
    else if (reminder.recurrence === "every_n_weeks") next.setDate(next.getDate() + 7 * (reminder.recurrenceN || 1));
    else if (reminder.recurrence === "every_n_months") next.setMonth(next.getMonth() + (reminder.recurrenceN || 1));
    else break;
    occurrence = next;
    guard++;
  }
  return occurrence;
}

/** Reminders whose occurrence date has arrived and haven't yet been resolved by a matching report. */
export function dueBloodworkReminders(data, referenceDate = new Date()) {
  return (data.bloodworkReminders || []).reduce((out, r) => {
    const occurrence = nextReminderOccurrence(r, referenceDate);
    if (!occurrence || occurrence > referenceDate) return out;
    const occurrenceISO = occurrence.toLocaleDateString("en-CA");
    const resolved = (data.bloodworkReports || []).some(rep =>
      rep.testDate && rep.testDate >= occurrenceISO && (!r.peptideId || (rep.linkedPeptideIds || []).includes(r.peptideId)));
    if (!resolved) out.push({ ...r, occurrenceDate: occurrenceISO });
    return out;
  }, []);
}
