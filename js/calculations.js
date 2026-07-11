// Pure calculation utilities. No DOM access, no storage access — easy to reason about and reuse.
import { MUSCLE_GROUP_MAP, PRIORITY_MUSCLES } from "./program.js";
import { parseLogDate, isSameWeek, startOfWeek } from "./dates.js";
import { RECOVERY_PROTOCOLS } from "./recovery-data.js";

function setVolume(e) {
  return (Number(e.set1Weight) || 0) * (Number(e.set1Reps) || 0) + (Number(e.set2Weight) || 0) * (Number(e.set2Reps) || 0);
}

/** Last logged entry, most recent entry from a different week, and best-volume entry for one exercise across all past workouts. */
export function getExerciseHistory(workouts, exerciseName, referenceDate = new Date()) {
  const entries = [];
  workouts.forEach(w => {
    (w.exercises || []).forEach(e => {
      if (e.name === exerciseName) entries.push({ ...e, date: w.date });
    });
  });
  entries.sort((a, b) => (parseLogDate(a.date) || 0) - (parseLogDate(b.date) || 0));

  const lastSession = entries.length ? entries[entries.length - 1] : null;
  const previousWeek = [...entries].reverse().find(e => {
    const d = parseLogDate(e.date);
    return d && !isSameWeek(d, referenceDate);
  }) || null;
  const previousBest = entries.reduce((best, e) => (!best || setVolume(e) > setVolume(best)) ? e : best, null);

  return { lastSession, previousWeek, previousBest };
}

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

