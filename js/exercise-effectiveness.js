// Personal Exercise Effectiveness (Hypertrophy Intelligence Engine spec): five per-exercise,
// evidence-gated scores built entirely from data already logged — no new subjective rating
// field exists anywhere in the app (confirmed: no enjoyment/difficulty/"how did that feel"
// field on a workout-log entry), so "Enjoyment/Adherence" here is computed as a behavioural
// adherence proxy (was this exercise actually completed when its programmed day was trained)
// rather than a fabricated preference score. Every function is read-only: this file never
// edits the programme, never auto-deprioritizes an exercise, and always returns a `reason`/
// `confidence` alongside any score so the UI can explain exactly why a number is what it is,
// or why there isn't one yet.
import { parseLogDate } from "./dates.js";
import { average, exerciseProgressionStatus } from "./calculations.js";
import { detectExercisePlateau } from "./plateau-detection.js";

function round2(n) { return Math.round(n * 100) / 100; }

function entriesForExercise(workouts, exerciseName) {
  const entries = [];
  (workouts || []).forEach(w => (w.exercises || []).forEach(e => {
    if (e.name === exerciseName) entries.push({ ...e, date: w.date });
  }));
  return entries.sort((a, b) => (parseLogDate(a.date) || 0) - (parseLogDate(b.date) || 0));
}

// Recency weighting shared by the scores below: a 45-day half-life, so a session from 3
// months ago still counts but far less than one from last week — never a hard cliff.
function recencyWeight(date, referenceDate) {
  const d = parseLogDate(date);
  if (!d) return 0;
  const daysAgo = Math.max(0, (referenceDate - d) / 86400000);
  return Math.pow(0.5, daysAgo / 45);
}

const PROGRESSION_POSITIVE = new Set(["Increase Load", "Increase Reps"]);
const PROGRESSION_NEGATIVE = new Set(["Reduce Load"]);
const PROGRESSION_BLOCKED = new Set(["Pain Review", "Improve Form", "Improve ROM", "Improve Tempo", "Insufficient Data"]);

/**
 * Growth Effectiveness Score: of the sessions where this exercise's own logged data was
 * actually eligible to judge progression (i.e. not blocked by pain/form/ROM/tempo/missing
 * data — those are execution issues, not evidence the exercise itself doesn't work), what
 * share ended in Increase Load/Increase Reps vs Hold/Reduce, recency-weighted.
 */
export function growthEffectivenessScore(workouts, exerciseDef, referenceDate = new Date()) {
  if (!exerciseDef) return { score: null, confidence: "insufficient-data", sessionsConsidered: 0, blockedSessions: 0, reason: "No exercise definition provided." };
  const sorted = entriesForExercise(workouts, exerciseDef.name);
  if (sorted.length < 2) {
    return { score: null, confidence: "insufficient-data", sessionsConsidered: sorted.length, blockedSessions: 0, reason: "Fewer than 2 logged sessions." };
  }

  let positiveWeight = 0, otherWeight = 0, blockedSessions = 0, considered = 0;
  for (let i = 1; i < sorted.length; i++) {
    const entry = sorted[i];
    const { status } = exerciseProgressionStatus(entry, exerciseDef, { previousEntry: sorted[i - 1] });
    if (PROGRESSION_BLOCKED.has(status)) { blockedSessions++; continue; }
    considered++;
    const weight = recencyWeight(entry.date, referenceDate);
    if (PROGRESSION_POSITIVE.has(status)) positiveWeight += weight;
    else otherWeight += weight; // Hold Load or Reduce Load — a real (non-blocked) outcome that wasn't progression
  }

  if (considered < 2) {
    return { score: null, confidence: "insufficient-data", sessionsConsidered: sorted.length, blockedSessions, reason: "Fewer than 2 sessions where progression could actually be judged (the rest were blocked by pain, form, ROM or tempo issues)." };
  }

  const totalWeight = positiveWeight + otherWeight;
  const score = totalWeight > 0 ? round2(positiveWeight / totalWeight) : 0;
  const confidence = considered >= 8 ? "high" : considered >= 4 ? "medium" : "low";
  return {
    score, confidence, sessionsConsidered: considered, blockedSessions,
    reason: `${considered} eligible sessions judged (${blockedSessions} excluded for pain/form/ROM/tempo/missing data), recency-weighted toward Increase Load/Increase Reps outcomes.`
  };
}

/**
 * Progression Reliability: how often this exercise plateaus, not whether it's currently
 * plateaued. Re-checks detectExercisePlateau() (plateau-detection.js) at several past
 * checkpoints going back in time and reports the share of data-sufficient checkpoints that
 * were NOT plateaued — an exercise that plateaus repeatedly is a less reliable long-term
 * choice even if it isn't plateaued at this exact moment.
 */
