// Fatigue-Optimised Split Logic + Hypertrophy Allocation Pass (Hypertrophy Intelligence
// Engine spec, Phase 8). Both are read-only, explainable, advisory outputs — neither ever
// edits the programme, reorders a split, or relocates an exercise on its own. This file is
// the final aggregation layer tying Phases 1-7 together into one consolidated report.
import { adaptiveVolumeWarnings, fatigueBudgetWarnings } from "./calculations.js";
import { MUSCLE_HEADS } from "./muscle-heads.js";
import { weakPointRanking, allIntelligentWarnings } from "./hypertrophy-warnings.js";
import { allRecommendedExerciseOrders, programmeEvolutionRecommendations } from "./programme-evolution.js";

/**
 * Fatigue-Optimised Split Logic: flags when two days that are ADJACENT IN THE CURRENT SPLIT
 * ORDER (treated as a repeating weekly cycle, since this app has no calendar-day assignment
 * for programme days — see Phase 3's Recovery Forecast for the actual-logged-date version of
 * this idea) both train the same muscle head, and names one specific exercise as the
 * relocation candidate. This is about programme STRUCTURE overlap, not a claim about real
 * calendar spacing — the message says "adjacent in your split" for exactly that reason.
 */
export function fatigueOptimisedRelocationSuggestions(data) {
  const days = Object.keys(data.trainingProgram || {});
  if (days.length < 2) return [];
  const byName = Object.fromEntries((data.exercises || []).map(e => [e.name, e]));

  const headsByDay = days.map(day => {
    const heads = new Set();
    (data.trainingProgram[day] || []).forEach(x => {
      const def = byName[x.name];
      if (def && def.active !== false) Object.keys(def.muscleHeadContributions || {}).forEach(h => heads.add(h));
    });
    return { day, heads };
  });

  const suggestions = [];
  for (let i = 0; i < headsByDay.length; i++) {
    const current = headsByDay[i];
    const next = headsByDay[(i + 1) % headsByDay.length];
    if (headsByDay.length < 2 || current.day === next.day) continue;
    const shared = [...current.heads].filter(h => next.heads.has(h));
    if (!shared.length) continue;

    const candidates = (data.trainingProgram[current.day] || []).filter(x => {
      const def = byName[x.name];
      return def && Object.keys(def.muscleHeadContributions || {}).some(h => shared.includes(h));
    });
    if (!candidates.length) continue;

    const labels = shared.map(h => MUSCLE_HEADS[h]?.label || h);
    suggestions.push({
      fromDay: current.day, adjacentDay: next.day, exercise: candidates[0].name, sharedHeads: shared,
      message: `${current.day} and ${next.day} are adjacent in your split and both train ${labels.join(", ")} — consider relocating "${candidates[0].name}" to a different day, or adding rest between these two, to spread recovery demand.`
    });
  }
  return suggestions;
}

/**
 * Hypertrophy Allocation Pass: the consolidated read of everything Phases 1-7 already
 * compute — programme-level warnings, fatigue budget, weak points (using the user's
 * configurable priority order if set), suggested exercise re-ordering, programme evolution
 * recommendations, and this phase's fatigue-optimised relocation suggestions — in one object.
 * Meant to be recomputed fresh whenever a split is created, switched, or edited (nothing here
 * is persisted; every number is derived live from current data, same as the rest of this
 * calculation layer), so the user sees the consequence of a programme change immediately.
 */
export function hypertrophyAllocationPass(data, referenceDate = new Date()) {
  return {
    generatedAt: referenceDate.toISOString(),
    warnings: allIntelligentWarnings(data, referenceDate),
    fatigueBudgetWarnings: fatigueBudgetWarnings(data.workouts, data.exercises, referenceDate),
    adaptiveVolumeWarnings: adaptiveVolumeWarnings(data.workouts, data.exercises, referenceDate),
    weakPoints: weakPointRanking(data, referenceDate).filter(r => r.isWeakPoint),
    orderSuggestions: allRecommendedExerciseOrders(data, referenceDate),
    evolutionRecommendations: programmeEvolutionRecommendations(data, referenceDate),
    relocationSuggestions: fatigueOptimisedRelocationSuggestions(data)
  };
}