/** Arm-vs-forearm growth comparison between two measurement records, for monthly review. */
export function armForearmBalance(first, last) {
  if (!first || !last) return { status: "insufficient-data", message: "Not enough measurement data yet." };
  const rArmChange = round2((Number(last.rarm) || 0) - (Number(first.rarm) || 0));
  const lArmChange = round2((Number(last.larm) || 0) - (Number(first.larm) || 0));
  const rForearmChange = round2((Number(last.rforearm) || 0) - (Number(first.rforearm) || 0));
  const lForearmChange = round2((Number(last.lforearm) || 0) - (Number(first.lforearm) || 0));
  const armChange = round2((rArmChange + lArmChange) / 2);
  const forearmChange = round2((rForearmChange + lForearmChange) / 2);
  const haveForearmData = Number(first.rforearm) > 0 && Number(last.rforearm) > 0;

  let status = "insufficient-data";
  let message = "Not enough forearm measurement data yet — log Right/Left Forearm in Measurements to track this.";
  if (haveForearmData) {
    if (armChange > 0 && forearmChange <= 0) {
      status = "forearms-lagging";
      message = "Forearms lagging behind arm growth this period.";
    } else if (forearmChange > 0 && forearmChange >= armChange) {
      status = "forearms-improving";
      message = "Forearms catching up — growing at or above the rate of the upper arm.";
    } else if (armChange > 0 && forearmChange > 0) {
      status = "balanced";
      message = "Balanced arm and forearm growth.";
    } else if (armChange > 0 || forearmChange > 0) {
      status = "strong-improvement";
      message = "Measurable growth recorded this period.";
    }
  }
  return { rArmChange, lArmChange, rForearmChange, lForearmChange, armChange, forearmChange, status, message };
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
/**
 * previousEntry (optional) is the same exercise's most recent prior logged entry —
 * used only for the "reps improved but form dropped" comparison. Everything else
 * is decided from `entry` alone.
 */
export function recommendProgression(entry, exerciseDef, previousEntry = null) {
  if (!exerciseDef || exerciseDef.repRangeMax == null) {
    return { increaseNextWeek: false, recommendation: "No target rep range set for this exercise." };
  }
  const { repRangeMax, repRangeMin } = exerciseDef;
  const s1 = Number(entry.set1Reps) || 0;
  const s2 = Number(entry.set2Reps) || 0;
  const formQuality = entry.formQuality != null ? Number(entry.formQuality) : null;
  const romQuality = entry.rangeOfMotionQuality != null ? Number(entry.rangeOfMotionQuality) : null;
  const tempoControl = entry.tempoControl != null ? Number(entry.tempoControl) : null;

  if (entry.painFlag) {
    return { increaseNextWeek: false, recommendation: "Pain/discomfort flagged — do not progress this exercise. Consider a professional if it persists." };
  }
  if (formQuality != null && formQuality < 3) {
    return { increaseNextWeek: false, recommendation: "Form quality below 3 — hold or reduce load, even though reps may be high." };
  }
  if (romQuality != null && romQuality < 4) {
    return { increaseNextWeek: false, recommendation: "Range of motion below standard — hold load until depth/stretch is consistent." };
  }
  if (tempoControl != null && tempoControl < 3) {
    return { increaseNextWeek: false, recommendation: "Tempo control broke down — hold load and focus on the eccentric next session." };
  }

  if (previousEntry) {
    const prevS1 = Number(previousEntry.set1Reps) || 0;
    const prevS2 = Number(previousEntry.set2Reps) || 0;
    const prevForm = previousEntry.formQuality != null ? Number(previousEntry.formQuality) : null;
    const repsImproved = (s1 + s2) > (prevS1 + prevS2);
    const formDropped = prevForm != null && formQuality != null && formQuality < prevForm;
    if (repsImproved && formDropped) {
      return { increaseNextWeek: false, recommendation: "Reps improved but form quality dropped vs. last session — repeat the same load." };
    }
  }

  if (s1 >= repRangeMax && s2 >= repRangeMax && (formQuality == null || formQuality >= 4)) {
    if (exerciseDef.distanceBased) {
      return { increaseNextWeek: true, recommendation: "Both sets hit the top of the lengths range with good form — increase weight next session and reset lengths to the bottom of the range." };
    }
    return { increaseNextWeek: true, recommendation: "Both sets hit the top of the rep range with good form — increase load next session." };
  }
  if (repRangeMin != null && (s1 < repRangeMin || s2 < repRangeMin)) {
    return {
      increaseNextWeek: false,
      recommendation: exerciseDef.distanceBased
        ? "Lengths fell below target range — watch for fatigue or excessive weight across sessions."
        : "Reps fell below target range — watch for fatigue or excessive load across sessions."
    };
  }
  return {
    increaseNextWeek: false,
    recommendation: exerciseDef.distanceBased
      ? "Within target lengths range — repeat weight, aim for more lengths next session before increasing weight."
      : "Within target range — repeat load, aim for more reps next session."
  };
}

/** Farmer's Carry-only distance analytics — reads calculatedDistanceMetres logged on each entry. No other exercise is affected. */
export function farmersCarryAnalytics(workouts, referenceDate = new Date()) {
  const entries = [];
  (workouts || []).forEach(w => {
    (w.exercises || []).forEach(e => {
      if (e.name === "Farmer's Carry" && e.calculatedDistanceMetres != null) {
        const d = parseLogDate(w.date);
        if (d) entries.push({ dateObj: d, ...e });
      }
    });
  });
  if (!entries.length) return { hasData: false };

  entries.sort((a, b) => a.dateObj - b.dateObj);

  const distances = entries.map(e => e.calculatedDistanceMetres || 0);
  const loads = entries.map(e => Math.max(Number(e.set1Weight) || 0, Number(e.set2Weight) || 0));
  const volumes = entries.map(e => (e.calculatedDistanceMetres || 0) * Math.max(Number(e.set1Weight) || 0, Number(e.set2Weight) || 0));

  const monthKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
  const yearKey = String(referenceDate.getFullYear());
  const sameMonth = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === monthKey;
  const sameYear = (d) => String(d.getFullYear()) === yearKey;

  const recentHalf = entries.slice(-3).map(e => e.calculatedDistanceMetres || 0);
  const priorHalf = entries.slice(0, Math.max(0, entries.length - 3)).map(e => e.calculatedDistanceMetres || 0);
  let trend = "stable";
  if (recentHalf.length && priorHalf.length) {
    const diff = average(recentHalf) - average(priorHalf);
    if (diff > 1) trend = "improving";
    else if (diff < -1) trend = "declining";
  }

  return {
    hasData: true,
    sessionsLogged: entries.length,
    longestCarryDistance: round1(Math.max(...distances)),
    heaviestCarry: Math.max(...loads),
    highestVolume: round1(Math.max(...volumes)),
    estimatedTotalLoad: round1(volumes.reduce((a, b) => a + b, 0)),
    monthlyCarryDistance: round1(entries.filter(e => sameMonth(e.dateObj)).reduce((sum, e) => sum + (e.calculatedDistanceMetres || 0), 0)),
    yearlyCarryDistance: round1(entries.filter(e => sameYear(e.dateObj)).reduce((sum, e) => sum + (e.calculatedDistanceMetres || 0), 0)),
    averageDistance: round1(average(distances)),
    averageLoad: round1(average(loads)),
    trend
  };
}

/**
 * Deterministic, rule-based stand-in for a live AI chat when asked "about this
 * exercise" from the Train tab — there's no server in this app to hold an AI API
 * key securely, so this reuses recommendProgression + the exercise's guide content
 * to answer the same questions a coach would, without a network call.
 */
export function localExerciseAdvice(entry, exerciseDef, previousEntry = null) {
  const rec = recommendProgression(entry, exerciseDef, previousEntry);
  const s1 = Number(entry.set1Reps) || 0;
  const s2 = Number(entry.set2Reps) || 0;
  const repRangeMin = exerciseDef?.repRangeMin;
  const setCounted = repRangeMin == null || (s1 >= repRangeMin && s2 >= repRangeMin) || entry.technicalFailureReached;

  const formLimiting = entry.painFlag
    || (entry.formQuality != null && Number(entry.formQuality) < 4)
    || (entry.rangeOfMotionQuality != null && Number(entry.rangeOfMotionQuality) < 4)
    || (entry.tempoControl != null && Number(entry.tempoControl) < 3);

  const needsSubstitution = Boolean(entry.painFlag) || (entry.quickFlags || []).includes("Need substitution");

  const nextSetCue = entry.painFlag
    ? "Stop — do not push through pain. Reassess the movement."
    : formLimiting
      ? (exerciseDef?.commonMistakes?.[0] ? `Watch for: ${exerciseDef.commonMistakes[0]}` : "Prioritise form over adding reps this set.")
      : (exerciseDef?.todayFocusCue || "Keep the same execution and chase one more clean rep.");

  return {
    setCounted,
    progressionDecision: rec.increaseNextWeek ? "increase" : "hold",
    reason: rec.recommendation,
    nextSetCue,
    formLimitingProgression: formLimiting,
    substitutionSuggested: needsSubstitution,
    safetyWarning: entry.painFlag ? "Pain/discomfort was flagged on this exercise — stop if it continues and consider a professional." : null
  };
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
        const group = def.volumeGroup || MUSCLE_GROUP_MAP[def.primaryMuscle];
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

// Custom weekly-set targets for the arm/forearm/delt specialisation groups — these
// have their own moderate/strong guidance rather than the generic priority-muscle
// [16, 20] band, since 2-working-set-per-exercise programming realistically lands
// well under that for isolation-only muscle groups.
const VOLUME_TARGET_OVERRIDES = {
  "biceps": { moderate: 6, strong: 8 },
  "brachialis": { moderate: 6, strong: 8 },
  "triceps": { moderate: 6, strong: 8 },
  "forearms": { moderate: 4, strong: 6 },
  "forearm-flexors": { moderate: 4, strong: 6 },
  "forearm-extensors": { moderate: 4, strong: 6 },
  "side delts": { moderate: 6, strong: 10 }
};

export function volumeStatus(group, sets) {
  const override = VOLUME_TARGET_OVERRIDES[group];
  if (override) {
    const specialisationLabel = sets >= override.strong ? "strong specialisation" : sets >= override.moderate ? "moderate" : "under baseline";
    return {
      status: sets < override.moderate ? "under" : "on-target",
      target: [override.moderate, override.strong],
      isPriority: true,
      specialisationLabel
    };
  }
  const isPriority = PRIORITY_MUSCLES.includes(group);
  const target = isPriority ? [16, 20] : [10, null];
  if (sets < 10) return { status: "under", target, isPriority };
  if (isPriority && sets < 16) return { status: "below-priority-target", target, isPriority };
  return { status: "on-target", target, isPriority };
}

/**
 * Arm/forearm/delt specialisation warnings — surfaced on the Dashboard and in the
 * Weekly Review. Only fires from real logged volume/pain data, never a generic nag.
 */
export function armForearmDeltWarnings({ workouts, exercises, recoveryLogs = [] }, referenceDate = new Date()) {
  const totals = weeklyVolumeByMuscleGroup(workouts, exercises, referenceDate);
  const warnings = [];
  const forearmSets = (totals["forearms"] || 0) + (totals["forearm-flexors"] || 0) + (totals["forearm-extensors"] || 0);
  const armSets = (totals["biceps"] || 0) + (totals["brachialis"] || 0) + (totals["triceps"] || 0) + forearmSets;
  const sideDeltSets = totals["side delts"] || 0;

  if (forearmSets > 0 && forearmSets < 4) {
    warnings.push("Forearm volume may be too low to bring them up relative to upper arms.");
  }

  const recentPain = workouts.slice(-4).some(w => (w.exercises || []).some(e => e.painFlag));
  const recentShoulderDiscomfort = recentPain && workouts.slice(-4).some(w =>
    (w.exercises || []).some(e => e.painFlag && ["Cable Lateral Raise", "Seated DB Lateral Raise", "Face Pull", "Rear Delt Fly", "Seated DB Shoulder Press"].includes(e.name)));
  if (sideDeltSets >= 10 && recentShoulderDiscomfort) {
    warnings.push("Side-delt volume is high. Monitor shoulder comfort, trap takeover and pressing performance.");
  }

  const recentElbowWristPain = workouts.slice(-4).some(w => (w.exercises || []).some(e => e.painFlag &&
    ["Hammer Curl", "EZ Curl", "Incline DB Curl", "Reverse Curl", "Overhead Triceps Extension", "Reverse-Grip Bar Extension",
     "Triceps Pushdown", "Wrist Curl", "Reverse Wrist Curl", "Farmer's Carry"].includes(e.name)));
  if (armSets >= 12 && recentElbowWristPain) {
    warnings.push("Arm/forearm volume may be exceeding joint recovery. Hold load increases and monitor discomfort.");
  }

  return warnings;
}

/** Sums calories/protein/carbs/fat/fibre for all meals logged on a given ISO date. */
export function dailyMealTotals(mealLogs, dateStr) {
  const meals = mealLogs.filter(m => m.date === dateStr);
  const sum = (key) => meals.reduce((total, m) => total + (Number(m[key]) || 0), 0);
  return {
    mealCount: meals.length,
    calories: round1(sum("calories")),
    protein: round1(sum("protein")),
    carbs: round1(sum("carbs")),
    fat: round1(sum("fat")),
    fibre: round1(sum("fibre"))
  };
}

export function remainingMacros(totals, targets) {
  return {
    caloriesRemaining: round1((targets.calories ?? 0) - totals.calories),
    proteinRemaining: round1((targets.proteinMax ?? targets.protein ?? 0) - totals.protein),
    carbsRemaining: round1((targets.carbsMax ?? targets.carbs ?? 0) - totals.carbs),
    fatRemaining: round1((targets.fatMax ?? targets.fat ?? 0) - totals.fat),
    fibreRemaining: round1((targets.fibre ?? 0) - totals.fibre)
  };
}

/** Adherence percentages + a short status label for a single day's totals against targets. */
export function macroAdherence(totals, targets) {
  const calorieAdherencePercentage = targets.calories ? round1((totals.calories / targets.calories) * 100) : null;
  const proteinAdherencePercentage = targets.proteinMin ? round1((totals.protein / targets.proteinMin) * 100) : null;

  let macroStatus = "Insufficient data";
  if (totals.mealCount === 0) {
    macroStatus = "No meals logged";
  } else if (targets.proteinMin && totals.protein < targets.proteinMin * 0.85) {
    macroStatus = "Under protein";
  } else if (targets.calories && totals.calories < targets.calories * 0.85) {
    macroStatus = "Under calories";
  } else if (targets.calories && totals.calories > targets.calories * 1.15) {
    macroStatus = "Over calories";
  } else if (targets.fibre && totals.fibre < targets.fibre * 0.6) {
    macroStatus = "Low fibre";
  } else {
    macroStatus = "On target";
  }

  return { calorieAdherencePercentage, proteinAdherencePercentage, macroStatus };
}

/** Aggregates a month ("YYYY-MM") of meal logs into daily totals + summary stats. */
export function monthlyMealSummary(mealLogs, yearMonth) {
  const inMonth = mealLogs.filter(m => (m.date || "").startsWith(yearMonth));
  const days = [...new Set(inMonth.map(m => m.date))].sort();
  const byDay = days.map(date => ({ date, ...dailyMealTotals(inMonth, date) }));

  const avg = (key) => average(byDay.map(d => d[key]));
  const highestCalorieDay = byDay.reduce((a, b) => (!a || b.calories > a.calories) ? b : a, null);
  const lowestCalorieDay = byDay.reduce((a, b) => (!a || (b.calories > 0 && b.calories < a.calories)) ? b : a, null);
  const bestProteinDay = byDay.reduce((a, b) => (!a || b.protein > a.protein) ? b : a, null);

  return {
    byDay,
    daysLogged: days.length,
    averageCalories: round1(avg("calories")),
    averageProtein: round1(avg("protein")),
    averageCarbs: round1(avg("carbs")),
    averageFat: round1(avg("fat")),
    averageFibre: round1(avg("fibre")),
    highestCalorieDay,
    lowestCalorieDay,
    bestProteinDay,
    aiEstimatedMeals: inMonth.filter(m => !m.userCorrected).length,
    manuallyConfirmedMeals: inMonth.filter(m => m.userCorrected).length,
    consistencyScore: days.length ? round1((days.length / new Date(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(5, 7)), 0).getDate()) * 100) : 0
  };
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

/**
 * All figures below are derived live from existing collections on every call —
 * nothing here is stored, so the streak/badge/engagement layer can never drift
 * from or corrupt the underlying save data.
 */

/** Consecutive Monday-Sunday weeks (counting the current week) with >=1 workout logged, most-recent-first. */
export function trainingStreakWeeks(workouts, referenceDate = new Date()) {
  const weeksWithSessions = new Set(
    workouts.map(w => parseLogDate(w.date)).filter(Boolean).map(d => startOfWeek(d).getTime())
  );
  let streak = 0;
  const cursor = startOfWeek(referenceDate);
  while (weeksWithSessions.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/** Consecutive calendar days (counting today, walking backward) with >=1 entry in a date-keyed collection. */
export function loggingStreakDays(entries, dateKey = "date", referenceDate = new Date()) {
  const daysWithEntries = new Set(
    entries.map(e => parseLogDate(e[dateKey])).filter(Boolean)
      .map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime())
  );
  let streak = 0;
  const cursor = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  while (daysWithEntries.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Percentage of this program's training days that have a logged session in the current week (0-100). */
export function weeklyComplianceRate(workouts, trainingProgram, referenceDate = new Date()) {
  const dayCount = Object.keys(trainingProgram || {}).length;
  if (!dayCount) return 0;
  const logged = new Set(workoutsInWeek(workouts, referenceDate).map(w => w.day || w.programDay));
  return Math.round((logged.size / dayCount) * 100);
}

/**
 * Serious, performance-focused badge set — every badge is computed live from
 * existing collections, never stored, so there is no new persisted state at all.
 */
export function computeBadges(data) {
  const workouts = data.workouts || [];
  const recoveryStreak = loggingStreakDays(data.recoveryLogs || [], "date");
  const nutritionStreak = loggingStreakDays(data.mealLogs || [], "date");
  const trainStreak = trainingStreakWeeks(workouts);
  const anyPR = (data.prs || []).some(p => p.currentBest);
  const armDayLogged = workouts.some(w => /Arm.*Forearm.*Delt/i.test(w.day || w.programDay || ""));
  const forearmLogged = workouts.some(w => (w.exercises || []).some(e => /forearm|wrist|farmer/i.test(e.name || "")));
  const noMissedThisWeek = weeklyComplianceRate(workouts, data.trainingProgram, new Date()) >= 100;
  const techFailureLogged = workouts.some(w => (w.exercises || []).some(e => e.technicalFailureReached));

  const sleepStreakVal = loggingStreakDays(data.sleepLogs || [], "date");
  const wknd = weekendRecoveryStatus(data.sleepLogs || []);
  const todayCaffeine = caffeineLoadStatus(data.stimulantLogs || []);
  const todayHydration = hydrationStatus(data.hydrationLogs || [], data.stimulantLogs || []);

  return [
    { id: "first-week", name: "First Week Logged", icon: "🎖", unlocked: trainStreak >= 1 },
    { id: "five-workouts", name: "5 Workouts Completed", icon: "🏋", unlocked: workouts.length >= 5 },
    { id: "ten-workouts", name: "10 Workouts Completed", icon: "🏆", unlocked: workouts.length >= 10 },
    { id: "first-pr", name: "First PR", icon: "⭐", unlocked: anyPR },
    { id: "arm-day", name: "Arm Day Completed", icon: "💪", unlocked: armDayLogged },
    { id: "forearm-work", name: "Forearm Work Logged", icon: "🦾", unlocked: forearmLogged },
    { id: "recovery-3", name: "Recovery Logged 3 Days", icon: "😴", unlocked: recoveryStreak >= 3 },
    { id: "nutrition-7", name: "Nutrition Logged 7 Days", icon: "🍽", unlocked: nutritionStreak >= 7 },
    { id: "no-missed", name: "No Missed Sessions This Week", icon: "🎯", unlocked: noMissedThisWeek },
    { id: "tech-failure", name: "Technical Failure Standard", icon: "🔥", unlocked: techFailureLogged },
    { id: "consistency-chain", name: "Consistency Chain", icon: "⛓", unlocked: trainStreak >= 3 },
    { id: "sleep-tracked-3", name: "Sleep Tracked 3 Days", icon: "🌙", unlocked: sleepStreakVal >= 3 },
    { id: "weekend-recovery-banked", name: "Weekend Recovery Banked", icon: "🔋", unlocked: wknd.status === "Recovery extended" },
    { id: "caffeine-controlled", name: "Caffeine Controlled", icon: "☕", unlocked: todayCaffeine.status === "Low" || todayCaffeine.status === "Moderate" },
    { id: "fuel-protocol-complete", name: "Fuel Protocol Complete", icon: "🍽", unlocked: recoveryMealCompliance(data.mealLogs || []).preWorkoutComplete && recoveryMealCompliance(data.mealLogs || []).postWorkoutComplete },
    { id: "hydration-locked", name: "Hydration Locked", icon: "💧", unlocked: todayHydration.status === "Hydrated" }
  ];
}

// =====================================================================
// RECOVERY COMMAND CENTRE — sleep, readiness, fatigue detection, hydration,
// caffeine load, recovery protocols, and the AI Recovery Coach read. All
// derived live from sleepLogs/recoveryLogs/stimulantLogs/hydrationLogs/
// mealLogs/workouts every call — nothing here is persisted, so it can never
// drift from or corrupt the underlying save data. Frames readiness as
// performance guidance, never as a medical diagnosis.
// =====================================================================

const SLEEP_TARGET_HOURS = 7.5;

/** Cross-midnight-aware sleep duration in hours from "HH:MM" bedtime/wake time strings. */
export function calculateSleepDuration(bedtime, wakeTime) {
  const toMinutes = (t) => {
    const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const bed = toMinutes(bedtime);
  const wake = toMinutes(wakeTime);
  if (bed == null || wake == null) return null;
  let diffMinutes = wake - bed;
  if (diffMinutes <= 0) diffMinutes += 24 * 60;
  return Math.round((diffMinutes / 60) * 100) / 100;
}

export function formatHoursAsHM(hours) {
  if (hours == null) return "--";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Sleep tracker outputs: last night, 7-day/weekday/weekend averages, debt estimate, consistency, best/worst day, trend. */
export function sleepStats(sleepLogs, referenceDate = new Date()) {
  const dated = (sleepLogs || [])
    .map(s => ({ s, d: parseLogDate(s.date) }))
    .filter(x => x.d && x.s.calculatedDurationHours != null)
    .sort((a, b) => a.d - b.d);
  if (!dated.length) return { hasData: false };

  const last = dated[dated.length - 1];
  const windowStart = new Date(referenceDate);
  windowStart.setDate(windowStart.getDate() - 6);
  const last7 = dated.filter(x => x.d >= windowStart && x.d <= referenceDate);
  const durations = last7.map(x => x.s.calculatedDurationHours);
  const avg7 = durations.length ? average(durations) : null;

  const isWeekendDay = (d) => d.getDay() === 0 || d.getDay() === 6;
  const weekdayVals = last7.filter(x => !isWeekendDay(x.d)).map(x => x.s.calculatedDurationHours);
  const weekendVals = last7.filter(x => isWeekendDay(x.d)).map(x => x.s.calculatedDurationHours);

  const sleepDebtHours = last7.length
    ? round1(last7.reduce((sum, x) => sum + Math.max(0, SLEEP_TARGET_HOURS - x.s.calculatedDurationHours), 0))
    : null;
  const consistencySpreadHours = durations.length > 1 ? round1(Math.max(...durations) - Math.min(...durations)) : null;

  const best = last7.reduce((a, b) => (!a || b.s.calculatedDurationHours > a.s.calculatedDurationHours) ? b : a, null);
  const worst = last7.reduce((a, b) => (!a || b.s.calculatedDurationHours < a.s.calculatedDurationHours) ? b : a, null);

  const recentHalf = last7.slice(-3).map(x => x.s.calculatedDurationHours);
  const priorHalf = last7.slice(0, Math.max(0, last7.length - 3)).map(x => x.s.calculatedDurationHours);
  let trend = "stable";
  if (recentHalf.length && priorHalf.length) {
    const diff = average(recentHalf) - average(priorHalf);
    if (diff > 0.5) trend = "improving";
    else if (diff < -0.5) trend = "declining";
  }

  return {
    hasData: true,
    lastNight: last.s.calculatedDurationHours,
    sevenDayAverage: avg7 != null ? round1(avg7) : null,
    weekdayAverage: weekdayVals.length ? round1(average(weekdayVals)) : null,
    weekendAverage: weekendVals.length ? round1(average(weekendVals)) : null,
    sleepDebtHours,
    consistencySpreadHours,
    bestDay: best ? { date: best.s.date, hours: best.s.calculatedDurationHours } : null,
    worstDay: worst ? { date: worst.s.date, hours: worst.s.calculatedDurationHours } : null,
    trend
  };
}

/**
 * Weekend Recovery Extension: looks at the most recently completed Sat/Sun pair.
 * Deliberately does NOT claim weekend sleep cancels weekday debt — see `note`.
 */
export function weekendRecoveryStatus(sleepLogs, referenceDate = new Date()) {
  const dated = (sleepLogs || []).map(s => ({ s, d: parseLogDate(s.date) })).filter(x => x.d);
  const weekStart = startOfWeek(referenceDate);
  const sat = new Date(weekStart); sat.setDate(sat.getDate() + 5);
  const sun = new Date(weekStart); sun.setDate(sun.getDate() + 6);
  const pastSun = referenceDate.getTime() >= sun.getTime();
  const targetSat = pastSun ? sat : new Date(sat.getTime() - 7 * 86400000);
  const targetSun = pastSun ? sun : new Date(sun.getTime() - 7 * 86400000);

  const satLog = dated.find(x => x.d.getTime() === targetSat.getTime());
  const sunLog = dated.find(x => x.d.getTime() === targetSun.getTime());
  const hours = [satLog, sunLog].filter(Boolean).map(x => x.s.calculatedDurationHours).filter(h => h != null);
  const avg = hours.length ? average(hours) : null;
  const battery = avg != null ? Math.max(0, Math.min(100, Math.round((avg / 9) * 100))) : 0;

  let status = "No weekend sleep logged yet";
  if (avg != null) {
    if (avg >= 8) status = "Recovery extended";
    else if (avg >= 6.5) status = "Partial recovery";
    else status = "Recovery still limited";
  }

  return {
    hasData: avg != null,
    satHours: satLog?.s.calculatedDurationHours ?? null,
    sunHours: sunLog?.s.calculatedDurationHours ?? null,
    averageHours: avg != null ? round1(avg) : null,
    battery, status,
    note: "Weekend sleep extension is helpful, but consistent sleep remains the stronger long-term recovery strategy."
  };
}

export function hydrationStatus(hydrationLogs, stimulantLogs, referenceDate = new Date()) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const sorted = [...(hydrationLogs || [])].filter(h => parseLogDate(h.date)).sort((a, b) => parseLogDate(a.date) - parseLogDate(b.date));
  const today = sorted.find(h => h.date === todayISO) || sorted.at(-1) || null;
  const todayCaffeine = (stimulantLogs || []).filter(s => s.date === todayISO).reduce((sum, s) => sum + (Number(s.caffeineMg) || 0), 0);

  if (!today) return { status: "No hydration data logged", flags: [], hasData: false };

  const flags = [];
  if (todayCaffeine >= 300 && !today.electrolytesUsed) flags.push("Caffeine load is high without hydration support.");
  if (today.pumpQuality != null && Number(today.pumpQuality) > 0 && Number(today.pumpQuality) <= 2 && !today.electrolytesUsed) flags.push("Likely fuel/hydration issue.");
  if (today.sweatLevel === "high") flags.push("Electrolyte support may be useful today.");

  let status = "Hydrated";
  if (today.cramping || today.headache) status = "Low fluid/electrolyte risk";
  else if (flags.length) status = "Monitor";

  return { status, flags, hasData: true, waterIntake: today.waterIntake, electrolytesUsed: !!today.electrolytesUsed };
}

export function caffeineLoadStatus(stimulantLogs, referenceDate = new Date()) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const todayLogs = (stimulantLogs || []).filter(s => s.date === todayISO);
  const totalMg = todayLogs.reduce((sum, s) => sum + (Number(s.caffeineMg) || 0), 0);
  let status = "Low";
  if (totalMg >= 400) status = "Excessive / caution";
  else if (totalMg >= 300) status = "High";
  else if (totalMg >= 150) status = "Moderate";
  return {
    totalMg, status, sourceCount: todayLogs.length,
    lateFlag: todayLogs.some(s => s.sleepAffected),
    maskingWarning: totalMg >= 300
  };
}

export function recoveryMealCompliance(mealLogs, referenceDate = new Date()) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const todayMeals = (mealLogs || []).filter(m => m.date === todayISO);
  const has = (tag) => todayMeals.some(m => m.recoveryTag === tag);
  return {
    preWorkoutComplete: has("pre-workout"),
    postWorkoutComplete: has("post-workout"),
    preBedComplete: has("pre-bed"),
    highCarbRecoveryComplete: has("high-carb-recovery"),
    proteinAnchorComplete: has("protein-anchor"),
    hydrationTagComplete: has("hydration")
  };
}

function readinessRecommendationFor(status) {
  return {
    "green": "Readiness is high — push today if the session calls for it.",
    "amber-green": "Keep the workout as planned; only increase load if warm-ups feel strong.",
    "amber": "Hold load — chase clean reps instead of PRs today.",
    "red-amber": "Reduce intensity — technique focus, hold or lower load.",
    "red": "Recovery priority today — keep movement light and technical."
  }[status] || "Hold load — chase clean reps instead of PRs today.";
}

function nextRecoveryObjective({ sStats, latestRecovery, hydration, caffeineToday, preWorkoutDone }) {
  if (sStats.hasData && sStats.lastNight != null && sStats.lastNight < 6) return "Protect tonight's caffeine cutoff and aim for an earlier bedtime.";
  if (!preWorkoutDone) return "Complete a pre-workout meal: 30-80g carbs and 25-40g protein.";
  if (caffeineToday >= 400) return "Keep caffeine under control for the rest of today.";
  if (latestRecovery && Number(latestRecovery.sorenessScore) >= 4) return "Prioritise a post-workout recovery meal and extra sleep tonight.";
  if (hydration.flags?.length) return hydration.flags[0];
  return "Keep current recovery habits consistent.";
}

/** Composite 0-100 performance-readiness score. Never medically diagnostic — frames output as training guidance. */
export function readinessScore(data, referenceDate = new Date()) {
  const sStats = sleepStats(data.sleepLogs || [], referenceDate);
  const recoverySorted = [...(data.recoveryLogs || [])].filter(r => parseLogDate(r.date)).sort((a, b) => parseLogDate(a.date) - parseLogDate(b.date));
  const latestRecovery = recoverySorted.at(-1) || null;
  const hydration = hydrationStatus(data.hydrationLogs || [], data.stimulantLogs || [], referenceDate);
  const caffeine = caffeineLoadStatus(data.stimulantLogs || [], referenceDate);
  const mealCompliance = recoveryMealCompliance(data.mealLogs || [], referenceDate);

  const dataPoints = [sStats.hasData, !!latestRecovery, hydration.hasData, caffeine.sourceCount > 0].filter(Boolean).length;
  const confidence = dataPoints >= 3 ? "high" : dataPoints >= 2 ? "medium" : "low";

  let score = 50;
  const reasons = [];

  if (sStats.hasData && sStats.lastNight != null) {
    if (sStats.lastNight >= 7) score += 15;
    else if (sStats.lastNight >= 6) score += 8;
    else if (sStats.lastNight >= 5) score += 0;
    else { score -= 12; reasons.push("short sleep last night"); }
    if (sStats.trend === "declining") { score -= 8; reasons.push("declining sleep trend"); }
    else if (sStats.trend === "improving") score += 5;
  }

  if (latestRecovery) {
    const soreness = Number(latestRecovery.sorenessScore) || 0;
    const energy = Number(latestRecovery.energyScore) || 0;
    const motivation = Number(latestRecovery.motivationScore) || 0;
    const recoveryVal = Number(latestRecovery.recoveryScore) || 0;
    score += (energy - 3) * 5;
    score += (motivation - 3) * 4;
    score += (recoveryVal - 3) * 5;
    if (soreness >= 4) { score -= 10; reasons.push("high soreness"); }
  }

  const recentWorkouts = (data.workouts || []).filter(w => { const d = parseLogDate(w.date); return d && (referenceDate - d) / 86400000 <= 7; });
  const failureSets = recentWorkouts.reduce((sum, w) => sum + (w.exercises || []).filter(e => e.technicalFailureReached).length, 0);
  if (recentWorkouts.length >= 5 && failureSets >= 8) { score -= 8; reasons.push("high training load with repeated failure sets"); }

  if (caffeine.totalMg >= 400) { score -= 10; reasons.push("high caffeine load"); }
  else if (caffeine.totalMg >= 300) { score -= 4; }

  if (hydration.hasData) {
    if (hydration.status === "Low fluid/electrolyte risk") { score -= 6; reasons.push("hydration/electrolyte risk flagged"); }
    else if (hydration.status === "Monitor") { score -= 3; reasons.push("hydration status needs monitoring"); }
  }

  if (!mealCompliance.preWorkoutComplete) score -= 3;
  if (mealCompliance.postWorkoutComplete) score += 2;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const status = score >= 80 ? "green" : score >= 60 ? "amber-green" : score >= 40 ? "amber" : score >= 20 ? "red-amber" : "red";
  const trainingMode = {
    green: "Push", "amber-green": "Push Carefully", amber: "Hold Load",
    "red-amber": "Reduce Intensity", red: "Recovery Priority"
  }[status];

  const mainBottleneck = reasons[0] || (sStats.hasData || latestRecovery ? "No major bottleneck detected" : "Limited recovery data logged yet");
  const secondaryBottleneck = reasons[1] || null;

  return {
    score, status, trainingMode, mainBottleneck, secondaryBottleneck, confidence,
    recommendation: readinessRecommendationFor(status),
    nextObjective: nextRecoveryObjective({ sStats, latestRecovery, hydration, caffeineToday: caffeine.totalMg, preWorkoutDone: mealCompliance.preWorkoutComplete }),
    caffeineToday: caffeine.totalMg,
    sleepStats: sStats
  };
}

const FATIGUE_ACTIONS = {
  "medical-concern": { today: "This is outside normal recovery optimisation — consider a sports physio, GP/doctor, or qualified clinician review.", "48h": "Do not push through this. Seek professional support." },
  "sleep-debt": { today: "Protect your caffeine cutoff and prioritise sleep opportunity tonight.", "48h": "Use the weekend recovery window to extend sleep toward 8-10h." },
  "under-fuelled": { today: "Add 30-80g carbs and 25-40g protein pre-workout.", "48h": "Review the week's calorie trend against your lean bulk target." },
  "low-carb": { today: "Raise carbs around training today.", "48h": "Track carb timing and add a high-carb recovery meal." },
  "dehydration": { today: "Add water and sodium/electrolytes.", "48h": "Monitor pump and performance as hydration improves." },
  "stimulant-masking": { today: "Do not increase caffeine — treat this as a recovery/fuel issue.", "48h": "Reduce late caffeine and protect sleep." },
  "overreaching": { today: "Hold load and reduce optional finishers.", "48h": "Keep technique focus and use the weekend sleep extension." },
  "normal-soreness": { today: "Continue training as planned.", "48h": "Monitor the trend — no panic adjustments needed." },
  "joint-tendon": { today: "Hold progression on the affected movement and review form.", "48h": "Consider a substitution; seek professional help if it persists." },
  "insufficient-data": { today: "Log sleep, recovery and meals to unlock a fatigue read.", "48h": "Keep logging consistently for a more accurate picture." }
};
function fatigueActionText(id, when) { return (FATIGUE_ACTIONS[id] || FATIGUE_ACTIONS["insufficient-data"])[when]; }

/**
 * Fatigue Reason Detector: scores every category (A-I from the recovery framework)
 * against currently-logged signals and returns the strongest match as primary,
 * next-strongest as secondary. Never diagnostic — category I always routes to a
 * "seek professional support" message, never a specific medical claim.
 */
export function detectFatigueReason(data, referenceDate = new Date()) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const sStats = sleepStats(data.sleepLogs || [], referenceDate);
  const recoverySorted = [...(data.recoveryLogs || [])].filter(r => parseLogDate(r.date)).sort((a, b) => parseLogDate(a.date) - parseLogDate(b.date));
  const latestRecovery = recoverySorted.at(-1) || null;
  const recentRecovery = recoverySorted.slice(-4);
  const hydration = hydrationStatus(data.hydrationLogs || [], data.stimulantLogs || [], referenceDate);
  const latestHydration = [...(data.hydrationLogs || [])].filter(h => parseLogDate(h.date)).sort((a, b) => parseLogDate(a.date) - parseLogDate(b.date)).at(-1) || null;
  const caffeine = caffeineLoadStatus(data.stimulantLogs || [], referenceDate);
  const todayStim = (data.stimulantLogs || []).filter(s => s.date === todayISO);
  const mealCompliance = recoveryMealCompliance(data.mealLogs || [], referenceDate);
  const recentWorkouts = (data.workouts || []).filter(w => { const d = parseLogDate(w.date); return d && (referenceDate - d) / 86400000 <= 7; });
  const recentPainFlags = recentWorkouts.flatMap(w => (w.exercises || []).filter(e => e.painFlag).map(e => e.name));
  const failureSets = recentWorkouts.reduce((sum, w) => sum + (w.exercises || []).filter(e => e.technicalFailureReached).length, 0);
  const bodyweightTrendVal = weeklyRateOfGain(data.bodyweightLogs || []);

  const categories = [];

  const persistentPain = recentPainFlags.length >= 3;
  const severeFatigueFlag = recentRecovery.filter(r => Number(r.energyScore) <= 1 && Number(r.recoveryScore) <= 1).length >= 2;
  if (persistentPain || severeFatigueFlag) {
    categories.push({
      id: "medical-concern", label: "Medical Concern / Red Flag", score: persistentPain ? 5 : 3,
      signals: [persistentPain ? "persistent pain flagged across recent sessions" : null, severeFatigueFlag ? "severe fatigue/recovery scores repeated" : null].filter(Boolean)
    });
  }

  { let score = 0; const signals = [];
    if (sStats.hasData && sStats.lastNight != null && sStats.lastNight < 6) { score += 2; signals.push("sleep below 6h"); }
    if (sStats.hasData && sStats.sevenDayAverage != null && sStats.sevenDayAverage < 6.5) { score += 2; signals.push("7-day sleep average low"); }
    if (sStats.trend === "declining") { score += 1; signals.push("declining sleep trend"); }
    if (latestRecovery && Number(latestRecovery.energyScore) <= 2) { score += 1; signals.push("low morning energy"); }
    if (latestRecovery && Number(latestRecovery.motivationScore) <= 2) { score += 1; signals.push("motivation lower than normal"); }
    if (score) categories.push({ id: "sleep-debt", label: "Sleep Debt Fatigue", score, signals }); }

  { let score = 0; const signals = [];
    if (!mealCompliance.preWorkoutComplete) { score += 1; signals.push("pre-workout meal not logged"); }
    if (bodyweightTrendVal != null && bodyweightTrendVal <= 0) { score += 2; signals.push("bodyweight not increasing during lean bulk"); }
    if (score) categories.push({ id: "under-fuelled", label: "Under-Fuelled Fatigue", score, signals }); }

  { let score = 0; const signals = [];
    if (latestHydration && Number(latestHydration.pumpQuality) > 0 && Number(latestHydration.pumpQuality) <= 2) { score += 2; signals.push("flat pump logged"); }
    if (!mealCompliance.preWorkoutComplete) { score += 1; signals.push("pre-workout carbs likely missing"); }
    if (score) categories.push({ id: "low-carb", label: "Low-Carb / Low-Glycogen Fatigue", score, signals }); }

  { let score = 0; const signals = [];
    if (latestHydration) {
      if (latestHydration.sweatLevel === "high" && !latestHydration.electrolytesUsed) { score += 2; signals.push("high sweat without electrolytes"); }
      if (latestHydration.cramping) { score += 2; signals.push("cramping logged"); }
      if (latestHydration.headache) { score += 1; signals.push("headache logged"); }
    }
    if (caffeine.totalMg >= 300 && (!latestHydration || !latestHydration.electrolytesUsed)) { score += 1; signals.push("high caffeine without hydration support"); }
    if (score) categories.push({ id: "dehydration", label: "Dehydration / Electrolyte Issue", score, signals }); }

  { let score = 0; const signals = [];
    if (caffeine.totalMg >= 300 && latestRecovery && Number(latestRecovery.energyScore) <= 2) { score += 2; signals.push("high caffeine but energy still low"); }
    if (todayStim.some(s => s.sleepAffected)) { score += 1; signals.push("caffeine flagged as affecting sleep"); }
    if (todayStim.some(s => s.crashLater)) { score += 1; signals.push("crash later reported"); }
    if (score) categories.push({ id: "stimulant-masking", label: "Stimulant Masking", score, signals }); }

  { let score = 0; const signals = [];
    if (recentRecovery.filter(r => Number(r.sorenessScore) >= 4).length >= 2) { score += 2; signals.push("soreness high across recent logs"); }
    if (recentRecovery.filter(r => Number(r.motivationScore) <= 2).length >= 2) { score += 1; signals.push("motivation trending down"); }
    if (recentWorkouts.length >= 5 && failureSets >= 8) { score += 2; signals.push("high failure-set volume this week"); }
    if (score >= 3) categories.push({ id: "overreaching", label: "Accumulated Fatigue / Overreaching Risk", score, signals }); }

  { let score = 0; const signals = [];
    if (latestRecovery && Number(latestRecovery.sorenessScore) === 3 && Number(latestRecovery.energyScore) >= 3) { score += 1; signals.push("moderate soreness with stable energy"); }
    if (score) categories.push({ id: "normal-soreness", label: "Normal Adaptation Soreness", score, signals }); }

  { let score = 0; const signals = [];
    if (recentPainFlags.length) { score += Math.min(4, 2 + (recentPainFlags.length - 1)); signals.push(`pain flagged on ${[...new Set(recentPainFlags)].join(", ")}`); }
    if (score) categories.push({ id: "joint-tendon", label: "Joint / Tendon Irritation", score, signals }); }

  categories.sort((a, b) => b.score - a.score);
  const primary = categories[0] || { id: "insufficient-data", label: "Not enough data yet", score: 0, signals: [] };
  const secondary = (categories[1] && categories[1].score > 0) ? categories[1] : null;
  const confidence = primary.score >= 4 ? "high" : primary.score >= 2 ? "medium" : "low";

  return {
    primaryCause: primary.label, primaryId: primary.id, primarySignals: primary.signals,
    secondaryCause: secondary?.label || null, secondaryId: secondary?.id || null, secondarySignals: secondary?.signals || [],
    confidence,
    todayAction: fatigueActionText(primary.id, "today"),
    next48hAction: fatigueActionText(primary.id, "48h"),
    professionalSupportWarning: primary.id === "medical-concern"
  };
}

/** Maps triggered signals onto the static RECOVERY_PROTOCOLS templates. Nothing about "is this active" is stored — recomputed live every call. */
export function activeRecoveryProtocols(data, referenceDate = new Date()) {
  const fatigue = detectFatigueReason(data, referenceDate);
  const readiness = readinessScore(data, referenceDate);
  const weekend = weekendRecoveryStatus(data.sleepLogs || [], referenceDate);
  const recentWorkouts = (data.workouts || []).filter(w => { const d = parseLogDate(w.date); return d && (referenceDate - d) / 86400000 <= 7; });
  const forearmPain = recentWorkouts.some(w => /Day 6/i.test(w.day || w.programDay || "") && (w.exercises || []).some(e => e.painFlag && /forearm|wrist|hammer|curl|extension|farmer/i.test(e.name || "")));
  const shoulderPain = recentWorkouts.some(w => (w.exercises || []).some(e => e.painFlag && /lateral raise|shoulder press|delt/i.test(e.name || "")));

  const causeIds = new Set([fatigue.primaryId, fatigue.secondaryId].filter(Boolean));
  const activeIds = new Set();
  if (causeIds.has("sleep-debt")) activeIds.add("sleep-debt");
  if (causeIds.has("under-fuelled")) activeIds.add("under-fuelled");
  if (causeIds.has("low-carb")) activeIds.add("low-carb-flat");
  if (causeIds.has("dehydration")) activeIds.add("dehydration-electrolyte");
  if (causeIds.has("stimulant-masking")) activeIds.add("high-caffeine-low-readiness");
  if (causeIds.has("overreaching")) { activeIds.add("overreaching-risk"); }
  if (causeIds.has("joint-tendon")) activeIds.add("joint-tendon-warning");
  if (causeIds.has("normal-soreness")) activeIds.add("high-soreness");
  if (forearmPain) activeIds.add("forearm-elbow-overload");
  if (shoulderPain) activeIds.add("shoulder-irritation");
  if (recentWorkouts.length >= 4 && weekend.status !== "Recovery extended") activeIds.add("weekend-recovery-extension");
  if (["amber", "red-amber", "red"].includes(readiness.status)) activeIds.add("pre-bed-recovery");
  if (["red-amber", "red"].includes(readiness.status)) activeIds.add("deload-consideration");

  return RECOVERY_PROTOCOLS.filter(p => activeIds.has(p.id)).map(p => ({ ...p, triggered: true }));
}

function supplementSupportNoteFor(fatigueId) {
  const map = {
    "sleep-debt": "Magnesium glycinate or glycine pre-bed only if already tolerated — not a fix for sleep opportunity itself.",
    "under-fuelled": "Carb powder pre/post-workout only if food is genuinely difficult to fit in.",
    "low-carb": "Carb powder around training only if food is genuinely difficult to fit in.",
    "dehydration": "Electrolyte/sodium support around training.",
    "joint-tendon": "Collagen/gelatin + vitamin C is optional — not a substitute for load management."
  };
  return map[fatigueId] || "No specific supplement action needed — sleep, food, hydration and training load are the priority.";
}

function buildWeeklyRecoveryObjective({ caffeineAvg, highCaffeineDays, weekendSleep }) {
  if (highCaffeineDays >= 3) return "Keep caffeine under 300mg on at least 5/7 days next week.";
  if (!weekendSleep.length || average(weekendSleep) < 8) return "Hit 8.5h+ sleep on Saturday and Sunday next week.";
  return "Keep current recovery habits consistent next week.";
}

/** WEEKLY RECOVERY DEBRIEF — additive summary computed from this Mon-Sun week's logs. */
export function weeklyRecoveryDebrief(data, referenceDate = new Date()) {
  const inWeek = (d) => { const parsed = parseLogDate(d); return parsed && isSameWeek(parsed, referenceDate); };
  const isWeekendDate = (d) => { const p = parseLogDate(d); return p && (p.getDay() === 0 || p.getDay() === 6); };

  const weekSleep = (data.sleepLogs || []).filter(s => inWeek(s.date) && s.calculatedDurationHours != null);
  const weekRecovery = (data.recoveryLogs || []).filter(r => inWeek(r.date));
  const weekStim = (data.stimulantLogs || []).filter(s => inWeek(s.date));
  const weekMeals = (data.mealLogs || []).filter(m => inWeek(m.date));
  const weekHydration = (data.hydrationLogs || []).filter(h => inWeek(h.date));

  const durations = weekSleep.map(s => s.calculatedDurationHours);
  const weekdaySleep = weekSleep.filter(s => !isWeekendDate(s.date)).map(s => s.calculatedDurationHours);
  const weekendSleep = weekSleep.filter(s => isWeekendDate(s.date)).map(s => s.calculatedDurationHours);
  const best = weekSleep.reduce((a, b) => (!a || b.calculatedDurationHours > a.calculatedDurationHours) ? b : a, null);
  const worst = weekSleep.reduce((a, b) => (!a || b.calculatedDurationHours < a.calculatedDurationHours) ? b : a, null);
  const sleepDebtEstimate = durations.length ? round1(durations.reduce((sum, h) => sum + Math.max(0, SLEEP_TARGET_HOURS - h), 0)) : null;

  const caffeineByDay = {};
  weekStim.forEach(s => { caffeineByDay[s.date] = (caffeineByDay[s.date] || 0) + (Number(s.caffeineMg) || 0); });
  const caffeineVals = Object.values(caffeineByDay);
  const caffeineAverage = caffeineVals.length ? round1(average(caffeineVals)) : null;
  const highCaffeineDays = caffeineVals.filter(v => v >= 300).length;

  const workoutDaysThisWeek = new Set((data.workouts || []).filter(w => inWeek(w.date)).map(w => w.date)).size;
  const preWorkoutDays = new Set(weekMeals.filter(m => m.recoveryTag === "pre-workout").map(m => m.date)).size;
  const postWorkoutDays = new Set(weekMeals.filter(m => m.recoveryTag === "post-workout").map(m => m.date)).size;

  const preBedRoutineCompliance = weekSleep.length ? round1((weekSleep.filter(s => s.preBedRoutineCompleted).length / weekSleep.length) * 100) : null;
  const hydrationElectrolyteCompliance = weekHydration.length ? round1((weekHydration.filter(h => h.electrolytesUsed).length / weekHydration.length) * 100) : null;

  const sorenessVals = weekRecovery.map(r => Number(r.sorenessScore)).filter(v => !Number.isNaN(v));
  const fatigue = detectFatigueReason(data, referenceDate);

  return {
    averageSleep: durations.length ? round1(average(durations)) : null,
    weekdaySleepAverage: weekdaySleep.length ? round1(average(weekdaySleep)) : null,
    weekendSleepAverage: weekendSleep.length ? round1(average(weekendSleep)) : null,
    bestSleepNight: best ? { date: best.date, hours: best.calculatedDurationHours } : null,
    worstSleepNight: worst ? { date: worst.date, hours: worst.calculatedDurationHours } : null,
    sleepDebtEstimate,
    caffeineAverage, highCaffeineDays,
    preWorkoutFuelCompliance: workoutDaysThisWeek ? round1((preWorkoutDays / workoutDaysThisWeek) * 100) : null,
    postWorkoutRecoveryCompliance: workoutDaysThisWeek ? round1((postWorkoutDays / workoutDaysThisWeek) * 100) : null,
    preBedRoutineCompliance, hydrationElectrolyteCompliance,
    averageSoreness: sorenessVals.length ? round1(average(sorenessVals)) : null,
    recoveryBottleneckOfWeek: fatigue.primaryCause,
    nextWeekObjective: buildWeeklyRecoveryObjective({ caffeineAvg: caffeineAverage, highCaffeineDays, weekendSleep })
  };
}

function nextMonthRecoveryPriorityFor(label) {
  return {
    "Sleep bottleneck": "Prioritise weekday sleep consistency, not just weekend recovery.",
    "Stimulant bottleneck": "Reduce average daily caffeine and protect the cutoff time.",
    "Fuel bottleneck": "Review calories and pre/post-workout fuel compliance.",
    "Volume/recovery mismatch": "Consider a planned deload before adding more volume.",
    "Recovery improving": "Keep current habits — recovery is trending in the right direction.",
    "Recovery stable": "Maintain current sleep, fuel and caffeine habits."
  }[label] || "Maintain current recovery habits.";
}

/** MONTHLY RECOVERY TRAJECTORY — additive summary computed from the last 28 days of logs. */
export function monthlyRecoveryTrajectory(data, referenceDate = new Date()) {
  const monthAgo = new Date(referenceDate); monthAgo.setDate(monthAgo.getDate() - 28);
  const inMonth = (d) => { const p = parseLogDate(d); return p && p >= monthAgo && p <= referenceDate; };
  const isWeekendDate = (d) => { const p = parseLogDate(d); return p && (p.getDay() === 0 || p.getDay() === 6); };

  const monthSleep = (data.sleepLogs || []).filter(s => inMonth(s.date) && s.calculatedDurationHours != null);
  const durations = monthSleep.map(s => s.calculatedDurationHours);
  const weekdayVals = monthSleep.filter(s => !isWeekendDate(s.date)).map(s => s.calculatedDurationHours);
  const weekendVals = monthSleep.filter(s => isWeekendDate(s.date)).map(s => s.calculatedDurationHours);
  const weekdayAvg = weekdayVals.length ? average(weekdayVals) : null;
  const weekendAvg = weekendVals.length ? average(weekendVals) : null;

  const monthStim = (data.stimulantLogs || []).filter(s => inMonth(s.date));
  const caffeineByDay = {};
  monthStim.forEach(s => { caffeineByDay[s.date] = (caffeineByDay[s.date] || 0) + (Number(s.caffeineMg) || 0); });
  const caffeineVals = Object.values(caffeineByDay);
  const caffeineTrend = caffeineVals.length ? round1(average(caffeineVals)) : null;

  const monthRecovery = (data.recoveryLogs || []).filter(r => inMonth(r.date));
  const recoveryScoreVals = monthRecovery.map(r => Number(r.recoveryScore)).filter(v => !Number.isNaN(v));
  const recoveryScoreTrend = recoveryScoreVals.length ? round1(average(recoveryScoreVals)) : null;

  const bwInMonth = (data.bodyweightLogs || []).filter(b => inMonth(b.date));
  const bodyweightGain = bwInMonth.length >= 2 ? round2(Number(bwInMonth.at(-1).morningBodyweight) - Number(bwInMonth[0].morningBodyweight)) : null;
  const targetGainForMonth = round2((data.profile?.targetWeeklyGain || 0.25) * 4);

  const sessionsLogged = (data.workouts || []).filter(w => inMonth(w.date)).length;
  const sixDaySustainable = sessionsLogged >= 16;

  let label = "Recovery stable";
  if (weekdayAvg != null && weekendAvg != null && weekendAvg - weekdayAvg >= 2.5) label = "Sleep bottleneck";
  else if (caffeineTrend != null && caffeineTrend >= 350) label = "Stimulant bottleneck";
  else if (bodyweightGain != null && targetGainForMonth != null && bodyweightGain < targetGainForMonth * 0.5) label = "Fuel bottleneck";
  else if (!sixDaySustainable) label = "Volume/recovery mismatch";
  else if (recoveryScoreTrend != null && recoveryScoreTrend >= 3.5) label = "Recovery improving";

  return {
    monthlyAverageSleep: durations.length ? round1(average(durations)) : null,
    weekdayVsWeekendGap: (weekdayAvg != null && weekendAvg != null) ? round1(weekendAvg - weekdayAvg) : null,
    caffeineTrend, recoveryScoreTrend, bodyweightGain, targetGainForMonth,
    sessionsLogged, sixDaySustainable, label,
    nextMonthPriority: nextMonthRecoveryPriorityFor(label)
  };
}

/**
 * AI Recovery Coach structured read. Never recommends illegal PEDs or
 * self-prescribed peptides, never diagnoses, never tells the user to push
 * through pain, and never recommends increasing caffeine to overcome fatigue.
 */
export function recoveryCoachRead(data, referenceDate = new Date()) {
  const readiness = readinessScore(data, referenceDate);
  const fatigue = detectFatigueReason(data, referenceDate);
  const hydration = hydrationStatus(data.hydrationLogs || [], data.stimulantLogs || [], referenceDate);
  const caffeine = caffeineLoadStatus(data.stimulantLogs || [], referenceDate);
  const mealCompliance = recoveryMealCompliance(data.mealLogs || [], referenceDate);

  const nutritionAction = !mealCompliance.preWorkoutComplete
    ? "Complete a pre-workout meal: 30-80g carbs, 25-40g protein, 60-120 minutes before training."
    : !mealCompliance.postWorkoutComplete
      ? "Add a post-workout recovery meal: 30-50g protein, 60-120g carbs."
      : "Nutrition timing looks on track today.";

  const hydrationAction = hydration.flags.length ? hydration.flags[0] : "Hydration looks adequate today.";
  const caffeineAction = caffeine.maskingWarning
    ? "Caffeine may be masking fatigue rather than fixing recovery — do not increase it."
    : "Caffeine load is controlled today.";
  const sleepAction = (readiness.sleepStats?.hasData && readiness.sleepStats.lastNight != null && readiness.sleepStats.lastNight < 6)
    ? "Protect tonight's caffeine cutoff and prioritise sleep opportunity."
    : "Keep sleep consistent.";

  return {
    status: readiness.status, readinessScore: readiness.score, mainBottleneck: readiness.mainBottleneck,
    secondaryBottleneck: readiness.secondaryBottleneck, confidence: readiness.confidence,
    whatThisMeans: `${fatigue.primaryCause}${fatigue.secondaryCause ? " with " + fatigue.secondaryCause.toLowerCase() : ""}.`,
    trainingRecommendation: readiness.recommendation,
    nutritionAction, hydrationAction, caffeineAction, sleepAction,
    supplementSupport: supplementSupportNoteFor(fatigue.primaryId),
    professionalSupportWarning: fatigue.professionalSupportWarning
      ? "Consider professional support: sports physio, GP/doctor, bloodwork, or qualified clinician review."
      : null
  };
}

// =====================================================================
// DAILY / MONTHLY CHECKLIST + SEQUENCED DAILY FLOW
// Purely derived from existing collections on every call — there is no
// separate "checklist state" stored anywhere, so any log saved from any
// tab is reflected here on the very next render (this is the "two-way
// sync": the dashboard never holds a stale copy of anything).
// =====================================================================

/** Today's sequenced flow: each step's "done" state is read live from today's logs. */
export function dailyChecklist(data, referenceDate = new Date()) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const sleepDone = (data.sleepLogs || []).some(s => s.date === todayISO);
  const preWorkoutDone = (data.mealLogs || []).some(m => m.date === todayISO && m.recoveryTag === "pre-workout");
  const trainedToday = (data.workouts || []).some(w => w.date === todayISO);
  const postWorkoutDone = (data.mealLogs || []).some(m => m.date === todayISO && m.recoveryTag === "post-workout");
  const recoveryDone = (data.recoveryLogs || []).some(r => r.date === todayISO);
  const hydrationDone = (data.hydrationLogs || []).some(h => h.date === todayISO);
  const activeSupplements = (data.supplements || []).filter(s => s.active);
  const supplementsDone = activeSupplements.length === 0 ||
    activeSupplements.every(s => (data.supplementLogs || []).some(l => l.date === todayISO && l.supplementId === s.id && l.taken));

  const items = [
    { id: "sleep", label: "Log last night's sleep", done: sleepDone, tab: "recovery", anchor: "sleepBedtime" },
    { id: "pre-workout", label: "Pre-workout fuel", done: preWorkoutDone, tab: "nutrition", anchor: "mealName" },
    { id: "train", label: "Train today", done: trainedToday, tab: "train", anchor: "daySelect" },
    { id: "post-workout", label: "Post-workout recovery meal", done: postWorkoutDone, tab: "nutrition", anchor: "mealName" },
    { id: "recovery-log", label: "Log recovery (soreness / energy / motivation)", done: recoveryDone, tab: "recovery", anchor: "rSleepDuration" },
    { id: "hydration", label: "Log hydration / electrolytes", done: hydrationDone, tab: "recovery", anchor: "hydWaterIntake" },
    { id: "supplements", label: "Take active supplements", done: supplementsDone, tab: "nutrition", anchor: "supplementChecklist" }
  ];
  const completedCount = items.filter(i => i.done).length;
  return {
    items, completedCount, totalCount: items.length,
    pct: Math.round((completedCount / items.length) * 100),
    nextStep: items.find(i => !i.done) || null
  };
}

/** This calendar month's checklist — measurements, photos, monthly review. */
export function monthlyChecklist(data, referenceDate = new Date()) {
  const monthKey = referenceDate.toLocaleDateString("en-CA").slice(0, 7);
  const measurementsDone = (data.measurements || []).some(m => (m.date || "").startsWith(monthKey));
  const photosDone = (data.progressPhotos || []).some(p => (p.date || "").startsWith(monthKey));
  const reviewDone = (data.monthlyReviews || []).some(r => r.month === monthKey);

  const items = [
    { id: "measurements", label: "Log monthly measurements", done: measurementsDone, tab: "body", anchor: "mWeight" },
    { id: "photos", label: "Log progress photos", done: photosDone, tab: "body", anchor: "photoFront" },
    { id: "review", label: "Generate monthly review", done: reviewDone, tab: "more", anchor: "generateMonthlyReview" }
  ];
  const completedCount = items.filter(i => i.done).length;
  return { items, completedCount, totalCount: items.length, pct: Math.round((completedCount / items.length) * 100) };
}
