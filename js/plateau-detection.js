// Plateau detection (spec section 14): one weak session is never a plateau. Exercise
// plateaus require several comparable exposures with no meaningful improvement; bodyweight
// plateaus use rolling averages, never a single week's reading.
import { parseLogDate } from "./dates.js";

function round2(n) { return Math.round(n * 100) / 100; }

/** True if `cur` shows meaningful improvement over `prev` on any tracked front. */
function exposureImproved(prev, cur) {
  const repsImproved = (Number(cur.set1Reps) || 0) > (Number(prev.set1Reps) || 0) || (Number(cur.set2Reps) || 0) > (Number(prev.set2Reps) || 0);
  const loadImproved = (Number(cur.set1Weight) || 0) > (Number(prev.set1Weight) || 0) || (Number(cur.set2Weight) || 0) > (Number(prev.set2Weight) || 0);
  const romImproved = cur.rangeOfMotionQuality != null && prev.rangeOfMotionQuality != null && Number(cur.rangeOfMotionQuality) > Number(prev.rangeOfMotionQuality);
  const executionImproved = cur.formQuality != null && prev.formQuality != null && Number(cur.formQuality) > Number(prev.formQuality);
  const rirImproved = cur.set1RIR != null && prev.set1RIR != null && Number(cur.set1RIR) < Number(prev.set1RIR);
  return repsImproved || loadImproved || romImproved || executionImproved || rirImproved;
}

/**
 * Exercise plateau (spec section 14). Comparable exposures = same exercise name (setup
 * changes aren't separately tracked yet, so all same-name entries are treated as
 * comparable — see js/note-parser.js for the "equipment inconsistency" signal that can
 * reduce confidence in a specific session's comparability instead).
 */
export function detectExercisePlateau(workouts, exerciseName, referenceDate = new Date()) {
  const entries = [];
  (workouts || []).forEach(w => (w.exercises || []).forEach(e => {
    if (e.name === exerciseName) entries.push({ ...e, date: w.date });
  }));
  const sorted = entries.slice().sort((a, b) => (parseLogDate(a.date) || 0) - (parseLogDate(b.date) || 0));

  if (sorted.length < 3) {
    return { plateau: false, strength: "insufficient-data", exposureCount: sorted.length, reason: "Fewer than 3 comparable exposures logged." };
  }

  const oldestRelevant = sorted[sorted.length - 3].date;
  const daysSpanned = (referenceDate - (parseLogDate(oldestRelevant) || referenceDate)) / 86400000;
  if (daysSpanned < 7) {
    return { plateau: false, strength: "insufficient-time", exposureCount: sorted.length, reason: "Not enough time has passed across the comparable exposures yet." };
  }

  const last3 = sorted.slice(-3);
  const improvedInLast3 = last3.slice(1).some((cur, i) => exposureImproved(last3[i], cur));
  if (improvedInLast3) {
    return { plateau: false, strength: "none", exposureCount: sorted.length, reason: "Reps, load, execution, ROM or RIR improved within the last 3 exposures." };
  }

  const progressionAttempted = last3.some(e => e.increaseNextWeek === true);
  if (!progressionAttempted) {
    return { plateau: false, strength: "none", exposureCount: sorted.length, reason: "Progression has not actually been attempted in the last 3 exposures yet." };
  }

  const window = sorted.slice(-6);
  const strongerWindow = window.length >= 4;
  const noImprovementAcrossWindow = strongerWindow && window.slice(1).every((cur, i) => !exposureImproved(window[i], cur));

  return {
    plateau: true,
    strength: strongerWindow && noImprovementAcrossWindow ? "stronger" : "possible",
    exposureCount: sorted.length,
    windowSize: strongerWindow && noImprovementAcrossWindow ? window.length : 3,
    reason: strongerWindow && noImprovementAcrossWindow
      ? `Flat or regressing performance across the last ${window.length} comparable exposures with progression attempted.`
      : "No meaningful improvement across the last 3 comparable exposures with progression attempted."
  };
}

