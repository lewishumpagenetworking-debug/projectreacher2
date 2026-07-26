// Intelligent Warnings + Weak Point Analysis (Hypertrophy Intelligence Engine spec). Every
// function here is read-only and explainable — none of them ever edit the programme; they
// only surface a message the user can act on or ignore. All numbers come from the programme
// template (data.trainingProgram / data.exercises) and existing calculations.js output —
// nothing here is a new source of truth.
import { workoutsInWeek, weeklyMuscleHeadTargets, muscleHeadRecoveryStatusMap, allMuscleHeadRecoveryForecasts } from "./calculations.js";
import { detectMuscleHeadPlateau } from "./plateau-detection.js";
import { MUSCLE_HEADS, MUSCLE_HEAD_IDS } from "./muscle-heads.js";

// Default "superhero" structure priority (spec §"Priority Physique Allocation"). This is the
// out-of-the-box starting order; see resolvePriorityOrder() below for the user-configurable
// version (Phase 8), which lets a user reorder these same tiers via data.physiquePriorityTierOrder
// without ever needing to duplicate or hand-edit the tier contents themselves. Heads not
// listed here fall into the lowest ("remaining musculature") tier.
export const DEFAULT_PRIORITY_HEAD_ORDER = [
  ["lateral_delts"],
  ["chest_upper"],
  ["lat_width"],
  ["biceps_long_head", "biceps_short_head", "brachialis", "triceps_long_head", "triceps_lateral_head", "triceps_medial_head"],
  ["brachioradialis", "wrist_flexors", "wrist_extensors"],
  ["rear_delts"],
  ["quads", "hamstrings"]
];

/** Human-readable label per DEFAULT_PRIORITY_HEAD_ORDER tier index, for the priority-order UI. */
export const PRIORITY_TIER_LABELS = [
  "Lateral delts (shoulder width)",
  "Upper chest",
  "Lats (back width)",
  "Arms (biceps &amp; triceps)",
  "Forearms &amp; grip",
  "Rear delts",
  "Quads &amp; hamstrings"
];

/**
 * Priority Physique Allocation (spec: makes the "default superhero priority" order actually
 * user-configurable). `data.physiquePriorityTierOrder`, when present, is a permutation of tier
 * INDICES into DEFAULT_PRIORITY_HEAD_ORDER (e.g. [2,0,1,3,4,5,6]) — storing indices rather than
 * duplicating the tier contents means a user's reordering preference keeps applying correctly
 * even if this file's tier definitions are ever revised. An invalid/missing/malformed value
 * (wrong length, out-of-range index, duplicate index) silently falls back to the documented
 * default rather than throwing or guessing a repair.
 */
export function resolvePriorityOrder(data) {
  const order = data?.physiquePriorityTierOrder;
  if (!Array.isArray(order) || order.length !== DEFAULT_PRIORITY_HEAD_ORDER.length) return DEFAULT_PRIORITY_HEAD_ORDER;
  const inRange = order.every(i => Number.isInteger(i) && i >= 0 && i < DEFAULT_PRIORITY_HEAD_ORDER.length);
  const noDuplicates = new Set(order).size === DEFAULT_PRIORITY_HEAD_ORDER.length;
  if (!inRange || !noDuplicates) return DEFAULT_PRIORITY_HEAD_ORDER;
  return order.map(i => DEFAULT_PRIORITY_HEAD_ORDER[i]);
}

function priorityTierFor(headId, priorityOrder) {
  const idx = priorityOrder.findIndex(tier => tier.includes(headId));
  return idx === -1 ? priorityOrder.length : idx;
}

/**
 * Weak Point Analysis (spec: "Rank muscles by relative progression, weekly stimulus,
 * frequency, recovery, visual priority. Suggest the smallest changes likely to improve weak
 * points."). Combines Phase 1-3's stimulus/recovery/plateau signals with the (user-configurable,
 * Phase 8) priority order into one explainable ranked list — highest-priority structures that
 * are also under target or plateaued surface first.
 */
