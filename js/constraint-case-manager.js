// ConstraintCase persistence + lifecycle (spec section 20). Cases are created/updated ONLY
// through the weekly review — never mid-week. Pure functions operating on data.constraintCases;
// callers are responsible for saveData().
export const CASE_STATUS = {
  OBSERVING: "observing", ACTIVE: "active", IMPROVING: "improving",
  RESOLVED: "resolved", ESCALATED: "escalated", DISMISSED: "dismissed"
};

const ALLOWED_TRANSITIONS = {
  observing: ["active", "dismissed"],
  active: ["improving", "resolved", "escalated"],
  improving: ["resolved", "active"],
  escalated: ["improving", "resolved"],
  resolved: [],
  dismissed: []
};

export function isValidCaseTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  return (ALLOWED_TRANSITIONS[fromStatus] || []).includes(toStatus);
}

/** Finds an existing NON-terminal case (not resolved/dismissed) tied to the same rule id, to avoid duplicate cases for the same underlying issue. */
export function findOpenCaseForRule(cases, ruleId) {
  return (cases || []).find(c => c.status !== CASE_STATUS.RESOLVED && c.status !== CASE_STATUS.DISMISSED &&
    (c.rankedCauses || []).some(rc => rc.ruleId === ruleId));
}

/**
 * Creates a brand-new ConstraintCase in "observing" status from a weekly review's ranked
 * causes + plan. Never call this mid-week — only from the weekly review engine.
 */
export function createConstraintCase({ primaryRuleId, rankedCauses, selectedPlan, weekStart, weekEnd, engineVersion, knowledgeLibraryVersion, detectedSignals = [] }) {
  const now = new Date().toISOString();
  return {
    id: `case-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: now, updatedAt: now,
    weekStart, weekEnd,
    status: CASE_STATUS.OBSERVING,
    outcomeType: rankedCauses?.[0]?.category || null,
    affectedEntities: rankedCauses?.[0]?.appliesTo || [],
    detectedSignals,
    rankedCauses: rankedCauses || [],
    selectedPlan: selectedPlan || null,
    monitoringWindow: selectedPlan?.reassessmentPoint || "Next weekly review",
    reviewHistory: [{ date: now, weekStart, weekEnd, status: CASE_STATUS.OBSERVING, note: "Case opened from weekly review." }],
    resolutionEvidence: [],
    engineVersion, knowledgeLibraryVersion,
    primaryRuleId
  };
}

/**
 * Transitions an existing case's status (weekly review only) and appends a review-history
 * entry. Returns a NEW case object (never mutates the input) or null if the transition is
 * not allowed from the case's current status.
 */
export function transitionCase(caseObj, toStatus, { weekStart, weekEnd, note = "", resolutionEvidence = [] } = {}) {
  if (!caseObj) return null;
  if (!isValidCaseTransition(caseObj.status, toStatus)) return null;
  const now = new Date().toISOString();
  return {
    ...caseObj,
    status: toStatus,
    updatedAt: now,
    resolutionEvidence: resolutionEvidence.length ? [...caseObj.resolutionEvidence, ...resolutionEvidence] : caseObj.resolutionEvidence,
    reviewHistory: [...caseObj.reviewHistory, { date: now, weekStart, weekEnd, status: toStatus, note }]
  };
}

/** Adds new evidence to an OPEN case without changing its status — the only mutation allowed mid-week. */
export function addEvidenceToCase(caseObj, signal) {
  if (!caseObj) return null;
  return { ...caseObj, detectedSignals: [...caseObj.detectedSignals, signal], updatedAt: new Date().toISOString() };
}

/**
 * Applies one weekly review's outcome to the case list: either opens a new case for a
 * newly-identified primary cause, transitions an existing open case for that same cause, or
 * leaves cases alone when the outcome doesn't touch them. Returns the FULL new cases array
 * (does not mutate the input array).
 */
export function applyWeeklyOutcomeToCases(cases, { weeklyState, primaryRuleId, rankedCauses, selectedPlan, weekStart, weekEnd, engineVersion, knowledgeLibraryVersion, detectedSignals }) {
  const list = (cases || []).slice();

  if (weeklyState === "existing-plan-reviewed") {
    const existing = findOpenCaseForRule(list, primaryRuleId);
    if (!existing) return list;
    const improved = !!selectedPlan?.improved;
    const nextStatus = improved
      ? (existing.status === "active" ? "improving" : existing.status === "improving" || existing.status === "escalated" ? "resolved" : existing.status)
      : (existing.status === "active" || existing.status === "improving" ? "escalated" : existing.status);
    const updated = transitionCase(existing, nextStatus, { weekStart, weekEnd, note: improved ? "Target improved — plan reviewed as working." : "Target did not improve — escalating." });
    if (!updated) return list;
    const idx = list.findIndex(c => c.id === existing.id);
    list[idx] = updated;
    return list;
  }

  if (weeklyState === "constraint-identified") {
    const existing = findOpenCaseForRule(list, primaryRuleId);
    if (existing) {
      const updated = transitionCase(existing, existing.status === "observing" ? "active" : existing.status, { weekStart, weekEnd, note: "Re-confirmed by this week's review." });
      if (updated) { const idx = list.findIndex(c => c.id === existing.id); list[idx] = updated; }
      return list;
    }
    list.push(createConstraintCase({ primaryRuleId, rankedCauses, selectedPlan, weekStart, weekEnd, engineVersion, knowledgeLibraryVersion, detectedSignals }));
    return list;
  }

  if (weeklyState === "observe-for-another-week") {
    const existing = findOpenCaseForRule(list, primaryRuleId);
    if (existing) {
      const updated = addEvidenceToCase(existing, { weekStart, weekEnd, note: "Observed again — evidence still incomplete." });
      const idx = list.findIndex(c => c.id === existing.id);
      list[idx] = updated;
      return list;
    }
    list.push(createConstraintCase({ primaryRuleId, rankedCauses, selectedPlan: null, weekStart, weekEnd, engineVersion, knowledgeLibraryVersion, detectedSignals }));
    return list;
  }

  // "no-constraint-detected": leave existing cases untouched here — they only close via an
  // explicit weekly-review transition (e.g. an "existing-plan-reviewed" cycle), never silently.
  return list;
}
