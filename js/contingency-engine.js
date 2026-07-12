// Closed-Loop Intelligence: explicit, named if/then rules. Each rule is a pure
// function over existing collections — nothing here writes data. A triggered rule
// only ever SUGGESTS logging an Intervention (js/render-recovery.js); the user
// decides whether to act on it via the Intervention History CRUD UI.
import { parseLogDate } from "./dates.js";
import { average, dailyMealTotals, exerciseProgressionStatus, nutritionConfidenceStatus, calorieAdherence } from "./calculations.js";

function round1(n) { return Math.round(n * 10) / 10; }

/**
 * Rule: an exercise has held or reduced load for 3 consecutive logged sessions.
 * Live-computes each entry's status from its raw logged fields (rather than trusting
 * a possibly-null stored progressionStatus) so this works even for sessions logged
 * before the progression-memory feature existed.
 */
export function ruleProgressionStalled(data) {
  const byName = Object.fromEntries((data.exercises || []).map(e => [e.name, e]));
  const byExercise = {};
  (data.workouts || []).forEach(w => (w.exercises || []).forEach(e => {
    (byExercise[e.name] ||= []).push({ ...e, date: w.date });
  }));

  const stalled = [];
  Object.entries(byExercise).forEach(([name, entries]) => {
    const sorted = entries.sort((a, b) => (parseLogDate(a.date) || 0) - (parseLogDate(b.date) || 0));
    const recent = sorted.slice(-3);
    if (recent.length < 3) return;
    const statuses = recent.map((e, i) => exerciseProgressionStatus(e, byName[name], { previousEntry: recent[i - 1] || null }).status);
    if (statuses.every(s => ["Reduce Load", "Hold Load"].includes(s))) stalled.push(name);
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

  // IF bodyweight is flat BUT nutrition data is incomplete -> do not change calories,
  // require complete tracking first (addendum section 18).
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const confidence = nutritionConfidenceStatus(data.mealLogs || [], todayISO);
  if (confidence.status !== "High") {
    return {
      id: "bodyweight-flat-nutrition-incomplete",
      title: "Bodyweight flat — nutrition data incomplete",
      severity: "medium",
      issue: `Bodyweight has moved only ${round1(change)}kg over the last 21 days, and today's nutrition data confidence is ${confidence.status}.`,
      hypothesis: "Without reliable calorie/macro logging, a calorie change can't be proposed with confidence.",
      suggestedIntervention: "Do not change calories yet — complete nutrition tracking (every meal, full macros, reconciled) for a few days, then reassess."
    };
  }

  // IF bodyweight is flat AND nutrition data confidence is high AND calorie
  // adherence is high -> propose a 150-200kcal increase.
  const targetCalories = data.nutritionLogs?.at(-1)?.calories || 2800;
  const todayTotals = dailyMealTotals(data.mealLogs || [], todayISO);
  const adherencePct = calorieAdherence(todayTotals.calories, targetCalories);
  const adherenceHigh = adherencePct != null && adherencePct >= 90;

  return {
    id: "bodyweight-flat-21-days",
    title: "Bodyweight flat for 21+ days",
    severity: "high",
    issue: `Bodyweight has moved only ${round1(change)}kg over the last 21 days despite a lean bulk target, with high nutrition data confidence${adherenceHigh ? " and high calorie adherence" : ""}.`,
    hypothesis: "Calorie intake may be under the target rate of gain rather than a training or recovery issue.",
    suggestedIntervention: adherenceHigh
      ? "Propose a 150-200kcal increase and re-check the 7-day bodyweight average trend in 2 weeks."
      : "Calorie adherence to the current target is inconsistent — tighten adherence to the existing target for a week before increasing it further."
  };
}

function workoutVolume(w) {
  return (w.exercises || []).reduce((sum, e) =>
    sum + (Number(e.set1Weight) || 0) * (Number(e.set1Reps) || 0) + (Number(e.set2Weight) || 0) * (Number(e.set2Reps) || 0), 0);
}

/** Rule: pre-workout carbs repeatedly low AND session performance (volume) on those days is below average. */
export function rulePreWorkoutCarbsLow(data) {
  const preLogs = (data.preWorkoutLogs || []).filter(p => p.carbsG != null).slice(-6);
  if (preLogs.length < 4) return null;
  const lowLogs = preLogs.filter(p => p.carbsG < 30);
  if (lowLogs.length < 3) return null;

  const allVolumes = (data.workouts || []).map(workoutVolume).filter(v => v > 0);
  if (allVolumes.length < 3) return null; // not enough sessions to judge "poor performance" against
  const overallAverage = average(allVolumes);

  const volumeByDate = Object.fromEntries((data.workouts || []).map(w => [w.date, workoutVolume(w)]));
  const lowCarbSessionVolumes = lowLogs.map(p => volumeByDate[p.date]).filter(v => v != null);
  if (lowCarbSessionVolumes.length < 2) return null;
  const lowCarbAverage = average(lowCarbSessionVolumes);
  if (overallAverage == null || lowCarbAverage == null || lowCarbAverage >= overallAverage * 0.9) return null; // performance not actually poor on those days

  const lowCount = lowLogs.length;
  return {
    id: "pre-workout-carbs-low",
    title: "Pre-workout carbs consistently low",
    severity: "medium",
    issue: `${lowCount} of the last ${preLogs.length} pre-workout logs had under 30g carbs, and those sessions averaged ${round1(lowCarbAverage)}kg volume vs. a ${round1(overallAverage)}kg overall average.`,
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
    suggestedIntervention: "Propose a controlled substitution test (swap the suspected protein source for 2 weeks and compare skin log severity) — not an immediate permanent removal."
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