export function weakPointRanking(data, referenceDate = new Date(), priorityOrder = resolvePriorityOrder(data)) {
  const recoveryStatusMap = muscleHeadRecoveryStatusMap(data, referenceDate);
  const targets = weeklyMuscleHeadTargets(data.workouts, data.exercises, referenceDate, recoveryStatusMap);
  const targetById = Object.fromEntries(targets.map(t => [t.headId, t]));
  const recoveryById = Object.fromEntries(allMuscleHeadRecoveryForecasts(data, referenceDate).map(f => [f.headId, f]));

  return MUSCLE_HEAD_IDS.map(headId => {
    const t = targetById[headId];
    const recovery = recoveryById[headId];
    const plateau = detectMuscleHeadPlateau(data, headId, referenceDate);
    const tier = priorityTierFor(headId, priorityOrder);
    // An untrained head (zero stimulus this week) isn't "under target" in the weak-point
    // sense — it's simply not yet trained, mirroring adaptiveVolumeWarnings' own "not a
    // warning, just untrained" gate (calculations.js) so this ranking doesn't surface every
    // untouched head as a false weak point.
    const isUnderVolume = t.status === "under" && t.currentStimulus > 0;
    const isWeakPoint = isUnderVolume || plateau.plateau;

    let weaknessScore = (priorityOrder.length - tier);
    if (isUnderVolume) weaknessScore += 3;
    if (plateau.plateau) weaknessScore += 2;

    let suggestion;
    if (plateau.plateau) {
      suggestion = `Weekly stimulus has plateaued — consider ${plateau.suggestedActions.join(" or ").replace(/-/g, " ")}.`;
    } else if (isUnderVolume) {
      suggestion = `${t.currentStimulus} of ${t.targetStimulus[0]}+ target effective sets this week — a small volume increase is the smallest likely fix.`;
    } else {
      suggestion = "On track — no change suggested.";
    }

    return {
      headId, label: MUSCLE_HEADS[headId]?.label || headId, priorityTier: tier,
      stimulusStatus: t.status, currentStimulus: t.currentStimulus, targetStimulus: t.targetStimulus,
      recoveryPercent: recovery.recoveryPercent, isPlateaued: plateau.plateau, isWeakPoint, weaknessScore, suggestion
    };
  }).sort((a, b) => b.weaknessScore - a.weaknessScore);
}

/**
 * "High overlap" warning (spec §"Intelligent Warnings"): two exercises programmed on the same
 * training day that share both primary muscle and movement pattern are very likely redundant
 * unless deliberately paired for specialisation — an explainable, non-fabricated signal using
 * only the exercise database's own existing fields.
 */
export function exerciseOverlapWarnings(data) {
  const warnings = [];
  const byName = Object.fromEntries((data.exercises || []).map(e => [e.name, e]));
  Object.entries(data.trainingProgram || {}).forEach(([day, exercises]) => {
    const active = (exercises || []).map(x => byName[x.name]).filter(def => def && def.active !== false);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i], b = active[j];
        if (a.primaryMuscle && a.primaryMuscle === b.primaryMuscle && a.movementPattern && a.movementPattern === b.movementPattern) {
          warnings.push({
            day, type: "high-overlap", exercises: [a.name, b.name],
            message: `${day}: "${a.name}" and "${b.name}" share the same primary muscle and movement pattern — likely redundant unless intentionally paired for specialisation.`
          });
        }
      }
    }
  });
  return warnings;
}

/**
 * "Duplicate movement pattern" warning: 3+ exercises programmed on the same day sharing the
 * same movement pattern (regardless of primary muscle) may be crowding a single pattern rather
 * than covering the week's needs efficiently.
 */
export function duplicateMovementPatternWarnings(data) {
  const warnings = [];
  const byName = Object.fromEntries((data.exercises || []).map(e => [e.name, e]));
  Object.entries(data.trainingProgram || {}).forEach(([day, exercises]) => {
    const active = (exercises || []).map(x => byName[x.name]).filter(def => def && def.active !== false);
    const byPattern = {};
    active.forEach(def => {
      if (!def.movementPattern) return;
      (byPattern[def.movementPattern] ||= []).push(def.name);
    });
    Object.entries(byPattern).forEach(([pattern, names]) => {
      if (names.length >= 3) {
        warnings.push({
          day, type: "duplicate-movement-pattern", movementPattern: pattern, exercises: names,
          message: `${day}: ${names.length} exercises share the "${pattern}" movement pattern (${names.join(", ")}) — worth checking whether all are necessary.`
        });
      }
    });
  });
  return warnings;
}

/**
 * "Poor exercise ordering" warning (spec priority: weak point > large compounds > stable
 * hypertrophy movements > isolation > low-fatigue finishers). A lightweight version of that
 * check using the exercise database's existing category field: an isolation exercise
 * programmed before a compound on the same day flags the day for review. The full Smart
 * Ordering recommendation engine (re-ordering suggestions) is a later phase — this is only
 * the detection/warning half.
 */
