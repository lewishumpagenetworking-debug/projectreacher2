// Constraint Analysis page (spec section 7.8): current weekly outcome, active constraint
// cases, primary/contributing/ruled-out causes, missing evidence, active plan, compliance,
// success criteria, next review point. The "Complete This Week's Constraint Review" button
// is the ONLY place a formal diagnosis or case transition happens (spec section 10).
import { $, esc } from "./dom.js";
import { getData, saveData } from "./data.js";
import { startOfWeek } from "./dates.js";
import { runWeeklyReview, applyWeeklyReviewResultToCases, WEEKLY_STATES } from "./weekly-review-engine.js";

const WEEKLY_STATE_LABELS = {
  [WEEKLY_STATES.NO_CONSTRAINT_DETECTED]: "No limiting constraint was identified this week. Maintain the current plan.",
  [WEEKLY_STATES.OBSERVE_FOR_ANOTHER_WEEK]: "A possible constraint is forming, but the evidence is not strong enough to justify a change yet.",
  [WEEKLY_STATES.CONSTRAINT_IDENTIFIED]: "The evidence supports a controlled intervention this week.",
  [WEEKLY_STATES.EXISTING_PLAN_REVIEWED]: "An existing plan is being reviewed this week."
};

function currentWeekRange(referenceDate = new Date()) {
  const start = startOfWeek(referenceDate);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const iso = (d) => d.toLocaleDateString("en-CA");
  return { weekStart: iso(start), weekEnd: iso(end) };
}

function evidenceListHtml(items, emptyText) {
  if (!items.length) return `<p class="small">${esc(emptyText)}</p>`;
  return `<ul>${items.map(i => `<li class="small">${esc(i)}</li>`).join("")}</ul>`;
}

function causeCardHtml(evaluation, label) {
  if (!evaluation) return "";
  return `
    <div class="history-item">
      <strong>${esc(label)}: ${esc(evaluation.title)}</strong>
      <p class="small">Category: ${esc(evaluation.category)} · Confidence: ${esc(evaluation.confidence)}</p>
      ${evidenceListHtml(evaluation.evidenceDetail, "No evidence detail recorded.")}
    </div>`;
}

export function renderConstraintPage(data) {
  const readinessEl = $("constraintReadiness");
  const safetyEl = $("constraintSafetyFlags");
  const previewEl = $("constraintWeeklyPreview");
  const activeCasesEl = $("constraintActiveCases");
  const historyEl = $("constraintCaseHistory");
  if (!readinessEl) return;

  const { weekStart, weekEnd } = currentWeekRange();
  const analysis = runWeeklyReview(data, { weekStart, weekEnd });

  readinessEl.innerHTML = `
    <div class="badge-row">
      <span class="badge ${analysis.readiness.level === "Ready" ? "status-on-target" : analysis.readiness.level === "Insufficient data" ? "status-under" : ""}">Analysis readiness: ${esc(analysis.readiness.level)} (${analysis.readiness.pct}%)</span>
    </div>
    ${analysis.readiness.missing.length ? `
      <div class="status-banner status-info"><span class="status-icon">🔵</span><span>
        ${analysis.readiness.missing.map(m => `<span class="deep-link-row" data-goto-tab="${esc(m.tab)}" ${m.anchor ? `data-goto-anchor="${esc(m.anchor)}"` : ""}>${esc(m.label)}</span>`).join("<br>")}
      </span></div>` : ""}`;

  if (analysis.safetyFlags.length) {
    safetyEl.hidden = false;
    safetyEl.innerHTML = `<div class="status-banner status-warning"><span class="status-icon">🟠</span><span>
      Safety flags detected in recent notes: ${analysis.safetyFlags.map(f => esc(f.label)).join(", ")}. This does not wait for the weekly review — consider professional care if these are severe or persistent.
    </span></div>`;
  } else {
    safetyEl.hidden = true;
    safetyEl.innerHTML = "";
  }

  previewEl.innerHTML = `
    <div class="status-banner status-info"><span class="status-icon">🔵</span><span>${esc(WEEKLY_STATE_LABELS[analysis.weeklyState])}</span></div>
    ${causeCardHtml(analysis.primary, "Primary constraint")}
    ${analysis.contributing.length ? `<h3>Contributing</h3>${analysis.contributing.map(c => causeCardHtml(c, "Contributing")).join("")}` : ""}
    ${analysis.lowerConfidence.length ? `<h3>Lower-confidence possibilities</h3>${analysis.lowerConfidence.map(c => causeCardHtml(c, "Possible")).join("")}` : ""}
    ${analysis.ruledOut.length ? `<h3>Ruled out</h3>${evidenceListHtml(analysis.ruledOut.map(r => r.title), "Nothing ruled out yet.")}` : ""}
    <h3>Missing evidence</h3>
    ${evidenceListHtml(analysis.missingEvidence, "No missing evidence blocking this analysis.")}
    ${analysis.plan ? `
      <h3>Proposed plan</h3>
      <div class="history-item">
        <p class="small"><strong>Immediate action:</strong> ${esc(analysis.plan.immediateAction)}</p>
        <p class="small"><strong>Next-week plan:</strong> ${analysis.plan.nextWeekPlan.map(esc).join("; ")}</p>
        <p class="small"><strong>Monitoring:</strong> ${analysis.plan.monitoring.map(esc).join(", ")}</p>
        <p class="small"><strong>Success criteria:</strong> ${esc(analysis.plan.successCriteria)}</p>
        <p class="small"><strong>Reassessment point:</strong> ${esc(analysis.plan.reassessmentPoint)}</p>
      </div>` : `<p class="small">No plan is proposed this week — doing nothing can be the correct decision.</p>`}
    ${analysis.caseReviews.length ? `
      <h3>Existing plan compliance this week</h3>
      ${analysis.caseReviews.map(cr => `<p class="small">${esc(cr.title)}: ${cr.improved ? "evidence no longer supports this constraint — improving" : "evidence still present — will escalate"}</p>`).join("")}` : ""}`;

  const activeCases = (data.constraintCases || []).filter(c => ["observing", "active", "improving", "escalated"].includes(c.status));
  activeCasesEl.innerHTML = activeCases.length ? activeCases.map(caseCardHtml).join("") : "<p class='small'>No active constraint cases.</p>";

  const closedCases = (data.constraintCases || []).filter(c => ["resolved", "dismissed"].includes(c.status));
  historyEl.innerHTML = closedCases.length ? closedCases.slice().reverse().map(caseCardHtml).join("") : "<p class='small'>No resolved or dismissed cases yet.</p>";
}

