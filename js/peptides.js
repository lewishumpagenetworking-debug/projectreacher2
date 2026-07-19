// Peptide Recovery Tracking (Phase 1): CRUD + pure calculation helpers for peptide cycle
// records, user-defined administration schedules, and the administration log.
//
// Hard rule throughout this module (spec section 1): every value here is either something
// the user typed, or a read-only calculation over dates/amounts the user already typed.
// Nothing here ever selects a peptide, dose, schedule, or cycle length on the user's
// behalf, and nothing infers dosing guidance from a peptide's name.
import { uid } from "./data.js";
import { parseLogDate } from "./dates.js";

export const PEPTIDE_STATUSES = [
  "draft", "scheduled", "active", "paused", "completed", "cancelled", "recovery_period", "archived"
];

export const STATUS_LABELS = {
  draft: "Draft", scheduled: "Scheduled", active: "Active", paused: "Paused",
  completed: "Completed", cancelled: "Cancelled", recovery_period: "Recovery Period", archived: "Archived"
};

export const ADMIN_LOG_STATUSES = ["taken", "partial", "missed", "skipped", "postponed", "cancelled", "not_scheduled"];
export const ADMIN_LOG_STATUS_LABELS = {
  taken: "Taken", partial: "Partially taken", missed: "Missed", skipped: "Skipped",
  postponed: "Postponed", cancelled: "Cancelled", not_scheduled: "Not scheduled"
};
// Statuses that count as an actual dose taken — everything else is excluded from totals
// (spec section 16: "Missed and skipped entries must not contribute to total amount taken.").
const COMPLETED_LOG_STATUSES = new Set(["taken", "partial"]);

export const AMOUNT_UNITS = ["mcg", "mg", "g", "IU", "mL", "syringe_units", "custom"];
export const TIME_CATEGORIES = ["morning", "midday", "afternoon", "evening", "before_bed", "custom"];
export const WORKOUT_RELATIONSHIPS = ["pre_workout", "post_workout", "non_training_day", "no_relationship", "custom"];
export const MEAL_RELATIONSHIPS = ["before_meal", "with_meal", "after_meal", "fasted", "no_relationship", "custom"];

export const TIME_CATEGORY_LABELS = {
  morning: "Morning", midday: "Midday", afternoon: "Afternoon", evening: "Evening", before_bed: "Before bed", custom: "Custom"
};
export const WORKOUT_RELATIONSHIP_LABELS = {
  pre_workout: "Pre-workout", post_workout: "Post-workout", non_training_day: "Non-training day",
  no_relationship: "No workout relationship", custom: "Custom"
};
export const MEAL_RELATIONSHIP_LABELS = {
  before_meal: "Before meal", with_meal: "With meal", after_meal: "After meal",
  fasted: "Fasted", no_relationship: "No meal relationship", custom: "Custom"
};

// ==================== PEPTIDE RECORD CRUD ====================

export function getPeptideRecord(data, id) {
  return (data.peptideRecords || []).find(p => p.id === id) || null;
}

export function createPeptideRecord(data, fields) {
  const now = new Date().toISOString();
  const record = {
    id: uid(), name: "", abbreviation: "", status: "draft", purposeNote: "",
    startDate: null, plannedEndDate: null, actualEndDate: null,
    recoveryStartDate: null, recoveryEndDate: null, recoveryNotes: "",
    pauseDate: null, resumeDate: null, reasonForPause: "", reasonForEarlyCompletion: "",
    cycleLabel: "", cycleNotes: "", notes: "", dashboardHidden: false,
    createdAt: now, updatedAt: now,
    ...fields
  };
  data.peptideRecords.push(record);
  return record;
}

export function updatePeptideRecord(data, id, patch) {
  const record = getPeptideRecord(data, id);
  if (!record) return null;
  Object.assign(record, patch, { updatedAt: new Date().toISOString() });
  return record;
}

/** Cascades to the record's own schedules/logs so nothing is left pointing at a deleted peptide. */
export function deletePeptideRecord(data, id) {
  data.peptideRecords = (data.peptideRecords || []).filter(p => p.id !== id);
  data.administrationSchedules = (data.administrationSchedules || []).filter(s => s.peptideId !== id);
  data.administrationLogs = (data.administrationLogs || []).filter(l => l.peptideId !== id);
}

