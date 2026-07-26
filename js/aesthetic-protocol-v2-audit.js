// Aesthetic Protocol v2 Deterministic Training Rulebook and Implementation Directive —
// Sections 7, 8, 10 and 15. Every number here is either a hard-coded constant lifted directly
// from the directive's own tables, or a deterministic count/sum computed from the ACTIVE
// split's own programmed `sets` fields and the exercise database's muscleHeadContributions —
// never an estimate of biological adaptation (Section 15: "must not pretend to estimate
// advanced biological adaptation beyond the rules currently programmed"). This module is
// read-only: nothing here edits data.trainingProgram or blocks any action.
import { MUSCLE_HEADS } from "./muscle-heads.js";
import { daysSinceHeadLastTrained } from "./calculations.js";

/** Section 7 — hard-coded initial weekly direct-set targets. Not generated dynamically. */
export const WEEKLY_DIRECT_SET_TARGETS = [
  { structure: "Upper chest", headIds: ["chest_upper"], target: 8 },
  { structure: "Mid chest", headIds: ["chest_mid"], target: 4 },
  { structure: "Front delts", headIds: ["front_delts"], target: 1, targetMin: 0, targetMax: 2, note: "Primarily indirect" },
  { structure: "Lateral delts", headIds: ["lateral_delts"], target: 8 },
  { structure: "Rear delts", headIds: ["rear_delts"], target: 6 },
  { structure: "Lats", headIds: ["lat_width"], target: 8 },
  { structure: "Mid-back", headIds: ["back_thickness"], target: 4 },
  { structure: "Upper traps", headIds: ["traps"], target: 2 },
  { structure: "Biceps overall", headIds: ["biceps_long_head", "biceps_short_head"], target: 8 },
  { structure: "Triceps overall", headIds: ["triceps_long_head", "triceps_lateral_head", "triceps_medial_head"], target: 8 },
  { structure: "Brachialis", headIds: ["brachialis"], target: 4 },
  { structure: "Brachioradialis", headIds: ["brachioradialis"], target: 4 },
  { structure: "Quads", headIds: ["quads"], target: 8 },
  { structure: "Hamstrings", headIds: ["hamstrings"], target: 6 },
  { structure: "Calves", headIds: ["calves"], target: 6 },
  { structure: "Forearm flexors", headIds: ["wrist_flexors"], target: 4 },
  { structure: "Forearm extensors", headIds: ["wrist_extensors"], target: 4 },
  { structure: "Core", headIds: ["core"], target: 2 },
  { structure: "Neck", headIds: ["neck"], target: 2 }
];

// Section 8.1 — deterministic minimum spacing, expressed as the minimum acceptable number of
// training-day-slots between two direct exposures within the weekly cycle (1 = adjacent
// training days are fine — the 48-72h rear-delt/calf allowance; 2 = at least one other training
// day must fall between them — the default 72h rule for everything else). This matches the
// directive's own Section 11 Recovery Audit exactly: Day 1<->Day 5 pairs (upper chest, lateral
// delts, lats) and Day 2<->Day 4 pairs (quads, hamstrings) both have a forward gap of 2 in their
// shorter direction and are explicitly declared intentional/correct, while literally adjacent
// direct exposure (forward gap 1) for anything other than rear delts/calves is what Section 8.1
// actually prohibits — so this only ever fires on a genuine rule breach, never on the directive's
// own baseline split.
const LOW_FATIGUE_HEADS = new Set(["rear_delts", "calves"]);
function minTrainingDayGap(headId) {
  return LOW_FATIGUE_HEADS.has(headId) ? 1 : 2;
}

/** Every {day, ...programExercise} row across the currently active split, flattened. */
function flattenActiveProgram(data) {
  const days = Object.keys(data.trainingProgram || {});
  const rows = [];
  days.forEach((day, dayIndex) => {
    (data.trainingProgram[day] || []).forEach(ex => rows.push({ day, dayIndex, ...ex }));
  });
  return { days, rows };
}

function exerciseDefByName(data) {
  return Object.fromEntries((data.exercises || []).map(e => [e.name, e]));
}

/**
 * Direct (primary, contribution weight 1.0) vs secondary (0 < weight < 1) programmed weekly
 * sets for one muscle head, summed from the active split's own `sets` field. An exercise
 * programmed without a `sets` value (e.g. the legacy split, which predates this field)
 * contributes 0 here rather than guessing — this audit is only meaningful for a split that
 * actually carries set prescriptions.
 */
