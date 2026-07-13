// Weekly review engine (spec sections 10-12): the ONLY place a formal diagnosis, a
// ConstraintCase status change, or a contingency plan activation may happen. Mid-week,
// evidence is only ever collected (see constraint-engine.js's evaluateConstraintRules,
// which is safe to call any time — it just never gets promoted to a case outside this
// engine). Extends data.reviews (weekly review objects) with a `constraintAnalysis` field
// rather than a third parallel review system.
import { evaluateConstraintRules, rankCauses, buildContingencyPlan, CONSTRAINT_ENGINE_VERSION } from "./constraint-engine.js";
import { CONSTRAINT_LIBRARY_VERSION } from "./constraint-library.js";
import { applyWeeklyOutcomeToCases, findOpenCaseForRule } from "./constraint-case-manager.js";
import { detectSafetyFlags, summarizeSafetyFlags } from "./safety-escalation.js";
import { computeAnalysisReadiness } from "./analysis-readiness.js";

export const WEEKLY_STATES = {
  NO_CONSTRAINT_DETECTED: "no-constraint-detected",
  OBSERVE_FOR_ANOTHER_WEEK: "observe-for-another-week",
  CONSTRAINT_IDENTIFIED: "constraint-identified",
  EXISTING_PLAN_REVIEWED: "existing-plan-reviewed"
};

function slimEvaluation(e) {
  return {
    ruleId: e.rule.id, category: e.rule.category, title: e.rule.title, appliesTo: e.rule.appliesTo,
    fired: e.fired, confidence: e.confidence, rawScore: e.rawScore, evidenceDetail: e.evidenceDetail,
    contradictingDetail: e.contradictingDetail, missingData: e.missingData
  };
}

/**
 * Runs the full weekly analysis. Read-only — never touches data.constraintCases itself;
 * call applyWeeklyReviewResultToCases() separately once the user actually completes the
 * review (spec: "allow the user to continue with an incomplete review" — so computing this
 * must never be gated on completeness, only the eventual case-persisting step should be
 * intentional).
 */
export function runWeeklyReview(data, { weekStart, weekEnd, referenceDate = new Date() }) {
  const readiness = computeAnalysisReadiness(data, referenceDate);
  const safetyFlags = summarizeSafetyFlags(detectSafetyFlags(data, { referenceDate }));
  const evaluations = evaluateConstraintRules(data, referenceDate);
  const rankResult = rankCauses(evaluations);
  const plan = buildContingencyPlan(rankResult);

  const cases = data.constraintCases || [];
  const openCases = cases.filter(c => ["active", "improving", "escalated"].includes(c.status));
  const caseReviews = openCases.map(c => {
    const stillFires = evaluations.some(e => e.rule.id === c.primaryRuleId && e.fired);
    return { caseId: c.id, primaryRuleId: c.primaryRuleId, title: c.rankedCauses?.[0]?.title || c.primaryRuleId, improved: !stillFires };
  });

  const primaryRuleId = rankResult.primary?.rule.id || null;
  const primaryAlreadyOpen = primaryRuleId ? openCases.some(c => c.primaryRuleId === primaryRuleId) : false;

  let weeklyState;
  if (caseReviews.length) {
    weeklyState = WEEKLY_STATES.EXISTING_PLAN_REVIEWED;
  } else if (!rankResult.primary) {
    // Nothing fired at all (not even the low-data-history flag) -> there's enough evidence
    // and none of it points to a problem.
    weeklyState = WEEKLY_STATES.NO_CONSTRAINT_DETECTED;
  } else if (rankResult.primary.rule.id === "insufficient-history" || rankResult.primary.confidence === "low") {
    // Evidence exists but is too thin or too new to justify a change (spec test 21/45).
    weeklyState = WEEKLY_STATES.OBSERVE_FOR_ANOTHER_WEEK;
  } else {
    weeklyState = WEEKLY_STATES.CONSTRAINT_IDENTIFIED;
  }

  return {
    weekStart, weekEnd, generatedAt: new Date().toISOString(),
    readiness, safetyFlags,
    evaluations: evaluations.map(slimEvaluation),
    primary: rankResult.primary ? slimEvaluation(rankResult.primary) : null,
    contributing: rankResult.contributing.map(slimEvaluation),
    lowerConfidence: rankResult.lowerConfidence.map(slimEvaluation),
    ruledOut: rankResult.ruledOut.map(slimEvaluation),
    missingEvidence: rankResult.missingEvidence,
    plan, weeklyState, primaryRuleId, primaryAlreadyOpen, caseReviews,
    engineVersion: CONSTRAINT_ENGINE_VERSION, knowledgeLibraryVersion: CONSTRAINT_LIBRARY_VERSION
  };
}

/**
 * Applies a computed weekly-review result to data.constraintCases. This is the only
 * function that should ever change a case's status or open a new one — call it exactly
 * once, when the user actually completes/accepts the weekly review (not on every render).
 * Returns the full new cases array; caller is responsible for saveData().
 */
export function applyWeeklyReviewResultToCases(analysis, cases) {
  let list = (cases || []).slice();

  analysis.caseReviews.forEach(({ primaryRuleId, improved }) => {
    list = applyWeeklyOutcomeToCases(list, {
      weeklyState: WEEKLY_STATES.EXISTING_PLAN_REVIEWED, primaryRuleId,
      selectedPlan: { improved }, weekStart: analysis.weekStart, weekEnd: analysis.weekEnd
    });
  });

  if (analysis.weeklyState === WEEKLY_STATES.CONSTRAINT_IDENTIFIED && !analysis.primaryAlreadyOpen) {
    list = applyWeeklyOutcomeToCases(list, {
      weeklyState: WEEKLY_STATES.CONSTRAINT_IDENTIFIED, primaryRuleId: analysis.primaryRuleId,
      rankedCauses: [analysis.primary, ...analysis.contributing], selectedPlan: analysis.plan,
      weekStart: analysis.weekStart, weekEnd: analysis.weekEnd,
      engineVersion: analysis.engineVersion, knowledgeLibraryVersion: analysis.knowledgeLibraryVersion,
      detectedSignals: analysis.primary?.evidenceDetail || []
    });
  } else if (analysis.weeklyState === WEEKLY_STATES.OBSERVE_FOR_ANOTHER_WEEK) {
    list = applyWeeklyOutcomeToCases(list, {
      weeklyState: WEEKLY_STATES.OBSERVE_FOR_ANOTHER_WEEK, primaryRuleId: analysis.primaryRuleId,
      rankedCauses: analysis.primary ? [analysis.primary] : [], selectedPlan: null,
      weekStart: analysis.weekStart, weekEnd: analysis.weekEnd,
      engineVersion: analysis.engineVersion, knowledgeLibraryVersion: analysis.knowledgeLibraryVersion,
      detectedSignals: analysis.primary?.evidenceDetail || []
    });
  }
  // NO_CONSTRAINT_DETECTED: no case action — existing cases only ever change via an
  // explicit transition above, never silently closed by an unrelated quiet week.

  return list;
}