/** Duplicate record as a new draft (spec section 3) — copies descriptive fields only, never dates/logs/status. */
export function duplicatePeptideAsDraft(data, id) {
  const source = getPeptideRecord(data, id);
  if (!source) return null;
  return createPeptideRecord(data, {
    name: `${source.name} (copy)`, abbreviation: source.abbreviation, purposeNote: source.purposeNote,
    cycleLabel: source.cycleLabel, notes: ""
  });
}

// ==================== ADMINISTRATION SCHEDULE CRUD ====================

export function getSchedulesForPeptide(data, peptideId) {
  return (data.administrationSchedules || []).filter(s => s.peptideId === peptideId);
}

export function createAdministrationSchedule(data, fields) {
  const now = new Date().toISOString();
  const schedule = {
    id: uid(), peptideId: null, name: "", activeFrom: null, activeUntil: null,
    weekdays: [0, 1, 2, 3, 4, 5, 6], plannedTime: null, timeCategory: null,
    mealRelationship: null, workoutRelationship: null,
    plannedAmount: null, plannedAmountUnit: "mcg", reminderEnabled: false, notes: "",
    createdAt: now, updatedAt: now,
    ...fields
  };
  data.administrationSchedules.push(schedule);
  return schedule;
}

export function updateAdministrationSchedule(data, id, patch) {
  const schedule = (data.administrationSchedules || []).find(s => s.id === id);
  if (!schedule) return null;
  Object.assign(schedule, patch, { updatedAt: new Date().toISOString() });
  return schedule;
}

export function deleteAdministrationSchedule(data, id) {
  data.administrationSchedules = (data.administrationSchedules || []).filter(s => s.id !== id);
}

// ==================== ADMINISTRATION LOG CRUD ====================

export function getLogsForPeptide(data, peptideId) {
  return (data.administrationLogs || []).filter(l => l.peptideId === peptideId);
}

export function createAdministrationLog(data, fields) {
  const now = new Date().toISOString();
  const log = {
    id: uid(), peptideId: null, scheduleId: null, date: null, exactTime: null, status: "taken",
    amount: null, amountUnit: "mcg", timeCategory: null,
    mealRelationship: null, mealName: "", minutesFromMeal: null,
    workoutRelationship: null, workoutId: null, minutesFromWorkout: null,
    bodyweight: null, notes: "",
    createdAt: now, updatedAt: now,
    ...fields
  };
  data.administrationLogs.push(log);
  return log;
}

export function updateAdministrationLog(data, id, patch) {
  const log = (data.administrationLogs || []).find(l => l.id === id);
  if (!log) return null;
  Object.assign(log, patch, { updatedAt: new Date().toISOString() });
  return log;
}

export function deleteAdministrationLog(data, id) {
  data.administrationLogs = (data.administrationLogs || []).filter(l => l.id !== id);
}

// ==================== CYCLE / STATUS CALCULATIONS ====================

function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** "5 weeks 4 days" style label matching the spec's own examples — never singular/plural mismatched. */
export function formatDurationLabel(totalDays) {
  if (totalDays == null || Number.isNaN(totalDays)) return "--";
  const sign = totalDays < 0 ? "-" : "";
  const days = Math.abs(totalDays);
  const weeks = Math.floor(days / 7);
  const remDays = days % 7;
  const parts = [];
  if (weeks) parts.push(`${weeks} week${weeks === 1 ? "" : "s"}`);
  if (remDays || !weeks) parts.push(`${remDays} day${remDays === 1 ? "" : "s"}`);
  return `${sign}${parts.join(" ")}`;
}

/**
 * Cycle progress purely from the user's own dates (spec section 8) — the app never
 * calculates or suggests what the cycle length SHOULD be, only reports on the one
 * the user already entered.
 */
export function cycleProgress(record, referenceDate = new Date()) {
  const start = parseLogDate(record.startDate);
  const plannedEnd = parseLogDate(record.plannedEndDate);
  const actualEnd = parseLogDate(record.actualEndDate);
  const end = actualEnd || plannedEnd;
  if (!start || !end) return { totalPlannedDays: null, daysElapsed: null, daysRemaining: null, pct: null, isPastPlannedEnd: false };

  const totalPlannedDays = daysBetween(start, end);
  const daysElapsed = Math.max(0, daysBetween(start, referenceDate));
  const daysRemaining = daysBetween(referenceDate, end);
  const pct = totalPlannedDays > 0 ? Math.max(0, Math.min(100, Math.round((daysElapsed / totalPlannedDays) * 100))) : null;
  const isPastPlannedEnd = !actualEnd && plannedEnd && referenceDate > plannedEnd;
  return { totalPlannedDays, daysElapsed, daysRemaining, pct, isPastPlannedEnd };
}