export function directAndSecondarySetsForHead(data, headId) {
  const { rows } = flattenActiveProgram(data);
  const byName = exerciseDefByName(data);
  let direct = 0, secondary = 0;
  rows.forEach(row => {
    const def = byName[row.name];
    const weight = def?.muscleHeadContributions?.[headId];
    const sets = Number(row.sets) || 0;
    if (!weight || !sets) return;
    if (weight >= 1) direct += sets;
    else if (weight > 0) secondary += sets;
  });
  return { direct, secondary };
}

/** Section 10/15 — the full deterministic weekly volume audit, one row per Section 7 structure. */
export function weeklyDirectSetAudit(data) {
  return WEEKLY_DIRECT_SET_TARGETS.map(row => {
    const totals = row.headIds.reduce((acc, headId) => {
      const { direct, secondary } = directAndSecondarySetsForHead(data, headId);
      acc.direct += direct;
      acc.secondary += secondary;
      return acc;
    }, { direct: 0, secondary: 0 });

    const target = row.target;
    let status;
    if (totals.direct === target) status = "Target met";
    else if (totals.direct < target) status = "Below target";
    else status = "Exceeds target";

    return {
      structure: row.structure, headIds: row.headIds, target,
      targetMin: row.targetMin, targetMax: row.targetMax, note: row.note,
      currentDirect: totals.direct, currentSecondary: totals.secondary, status
    };
  });
}

/** Section 15 deterministic output format, e.g. "Lateral Delts / Target: 8 direct sets / Current: 8 direct sets / Status: Target met." */
export function formatAuditLine(row) {
  return `${row.structure}\nTarget: ${row.target} direct sets\nCurrent: ${row.currentDirect} direct sets\nStatus: ${row.status}`;
}

/** Section 8/15 — days since this head last received DIRECT (primary) exposure in real logged training. */
export function daysSinceLastDirectExposure(data, headId, referenceDate = new Date()) {
  return daysSinceHeadLastTrained(data.workouts || [], data.exercises || [], headId, referenceDate, 1);
}

/**
 * Which days in the active split's weekly cycle give this head DIRECT exposure, in day-index
 * order (0-based, following Object.keys(data.trainingProgram) order — the same day-ordering
 * convention already used by js/hypertrophy-allocation.js's cyclic adjacency logic).
 */
function directExposureDayIndices(data, headId) {
  const { rows } = flattenActiveProgram(data);
  const byName = exerciseDefByName(data);
  const indices = new Set();
  rows.forEach(row => {
    const def = byName[row.name];
    const weight = def?.muscleHeadContributions?.[headId];
    if (weight >= 1 && Number(row.sets) > 0) indices.add(row.dayIndex);
  });
  return [...indices].sort((a, b) => a - b);
}

/**
 * Section 8.2 — deterministic recovery-conflict warnings for the active split's STRUCTURE
 * (which days directly train which heads), checked against Section 8.1's spacing rule. This
 * recomputes from whatever is currently programmed, so it also catches a manual edit that
 * moves a direct-exposure exercise too close to another one for the same head (Section 19:
 * "Manual edits that breach rules trigger warnings"). Warnings are informational only and
 * never block anything — every warning carries an explicit override note.
 */
export function structuralRecoveryConflictWarnings(data) {
  const { days } = flattenActiveProgram(data);
  const dayCount = days.length;
  if (!dayCount) return [];
  const warnings = [];

  Object.keys(MUSCLE_HEADS).forEach(headId => {
    const exposureDays = directExposureDayIndices(data, headId);
    if (exposureDays.length < 2) return;
    const requiredGap = minTrainingDayGap(headId);

    for (let i = 0; i < exposureDays.length; i++) {
      const a = exposureDays[i];
      const b = exposureDays[(i + 1) % exposureDays.length];
      // Cyclic distance between the two exposure days around the weekly split.
      const forwardGap = i + 1 < exposureDays.length ? b - a : (dayCount - a) + b;
      if (forwardGap < requiredGap) {
        const { direct } = directAndSecondarySetsForHead(data, headId);
        warnings.push({
          type: "deterministic-recovery-conflict",
          headId, label: MUSCLE_HEADS[headId]?.label || headId,
          days: [days[a], days[b]],
          trainingDaysApart: forwardGap,
          currentWeeklyDirectTotal: direct,
          resultingWeeklyDirectTotal: direct,
          rationale: `${MUSCLE_HEADS[headId]?.label || headId} receives direct work on both "${days[a]}" and "${days[b]}", only ${forwardGap} training day(s) apart — the configured minimum spacing is ${requiredGap} training day(s) for this structure, so recovery may still be in progress.`,
          overrideAvailable: true
        });
      }
    }
  });

  return warnings;
}