export function poorOrderingWarnings(data) {
  const warnings = [];
  const byName = Object.fromEntries((data.exercises || []).map(e => [e.name, e]));
  Object.entries(data.trainingProgram || {}).forEach(([day, exercises]) => {
    const active = (exercises || []).map(x => byName[x.name]).filter(def => def && def.active !== false);
    let seenIsolation = null;
    for (const def of active) {
      if (def.category === "isolation" && !seenIsolation) seenIsolation = def.name;
      if (def.category === "compound" && seenIsolation) {
        warnings.push({
          day, type: "poor-ordering",
          message: `${day}: "${seenIsolation}" (isolation) is programmed before "${def.name}" (compound) — compounds are typically placed earlier, while mechanical-tension capacity is highest.`
        });
        break;
      }
    }
  });
  return warnings;
}

/**
 * "Recovery conflict" warning (spec: "Warn if a muscle head is trained again before adequate
 * recovery"). Forward-looking at the programme level: for each training day, does it currently
 * train any muscle head that Phase 3's Recovery Forecast reports under 50% recovered right now?
 * A brand-new (never-trained) head is always fully recovered by definition, so it never
 * contributes a false conflict here.
 */
export function recoveryConflictWarnings(data, referenceDate = new Date()) {
  const warnings = [];
  const byName = Object.fromEntries((data.exercises || []).map(e => [e.name, e]));
  const recoveryByHead = Object.fromEntries(allMuscleHeadRecoveryForecasts(data, referenceDate).map(f => [f.headId, f]));

  Object.entries(data.trainingProgram || {}).forEach(([day, exercises]) => {
    const active = (exercises || []).map(x => byName[x.name]).filter(def => def && def.active !== false);
    const conflictHeads = new Set();
    active.forEach(def => {
      Object.keys(def.muscleHeadContributions || {}).forEach(headId => {
        const f = recoveryByHead[headId];
        if (f && f.daysSinceTrained != null && f.recoveryPercent < 50) conflictHeads.add(headId);
      });
    });
    if (conflictHeads.size) {
      const labels = [...conflictHeads].map(h => MUSCLE_HEADS[h]?.label || h);
      warnings.push({
        day, type: "recovery-conflict", headIds: [...conflictHeads],
        message: `${day}: currently trains ${labels.join(", ")} while still under 50% recovered by the current forecast — consider whether this day is due yet.`
      });
    }
  });
  return warnings;
}

/**
 * "Excessive junk volume" warning: sets logged with below-standard form or ROM don't reliably
 * contribute to the growth their set-count would suggest. Flags a muscle head when a
 * meaningful share (>=40%) of its logged weekly sets were poor-quality — never from a single
 * off set, and never below a minimum weekly volume worth judging.
 */
export function junkVolumeWarnings(data, referenceDate = new Date()) {
  const warnings = [];
  const byName = Object.fromEntries((data.exercises || []).map(e => [e.name, e]));
  const thisWeek = workoutsInWeek(data.workouts || [], referenceDate);
  const headSetCounts = {};

  thisWeek.forEach(w => (w.exercises || []).forEach(e => {
    const def = byName[e.name];
    const contributions = def?.muscleHeadContributions;
    if (!contributions || !Object.keys(contributions).length) return;
    ["set1", "set2"].forEach(prefix => {
      if (!(Number(e[`${prefix}Reps`]) > 0)) return;
      const poor = (e.formQuality != null && Number(e.formQuality) < 3) || (e.rangeOfMotionQuality != null && Number(e.rangeOfMotionQuality) < 4);
      Object.entries(contributions).forEach(([headId, weight]) => {
        const counts = (headSetCounts[headId] ||= { total: 0, poor: 0 });
        counts.total += weight;
        if (poor) counts.poor += weight;
      });
    });
  }));

  Object.entries(headSetCounts).forEach(([headId, counts]) => {
    if (counts.total < 2) return;
    const poorRatio = counts.poor / counts.total;
    if (poorRatio >= 0.4) {
      warnings.push({
        headId, type: "junk-volume",
        message: `${MUSCLE_HEADS[headId]?.label || headId}: roughly ${Math.round(poorRatio * 100)}% of this week's sets had below-standard form or ROM — that volume isn't reliably contributing to growth.`
      });
    }
  });

  return warnings;
}

/** Every intelligent warning type at once, for a single combined display. */
export function allIntelligentWarnings(data, referenceDate = new Date()) {
  return [
    ...exerciseOverlapWarnings(data),
    ...duplicateMovementPatternWarnings(data),
    ...poorOrderingWarnings(data),
    ...recoveryConflictWarnings(data, referenceDate),
    ...junkVolumeWarnings(data, referenceDate)
  ];
}
