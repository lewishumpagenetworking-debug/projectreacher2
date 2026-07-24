// Pure calculation utilities. No DOM access, no storage access — easy to reason about and reuse.
import { MUSCLE_GROUP_MAP, PRIORITY_MUSCLES } from "./program.js";
import { parseLogDate, isSameWeek, startOfWeek } from "./dates.js";
import { RECOVERY_PROTOCOLS } from "./recovery-data.js";

function setVolume(e) {
  return (Number(e.set1Weight) || 0) * (Number(e.set1Reps) || 0) + (Number(e.set2Weight) || 0) * (Number(e.set2Reps) || 0);
}

/**
 * Which variant a logged entry belongs to (Gym App spec Part 2). An entry logged before
 * variants existed — or logged without ever touching the variant selector — has no
 * `selectedVariantId`, and always resolves to its exercise slot's own canonical/default
 * variant. `fallbackId` should be that exercise's own id — the caller's job, since this
 * function only sees one entry at a time. Without a fallbackId, entries whose `exerciseId`
 * is itself null or missing (e.g. logged before that field existed at all) resolve to null
 * rather than silently guessing an exercise — pass one whenever you know which exercise
 * you're asking about, which is every real caller. This is the one fallback rule that keeps
 * every pre-existing workout's history resolving exactly as it always has.
 */
export function resolveVariantId(entry, fallbackId = null) {
  return entry.selectedVariantId || entry.exerciseId || fallbackId;
}

/**
 * Last logged entry, most recent entry from a different week, and best-volume entry for one
 * exercise across all past workouts. Pass `variantId` to scope history to one specific
 * equipment variant only (Gym App spec Part 2: "performance from one variant must not
 * overwrite another") — omitted (the default), this returns history across ALL variants of
 * the exercise combined, i.e. today's existing name-only behaviour, unchanged. When scoping
 * by variantId, also pass `canonicalVariantId` (the exercise's own id) so that legacy entries
 * with no selectedVariantId/exerciseId of their own still correctly resolve to the canonical
 * variant instead of matching nothing.
 */
