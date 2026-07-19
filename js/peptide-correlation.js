// Peptide correlation engine (Phase 3, spec sections 26-30). Compares existing training/
// nutrition/recovery/bodyweight data across a user-defined window of a peptide cycle
// against a pre-cycle baseline — purely time-based association, never causation.
//
// Hard rules enforced throughout (spec section 30):
// - Only approved, neutral language is ever produced (coincided with / occurred during /
//   was associated with / increased or decreased during the selected period / no clear
//   pattern detected / insufficient data / multiple variables changed simultaneously).
// - Disallowed language (caused, proved, guaranteed, dose suggestions, "this protocol is
//   effective") is never generated.
// - When more than one tracked variable changes in the same window, the narrative says so
//   explicitly rather than crediting a single variable.
// - Every comparison states its own sample size; missing data reads as "insufficient
//   data," never as a silent zero.
import { parseLogDate } from "./dates.js";

export const COMPARISON_WINDOWS = ["active_cycle", "recovery_period", "post_cycle", "custom"];
export const COMPARISON_WINDOW_LABELS = {
  pre_cycle: "Pre-cycle baseline", active_cycle: "Active-cycle period", recovery_period: "Recovery period",
  post_cycle: "Post-cycle period", custom: "Custom date range"
};

export const APPROVED_PHRASES = [
  "coincided with", "occurred during", "was associated with", "increased during the selected period",
  "decreased during the selected period", "no clear pattern detected", "insufficient data",
  "multiple variables changed simultaneously"
];
export const DISALLOWED_PHRASES = [
  "caused", "proved", "guaranteed", "the peptide produced", "this protocol is effective",
  "continue because it worked", "increase the dose", "reduce the dose"
];

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
function inRange(dateStr, start, end) {
  const d = parseLogDate(dateStr);
  return d && d >= start && d <= end;
}

/** Resolves a named comparison window into concrete [start,end] Dates, purely from the peptide record's own user-entered dates — never decides or suggests a cycle length. */
export function resolveWindow(record, windowType, referenceDate = new Date(), customRange = null) {
  const start0 = parseLogDate(record.startDate);
  const plannedEnd = parseLogDate(record.plannedEndDate);
  const actualEnd = parseLogDate(record.actualEndDate);
  const recoveryStart = parseLogDate(record.recoveryStartDate);
  const recoveryEnd = parseLogDate(record.recoveryEndDate);
  const cycleEnd = actualEnd || plannedEnd || referenceDate;

  if (windowType === "custom") {
    const start = parseLogDate(customRange?.start);
    const end = parseLogDate(customRange?.end);
    return { start, end };
  }
  if (windowType === "active_cycle" && start0) {
    return { start: start0, end: cycleEnd < referenceDate ? cycleEnd : referenceDate };
  }
  if (windowType === "recovery_period" && recoveryStart) {
    return { start: recoveryStart, end: (recoveryEnd && recoveryEnd < referenceDate) ? recoveryEnd : referenceDate };
  }
  if (windowType === "post_cycle" && actualEnd) {
    const spanDays = start0 ? Math.round((cycleEnd - start0) / 86400000) : 28;
    const end = new Date(actualEnd); end.setDate(end.getDate() + spanDays);
    return { start: actualEnd, end: end < referenceDate ? end : referenceDate };
  }
  if (windowType === "pre_cycle" && start0) {
    const spanDays = plannedEnd ? Math.max(1, Math.round((plannedEnd - start0) / 86400000)) : 28;
    const start = new Date(start0); start.setDate(start.getDate() - spanDays);
    const end = new Date(start0); end.setDate(end.getDate() - 1);
    return { start, end };
  }
  return { start: null, end: null };
}

/** Aggregates the app's own existing logs into simple range-scoped metrics — a date-filter + average, not a reimplementation of any existing "last N days" calculation. */
export function windowMetrics(data, start, end) {
  if (!start || !end || start > end) return null;
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const weeks = days / 7;

  const recoveryLogs = (data.recoveryLogs || []).filter(r => inRange(r.date, start, end));
  const recoveryScoreAvg = recoveryLogs.length ? Math.round(avg(recoveryLogs.map(r => Number(r.recoveryScore) || 0)) * 10) / 10 : null;

  const sleepLogs = (data.sleepLogs || []).filter(s => inRange(s.date, start, end));
  const sleepHours = sleepLogs.map(s => Number(s.calculatedDurationHours)).filter(v => v > 0);
  const sleepDurationAvg = sleepHours.length ? Math.round(avg(sleepHours) * 10) / 10 : null;

  const workouts = (data.workouts || []).filter(w => inRange(w.date, start, end));
  const totalSets = workouts.reduce((sum, w) => sum + (w.exercises || []).reduce((s2, e) =>
    s2 + [e.set1Weight, e.set2Weight, e.optionalSet3Weight].filter(v => v != null && v !== "").length, 0), 0);
  const trainingVolumeAvgPerWeek = weeks > 0 ? Math.round(totalSets / weeks) : null;
  const sessionsLogged = workouts.length;
  const programDaysPerWeek = Object.keys(data.trainingProgram || {}).length || 1;
  const expectedSessions = Math.round(programDaysPerWeek * weeks);
  const sessionCompletionPct = expectedSessions > 0 ? Math.round((sessionsLogged / expectedSessions) * 100) : null;

  const mealLogs = (data.mealLogs || []).filter(m => inRange(m.date, start, end));
  const dailyCalories = {}, dailyProtein = {};
  mealLogs.forEach(m => {
    dailyCalories[m.date] = (dailyCalories[m.date] || 0) + (Number(m.calories) || 0);
    dailyProtein[m.date] = (dailyProtein[m.date] || 0) + (Number(m.protein) || 0);
  });
  const nutritionDayCount = Object.keys(dailyCalories).length;
  const caloriesAvg = nutritionDayCount ? Math.round(avg(Object.values(dailyCalories))) : null;
  const proteinAvg = nutritionDayCount ? Math.round(avg(Object.values(dailyProtein))) : null;

  const bwLogs = (data.bodyweightLogs || []).filter(b => inRange(b.date, start, end)).slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  let bodyweightRateOfChange = null;
  if (bwLogs.length >= 2) {
    const first = Number(bwLogs[0].morningBodyweight), last = Number(bwLogs.at(-1).morningBodyweight);
    if (!Number.isNaN(first) && !Number.isNaN(last) && weeks > 0) bodyweightRateOfChange = Math.round(((last - first) / weeks) * 100) / 100;
  }

  return {
    start: start.toLocaleDateString("en-CA"), end: end.toLocaleDateString("en-CA"), days,
    recoveryScoreAvg, recoveryLogCount: recoveryLogs.length,
    sleepDurationAvg, sleepLogCount: sleepLogs.length,
    trainingVolumeAvgPerWeek, sessionsLogged, sessionCompletionPct,
    caloriesAvg, proteinAvg, nutritionDayCount,
    bodyweightRateOfChange, bodyweightLogCount: bwLogs.length
  };
}