/**
 * Bodyweight plateau (spec section 14). Uses 7-day rolling averages against the previous
 * 7-day window, and prefers 14-21 days of history before drawing a calorie conclusion —
 * never a single abnormal week.
 */
export function detectBodyweightPlateau(bodyweightLogs, targetWeeklyGain = 0.25, referenceDate = new Date()) {
  const dated = (bodyweightLogs || []).map(b => ({ ...b, d: parseLogDate(b.date) })).filter(x => x.d).sort((a, b) => a.d - b.d);
  if (!dated.length) return { status: "insufficient-data", reason: "No bodyweight logs." };

  const cutoff14 = new Date(referenceDate); cutoff14.setDate(cutoff14.getDate() - 14);
  if (dated[0].d > cutoff14) {
    return { status: "insufficient-data", reason: "Fewer than 14 days of bodyweight history — too early for a calorie conclusion." };
  }

  const windowFor = (daysAgoStart, daysAgoEnd) => {
    const start = new Date(referenceDate); start.setDate(start.getDate() - daysAgoStart);
    const end = new Date(referenceDate); end.setDate(end.getDate() - daysAgoEnd);
    return dated.filter(x => x.d >= start && x.d <= end).map(x => Number(x.morningBodyweight));
  };
  const currentWeek = windowFor(7, 0);
  const previousWeek = windowFor(14, 8);
  if (currentWeek.length < 2 || previousWeek.length < 2) {
    return { status: "insufficient-data", reason: "Not enough weigh-ins in the current or previous 7-day window." };
  }
  const currentAvg = currentWeek.reduce((a, b) => a + b, 0) / currentWeek.length;
  const previousAvg = previousWeek.reduce((a, b) => a + b, 0) / previousWeek.length;
  const rateOfChange = round2(currentAvg - previousAvg);

  const preferConfident = dated[0].d <= (() => { const c = new Date(referenceDate); c.setDate(c.getDate() - 21); return c; })();
  const expectedMin = targetWeeklyGain * 0.6;
  const expectedMax = targetWeeklyGain * 1.4;

  // Persistence check (spec: "too slow/too fast for at least two weeks") — the prior
  // 7-day-vs-7-day rate must show the same direction before classifying as too-slow/too-fast,
  // so one abnormal week alone never triggers a calorie conclusion.
  const priorWeek = windowFor(14, 8);
  const priorPriorWeek = windowFor(21, 15);
  let sustainedSameDirection = false;
  if (priorWeek.length >= 2 && priorPriorWeek.length >= 2) {
    const priorAvg = priorWeek.reduce((a, b) => a + b, 0) / priorWeek.length;
    const priorPriorAvg = priorPriorWeek.reduce((a, b) => a + b, 0) / priorPriorWeek.length;
    const priorRate = round2(priorAvg - priorPriorAvg);
    sustainedSameDirection = (rateOfChange < 0.10 && priorRate < 0.10) || (rateOfChange > 0.45 && priorRate > 0.45);
  }

  let status;
  if (rateOfChange < 0.10 && sustainedSameDirection) status = "too-slow";
  else if (rateOfChange > 0.45 && sustainedSameDirection) status = "too-fast";
  else if (rateOfChange >= expectedMin && rateOfChange <= expectedMax) status = "on-track";
  else status = "acceptable";

  return {
    status, rateOfChange, currentWeekAverage: round2(currentAvg), previousWeekAverage: round2(previousAvg),
    confidentWindow: preferConfident, sustainedSameDirection,
    reason: preferConfident
      ? `7-day average is ${rateOfChange >= 0 ? "+" : ""}${rateOfChange}kg/wk vs. the previous 7-day average, with 21+ days of history.`
      : `7-day average is ${rateOfChange >= 0 ? "+" : ""}${rateOfChange}kg/wk vs. the previous 7-day average — under 21 days of history, so treat as provisional.`
  };
}
