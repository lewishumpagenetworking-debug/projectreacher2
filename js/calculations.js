// Pure calculation utilities. No DOM access, no storage access — easy to reason about and reuse.
import { MUSCLE_GROUP_MAP, PRIORITY_MUSCLES } from "./program.js";
import { parseLogDate, isSameWeek } from "./dates.js";

export function average(nums) {
  const valid = nums.filter(n => typeof n === "number" && !Number.isNaN(n));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** Rolling 7-day average of {date, value} entries, evaluated as of the newest entry's date. */
export function sevenDayAverage(entries, valueKey = "value") {
  const dated = entries.map(e => ({ e, d: parseLogDate(e.date) })).filter(x => x.d);
  if (!dated.length) return null;
  const sorted = dated.sort((a, b) => a.d - b.d);
  const last = sorted[sorted.length - 1].d;
  const windowStart = new Date(last);
  windowStart.setDate(windowStart.getDate() - 6);
  const inWindow = sorted.filter(x => x.d >= windowStart && x.d <= last);
  return average(inWindow.map(x => Number(x.e[valueKey])));
}

/** kg/week rate of gain, comparing 7-day average now vs. 7-day average ~7 days ago. */
export function weeklyRateOfGain(bodyweightLogs) {
  const dated = bodyweightLogs.map(e => ({ e, d: parseLogDate(e.date) })).filter(x => x.d);
  if (dated.length < 2) return null;
  const sorted = dated.sort((a, b) => a.d - b.d);
  const last = sorted[sorted.length - 1].d;
  const prevWindowEnd = new Date(last);
  prevWindowEnd.setDate(prevWindowEnd.getDate() - 7);

  const nowAvg = sevenDayAverage(sorted.map(x => x.e), "morningBodyweight");
  const priorEntries = sorted.filter(x => x.d <= prevWindowEnd).map(x => x.e);
  const priorAvg = priorEntries.length ? sevenDayAverage(priorEntries, "morningBodyweight") : null;
  if (nowAvg == null || priorAvg == null) return null;
  return nowAvg - priorAvg;
}

export function gainRateStatus(rate, targetWeeklyGain = 0.25) {
  if (rate == null) return { status: "unknown", message: "Not enough bodyweight data yet." };
  if (rate < 0.15) return { status: "low", message: "Under 0.15 kg/week — if this persists 2+ weeks, consider increasing calories." };
  if (rate <= 0.35) return { status: "on-track", message: "On track for the target rate of gain." };
  if (rate <= 0.5) return { status: "fast", message: "Slightly ahead of target — keep an eye on waist measurements." };
  return { status: "too-fast", message: "Gaining too fast (>0.5 kg/week) — likely adding more fat than muscle." };
}

/** Protein/carb/fat/fibre targets in grams, from bodyweight in kg. */
export function macroTargets(weightKg) {
  return {
    proteinMin: round1(weightKg * 1.6),
    proteinMax: round1(weightKg * 2.2),
    carbsMin: round1(weightKg * 3),
    carbsMax: round1(weightKg * 5),
    fatMin: round1(weightKg * 0.5),
    fatMax: round1(weightKg * 1.5)
  };
}

export function fibreTarget(calories) {
  if (!calories) return null;
  return round1((calories / 1000) * 14);
}

export function perKg(grams, weightKg) {
  if (!weightKg) return null;
  return round1(grams / weightKg);
}

function round1(n) { return Math.round(n * 10) / 10; }

export function calorieAdherence(logged, target) {
  if (!target) return null;
  return round1((logged / target) * 100);
}

export function suggestedCalorieAdjustment(gainRate, targetWeeklyGain = 0.25) {
  const status = gainRateStatus(gainRate, targetWeeklyGain).status;
  if (status === "low") return "+150-250 kcal/day";
  if (status === "too-fast") return "-200-300 kcal/day";
  if (status === "fast") return "Hold, monitor waist trend before adjusting";
  if (status === "on-track") return "No change";
  return "Log more bodyweight data";
}

/** shoulder:waist and chest:waist ratios from a measurement entry. */
export function ratios(measurement) {
  const shoulders = Number(measurement.shoulders);
  const chest = Number(measurement.chest);
  const waist = Number(measurement.waist);
  return {
    shoulderToWaist: waist ? round2(shoulders / waist) : null,
    chestToWaist: waist ? round2(chest / waist) : null
  };
}
function round2(n) { return Math.round(n * 100) / 100; }

/**
 * Progression recommendation for one logged exercise entry.
 * - Compound: set1 ~1 RIR, set2 to failure. Isolation: both sets to failure.
 * - Increase load next time only if both working sets hit the TOP of the target rep
 *   range AND formQuality is 3+ (never recommend an increase on poor form).
 */
export function recommendProgression(entry, exerciseDef) {
  if (!exerciseDef || exerciseDef.repRangeMax == null) {
    return { increaseNextWeek: false, recommendation: "No target rep range set for this exercise." };
  }
  const { repRangeMax, repRangeMin } = exerciseDef;
  const s1 = Number(entry.set1Reps) || 0;
  const s2 = Number(entry.set2Reps) || 0;
  const formQuality = entry.formQuality != null ? Number(entry.formQuality) : null;

  if (formQuality != null && formQuality < 3) {
    return { increaseNextWeek: false, recommendation: "Form quality below 3 — hold load even though reps may be high." };
  }
  if (s1 >= repRangeMax && s2 >= repRangeMax) {
    return { increaseNextWeek: true, recommendation: "Both sets hit the top of the rep range with good form — increase load next session." };
  }
  if (repRangeMin != null && (s1 < repRangeMin || s2 < repRangeMin)) {
    return { increaseNextWeek: false, recommendation: "Reps fell below target range — watch for fatigue or excessive load across sessions." };
  }
  return { increaseNextWeek: false, recommendation: "Within target range — repeat load, aim for more reps next session." };
}

/** Flags repeated below-range performance across the last N logged sessions of an exercise. */
export function detectFatigueFlag(sessionsForExercise, exerciseDef, lookback = 3) {
  if (!exerciseDef || !sessionsForExercise.length) return false;
  const recent = sessionsForExercise.slice(-lookback);
  if (recent.length < 2) return false;
  const belowRange = recent.filter(e => {
    const s1 = Number(e.set1Reps) || 0;
    const s2 = Number(e.set2Reps) || 0;
    return exerciseDef.repRangeMin != null && (s1 < exerciseDef.repRangeMin || s2 < exerciseDef.repRangeMin);
  });
  return belowRange.length >= 2;
}

/** Weekly hard-set volume by muscle group, from workouts logged in the current Monday-Sunday week. */
export function weeklyVolumeByMuscleGroup(workouts, exercises, referenceDate = new Date()) {
  const byName = Object.fromEntries(exercises.map(e => [e.name, e]));

  const totals = {};
  workouts
    .filter(w => {
      const d = parseLogDate(w.date);
      return d && isSameWeek(d, referenceDate);
    })
    .forEach(w => {
      (w.exercises || []).forEach(e => {
        const def = byName[e.name];
        if (!def) return;
        const group = MUSCLE_GROUP_MAP[def.primaryMuscle];
        if (!group) return;
        let hardSets = 0;
        if (Number(e.set1Reps) > 0) hardSets++;
        if (Number(e.set2Reps) > 0) hardSets++;
        if (Number(e.optionalSet3Reps) > 0) hardSets++;
        totals[group] = (totals[group] || 0) + hardSets;
      });
    });
  return totals;
}

/** Workouts whose (correctly-parsed) date falls in the same Monday-Sunday week as referenceDate. */
export function workoutsInWeek(workouts, referenceDate = new Date()) {
  return workouts.filter(w => {
    const d = parseLogDate(w.date);
    return d && isSameWeek(d, referenceDate);
  });
}

export function volumeStatus(group, sets) {
  const isPriority = PRIORITY_MUSCLES.includes(group);
  const target = isPriority ? [16, 20] : [10, null];
  if (sets < 10) return { status: "under", target, isPriority };
  if (isPriority && sets < 16) return { status: "below-priority-target", target, isPriority };
  return { status: "on-target", target, isPriority };
}

/** Recovery red flags — never a generic "sleep more" warning, only trend-based signals. */
export function recoveryWarnings({ recoveryLogs, stimulantLogs, workouts }) {
  const warnings = [];
  const recentRecovery = recoveryLogs.slice(-7);

  const lowRecovery = recentRecovery.filter(r => Number(r.recoveryScore) < 3);
  if (lowRecovery.length >= 3) warnings.push("Recovery score below 3/5 in 3+ of the last 7 logs.");

  const lowSleepQuality = recentRecovery.filter(r => Number(r.sleepQuality) < 3);
  if (lowSleepQuality.length >= 3) warnings.push("Sleep quality below 3/5 in 3+ of the last 7 logs.");

  const lowMotivation = recentRecovery.filter(r => Number(r.motivationScore) < 3);
  if (lowMotivation.length >= 3) warnings.push("Motivation trending low across recent logs.");

  const soreness = recentRecovery.filter(r => Number(r.sorenessScore) >= 4);
  if (soreness.length >= 3) warnings.push("Persistent soreness reported across recent logs.");

  const hrValues = recentRecovery.map(r => Number(r.restingHeartRate)).filter(v => v);
  if (hrValues.length >= 3) {
    const trendUp = hrValues[hrValues.length - 1] > average(hrValues.slice(0, -1)) + 5;
    if (trendUp) warnings.push("Resting heart rate trending elevated.");
  }

  const recentStims = stimulantLogs.slice(-7);
  const risingCaffeine = recentStims.length >= 4 &&
    average(recentStims.slice(-2).map(s => Number(s.caffeineMg) || 0)) >
    average(recentStims.slice(0, 2).map(s => Number(s.caffeineMg) || 0)) + 50;
  if (risingCaffeine) warnings.push("Caffeine use increasing — check whether it's masking declining recovery.");

  return warnings;
}