/**
 * Display status derived from the user's own dates + their last manual state change
 * (spec section 3: "Status is determined from user-entered dates and manual state
 * changes."). A manual terminal/paused state always wins over date-derived states —
 * the app never overrides an explicit user action.
 */
export function computeDisplayStatus(record, referenceDate = new Date()) {
  if (["draft", "cancelled", "archived", "paused"].includes(record.status)) return record.status;
  const recoveryStart = parseLogDate(record.recoveryStartDate);
  const recoveryEnd = parseLogDate(record.recoveryEndDate);
  if (recoveryStart && referenceDate >= recoveryStart && (!recoveryEnd || referenceDate <= recoveryEnd)) return "recovery_period";
  if (record.actualEndDate) return "completed";
  const start = parseLogDate(record.startDate);
  if (start && referenceDate < start) return "scheduled";
  return "active";
}

export function displayStatusLabel(record, referenceDate = new Date()) {
  return STATUS_LABELS[computeDisplayStatus(record, referenceDate)] || record.status;
}

// ==================== ADMINISTRATION SCHEDULE / ADHERENCE ====================

function eachDate(from, to) {
  const dates = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Every calendar date within [fromDate, toDate] on which `schedule` calls for an administration. */
export function scheduledDatesInRange(schedule, fromDate, toDate) {
  const activeFrom = parseLogDate(schedule.activeFrom) || fromDate;
  const activeUntil = parseLogDate(schedule.activeUntil) || toDate;
  const rangeStart = activeFrom > fromDate ? activeFrom : fromDate;
  const rangeEnd = activeUntil < toDate ? activeUntil : toDate;
  if (rangeStart > rangeEnd) return [];
  const weekdays = new Set(schedule.weekdays && schedule.weekdays.length ? schedule.weekdays : [0, 1, 2, 3, 4, 5, 6]);
  return eachDate(rangeStart, rangeEnd).filter(d => weekdays.has(d.getDay()));
}

/**
 * Adherence % (spec section 18): completed administrations vs. the number the user's own
 * schedule(s) called for in the given range. Future dates never count as expected — only
 * dates up to and including `referenceDate`.
 */
export function adherencePct(peptideId, schedules, logs, fromDate, toDate, referenceDate = new Date()) {
  const effectiveEnd = toDate < referenceDate ? toDate : referenceDate;
  if (fromDate > effectiveEnd) return null;
  const peptideSchedules = schedules.filter(s => s.peptideId === peptideId);
  const expectedDates = new Set();
  peptideSchedules.forEach(s => scheduledDatesInRange(s, fromDate, effectiveEnd).forEach(d => expectedDates.add(d.toLocaleDateString("en-CA"))));
  if (!expectedDates.size) return null;

  const peptideLogs = logs.filter(l => l.peptideId === peptideId);
  const completedDates = new Set(peptideLogs.filter(l => COMPLETED_LOG_STATUSES.has(l.status)).map(l => l.date));
  let completed = 0;
  expectedDates.forEach(d => { if (completedDates.has(d)) completed++; });
  return Math.round((completed / expectedDates.size) * 100);
}

/** Next date/time this peptide is due, per the user's own schedule(s), that doesn't already have a log. */
export function nextScheduledAdministration(peptideId, schedules, logs, referenceDate = new Date()) {
  const peptideSchedules = schedules.filter(s => s.peptideId === peptideId);
  if (!peptideSchedules.length) return null;
  const loggedDates = new Set(logs.filter(l => l.peptideId === peptideId).map(l => l.date));
  const horizon = new Date(referenceDate.getTime() + 60 * 86400000);

  let best = null;
  peptideSchedules.forEach(s => {
    scheduledDatesInRange(s, referenceDate, horizon).forEach(d => {
      const iso = d.toLocaleDateString("en-CA");
      if (loggedDates.has(iso)) return;
      if (!best || d < best.dateObj) {
        best = {
          dateObj: d, date: iso, scheduleId: s.id,
          plannedTime: s.plannedTime, timeCategory: s.timeCategory,
          mealRelationship: s.mealRelationship, workoutRelationship: s.workoutRelationship,
          plannedAmount: s.plannedAmount, plannedAmountUnit: s.plannedAmountUnit
        };
      }
    });
  });
  if (!best) return null;
  const { dateObj, ...rest } = best;
  return rest;
}

/** Whether/how this peptide is due today, and what (if anything) has already been logged today. */
export function todaysAdministrationState(peptideId, schedules, logs, referenceDate = new Date()) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const peptideSchedules = schedules.filter(s => s.peptideId === peptideId);
  const scheduledToday = peptideSchedules.some(s => scheduledDatesInRange(s, referenceDate, referenceDate).length > 0);
  const loggedToday = logs.filter(l => l.peptideId === peptideId && l.date === todayISO);
  return { scheduledToday, loggedToday, hasLoggedToday: loggedToday.length > 0 };
}