export function progressionReliability(workouts, exerciseDef, referenceDate = new Date(), { checkpoints = 6, intervalDays = 14 } = {}) {
  if (!exerciseDef) return { score: null, confidence: "insufficient-data", checkpointsConsidered: 0, reason: "No exercise definition provided." };
  const results = [];
  for (let i = 0; i < checkpoints; i++) {
    const checkpointDate = new Date(referenceDate.getTime() - i * intervalDays * 86400000);
    // Only sessions logged by that point in time — otherwise every checkpoint would see the
    // exact same full history and this would just repeat today's plateau reading, not a real
    // historical trend.
    const workoutsAsOf = (workouts || []).filter(w => {
      const d = parseLogDate(w.date);
      return d && d <= checkpointDate;
    });
    const r = detectExercisePlateau(workoutsAsOf, exerciseDef.name, checkpointDate);
    if (r.strength === "insufficient-data" || r.strength === "insufficient-time") continue;
    results.push(r.plateau);
  }
  if (results.length < 2) {
    return { score: null, confidence: "insufficient-data", checkpointsConsidered: results.length, reason: "Not enough historical checkpoints with sufficient comparable-session data yet." };
  }
  const nonPlateauCount = results.filter(p => !p).length;
  const score = round2(nonPlateauCount / results.length);
  const confidence = results.length >= 5 ? "high" : results.length >= 3 ? "medium" : "low";
  return {
    score, confidence, checkpointsConsidered: results.length,
    reason: `${results.length} historical checkpoints considered — plateaued at ${results.length - nonPlateauCount} of them.`
  };
}

/**
 * Fatigue Cost: how much proximity-to-failure and pain this exercise tends to generate per
 * logged set — informational, not good-or-bad by itself (a high fatigue cost is expected and
 * fine for a compound main lift; it's more relevant later for Smart Ordering/fatigue-budget
 * decisions than as a standalone verdict here).
 */
export function fatigueCostScore(workouts, exerciseDef, referenceDate = new Date(), lookbackDays = 90) {
  if (!exerciseDef) return { score: null, confidence: "insufficient-data", sessionsConsidered: 0, reason: "No exercise definition provided." };
  const cutoff = new Date(referenceDate.getTime() - lookbackDays * 86400000);
  const entries = entriesForExercise(workouts, exerciseDef.name).filter(e => {
    const d = parseLogDate(e.date);
    return d && d >= cutoff;
  });
  if (entries.length < 3) {
    return { score: null, confidence: "insufficient-data", sessionsConsidered: entries.length, reason: `Fewer than 3 sessions logged in the last ${lookbackDays} days.` };
  }

  let totalSets = 0, highEffortSets = 0, painSessions = 0;
  entries.forEach(e => {
    ["set1", "set2"].forEach(prefix => {
      const reps = Number(e[`${prefix}Reps`]);
      if (!(reps > 0)) return;
      totalSets++;
      const rir = e[`${prefix}RIR`];
      const highEffort = (rir != null && Number(rir) <= 1) || e.technicalFailureReached === true || (e.RPE != null && Number(e.RPE) >= 9);
      if (highEffort) highEffortSets++;
    });
    if (e.painFlag) painSessions++;
  });
  if (totalSets === 0) {
    return { score: null, confidence: "insufficient-data", sessionsConsidered: entries.length, reason: "No hard sets logged in the lookback window." };
  }

  const effortRatio = round2(highEffortSets / totalSets);
  const painRatio = round2(painSessions / entries.length);
  const score = round2(Math.min(1, effortRatio * 0.7 + painRatio * 0.3));
  const confidence = totalSets >= 10 ? "high" : totalSets >= 6 ? "medium" : "low";
  return {
    score, effortRatio, painRatio, confidence, sessionsConsidered: entries.length,
    reason: `${Math.round(effortRatio * 100)}% of logged sets were at or near failure, with pain flagged on ${Math.round(painRatio * 100)}% of sessions in the last ${lookbackDays} days.`
  };
}

/**
 * Adherence Score: of the sessions logged on a day this exercise is currently programmed,
 * what share actually included real logged sets for it (vs. being skipped/swapped away from
 * in practice). This is the behavioural stand-in for the spec's "Enjoyment/Adherence Score" —
 * there is no subjective rating field in this app to build a real enjoyment score from, and
 * inventing one here would be exactly the kind of fabricated precision this app avoids
 * everywhere else, so this measures actual completion behaviour instead.
 */