function caseCardHtml(c) {
  return `
    <details class="history-item expandable-card">
      <summary><strong>${esc(c.rankedCauses?.[0]?.title || c.primaryRuleId)}</strong> · <span class="badge">${esc(c.status)}</span></summary>
      <p class="small">Opened ${esc(c.weekStart)} · Category: ${esc(c.outcomeType || "--")}</p>
      ${c.selectedPlan ? `<p class="small"><strong>Plan:</strong> ${esc(c.selectedPlan.immediateAction || "")}</p>` : ""}
      <p class="small"><strong>Monitoring window:</strong> ${esc(c.monitoringWindow || "--")}</p>
      <p class="small"><strong>Review history:</strong></p>
      <ul>${(c.reviewHistory || []).map(r => `<li class="small">${esc(r.date?.slice(0, 10) || "")} — ${esc(r.status)}${r.note ? `: ${esc(r.note)}` : ""}</li>`).join("")}</ul>
    </details>`;
}

/** The only user action that formally advances the constraint-diagnosis system for the week. */
export function completeWeeklyReview() {
  const data = getData();
  const { weekStart, weekEnd } = currentWeekRange();
  const analysis = runWeeklyReview(data, { weekStart, weekEnd });

  data.constraintCases = applyWeeklyReviewResultToCases(analysis, data.constraintCases);

  let review = (data.reviews || []).find(r => r.reviewType === "weekly" && r.periodStart === weekStart && r.periodEnd === weekEnd);
  if (!review) {
    review = {
      id: `review-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      reviewType: "weekly", periodStart: weekStart, periodEnd: weekEnd, status: "approved",
      overallScore: null, summary: WEEKLY_STATE_LABELS[analysis.weeklyState], source: "app", sourceFilename: null,
      findings: [], proposedUpdates: [], knowledgeNotes: [], proposedTasks: [], appliedLog: [],
      createdAt: new Date().toISOString(), approvedAt: new Date().toISOString(), appliedAt: null,
      constraintAnalysis: analysis
    };
    data.reviews.push(review);
  } else {
    review.constraintAnalysis = analysis;
    review.summary = WEEKLY_STATE_LABELS[analysis.weeklyState];
  }

  saveData(data);
  window.dispatchEvent(new CustomEvent("reacher:refresh"));
  alert(`This week's constraint review is complete: ${WEEKLY_STATE_LABELS[analysis.weeklyState]}`);
}
