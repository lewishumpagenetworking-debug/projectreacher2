// Pure calculation utilities. No DOM access, no storage access — easy to reason about and reuse.
import { MUSCLE_GROUP_MAP, PRIORITY_MUSCLES } from "./program.js";
import { parseLogDate, isSameWeek } from "./dates.js";

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
    return { increaseNextWeek: true, recommendation: "Both sets hit the top of the rep range with good form — increase load next session." };
  }
  if (repRangeMin != null && (s1 < repRangeMin || s2 < repRangeMin)) {
    return { increaseNextWeek: false, recommendation: "Reps fell below target range — watch for fatigue or excessive load across sessions." };
  }
  return { increaseNextWeek: false, recommendation: "Within target range — repeat load, aim for more reps next session." };
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