export function adherenceScore(data, exerciseDef, referenceDate = new Date(), lookbackDays = 60) {
  if (!exerciseDef) return { score: null, confidence: "insufficient-data", scheduledOccurrences: 0, reason: "No exercise definition provided." };
  const programDays = Object.entries(data.trainingProgram || {})
    .filter(([, exs]) => (exs || []).some(x => x.name === exerciseDef.name))
    .map(([day]) => day);
  if (!programDays.length) {
    return { score: null, confidence: "not-programmed", scheduledOccurrences: 0, reason: "This exercise is not currently part of the active programme." };
  }

  const cutoff = new Date(referenceDate.getTime() - lookbackDays * 86400000);
  const relevantWorkouts = (data.workouts || []).filter(w => {
    const d = parseLogDate(w.date);
    return d && d >= cutoff && programDays.includes(w.day);
  });
  if (relevantWorkouts.length < 3) {
    return { score: null, confidence: "insufficient-data", scheduledOccurrences: relevantWorkouts.length, reason: `Fewer than 3 logged sessions in the last ${lookbackDays} days on a day this exercise is programmed.` };
  }

  const completed = relevantWorkouts.filter(w => (w.exercises || []).some(e =>
    e.name === exerciseDef.name && (Number(e.set1Reps) > 0 || Number(e.set2Reps) > 0)
  )).length;
  const score = round2(completed / relevantWorkouts.length);
  const confidence = relevantWorkouts.length >= 8 ? "high" : relevantWorkouts.length >= 5 ? "medium" : "low";
  return {
    score, confidence, scheduledOccurrences: relevantWorkouts.length, completedOccurrences: completed,
    reason: `Completed on ${completed} of ${relevantWorkouts.length} sessions logged on a programmed day, in the last ${lookbackDays} days.`
  };
}

/**
 * Consistency Score: how regular the gaps between sessions of this exercise are. A low,
 * steady gap variance scores high; erratic long-then-short gaps score low. Says nothing
 * about whether the frequency itself is adequate — only about regularity.
 */
export function exerciseConsistencyScore(workouts, exerciseDef, referenceDate = new Date(), lookbackDays = 180) {
  if (!exerciseDef) return { score: null, confidence: "insufficient-data", sessionsConsidered: 0, reason: "No exercise definition provided." };
  const cutoff = new Date(referenceDate.getTime() - lookbackDays * 86400000);
  const entries = entriesForExercise(workouts, exerciseDef.name).filter(e => {
    const d = parseLogDate(e.date);
    return d && d >= cutoff;
  });
  if (entries.length < 4) {
    return { score: null, confidence: "insufficient-data", sessionsConsidered: entries.length, reason: `Fewer than 4 sessions logged in the last ${lookbackDays} days.` };
  }

  const dates = entries.map(e => parseLogDate(e.date)).filter(Boolean).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / 86400000);
  const meanGap = average(gaps);
  if (!meanGap) {
    return { score: null, confidence: "insufficient-data", sessionsConsidered: entries.length, reason: "Not enough spacing between sessions to compute a gap pattern." };
  }
  const variance = average(gaps.map(g => (g - meanGap) ** 2));
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / meanGap;
  const score = round2(Math.max(0, Math.min(1, 1 - cv)));
  const confidence = entries.length >= 8 ? "high" : entries.length >= 5 ? "medium" : "low";
  return {
    score, confidence, sessionsConsidered: entries.length, meanGapDays: Math.round(meanGap * 10) / 10,
    reason: `${entries.length} sessions in the last ${lookbackDays} days, averaging ${Math.round(meanGap * 10) / 10} days apart.`
  };
}

/** All 5 scores for one exercise, bundled for display. Never mutates its inputs. */
export function personalExerciseEffectiveness(data, exerciseDef, referenceDate = new Date()) {
  return {
    exerciseId: exerciseDef?.id ?? null,
    name: exerciseDef?.name ?? null,
    growthEffectiveness: growthEffectivenessScore(data.workouts || [], exerciseDef, referenceDate),
    progressionReliability: progressionReliability(data.workouts || [], exerciseDef, referenceDate),
    fatigueCost: fatigueCostScore(data.workouts || [], exerciseDef, referenceDate),
    adherence: adherenceScore(data, exerciseDef, referenceDate),
    consistency: exerciseConsistencyScore(data.workouts || [], exerciseDef, referenceDate)
  };
}

/** Bundled scores for every active exercise in the database. */
export function allExerciseEffectivenessScores(data, referenceDate = new Date()) {
  return (data.exercises || [])
    .filter(e => e.active !== false)
    .map(e => personalExerciseEffectiveness(data, e, referenceDate));
}
