// Smart Ordering + Programme Evolution recommendations (Hypertrophy Intelligence Engine
// spec). Both halves are read-only, explainable, override-able recommendations — neither
// ever reorders a training day or edits the exercise database on its own. Built entirely on
// top of Phase 1-5's existing output (weeklyMuscleHeadTargets, weakPointRanking,
// personalExerciseEffectiveness) rather than any new source of truth.
import { weeklyMuscleHeadTargets } from "./calculations.js";
import { weakPointRanking } from "./hypertrophy-warnings.js";
import { allExerciseEffectivenessScores, fatigueCostScore } from "./exercise-effectiveness.js";

const ORDER_TIER_LABEL = [
  "Weak point priority",
  "Large compound",
  "Stable hypertrophy movement",
  "Low-fatigue finisher"
];

function tierForExercise(def, weakHeadIds, workouts, referenceDate) {
  const contributesToWeakPoint = Object.keys(def.muscleHeadContributions || {}).some(h => weakHeadIds.has(h));
  if (contributesToWeakPoint) return 0;
  if (def.category === "compound") return 1;
  const fatigue = fatigueCostScore(workouts, def, referenceDate);
  if (fatigue.score != null && fatigue.score < 0.3) return 3;
  return 2;
}

/**
 * Smart Ordering (spec priority: weak point > large compounds > stable hypertrophy movements
 * > isolation > low-fatigue finishers). Only ever suggests a re-ordering of exercises already
 * programmed for that day — it never adds, removes, or substitutes anything. Ties within a
 * tier keep their original relative order (a stable sort), so this never reshuffles exercises
 * the tiering has no opinion about.
 */
export function recommendedExerciseOrder(data, day, referenceDate = new Date()) {
  const programmed = (data.trainingProgram || {})[day] || [];
  const byName = Object.fromEntries((data.exercises || []).map(e => [e.name, e]));
  const active = programmed.map(x => byName[x.name]).filter(def => def && def.active !== false);

  if (active.length < 2) {
    return { day, changed: false, currentOrder: active.map(e => e.name), recommendedOrder: active.map(e => e.name), reasoning: [] };
  }

  const weakHeadIds = new Set(weakPointRanking(data, referenceDate).filter(r => r.isWeakPoint).map(r => r.headId));
  const withTier = active.map((def, i) => ({ def, tier: tierForExercise(def, weakHeadIds, data.workouts || [], referenceDate), originalIndex: i }));
  const sorted = withTier.slice().sort((a, b) => a.tier - b.tier || a.originalIndex - b.originalIndex);

  const currentOrder = active.map(e => e.name);
  const recommendedOrder = sorted.map(x => x.def.name);
  const changed = JSON.stringify(currentOrder) !== JSON.stringify(recommendedOrder);

  return {
    day, changed, currentOrder, recommendedOrder,
    reasoning: sorted.map(x => ({ name: x.def.name, tier: x.tier, tierLabel: ORDER_TIER_LABEL[x.tier] }))
  };
}

/** Suggested order for every programmed day, but only the ones that would actually change. */
export function allRecommendedExerciseOrders(data, referenceDate = new Date()) {
  return Object.keys(data.trainingProgram || {})
    .map(day => recommendedExerciseOrder(data, day, referenceDate))
    .filter(r => r.changed);
}

const LOW_EFFECTIVENESS_THRESHOLD = 0.3;
const HIGH_EFFECTIVENESS_THRESHOLD = 0.75;

/**
 * Programme Evolution recommendations (spec: "retire poor exercises, increase/reduce
 * volume, replace ineffective variations, prioritize high-response movements"). Volume
 * increase/reduction is already covered by Phase 2's adaptiveVolumeWarnings, so this focuses
 * on the exercise-selection half: which specific exercises are/aren't earning their slot.
 * Every recommendation is advisory only — nothing here removes, adds, or reorders anything.
 */
export function programmeEvolutionRecommendations(data, referenceDate = new Date()) {
  const byName = Object.fromEntries((data.exercises || []).map(e => [e.name, e]));
  const targets = weeklyMuscleHeadTargets(data.workouts, data.exercises, referenceDate);
  const targetByHead = Object.fromEntries(targets.map(t => [t.headId, t]));
  const bundles = allExerciseEffectivenessScores(data, referenceDate);

  const recommendations = [];

  bundles.forEach(b => {
    const def = byName[b.name];
    if (!def) return;
    const ge = b.growthEffectiveness, pr = b.progressionReliability;

    const lowEvidenceEnough = ge.confidence !== "low" && pr.confidence !== "low";
    if (ge.score != null && pr.score != null && lowEvidenceEnough && ge.score < LOW_EFFECTIVENESS_THRESHOLD && pr.score < LOW_EFFECTIVENESS_THRESHOLD) {
      const heads = Object.keys(def.muscleHeadContributions || {});
      const anyHeadUnderTarget = heads.some(h => targetByHead[h]?.status === "under");
      const hasOtherVariants = (def.variants || []).length >= 2;

      if (anyHeadUnderTarget) {
        recommendations.push({
          type: "adjust-before-retiring", name: b.name,
          message: `${b.name} has low Growth Effectiveness (${Math.round(ge.score * 100)}%) and Progression Reliability (${Math.round(pr.score * 100)}%), but still contributes to a muscle head that's currently under its weekly target — a rep-range or variant change is worth trying before dropping it entirely.`
        });
      } else if (hasOtherVariants) {
        recommendations.push({
          type: "try-different-variant", name: b.name,
          message: `${b.name} has low Growth Effectiveness (${Math.round(ge.score * 100)}%) and Progression Reliability (${Math.round(pr.score * 100)}%). It has other equipment variants available — worth trying one before retiring the movement.`
        });
      } else {
        recommendations.push({
          type: "retire-candidate", name: b.name,
          message: `${b.name} has consistently low Growth Effectiveness (${Math.round(ge.score * 100)}%) and Progression Reliability (${Math.round(pr.score * 100)}%) with no under-target muscle head depending on it — a candidate to retire or replace.`
        });
      }
    }

    if (ge.score != null && ge.confidence === "high" && ge.score >= HIGH_EFFECTIVENESS_THRESHOLD) {
      recommendations.push({
        type: "high-responder", name: b.name,
        message: `${b.name} has a high, well-evidenced Growth Effectiveness score (${Math.round(ge.score * 100)}%) — a strong candidate to keep prioritised in the programme.`
      });
    }
  });

  return recommendations;
}
