// Deterministic evidence-scoring, cause-ranking, intervention-selection and
// contingency-plan-building engine. Runs entirely against local data and the local
// js/constraint-library.js knowledge library — no external AI API, no network call.
import { CONSTRAINT_RULES, CONSTRAINT_LIBRARY_VERSION } from "./constraint-library.js";

export const CONSTRAINT_ENGINE_VERSION = "1.0.0";

const IMPACT_RANK = { high: 0, medium: 1, low: 2 };

// Default smallest-effective-intervention ordering (spec section 19) — a default, not an
// absolute rule; rankCauses() still orders primarily by evidence score.
const CATEGORY_INTERVENTION_PRIORITY = {
  "data-quality": 1,
  "execution-technique": 2,
  "adherence": 3,
  "nutrition": 4,
  "recovery": 5,
  "performance-progression": 6,
  "programme-design": 7,
  "bodyweight-progression": 8,
  "body-composition": 9
};

/** Evidence scoring (spec section 16): weighted support/contradiction points -> a confidence band. */
export function scoreEvidence({ supportPoints = 0, contradictPoints = 0, dataSufficient = true }) {
  const rawScore = supportPoints - contradictPoints;
  let confidence;
  if (!dataSufficient) confidence = "low";
  else if (contradictPoints > 0 && contradictPoints >= supportPoints) confidence = "low";
  else if (rawScore >= 3) confidence = "high";
  else if (rawScore >= 1) confidence = "medium";
  else confidence = "low";
  return { rawScore, confidence };
}

/** Runs every rule in the library against current data and scores each result. Pure, read-only. */
export function evaluateConstraintRules(data, referenceDate = new Date()) {
  return CONSTRAINT_RULES.map(rule => {
    const result = rule.evaluate(data, referenceDate) || {};
    const scored = scoreEvidence(result);
    return {
      rule,
      fired: !!result.fired,
      considered: !!result.considered,
      supportPoints: result.supportPoints || 0,
      contradictPoints: result.contradictPoints || 0,
      dataSufficient: result.dataSufficient !== false,
      evidenceDetail: result.evidenceDetail || [],
      contradictingDetail: result.contradictingDetail || [],
      missingData: result.missingData || [],
      ...scored
    };
  });
}

/**
 * Multi-cause ranking (spec section 17): one primary, up to 3 contributing, up to 2
 * lower-confidence possibilities, factors ruled out, and missing evidence. Never flattens
 * everything into one list — a single strong contradiction can outrank several weak
 * supports because scoreEvidence() already folds contradiction into rawScore/confidence.
 */
export function rankCauses(evaluations) {
  const fired = evaluations.filter(e => e.fired);
  const sorted = fired.slice().sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    return (IMPACT_RANK[a.rule.impactLevel] ?? 1) - (IMPACT_RANK[b.rule.impactLevel] ?? 1);
  });
  const primary = sorted[0] || null;
  const contributing = sorted.slice(1, 4);
  const lowerConfidence = sorted.slice(4).filter(e => e.confidence === "low").slice(0, 2);
  const ruledOut = evaluations.filter(e => e.considered && !e.fired);
  const missingEvidence = [...new Set(evaluations.flatMap(e => e.missingData))];
  return { primary, contributing, lowerConfidence, ruledOut, missingEvidence };
}

/** Picks the smallest-effective-intervention framing for a ranked cause (spec section 19). */
export function selectIntervention(rankedCause) {
  if (!rankedCause) return null;
  return {
    ruleId: rankedCause.rule.id,
    category: rankedCause.rule.category,
    priorityRank: CATEGORY_INTERVENTION_PRIORITY[rankedCause.rule.category] ?? 5,
    actions: rankedCause.rule.recommendedActions,
    monitoringMetrics: rankedCause.rule.monitoringMetrics,
    reassessmentWindow: rankedCause.rule.reassessmentWindow,
    escalationRules: rankedCause.rule.escalationRules
  };
}

/**
 * Builds a full ContingencyPlan (spec section 18) from a rankCauses() result. Returns null
 * when there is no primary cause — "doing nothing for another week" is a valid outcome and
 * must not be forced into a plan.
 */
export function buildContingencyPlan(rankResult) {
  const { primary, contributing, lowerConfidence, ruledOut, missingEvidence } = rankResult;
  if (!primary) return null;
  const intervention = selectIntervention(primary);
  return {
    diagnosis: {
      whatIsHappening: primary.rule.title,
      likelyCause: primary.evidenceDetail[0] || primary.rule.description,
      confidence: primary.confidence,
      evidence: primary.evidenceDetail,
      contradictions: primary.contradictingDetail,
      missingEvidence
    },
    immediateAction: intervention.actions[0] || "No specific action recommended.",
    nextWeekPlan: intervention.actions,
    monitoring: intervention.monitoringMetrics,
    successCriteria: intervention.monitoringMetrics.length
      ? `Improvement in: ${intervention.monitoringMetrics.join(", ")}.`
      : "Evidence for this cause no longer fires on the next weekly review.",
    reassessmentPoint: intervention.reassessmentWindow,
    escalationPath: intervention.escalationRules,
    primaryCauseId: primary.rule.id,
    contributingCauseIds: contributing.map(c => c.rule.id),
    contributingCauses: contributing.map(c => c.rule.title),
    lowerConfidenceCauseIds: lowerConfidence.map(c => c.rule.id),
    ruledOutFactors: ruledOut.map(r => r.rule.title),
    engineVersion: CONSTRAINT_ENGINE_VERSION,
    knowledgeLibraryVersion: CONSTRAINT_LIBRARY_VERSION
  };
}

/** Convenience one-shot: evaluate -> rank -> plan, for a given data snapshot. */
export function runConstraintEngine(data, referenceDate = new Date()) {
  const evaluations = evaluateConstraintRules(data, referenceDate);
  const rankResult = rankCauses(evaluations);
  const plan = buildContingencyPlan(rankResult);
  return { evaluations, ...rankResult, plan };
}