/**
 * Amount totals grouped by unit (spec section 30: "Incompatible units must not be silently
 * combined") — only counts completed logs (spec section 16/18), never future/scheduled ones.
 */
export function totalsByUnit(logsSubset) {
  const byUnit = {};
  let count = 0, firstTime = null, lastTime = null;
  logsSubset.forEach(l => {
    if (!COMPLETED_LOG_STATUSES.has(l.status)) return;
    count++;
    if (l.amount != null && l.amountUnit) byUnit[l.amountUnit] = (byUnit[l.amountUnit] || 0) + Number(l.amount);
    if (l.exactTime) {
      if (!firstTime || l.exactTime < firstTime) firstTime = l.exactTime;
      if (!lastTime || l.exactTime > lastTime) lastTime = l.exactTime;
    }
  });
  return { byUnit, count, firstTime, lastTime };
}

export function dailyTotals(peptideId, logs, dateISO) {
  return totalsByUnit(logs.filter(l => l.peptideId === peptideId && l.date === dateISO));
}

export function weeklyTotals(peptideId, logs, fromDate, toDate) {
  const inRange = logs.filter(l => l.peptideId === peptideId && withinDateRange(l.date, fromDate, toDate));
  const totals = totalsByUnit(inRange);
  const missed = inRange.filter(l => l.status === "missed").length;
  const skipped = inRange.filter(l => l.status === "skipped").length;
  return { ...totals, missed, skipped };
}

export function cycleTotals(record, schedules, logs, referenceDate = new Date()) {
  const start = parseLogDate(record.startDate);
  if (!start) return { byUnit: {}, count: 0, missed: 0, skipped: 0, adherencePct: null };
  const end = parseLogDate(record.actualEndDate) || parseLogDate(record.plannedEndDate) || referenceDate;
  const inRange = logs.filter(l => l.peptideId === record.id && withinDateRange(l.date, start, end));
  const totals = totalsByUnit(inRange);
  const missed = inRange.filter(l => l.status === "missed").length;
  const skipped = inRange.filter(l => l.status === "skipped").length;
  const adherence = adherencePct(record.id, schedules, logs, start, end, referenceDate);
  return { ...totals, missed, skipped, adherencePct: adherence };
}

function withinDateRange(dateStr, fromDate, toDate) {
  const d = parseLogDate(dateStr);
  if (!d) return false;
  return d >= new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()) &&
    d <= new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
}

// ==================== CYCLE COUNTDOWN (spec section 10) ====================
// Strictly neutral, date-based wording only — no prescriptive "you should stop" language,
// exactly matching the spec's own notification examples.

const COUNTDOWN_DAY_THRESHOLDS = [21, 14, 7, 3, 0];

/** Countdown notices that apply exactly today, from the record's own dates only. */
export function dueCountdownMilestones(record, referenceDate = new Date()) {
  const notices = [];
  const plannedEnd = parseLogDate(record.plannedEndDate);
  if (plannedEnd && !record.actualEndDate) {
    const remaining = daysBetween(referenceDate, plannedEnd);
    if (COUNTDOWN_DAY_THRESHOLDS.includes(remaining)) {
      notices.push({
        id: `cycle-${remaining}`,
        message: remaining === 0
          ? `${record.name} cycle reaches its user-entered end date today.`
          : `${record.name} cycle: ${formatDurationLabel(remaining)} remaining.`
      });
    }
  }
  const recoveryStart = parseLogDate(record.recoveryStartDate);
  if (recoveryStart && daysBetween(referenceDate, recoveryStart) === 0) {
    notices.push({ id: "recovery-start", message: `${record.name} recovery period begins today.` });
  }
  const recoveryEnd = parseLogDate(record.recoveryEndDate);
  if (recoveryEnd && daysBetween(referenceDate, recoveryEnd) === 0) {
    notices.push({ id: "recovery-end", message: `${record.name} user-defined recovery period ends today.` });
  }
  return notices;
}