export function getExerciseHistory(workouts, exerciseName, { variantId = null, canonicalVariantId = null, referenceDate = new Date() } = {}) {
  const entries = [];
  workouts.forEach(w => {
    (w.exercises || []).forEach(e => {
      if (e.name !== exerciseName) return;
      if (variantId != null && resolveVariantId(e, canonicalVariantId) !== variantId) return;
      entries.push({ ...e, date: w.date });
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

/**
 * shoulder:waist and chest:waist ratios from a measurement entry. Both ratios assume
 * circumference measurements — if shoulders/chest/waist was logged as flat-width
 * (see measurementMethods), the ratio is skipped rather than silently comparing two
 * incompatible measurement methods, and a warning is returned instead.
 */
export function ratios(measurement) {
  const methods = measurement.measurementMethods || { shoulders: "circumference", chest: "circumference", waist: "circumference" };
  const nonCircumference = ["shoulders", "chest", "waist"].filter(k => methods[k] && methods[k] !== "circumference");
  if (nonCircumference.length) {
    return {
      shoulderToWaist: null, chestToWaist: null,
      methodWarning: `Ratios skipped — ${nonCircumference.join(", ")} logged as flat-width. Ratios require circumference measurements for shoulders, chest and waist.`
    };
  }
  const shoulders = Number(measurement.shoulders);
  const chest = Number(measurement.chest);
  const waist = Number(measurement.waist);
  return {
    shoulderToWaist: waist ? round2(shoulders / waist) : null,
    chestToWaist: waist ? round2(chest / waist) : null,
    methodWarning: null
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

  if (s1 >= repRangeMax && s2 >= repRangeMax && formQuality != null && formQuality >= 4) {
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

/**
 * Full progression-status enum for one logged exercise entry — "NEXT SESSION" guidance
 * surfaced on the exercise card, workout preview and Dashboard. Blank/unlogged quality
 * fields (form/ROM/tempo) are always treated as UNKNOWN, never as a silent pass: they
 * can never produce "Increase Load" on their own, only "Hold Load" pending confirmation.
 * `context.readiness` / `context.mealCompliance` are optional and never affect `.status`
 * or `.reason` (Gym App spec, Part 1) — when provided, they only populate the separate
 * `.contextNotes` array for non-blocking, informational display alongside the result.
 */
/**
 * Builds non-blocking, informational-only notes from readiness/nutrition context. These are
 * never allowed to change a progression status or reason — they exist purely so the UI can
 * show "here's some other context" alongside a result that was already fully determined from
 * performance data alone (Gym App spec: "Nutrition and recovery data may influence contextual
 * commentary, but they must never disable, suppress, delay, weaken or invalidate progression.")
 */
function buildProgressionContextNotes({ readiness = null, mealCompliance = null } = {}) {
  const notes = [];
  if (readiness && ["red-amber", "red"].includes(readiness.status)) {
    notes.push({ type: "recovery", message: `Readiness is currently ${readiness.status} (${readiness.mainBottleneck}). Shown as context only — it does not change the progression result above.` });
  }
  if (mealCompliance && mealCompliance.preWorkoutComplete === false) {
    notes.push({ type: "nutrition", message: "Pre-workout fuel wasn't logged for this session. Shown as context only — it does not change the progression result above." });
  }
  return notes;
}

export function exerciseProgressionStatus(entry, exerciseDef, context = {}) {
  const { previousEntry = null, readiness = null, mealCompliance = null } = context;
  const contextNotes = buildProgressionContextNotes({ readiness, mealCompliance });
  const core = computeCoreProgressionStatus(entry, exerciseDef, { previousEntry });
  return { ...core, contextNotes };
}

/**
 * Exercise Progression Engine (Gym App spec, Part 1): performance-derived signals only —
 * reps, sets, load, RIR/RPE, technique, ROM, tempo, pain, and prior performance. Deliberately
 * takes no nutrition or recovery/readiness input, so it can never be gated, weakened, or
 * relabelled by unrelated data. See exerciseProgressionStatus() above for the non-blocking
 * context notes shown alongside this result.
 */
function computeCoreProgressionStatus(entry, exerciseDef, context = {}) {
  const { previousEntry = null } = context;

  if (!exerciseDef || exerciseDef.repRangeMax == null) {
    return { status: "Insufficient Data", reason: "No target rep/lengths range set for this exercise.", limitingFactor: null };
  }

  const s1 = Number(entry.set1Reps) || 0;
  const s2 = Number(entry.set2Reps) || 0;
  if (s1 === 0 && s2 === 0) {
    return { status: "Insufficient Data", reason: "No sets logged yet for this exercise.", limitingFactor: null };
  }

  if (entry.painFlag) {
    return { status: "Pain Review", reason: "Pain/discomfort flagged — do not progress this exercise. Consider a professional if it persists.", limitingFactor: "pain" };
  }

  const formQuality = entry.formQuality != null ? Number(entry.formQuality) : null;
  const romQuality = entry.rangeOfMotionQuality != null ? Number(entry.rangeOfMotionQuality) : null;
  const tempoControl = entry.tempoControl != null ? Number(entry.tempoControl) : null;

  const formConfirmedGood = formQuality != null && formQuality >= 4;
  const formKnownBad = formQuality != null && formQuality < 3;
  const romKnownBad = romQuality != null && romQuality < 4;
  const tempoKnownBad = tempoControl != null && tempoControl < 3;

  if (formKnownBad) {
    return { status: "Improve Form", reason: "Form quality below 3 — hold or reduce load until execution is clean.", limitingFactor: "form" };
  }
  if (romKnownBad) {
    return { status: "Improve ROM", reason: "Range of motion below standard — hold load until depth/stretch is consistent.", limitingFactor: "rom" };
  }
  if (tempoKnownBad) {
    return { status: "Improve Tempo", reason: "Tempo control broke down — hold load and focus on the eccentric next session.", limitingFactor: "tempo" };
  }

  const { repRangeMax, repRangeMin } = exerciseDef;
  const distanceBased = !!exerciseDef.distanceBased;
  const unitLabel = distanceBased ? "lengths" : "reps";

  // Quality-gated progression is unconditional on the set's OWN data (addendum section
  // 7; reaffirmed by the Gym App spec's progression-independence rule) — an earned
  // Increase Load is never overridden by today's readiness or nutrition context, and
  // (unlike the removed Recovery-Limited/Nutrition-Limited statuses) unrelated data can
  // no longer relabel a Hold/Reduce/Increase-Reps result either. See contextNotes on the
  // wrapping exerciseProgressionStatus() for how that context is still surfaced.
  if (s1 >= repRangeMax && s2 >= repRangeMax && formConfirmedGood) {
    return {
      status: "Increase Load",
      reason: distanceBased
        ? "Both sets hit the top of the lengths range with confirmed good form — increase weight next session and reset lengths to the bottom of the range."
        : "Both sets hit the top of the rep range with confirmed good form — increase load next session.",
      limitingFactor: null
    };
  }

  if (previousEntry) {
    const prevS1 = Number(previousEntry.set1Reps) || 0;
    const prevS2 = Number(previousEntry.set2Reps) || 0;
    const prevForm = previousEntry.formQuality != null ? Number(previousEntry.formQuality) : null;
    const repsImproved = (s1 + s2) > (prevS1 + prevS2);
    const formDropped = prevForm != null && formQuality != null && formQuality < prevForm;
    if (repsImproved && formDropped) {
      return { status: "Hold Load", reason: "Reps improved but form quality dropped vs. last session — repeat the same load.", limitingFactor: "form" };
    }
  }

  if (s1 >= repRangeMax && s2 >= repRangeMax) {
    return {
      status: "Hold Load",
      reason: "Potential progression candidate — complete quality assessment.",
      limitingFactor: "form-unknown"
    };
  }

  if (repRangeMin != null && (s1 < repRangeMin || s2 < repRangeMin)) {
    return {
      status: "Reduce Load",
      reason: distanceBased
        ? "Lengths fell below target range — watch for fatigue or excessive weight across sessions."
        : "Reps fell below target range — watch for fatigue or excessive load across sessions.",
      limitingFactor: null
    };
  }

  return {
    status: "Increase Reps",
    reason: distanceBased
      ? "Within target lengths range — repeat weight, aim for more lengths next session before increasing weight."
      : "Within target range — repeat load, aim for more reps next session.",
    limitingFactor: null
  };
}

/**
 * Exercise names + reasons whose most recently logged entry resolves to "Increase Load".
 * Always LIVE-computed from each entry's raw logged fields (reps/weight/form/ROM/tempo/
 * pain) via exerciseProgressionStatus() rather than trusting a stored progressionStatus
 * snapshot — this is what makes a fully-qualifying historical session (logged before
 * this status existed, so its stored snapshot is null) surface correctly on the very
 * next exposure without ever needing the user to re-confirm it or the app rewriting
 * the saved record.
 */
export function exercisesReadyToIncrease(workouts, exercises) {
  const byName = Object.fromEntries((exercises || []).map(e => [e.name, e]));
  const latestByName = {};
  (workouts || []).forEach(w => {
    (w.exercises || []).forEach(e => {
      const d = parseLogDate(w.date);
      if (!d) return;
      if (!latestByName[e.name] || d > latestByName[e.name].dateObj) latestByName[e.name] = { dateObj: d, entry: e };
    });
  });
  return Object.entries(latestByName)
    .map(([name, v]) => ({ name, ...exerciseProgressionStatus(v.entry, byName[name]) }))
    .filter(r => r.status === "Increase Load");
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

function hasLoggedSets(e) {
  return Number(e.set1Reps) > 0 || Number(e.set2Reps) > 0;
}

/**
 * Custom Session Builder support (spec: "the app must track exercises rather than
 * relying solely on session names"). Was `exerciseName` already logged with real sets
 * inside a custom session this week? Returns that workout (so the caller can show which
 * day it landed on) or null. Used to badge the ORIGINAL programmed session's card
 * "Completed in Custom Session" once its exercise has already been done elsewhere this
 * week, so the user isn't misled into repeating it.
 */
export function exerciseCompletedInCustomSessionThisWeek(workouts, exerciseName, referenceDate = new Date()) {
  const weekCustomWorkouts = workoutsInWeek(workouts, referenceDate).filter(w => w.isCustomSession);
  for (const w of weekCustomWorkouts) {
    const entry = (w.exercises || []).find(e => e.name === exerciseName && hasLoggedSets(e));
    if (entry) return w;
  }
  return null;
}

/**
 * Before a custom session template is saved, checks its proposed exercise list against
 * everything already logged (with real sets) this week — in any workout, custom or
 * normal — and returns the names that would duplicate already-completed work. An empty
 * result means no warning is needed; a non-empty one lists exactly which exercises to
 * flag, per spec's "clearly identify the duplicated exercises" requirement. Never blocks
 * saving — purely informational.
 */
export function customSessionVolumeWarnings(exerciseNames, workouts, referenceDate = new Date()) {
  const alreadyLogged = new Set();
  workoutsInWeek(workouts, referenceDate).forEach(w => {
    (w.exercises || []).forEach(e => { if (hasLoggedSets(e)) alreadyLogged.add(e.name); });
  });
  return [...new Set(exerciseNames)].filter(name => alreadyLogged.has(name));
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
  const meals = mealLogs.filter(m => m.date === dateStr && !m.isDraft);
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

/**
 * Combines a meal log's stored date ("YYYY-MM-DD" or legacy DD/MM/YYYY) and time
 * ("HH:MM") into one Date. Returns null if either half is missing/unparseable — such a
 * meal simply can't be placed into a timing window and is excluded from window totals,
 * never guessed at.
 */
export function mealLogDateTime(meal) {
  const day = parseLogDate(meal?.date);
  if (!day || typeof meal?.time !== "string") return null;
  const match = meal.time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const dt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(match[1]), Number(match[2]));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** [start, end) window ending at the workout's start, beginning `minutesBefore` earlier — the pre-workout intake window. */
export function preWorkoutWindow(workoutStart, minutesBefore = 150) {
  if (!workoutStart) return null;
  const end = new Date(workoutStart);
  const start = new Date(end.getTime() - minutesBefore * 60000);
  return { start, end };
}

/** [start, end) window beginning at workout completion, ending `minutesAfter` later — the post-workout intake window. */
export function postWorkoutWindow(workoutCompletion, minutesAfter = 120) {
  if (!workoutCompletion) return null;
  const start = new Date(workoutCompletion);
  const end = new Date(start.getTime() + minutesAfter * 60000);
  return { start, end };
}

/**
 * Sums protein/carbohydrate/fat/calories for whichever already-logged (non-draft) meals
 * fall inside `[window.start, window.end)`, purely by reading mealLogs — never mutates,
 * duplicates, or removes any log, and never changes what counts toward daily totals
 * elsewhere. Returns null (not zeros) when `window` itself is null, so callers can tell
 * "no workout time to classify against" apart from "classified, and totals were zero".
 */
export function sessionNutritionWindowTotals(mealLogs, window) {
  if (!window) return null;
  const meals = (mealLogs || []).filter(m => {
    if (m.isDraft) return false;
    const dt = mealLogDateTime(m);
    return dt && dt >= window.start && dt < window.end;
  });
  const sum = (key) => meals.reduce((total, m) => total + (Number(m[key]) || 0), 0);
  return {
    mealCount: meals.length,
    protein: round1(sum("protein")),
    carbs: round1(sum("carbs")),
    fat: round1(sum("fat")),
    calories: round1(sum("calories"))
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

/**
 * Purely diagnostic — never blocks a save (spec: "Log first. Validate second. Never
 * reject user nutrition data."). Reconciles entered calories against protein/carbs/fat
 * math (calories = protein*4 + carbs*4 + fat*9) and flags missing fields, but the
 * caller must treat every result here as an optional warning to display, never as a
 * reason to refuse `data.mealLogs.push(...)`. Tolerance is the larger of 50 kcal or
 * 10% of the calculated total, to allow for rounding without silently hiding
 * genuinely inconsistent entries from the warning.
 */
export function validateMealEntry({ mealName, quantity, unit, calories, protein, carbs, fat }) {
  const missingFields = [];
  if (!mealName) missingFields.push("food or meal name");
  if (quantity === "" || quantity == null) missingFields.push("quantity");
  if (!unit) missingFields.push("unit");
  if (calories === "" || calories == null) missingFields.push("calories");
  if (protein === "" || protein == null) missingFields.push("protein");
  if (carbs === "" || carbs == null) missingFields.push("carbohydrates");
  if (fat === "" || fat == null) missingFields.push("fat");

  const haveAllMacros = protein != null && protein !== "" && carbs != null && carbs !== "" && fat != null && fat !== "";
  const calculatedCaloriesFromMacros = haveAllMacros
    ? round1((Number(protein) || 0) * 4 + (Number(carbs) || 0) * 4 + (Number(fat) || 0) * 9)
    : null;

  if (missingFields.length) {
    return {
      reconciled: false, missingFields, calculatedCaloriesFromMacros,
      message: `Some fields were left blank (${missingFields.join(", ")}). The entry has still been logged using exactly what you entered.`
    };
  }

  const enteredCalories = Number(calories) || 0;
  const difference = round1(Math.abs(enteredCalories - calculatedCaloriesFromMacros));
  const tolerance = Math.round(Math.max(50, calculatedCaloriesFromMacros * 0.1));
  const reconciled = difference <= tolerance;
  return {
    reconciled, missingFields: [], expectedCalories: calculatedCaloriesFromMacros, calculatedCaloriesFromMacros,
    enteredCalories, difference, tolerance,
    message: reconciled
      ? "Calories and macros reconcile."
      : "The entered calories and macros may not fully align. The entry has still been logged using your exact values."
  };
}

/** Nutrition Data Confidence for a given day: High/Medium/Low/Incomplete Day, derived purely from today's logged meals. */
const PROVISIONAL_MESSAGE = "Nutrition data incomplete — calorie and macro analysis is provisional.";

export function nutritionConfidenceStatus(mealLogs, dateStr) {
  const meals = (mealLogs || []).filter(m => m.date === dateStr);
  if (!meals.length) return { status: "Incomplete Day", reason: "No meals logged for this day yet.", provisionalMessage: PROVISIONAL_MESSAGE, mealCount: 0, draftCount: 0 };

  const draftCount = meals.filter(m => m.isDraft).length;
  if (draftCount > 0) {
    return {
      status: "Low",
      reason: `${draftCount} meal(s) saved as draft — macros not yet reconciled.`,
      provisionalMessage: PROVISIONAL_MESSAGE,
      mealCount: meals.length, draftCount
    };
  }

  const scoreMap = { High: 3, Medium: 2, Low: 1, Manual: 3 };
  const reconciled = meals.filter(m => m.isDraft !== true);
  const lowCount = reconciled.filter(m => m.confidenceScore === "Low").length;
  const avg = average(reconciled.map(m => scoreMap[m.confidenceScore] ?? 1));

  let status;
  if (lowCount > 0) status = "Low";
  else if (avg != null && avg >= 2.6) status = "High";
  else status = "Medium";

  return {
    status,
    reason: lowCount
      ? `${lowCount} low-confidence meal(s) logged today.`
      : `${meals.length} meal(s) logged, average estimate confidence ${avg != null ? avg.toFixed(1) : "--"}/3.`,
    provisionalMessage: status === "High" ? null : PROVISIONAL_MESSAGE,
    mealCount: meals.length, draftCount
  };
}

/** Today's remaining calorie/macro targets, from the same dailyMealTotals() used everywhere else (drafts excluded). */
export function remainingDailyTargets(data, referenceDate = new Date()) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const totals = dailyMealTotals(data.mealLogs || [], todayISO);
  const weight = currentBodyweightKg(data);
  const macros = macroTargets(weight);
  const calorieTarget = data.profile?.dailyCalorieTarget || 2800;
  return {
    calories: round1(calorieTarget - totals.calories),
    protein: round1(macros.proteinMin - totals.protein),
    carbs: round1(macros.carbsMin - totals.carbs),
    fat: round1(macros.fatMin - totals.fat),
    totals, calorieTarget, macroTargets: macros
  };
}

/** How prominently the "meals to reach today's goal" panel should surface itself, unless the user manually opens it. */
export function macroGapUrgency(remaining, referenceDate = new Date()) {
  const meaningfulGap = remaining.calories > 200 || remaining.protein > 20;
  if (!meaningfulGap) return "none";
  const hour = referenceDate.getHours();
  if (hour >= 20) return "urgent";
  if (hour >= 17) return "prominent";
  return "low";
}

const GAP_SORTERS = {
  "best-fit": (a, b) => b.fitScore - a.fitScore,
  "highest-calories": (a, b) => b.meal.calories - a.meal.calories,
  "highest-protein": (a, b) => b.meal.protein - a.meal.protein,
  "highest-carbs": (a, b) => b.meal.carbs - a.meal.carbs,
  "highest-fat": (a, b) => b.meal.fat - a.meal.fat,
  "closest-without-exceeding": (a, b) => {
    const aOver = a.exceedsCalories ? 1 : 0, bOver = b.exceedsCalories ? 1 : 0;
    if (aOver !== bOver) return aOver - bOver;
    return b.meal.calories - a.meal.calories;
  },
  "most-frequent": (a, b) => (b.meal.timesLogged || 0) - (a.meal.timesLogged || 0),
  "recent": (a, b) => new Date(b.meal.lastUsedAt || 0) - new Date(a.meal.lastUsedAt || 0)
};

/**
 * Ranks saved meals (Meal History only — never an external database) against today's
 * remaining macro shortfall. High-calorie meals rank highest for a calorie shortfall,
 * high-protein meals rank highest for a protein shortfall; fitScore blends both when
 * more than one macro is behind.
 */
export function rankSavedMealsForGap(savedMeals, remaining, sortBy = "best-fit") {
  const active = (savedMeals || []).filter(m => !m.archived);
  const scored = active.map(meal => {
    const calScore = remaining.calories > 0 ? Math.max(0, 1 - Math.abs(remaining.calories - meal.calories) / Math.max(remaining.calories, 1)) : 0;
    const proteinScore = remaining.protein > 0 ? Math.min(1, meal.protein / Math.max(remaining.protein, 1)) : 0;
    const fitScore = round1(calScore * 40 + proteinScore * 60);
    const afterCalories = round1(remaining.calories - meal.calories);
    const afterProtein = round1(remaining.protein - meal.protein);
    const afterCarbs = round1(remaining.carbs - meal.carbs);
    const afterFat = round1(remaining.fat - meal.fat);
    return {
      meal, fitScore,
      exceedsCalories: meal.calories > remaining.calories + 100,
      exceedsCarbs: meal.carbs > remaining.carbs + 20,
      exceedsFat: meal.fat > remaining.fat + 15,
      afterCalories, afterProtein, afterCarbs, afterFat
    };
  });
  return scored.sort(GAP_SORTERS[sortBy] || GAP_SORTERS["best-fit"]);
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
  const todayCaffeine = caffeineLoadStatus(data.stimulantLogs || [], new Date(), currentBodyweightKg(data));
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

// Caffeine Guidelines v2 — bands as specified for a 70kg reference user (normal
// training range 150-250mg, priority-session range 200-300mg, caution range
// 300-400mg, high/recovery concern above 400mg) and scaled linearly with the
// logged/current bodyweight, so a lighter or heavier lifter gets a proportionate
// read rather than one fixed absolute number. The 400mg reference is an upper
// general safety reference for many healthy adults, never a performance target.
const CAFFEINE_REFERENCE_WEIGHT_KG = 70;
const CAFFEINE_RED_FLAG_SYMPTOMS = ["heart racing/palpitations", "chest tightness", "severe anxiety/panic", "tremor", "nausea/vomiting"];

export function currentBodyweightKg(data) {
  return data?.bodyweightLogs?.at(-1)?.morningBodyweight || data?.profile?.currentWeight || data?.profile?.startingWeight || CAFFEINE_REFERENCE_WEIGHT_KG;
}

/**
 * Per-kg-aware caffeine status. Bands (at the 70kg reference weight): Normal 150-250mg,
 * Priority-Session 200-300mg, Caution 300-400mg, Concern 400mg+ — scaled proportionately
 * by bodyweightKg. `status` keeps its original 4 values (Low/Moderate/High/"Excessive /
 * caution") for backward compatibility with existing callers; `label` carries the more
 * descriptive v2 name.
 */
export function caffeineLoadStatus(stimulantLogs, referenceDate = new Date(), bodyweightKg = null) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const todayLogs = (stimulantLogs || []).filter(s => s.date === todayISO);
  const totalMg = todayLogs.reduce((sum, s) => sum + (Number(s.caffeineMg) || 0), 0);

  const weight = bodyweightKg || CAFFEINE_REFERENCE_WEIGHT_KG;
  const scale = weight / CAFFEINE_REFERENCE_WEIGHT_KG;
  const mgPerKg = weight ? round1(totalMg / weight) : null;
  const bands = {
    normalMin: Math.round(150 * scale),
    normalMax: Math.round(250 * scale),
    priorityMax: Math.round(300 * scale),
    cautionMax: Math.round(400 * scale)
  };

  let status, label, message;
  if (totalMg < bands.normalMax) {
    status = "Low"; label = "Normal Range";
    message = `${totalMg}mg is within the normal training range (~${bands.normalMin}-${bands.normalMax}mg at your bodyweight).`;
  } else if (totalMg < bands.priorityMax) {
    status = "Moderate"; label = "Priority-Session Range";
    message = "Caffeine is above the normal Aesthetic Protocol performance range and may impair recovery.";
  } else if (totalMg < bands.cautionMax) {
    status = "High"; label = "Caution";
    message = "Caffeine is above the normal Aesthetic Protocol performance range and may impair recovery.";
  } else {
    status = "Excessive / caution"; label = "Concern";
    message = "High caffeine day. Do not add further stimulants.";
  }

  const redFlagLogs = todayLogs.filter(s => Array.isArray(s.redFlagSymptoms) && s.redFlagSymptoms.length);
  const redFlagEscalation = redFlagLogs.length
    ? "Symptoms logged with today's caffeine intake — stop the session and seek appropriate medical advice if palpitations, chest symptoms, severe anxiety, dizziness or abnormal heart symptoms continue."
    : null;

  return {
    totalMg, mgPerKg, status, label, message, bands,
    sourceCount: todayLogs.length,
    lateFlag: todayLogs.some(s => s.sleepAffected),
    maskingWarning: totalMg >= bands.priorityMax,
    redFlagEscalation
  };
}

/**
 * Proposes a gradual, week-by-week reduction plan toward the user's cutoff preference
 * — never a same-day cold-stop recommendation. Only proposes a plan when there's
 * enough recent history (5+ logged days) to base a starting point on.
 */
export function caffeineGradualReductionPlan(stimulantLogs, referenceDate = new Date()) {
  const byDay = {};
  (stimulantLogs || []).forEach(s => { byDay[s.date] = (byDay[s.date] || 0) + (Number(s.caffeineMg) || 0); });
  const recentDays = Object.entries(byDay)
    .filter(([date]) => { const d = parseLogDate(date); return d && (referenceDate - d) / 86400000 <= 14; })
    .map(([, mg]) => mg);

  if (recentDays.length < 5) {
    return { hasData: false, note: "Log caffeine for a few more days to unlock a personalised reduction plan." };
  }

  const currentAverage = round1(average(recentDays));
  const highDayCount = recentDays.filter(mg => mg > 400).length;
  if (currentAverage < 400 && highDayCount < 3) {
    return { hasData: true, needed: false, currentAverage, note: "Current caffeine intake doesn't need a reduction plan." };
  }

  const targetAverage = 250;
  const weeklyStepMg = 75; // "approximately 50-100 mg" per week
  const weeksNeeded = Math.max(1, Math.ceil((currentAverage - targetAverage) / weeklyStepMg));
  const steps = [];
  for (let w = 1; w <= weeksNeeded; w++) {
    steps.push({ week: w, targetMg: Math.max(targetAverage, Math.round(currentAverage - weeklyStepMg * w)) });
  }

  return {
    hasData: true, needed: true, currentAverage, targetAverage, weeklyStepMg, weeksNeeded, steps,
    note: `Week 1: reduce your usual dose by approximately 50-100mg. Week 2: reduce again if tolerated. Track headache, fatigue, irritability, performance, sleep and cravings as you go — never stop abruptly.`
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

/** Today's logged pre-workout readiness choice, if any — used to gate the Train tab mission start. */
export function preWorkoutReadinessToday(preWorkoutLogs, referenceDate = new Date()) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  return (preWorkoutLogs || []).find(p => p.date === todayISO) || null;
}

/**
 * Training-nutrition correlation: only reports a pattern once there are enough
 * repeated sessions on both sides (fuelled vs. under-fuelled/fasted) to be
 * meaningful — a single low-volume fasted session never triggers a claim.
 */
export function trainingNutritionCorrelation(data) {
  const workouts = data.workouts || [];
  const preLogs = data.preWorkoutLogs || [];
  if (workouts.length < 4 || !preLogs.length) return { hasData: false };

  const byDate = {};
  preLogs.forEach(p => { byDate[p.date] = p; });

  const paired = workouts.map(w => {
    const pre = byDate[w.date];
    const volume = (w.exercises || []).reduce((sum, e) =>
      sum + (Number(e.set1Weight) || 0) * (Number(e.set1Reps) || 0) + (Number(e.set2Weight) || 0) * (Number(e.set2Reps) || 0), 0);
    return { date: w.date, readinessChoice: pre?.readinessChoice || null, volume };
  }).filter(p => p.readinessChoice);

  const fuelled = paired.filter(p => p.readinessChoice === "fuel-complete").map(p => p.volume);
  const underfuelled = paired.filter(p => ["training-fasted", "food-unavailable", "digestive-tolerance", "continue-incomplete"].includes(p.readinessChoice)).map(p => p.volume);

  if (fuelled.length < 3 || underfuelled.length < 3) {
    return { hasData: false, sessionsAnalysed: paired.length, note: "Log a pre-workout readiness choice on a few more sessions (3+ fuelled and 3+ under-fuelled) to unlock this pattern." };
  }

  const avgFuelled = average(fuelled);
  const avgUnderfuelled = average(underfuelled);
  const volumeDifferencePct = avgFuelled ? round1(((avgFuelled - avgUnderfuelled) / avgFuelled) * 100) : null;

  return {
    hasData: true,
    sessionsAnalysed: paired.length,
    averageVolumeFuelled: round1(avgFuelled),
    averageVolumeUnderfuelled: round1(avgUnderfuelled),
    volumeDifferencePct,
    pattern: (volumeDifferencePct != null && volumeDifferencePct >= 10)
      ? `Sessions logged as fully fuelled beforehand show ~${volumeDifferencePct}% higher training volume than under-fuelled/fasted sessions — a repeated pattern across ${paired.length} logged sessions.`
      : "No strong repeated pattern yet between pre-workout fuel status and training volume."
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
  const caffeine = caffeineLoadStatus(data.stimulantLogs || [], referenceDate, currentBodyweightKg(data));
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
  const caffeine = caffeineLoadStatus(data.stimulantLogs || [], referenceDate, currentBodyweightKg(data));
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
  const caffeine = caffeineLoadStatus(data.stimulantLogs || [], referenceDate, currentBodyweightKg(data));
  const mealCompliance = recoveryMealCompliance(data.mealLogs || [], referenceDate);

  const nutritionAction = !mealCompliance.preWorkoutComplete
    ? "Complete a pre-workout meal: 30-80g carbs, 25-40g protein, 60-120 minutes before training."
    : !mealCompliance.postWorkoutComplete
      ? "Add a post-workout recovery meal: 30-50g protein, 60-120g carbs."
      : "Nutrition timing looks on track today.";

  const hydrationAction = hydration.flags.length ? hydration.flags[0] : "Hydration looks adequate today.";
  const shortSleep = readiness.sleepStats?.hasData && readiness.sleepStats.lastNight != null && readiness.sleepStats.lastNight < 6;
  const caffeineAction = (shortSleep && caffeine.maskingWarning)
    ? "Caffeine may be masking fatigue rather than resolving it."
    : caffeine.status === "Excessive / caution"
      ? "High caffeine day. Do not add further stimulants."
      : "Caffeine load is controlled today.";
  const sleepAction = shortSleep
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

/** Today's sequenced flow: each step's "done" state is read live from today's logs. Weekend-aware: Sat/Sun swap "Train today" for weekend recovery items. */
export function dailyChecklist(data, referenceDate = new Date()) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const isWeekend = referenceDate.getDay() === 0 || referenceDate.getDay() === 6;
  const sleepDone = (data.sleepLogs || []).some(s => s.date === todayISO);
  const preWorkoutDone = (data.mealLogs || []).some(m => m.date === todayISO && m.recoveryTag === "pre-workout");
  const trainedToday = (data.workouts || []).some(w => w.date === todayISO);
  const postWorkoutDone = (data.mealLogs || []).some(m => m.date === todayISO && m.recoveryTag === "post-workout");
  const recoveryDone = (data.recoveryLogs || []).some(r => r.date === todayISO);
  const hydrationDone = (data.hydrationLogs || []).some(h => h.date === todayISO);
  const activeSupplements = (data.supplements || []).filter(s => s.active);
  const supplementsDone = activeSupplements.length === 0 ||
    activeSupplements.every(s => (data.supplementLogs || []).some(l => l.date === todayISO && l.supplementId === s.id && l.taken));
  const todaySleep = (data.sleepLogs || []).find(s => s.date === todayISO);
  const weekendSleepExtended = !!todaySleep && todaySleep.calculatedDurationHours != null && todaySleep.calculatedDurationHours >= 8;
  const highCarbRecoveryDone = (data.mealLogs || []).some(m => m.date === todayISO && m.recoveryTag === "high-carb-recovery");

  const items = [
    { id: "sleep", label: "Log last night's sleep", done: sleepDone, tab: "recovery", anchor: "sleepBedtime" },
    { id: "pre-workout", label: "Pre-workout fuel", done: preWorkoutDone, tab: "nutrition", anchor: "mealName" },
    { id: "train", label: "Train today", done: trainedToday, tab: "train", anchor: "daySelect" },
    { id: "post-workout", label: "Post-workout recovery meal", done: postWorkoutDone, tab: "nutrition", anchor: "mealName" },
    { id: "recovery-log", label: "Log recovery (soreness / energy / motivation)", done: recoveryDone, tab: "recovery", anchor: "rSleepDuration" },
    { id: "hydration", label: "Log hydration / electrolytes", done: hydrationDone, tab: "recovery", anchor: "hydWaterIntake" },
    { id: "supplements", label: "Take active supplements", done: supplementsDone, tab: "nutrition", anchor: "supplementChecklist" }
  ];
  if (isWeekend) {
    items.push(
      { id: "weekend-sleep-extension", label: "Weekend recovery extension (aim 8-10h sleep)", done: weekendSleepExtended, tab: "recovery", anchor: "sleepBedtime" },
      { id: "weekend-high-carb-meal", label: "Bank a high-carb recovery meal", done: highCarbRecoveryDone, tab: "nutrition", anchor: "mealName" }
    );
  }
  const completedCount = items.filter(i => i.done).length;
  return {
    items, completedCount, totalCount: items.length,
    pct: Math.round((completedCount / items.length) * 100),
    nextStep: items.find(i => !i.done) || null,
    isWeekend
  };
}

/**
 * Weekly Recovery Direction: a single "push / maintain / prioritise recovery" call
 * combining progression readiness, this week's bottleneck, today's nutrition
 * confidence, caffeine load, and any recent joint/pain concerns. Additive read-only
 * summary — never writes anything, purely derived from existing collections.
 */
export function weeklyRecoveryDirection(data, referenceDate = new Date()) {
  const readiness = readinessScore(data, referenceDate);
  const fatigue = detectFatigueReason(data, referenceDate);
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const nutritionConfidence = nutritionConfidenceStatus(data.mealLogs || [], todayISO);
  const caffeine = caffeineLoadStatus(data.stimulantLogs || [], referenceDate, currentBodyweightKg(data));
  const jointWarnings = armForearmDeltWarnings(data, referenceDate);

  const reasons = [];
  let direction = "Maintain";

  if (["red", "red-amber"].includes(readiness.status)) {
    direction = "Prioritise Recovery";
    reasons.push(`Readiness is ${readiness.status} — ${readiness.mainBottleneck}.`);
  } else if (fatigue.primaryId === "medical-concern") {
    direction = "Prioritise Recovery";
    reasons.push(fatigue.primaryCause);
  } else if (["green", "amber-green"].includes(readiness.status) && nutritionConfidence.status !== "Low" && caffeine.status !== "Excessive / caution") {
    direction = "Push";
    reasons.push(`Readiness is ${readiness.status} with no major bottleneck.`);
  }

  if (nutritionConfidence.status === "Incomplete Day" || nutritionConfidence.status === "Low") {
    reasons.push(`Nutrition data confidence is ${nutritionConfidence.status.toLowerCase()} — ${nutritionConfidence.reason}`);
    if (direction === "Push") direction = "Maintain";
  }
  if (caffeine.status === "Excessive / caution") {
    reasons.push(caffeine.message);
    if (direction === "Push") direction = "Maintain";
  }
  if (jointWarnings.length) {
    reasons.push(...jointWarnings);
    direction = "Prioritise Recovery";
  }

  return {
    direction, reasons,
    readinessStatus: readiness.status, readinessScore: readiness.score,
    weeklyBottleneck: fatigue.primaryCause, nutritionConfidence: nutritionConfidence.status,
    caffeineStatus: caffeine.status
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

/**
 * A Session Review (spec section 21) doesn't require every field, but performanceVsExpected,
 * mainLimitingFactor and energy are the minimum needed for the constraint engine to treat
 * this session as usable evidence. Missing fields don't block saving — they surface a task.
 */
const SESSION_REVIEW_REQUIRED_FIELDS = ["performanceVsExpected", "mainLimitingFactor", "energy"];
export function isSessionReviewComplete(review) {
  if (!review) return false;
  return SESSION_REVIEW_REQUIRED_FIELDS.every(f => review[f] != null && review[f] !== "");
}
export function sessionReviewMissingFields(review) {
  if (!review) return SESSION_REVIEW_REQUIRED_FIELDS.slice();
  return SESSION_REVIEW_REQUIRED_FIELDS.filter(f => review[f] == null || review[f] === "");
}

/**
 * Ranked "what needs attention" signals — overdue tasks, macro gaps, recovery direction,
 * recovery warnings, monthly-review-due, no-meals-logged-yet. Extracted as the SINGLE
 * shared source for both the Dashboard Attention Panel and the global ProgressTask engine,
 * so both surfaces can never disagree about what's flagged (see js/task-engine.js).
 */
export function attentionSignals(data, referenceDate = new Date()) {
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  const items = [];

  const overdueTasks = (data.tasks || []).filter(t => !t.completed && t.dueDate && t.dueDate < todayISO);
  overdueTasks.forEach(t => items.push({
    id: `overdue-task-${t.id}`, severity: "error", icon: "🔴", title: t.title || t.description || "Overdue task",
    detail: `Was due ${t.dueDate}.`, gotoTab: "more", gotoAnchor: "tasksCard"
  }));

  const remaining = remainingDailyTargets(data, referenceDate);
  const urgency = macroGapUrgency(remaining, referenceDate);
  if (urgency === "urgent" || urgency === "prominent") {
    items.push({
      id: "macro-gap-open", severity: urgency === "urgent" ? "error" : "warning", icon: urgency === "urgent" ? "🔴" : "🟠",
      title: "Macro gap still open today",
      detail: `${Math.max(0, remaining.calories)}kcal / ${Math.max(0, remaining.protein)}g protein remaining.`,
      gotoTab: "nutrition", gotoAnchor: "findMealBtn"
    });
  }

  const direction = weeklyRecoveryDirection(data, referenceDate);
  if (direction.direction === "Prioritise Recovery") {
    items.push({
      id: "recovery-direction-prioritise", severity: "warning", icon: "🟠", title: "Recovery direction: Prioritise Recovery",
      detail: direction.reasons[0] || "Readiness signals suggest backing off today.",
      gotoTab: "recovery", gotoAnchor: undefined
    });
  }

  const warnings = recoveryWarnings(data);
  warnings.slice(0, 2).forEach((w, i) => items.push({
    id: `recovery-warning-${i}`, severity: "warning", icon: "🟠", title: "Recovery flag", detail: w, gotoTab: "recovery", gotoAnchor: undefined
  }));

  const lastMonthlyReview = data.monthlyReviews.at(-1);
  const daysSinceMonthly = lastMonthlyReview ? (referenceDate.getTime() - new Date(lastMonthlyReview.createdAt || lastMonthlyReview.month).getTime()) / 86400000 : Infinity;
  if (daysSinceMonthly >= 28) {
    items.push({
      id: "monthly-review-due", severity: "info", icon: "🔵", title: "Monthly review is due",
      detail: lastMonthlyReview ? `Last review was ${Math.round(daysSinceMonthly)} days ago.` : "No monthly review has been generated yet.",
      gotoTab: "more", gotoAnchor: "monthlyReviewReminderCard"
    });
  }

  const trainedToday = (data.workouts || []).some(w => w.date === todayISO);
  const hour = referenceDate.getHours();
  const hasMealToday = dailyMealTotals(data.mealLogs || [], todayISO).mealCount > 0;
  if (!trainedToday && !hasMealToday && hour >= 14) {
    items.push({
      id: "no-meals-today", severity: "info", icon: "🔵", title: "No meals logged today yet",
      detail: "Log a meal to keep nutrition confidence and macro tracking accurate.",
      gotoTab: "nutrition", gotoAnchor: undefined
    });
  }

  const severityRank = { error: 0, warning: 1, info: 2 };
  return items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
