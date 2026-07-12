// Closed-Loop Intelligence: explicit, named if/then rules. Each rule is a pure
// function over existing collections — nothing here writes data. A triggered rule
// only ever SUGGESTS logging an Intervention (js/render-recovery.js); the user
// decides whether to act on it via the Intervention History CRUD UI.
import { parseLogDate } from "./dates.js";
import { average, dailyMealTotals } from "./calculations.js";

function round1(n) { return Math.round(n * 10) / 10; }

/** Rule: an exercise has held or reduced load for 3 consecutive logged sessions. */
export function ruleProgressionStalled(data) {
  const byExercise = {};
  (data.workouts || []).forEach(w => (w.exercises || []).forEach(e => {
    (byExercise[e.name] ||= []).push({ ...e, date: w.date });
  }));

  const stalled = [];
  Object.entries(byExercise).forEach(([name, entries]) => {
    const sorted = entries.filter(e => e.progressionStatus)
      .sort((a, b) => (parseLogDate(a.date) || 0) - (parseLogDate(b.date) || 0));
    const recent = sorted.slice(-3);
    if (recent.length >= 3 && recent.every(e => ["Reduce Load", "Hold Load"].includes(e.progressionStatus))) {
      stalled.push(name);
    }
  });
  if (!stalled.length) return null;

  return {
    id: "progression-stalled",
    title: "Progression stalled on repeated exercises",
    severity: "medium",
    issue: `${stalled.join(", ")} have held or reduced load for 3 consecutive logged sessions.`,
    hypothesis: "Volume, recovery capacity, or exercise selection may need adjusting for these movements.",
    suggestedIntervention: "Consider a short deload, a form/setup check, or a substitution for the flagged exercise(s)."
  };
}

/** Rule: bodyweight has moved less than 0.3kg over the last 21+ days of logged data. */
export function ruleBodyweightFlat21Days(data, referenceDate = new Date()) {
  const dated = (data.bodyweightLogs || []).map(b => ({ ...b, d: parseLogDate(b.date) })).filter(x => x.d).sort((a, b) => a.d - b.d);
  if (dated.length < 2) return null;

  const cutoff = new Date(referenceDate); cutoff.setDate(cutoff.getDate() - 21);
  if (dated[0].d > cutoff) return null; // not enough history spanning 21 days yet

  const inWindow = dated.filter(x => x.d >= cutoff);
  if (inWindow.length < 2) return null;

  const change = Number(inWindow.at(-1).morningBodyweight) - Number(inWindow[0].morningBodyweight);
  if (change >= 0.3) return null;

  return {
    id: "bodyweight-flat-21-days",
    title: "Bodyweight flat for 21+ days",
    severity: "high",
    issue: `Bodyweight has moved only ${round1(change)}kg over the last 21 days despite a lean bulk target.`,
    hypothesis: "Calorie intake may be under the target rate of gain, or logged intake isn't capturing true intake.",
    suggestedIntervention: "Increase daily calories by 150-250kcal and re-check the 7-day average trend in 2 weeks."
  };
}

/** Rule: pre-workout carbs have been under 30g on 3+ of the last 4-6 logged sessions. */
export function rulePreWorkoutCarbsLow(data) {
  const preLogs = (data.preWorkoutLogs || []).filter(p => p.carbsG != null).slice(-6);
  if (preLogs.length < 4) return null;
  const lowCount = preLogs.filter(p => p.carbsG < 30).length;
  if (lowCount < 3) return null;

  return {
    id: "pre-workout-carbs-low",
    title: "Pre-workout carbs consistently low",
    severity: "medium",
    issue: `${lowCount} of the last ${preLogs.length} pre-workout logs had under 30g carbs.`,
    hypothesis: "Low pre-workout glycogen availability may be limiting session output.",
    suggestedIntervention: "Add 30-80g carbs 60-120 minutes before training and compare volume over the next 2 weeks."
  };
}

/**
 * Rule: possible protein/dairy-skin pattern — average protein intake on days with a
 * logged high-severity skin breakout is notably higher than on other logged days.
 * Framed explicitly as a pattern worth watching, never a diagnosis or proven cause.
 */
export function ruleProteinSkinCorrelation(data) {
  const skinLogs = data.skinLogs || [];
  const mealLogs = data.mealLogs || [];
  const breakoutDates = [...new Set(skinLogs.filter(s => Number(s.breakouts) >= 3).map(s => s.date))];
  if (breakoutDates.length < 3) return null;

  const otherDates = [...new Set(mealLogs.map(m => m.date))].filter(d => !breakoutDates.includes(d));
  const proteinFor = (dates) => dates.map(d => dailyMealTotals(mealLogs, d).protein).filter(v => v > 0);
  const onBreakoutDays = proteinFor(breakoutDates);
  const onOtherDays = proteinFor(otherDates);
  if (onBreakoutDays.length < 3 || onOtherDays.length < 3) return null;

  const avgBreakout = average(onBreakoutDays);
  const avgOther = average(onOtherDays);
  if (avgBreakout == null || avgOther == null || avgBreakout <= avgOther * 1.2) return null;

  return {
    id: "protein-skin-correlation",
    title: "Possible protein/dairy-skin pattern",
    severity: "low",
    issue: `Average protein intake on breakout days (${round1(avgBreakout)}g) is notably higher than on other logged days (${round1(avgOther)}g).`,
    hypothesis: "Some people report a link between very high dairy/whey intake and breakouts — this is a pattern worth watching, not a proven cause.",
    suggestedIntervention: "Log dairy/whey sources specifically for 2 weeks and compare against skin log severity before changing anything."
  };
}

/** Rule: pain/discomfort flagged 2+ times on the same exercise within the last 14 days. */
export function rulePainReview(data, referenceDate = new Date()) {
  const recentWorkouts = (data.workouts || []).filter(w => {
    const d = parseLogDate(w.date);
    return d && (referenceDate - d) / 86400000 <= 14;
  });
  const painByExercise = {};
  recentWorkouts.forEach(w => (w.exercises || []).forEach(e => {
    if (e.painFlag) painByExercise[e.name] = (painByExercise[e.name] || 0) + 1;
  }));
  const flagged = Object.entries(painByExercise).filter(([, count]) => count >= 2);
  if (!flagged.length) return null;

  return {
    id: "pain-review",
    title: "Repeated pain flagged",
    severity: "high",
    issue: `Pain/discomfort flagged 2+ times in the last 14 days on: ${flagged.map(([n, c]) => `${n} (${c}x)`).join(", ")}.`,
    hypothesis: "Repeated pain on the same movement(s) suggests a form, load or joint issue rather than normal training soreness.",
    suggestedIntervention: "Hold progression on the flagged exercise(s), review form/setup, and consider a substitution or professional review if it persists."
  };
}

/** Runs every rule and returns only the ones that fired, most-severe first. */
export function runContingencyEngine(data, referenceDate = new Date()) {
  const severityRank = { high: 0, medium: 1, low: 2 };
  return [
    ruleProgressionStalled(data),
    ruleBodyweightFlat21Days(data, referenceDate),
    rulePreWorkoutCarbsLow(data),
    ruleProteinSkinCorrelation(data),
    rulePainReview(data, referenceDate)
  ].filter(Boolean).sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