const METRIC_DEFS = [
  { key: "recoveryScoreAvg", label: "Average recovery score", countKey: "recoveryLogCount" },
  { key: "sleepDurationAvg", label: "Average sleep duration", countKey: "sleepLogCount" },
  { key: "trainingVolumeAvgPerWeek", label: "Average weekly training volume", countKey: "sessionsLogged" },
  { key: "sessionCompletionPct", label: "Session completion rate", countKey: "sessionsLogged" },
  { key: "caloriesAvg", label: "Average daily calories", countKey: "nutritionDayCount" },
  { key: "proteinAvg", label: "Average daily protein", countKey: "nutritionDayCount" },
  { key: "bodyweightRateOfChange", label: "Weekly bodyweight change", countKey: "bodyweightLogCount" }
];

/** Neutral increased/decreased/no-clear-pattern/insufficient-data comparison per metric — never a percentage framed as significance, just the approved-language state. */
export function compareMetrics(baseline, current) {
  return METRIC_DEFS.map(def => {
    const b = baseline?.[def.key], c = current?.[def.key];
    const hasData = b != null && c != null && (baseline[def.countKey] || 0) > 0 && (current[def.countKey] || 0) > 0;
    if (!hasData) return { key: def.key, label: def.label, baselineValue: b, currentValue: c, trend: "Insufficient data" };
    const delta = c - b;
    const deadZone = Math.max(Math.abs(b) * 0.03, 0.1);
    let trend = "No clear pattern detected";
    if (delta > deadZone) trend = "Increased during the selected period";
    else if (delta < -deadZone) trend = "Decreased during the selected period";
    return { key: def.key, label: def.label, baselineValue: b, currentValue: c, trend };
  });
}

/** Builds the narrative exactly in the shape of the spec's own worked examples (sections 27/28), competing-variables sentence included whenever more than one tracked metric moved. */
export function correlationNarrative(comparison) {
  const lines = [];
  const changed = comparison.filter(c => c.trend === "Increased during the selected period" || c.trend === "Decreased during the selected period");
  const insufficient = comparison.filter(c => c.trend === "Insufficient data");

  if (!changed.length) {
    lines.push("No clear pattern detected across tracked metrics during the selected period.");
  } else {
    changed.forEach(c => lines.push(`${c.label} ${c.trend.toLowerCase()}.`));
    if (changed.length > 1) {
      lines.push(`Multiple variables changed simultaneously (${changed.map(c => c.label.toLowerCase()).join(", ")}), so no single tracked variable can be isolated as the cause.`);
    }
  }
  if (insufficient.length) lines.push(`Insufficient data for: ${insufficient.map(c => c.label.toLowerCase()).join(", ")}.`);
  lines.push("These are time-based associations within the selected period and do not establish causation.");
  return lines;
}

function hasSufficientData(metrics) {
  if (!metrics) return false;
  return (metrics.recoveryLogCount + metrics.sleepLogCount + metrics.sessionsLogged + metrics.nutritionDayCount + metrics.bodyweightLogCount) > 0;
}

/** Top-level orchestrator: pre-cycle baseline vs. a user-selected window, using only this peptide record's own dates. Returns an explicit insufficient-data state rather than ever guessing. */
export function buildCorrelationReport(data, record, windowType, referenceDate = new Date(), customRange = null) {
  const currentWindow = resolveWindow(record, windowType, referenceDate, customRange);
  const baselineWindow = resolveWindow(record, "pre_cycle", referenceDate);
  const current = windowMetrics(data, currentWindow.start, currentWindow.end);
  const baseline = windowMetrics(data, baselineWindow.start, baselineWindow.end);

  if (!current || !baseline || !hasSufficientData(current) || !hasSufficientData(baseline)) {
    return { insufficientData: true, message: "There is not enough aligned data to compare this period yet." };
  }
  const comparison = compareMetrics(baseline, current);
  const narrative = correlationNarrative(comparison);
  return { insufficientData: false, baseline, current, comparison, narrative };
}
