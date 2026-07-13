import { $, esc, fmt } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { parseReviewFile, getValueAtPath, setValueAtPath } from "./review-parser.js";
import {
  readinessScore, trainingStreakWeeks, weeklyComplianceRate, weeklyRecoveryDebrief,
  monthlyRecoveryTrajectory, detectFatigueReason, average, weeklyRateOfGain, sevenDayAverage,
  workoutsInWeek
} from "./calculations.js";
import { startOfWeek, parseLogDate } from "./dates.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

// In-memory only until the user explicitly applies it — nothing here touches saveData()
// until applyApprovedReview() runs, and even then only approved items are written.
let draft = null;
let activeReviewTab = "weekly";

// ==================== APP-GENERATED REVIEW (no upload needed) ====================
// Builds the same draft shape parseReviewFile() produces, straight from existing
// computed data — the empty-state's "generate your first review from tracked app
// data" option. Reuses calculations.js, never recomputes anything already available.
function generateAppReview(reviewType, data) {
  const now = new Date();
  if (reviewType === "weekly") {
    const weekStart = startOfWeek(now);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const inWeek = (d) => { const p = parseLogDate(d); return p && p >= weekStart && p <= weekEnd; };
    const sessions = workoutsInWeek(data.workouts, now);
    const compliance = weeklyComplianceRate(data.workouts, data.trainingProgram, now);
    const readiness = readinessScore(data, now);
    const recoveryDebrief = weeklyRecoveryDebrief(data, now);
    const bw = data.bodyweightLogs.filter(b => inWeek(b.date));
    const rate = weeklyRateOfGain(data.bodyweightLogs);
    const fatigue = detectFatigueReason(data, now);

    const findings = [];
    if (compliance >= 80) findings.push({ findingType: "achievement", category: "training", title: "Strong weekly compliance", description: `${compliance}% of planned sessions completed.`, severity: "info" });
    else findings.push({ findingType: "warning", category: "training", title: "Missed planned sessions", description: `Only ${compliance}% of planned sessions completed this week.`, severity: "warning" });
    if (readiness.status === "red" || readiness.status === "red-amber") findings.push({ findingType: "warning", category: "recovery", title: "Readiness trending low", description: readiness.mainBottleneck, severity: "warning" });
    if (fatigue.professionalSupportWarning) findings.push({ findingType: "warning", category: "recovery", title: "Persistent fatigue signals", description: fatigue.primaryCause, severity: "danger" });

    const proposedUpdates = [];
    if (rate != null && rate < 0.15) {
      proposedUpdates.push({
        metricKey: "daily_calorie_target", label: "Daily Calorie Target", path: ["profile", "dailyCalorieTarget"],
        currentValue: data.profile.dailyCalorieTarget, proposedValue: (data.profile.dailyCalorieTarget || 2800) + 150, unit: "kcal",
        actionType: "increase", reason: `Weekly rate of gain (${fmt(rate, 2)}kg/wk) is below the ${data.profile.targetWeeklyGain}kg/wk target.`,
        sourceText: "app-generated", confidence: "Medium", approvalStatus: "pending", userEditedValue: null
      });
    }

    return {
      reviewType: "weekly", periodStart: weekStart.toLocaleDateString("en-CA"), periodEnd: weekEnd.toLocaleDateString("en-CA"),
      summary: `${sessions.length} sessions logged, ${compliance}% weekly compliance, readiness ${readiness.score}/100 (${readiness.status}).`,
      overallScore: Math.round((compliance + readiness.score) / 2),
      findings, proposedUpdates,
      knowledgeNotes: [], proposedTasks: [], parseMethod: "app-generated",
      recoveryDebrief
    };
  }

  // monthly
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 28);
  const trajectory = monthlyRecoveryTrajectory(data, now);
  const streak = trainingStreakWeeks(data.workouts, now);
  const bwInMonth = data.bodyweightLogs.filter(b => { const p = parseLogDate(b.date); return p && p >= monthAgo; });
  const gain = bwInMonth.length >= 2 ? Number(bwInMonth.at(-1).morningBodyweight) - Number(bwInMonth[0].morningBodyweight) : null;

  const findings = [
    { findingType: trajectory.label === "Recovery improving" ? "achievement" : "warning", category: "recovery", title: trajectory.label, description: trajectory.nextMonthPriority, severity: trajectory.label === "Recovery improving" ? "info" : "warning" }
  ];
  if (streak >= 4) findings.push({ findingType: "achievement", category: "training", title: "Consistent training streak", description: `${streak} consecutive weeks with a logged session.`, severity: "info" });

  const weeklyReviews = data.reviews.filter(r => r.reviewType === "weekly" && r.status === "applied").slice(-5);
  const avgWeeklyScore = weeklyReviews.length ? Math.round(average(weeklyReviews.map(r => r.overallScore || 0))) : null;

  return {
    reviewType: "monthly", periodStart: monthAgo.toLocaleDateString("en-CA"), periodEnd: now.toLocaleDateString("en-CA"),
    summary: `Bodyweight change ${gain != null ? fmt(gain, 2) + "kg" : "n/a"} over the period. ${trajectory.nextMonthPriority}`,
    overallScore: avgWeeklyScore,
    findings, proposedUpdates: [], knowledgeNotes: [], proposedTasks: [], parseMethod: "app-generated",
    trajectory, synthesizedWeeklyReviews: weeklyReviews.map(r => r.id)
  };
}

// ==================== UPLOAD + DRAFT LIFECYCLE ====================

export async function handleReviewUpload(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const errEl = $("reviewUploadError");
  if (errEl) errEl.hidden = true;
  try {
    const data = getData();
    draft = await parseReviewFile(file, data);
    fileInput.value = "";
    renderReviewDraftPreview();
  } catch (err) {
    if (errEl) { errEl.hidden = false; errEl.textContent = err.message; }
    else alert(err.message);
  }
}

export function generateAndPreviewAppReview() {
  const data = getData();
  draft = generateAppReview(activeReviewTab, data);
  renderReviewDraftPreview();
}

export function cancelReviewDraft() {
  draft = null;
  renderReviewDraftPreview();
}

function findingsHtml(findings) {
  if (!findings || !findings.length) return "<p class='small'>No findings extracted.</p>";
  return findings.map(f => `
    <div class="status-banner status-${f.severity === "danger" ? "error" : f.severity === "warning" ? "warning" : "info"}">
      <span class="status-icon">${f.severity === "danger" ? "⛔" : f.severity === "warning" ? "⚠" : f.findingType === "achievement" ? "🏆" : "ℹ"}</span>
      <span>${esc(f.description)}</span>
    </div>`).join("");
}

function updateRowHtml(u, i) {
  const confClass = u.confidence === "High" ? "status-on-target" : u.confidence === "Unmapped" ? "status-under" : "";
  const changeLabel = u.actionType === "maintain" ? "Maintain" : u.actionType === "increase" ? "Increase" : u.actionType === "decrease" ? "Decrease" : u.actionType === "unsupported" ? "Unsupported" : u.actionType === "requires_clarification" ? "Needs clarification" : "Replace";
  return `
    <div class="history-item review-update-row" data-update-idx="${i}">
      <div class="section-title"><strong>${esc(u.label)}</strong><span class="badge ${confClass}">${esc(u.confidence)}</span></div>
      <p class="small">Current: ${u.currentValue ?? "--"} ${esc(u.unit)} &rarr; Proposed: ${esc(String(u.userEditedValue ?? u.proposedValue ?? "--"))} ${esc(u.unit)} (${changeLabel})</p>
      ${u.reason ? `<p class="small">Reason: ${esc(u.reason)}</p>` : ""}
      ${u.path ? "" : `<p class="small status-under">Could not map "${esc(u.metricKey)}" to a known field — will be kept as a note only unless you edit it.</p>`}
      <div class="badge-row">
        <label>Edit value <input type="text" class="review-update-edit" data-update-idx="${i}" value="${esc(u.userEditedValue ?? u.proposedValue ?? "")}"></label>
      </div>
      <div class="badge-row">
        <button type="button" class="secondary review-update-approve" data-update-idx="${i}" data-action="approved">${u.approvalStatus === "approved" ? "✓ Approved" : "Approve"}</button>
        <button type="button" class="secondary review-update-approve" data-update-idx="${i}" data-action="rejected">${u.approvalStatus === "rejected" ? "✓ Rejected" : "Reject"}</button>
        <button type="button" class="secondary review-update-approve" data-update-idx="${i}" data-action="note_only">Convert to Note Only</button>
      </div>
    </div>`;
}

function noteRowHtml(n, i) {
  return `
    <div class="history-item">
      <p class="small">${esc(n.note)}</p>
      <div class="badge-row">
        <button type="button" class="secondary review-note-approve" data-note-idx="${i}" data-action="approved">${n.approvalStatus === "approved" ? "✓ Approved" : "Approve"}</button>
        <button type="button" class="secondary review-note-approve" data-note-idx="${i}" data-action="rejected">${n.approvalStatus === "rejected" ? "✓ Rejected" : "Reject"}</button>
      </div>
    </div>`;
}

function taskRowHtml(t, i) {
  return `
    <div class="history-item">
      <strong>${esc(t.title)}</strong> <span class="badge">${esc(t.priority)}</span>
      <div class="badge-row">
        <button type="button" class="secondary review-task-approve" data-task-idx="${i}" data-action="approved">${t.approvalStatus === "approved" ? "✓ Approved" : "Approve"}</button>
        <button type="button" class="secondary review-task-approve" data-task-idx="${i}" data-action="rejected">${t.approvalStatus === "rejected" ? "✓ Rejected" : "Reject"}</button>
      </div>
    </div>`;
}

export function renderReviewDraftPreview() {
  const panel = $("reviewDraftPreview");
  if (!panel) return;
  if (!draft) { panel.hidden = true; panel.innerHTML = ""; return; }

  draft.knowledgeNotes = draft.knowledgeNotes.map(n => withApprovalDefault(n));
  draft.proposedTasks = draft.proposedTasks.map(t => withApprovalDefault(t));
  draft.proposedUpdates = draft.proposedUpdates.map(u => withApprovalDefault(u));

  panel.hidden = false;
  const approvedUpdates = draft.proposedUpdates.filter(u => u.approvalStatus === "approved").length;
  const approvedNotes = draft.knowledgeNotes.filter(n => n.approvalStatus === "approved").length;
  const approvedTasks = draft.proposedTasks.filter(t => t.approvalStatus === "approved").length;

  panel.innerHTML = `
    <div class="section-title"><h3>Review Draft — ${esc(draft.reviewType)}</h3><span class="badge">${esc(draft.periodStart)} – ${esc(draft.periodEnd)}</span></div>
    ${draft.sourceFilename ? `<p class="small">Source: ${esc(draft.sourceFilename)} (${esc(draft.parseMethod)})</p>` : `<p class="small">Source: generated from your tracked app data</p>`}
    <p class="small">${esc(draft.summary)}</p>
    ${draft.overallScore != null ? `<p class="small"><strong>Score: ${draft.overallScore}/100</strong></p>` : ""}

    <details open><summary>Findings (${draft.findings.length})</summary>${findingsHtml(draft.findings)}</details>

    <details open><summary>Proposed Metric/Goal Updates (${draft.proposedUpdates.length})</summary>
      ${draft.proposedUpdates.length ? draft.proposedUpdates.map(updateRowHtml).join("") : "<p class='small'>No metric or goal updates detected.</p>"}
    </details>

    <details><summary>Knowledge Notes (${draft.knowledgeNotes.length})</summary>
      ${draft.knowledgeNotes.length ? draft.knowledgeNotes.map(noteRowHtml).join("") : "<p class='small'>No notes detected.</p>"}
    </details>

    <details><summary>Proposed Tasks (${draft.proposedTasks.length})</summary>
      ${draft.proposedTasks.length ? draft.proposedTasks.map(taskRowHtml).join("") : "<p class='small'>No next-period actions detected.</p>"}
    </details>

    <div class="next-objective-card">
      <p class="mission-tag">Confirmation</p>
      <p class="small">You are about to update ${approvedUpdates} metric(s), add ${approvedNotes} note(s) and create ${approvedTasks} task(s).</p>
      <div class="badge-row">
        <button type="button" id="reviewApproveAllBtn" class="secondary">Approve All</button>
        <button type="button" id="reviewRejectAllBtn" class="secondary">Reject All</button>
        <button type="button" id="reviewApplyBtn">Apply Approved Changes</button>
        <button type="button" id="reviewCancelBtn" class="secondary">Cancel Import</button>
      </div>
    </div>`;
}

function withApprovalDefault(item) {
  return item.approvalStatus ? item : { ...item, approvalStatus: "pending" };
}

export function setReviewDraftUpdateApproval(idx, action) {
  if (!draft) return;
  const u = draft.proposedUpdates[idx];
  if (!u) return;
  if (action === "note_only") { u.actionType = "note_only"; u.approvalStatus = "rejected"; }
  else u.approvalStatus = action;
  renderReviewDraftPreview();
}
export function setReviewDraftUpdateValue(idx, value) {
  if (!draft || !draft.proposedUpdates[idx]) return;
  draft.proposedUpdates[idx].userEditedValue = value;
}
export function setReviewDraftNoteApproval(idx, action) {
  if (!draft || !draft.knowledgeNotes[idx]) return;
  draft.knowledgeNotes[idx].approvalStatus = action;
  renderReviewDraftPreview();
}
export function setReviewDraftTaskApproval(idx, action) {
  if (!draft || !draft.proposedTasks[idx]) return;
  draft.proposedTasks[idx].approvalStatus = action;
  renderReviewDraftPreview();
}
export function approveAllReviewDraft() {
  if (!draft) return;
  draft.proposedUpdates.forEach(u => { if (u.actionType !== "unsupported") u.approvalStatus = "approved"; });
  draft.knowledgeNotes.forEach(n => n.approvalStatus = "approved");
  draft.proposedTasks.forEach(t => t.approvalStatus = "approved");
  renderReviewDraftPreview();
}
export function rejectAllReviewDraft() {
  if (!draft) return;
  draft.proposedUpdates.forEach(u => u.approvalStatus = "rejected");
  draft.knowledgeNotes.forEach(n => n.approvalStatus = "rejected");
  draft.proposedTasks.forEach(t => t.approvalStatus = "rejected");
  renderReviewDraftPreview();
}

/**
 * Writes ONLY approved items to real app data, and only after this explicit call —
 * nothing above this function ever calls saveData(). Every applied change is logged
 * to review.appliedLog with before/after values for the audit trail (spec 4.5).
 */
export function applyApprovedReview() {
  if (!draft) return;
  const approvedUpdates = draft.proposedUpdates.filter(u => u.approvalStatus === "approved" && u.path);
  const approvedNotes = draft.knowledgeNotes.filter(n => n.approvalStatus === "approved");
  const approvedTasks = draft.proposedTasks.filter(t => t.approvalStatus === "approved");
  const total = approvedUpdates.length + approvedNotes.length + approvedTasks.length;
  if (!total) { alert("Nothing is approved yet — approve at least one item, or cancel the import."); return; }
  if (!confirm(`You are about to update ${approvedUpdates.length} metric(s), add ${approvedNotes.length} note(s) and create ${approvedTasks.length} task(s). Apply now?`)) return;

  const data = getData();
  const now = new Date().toISOString();
  const appliedLog = [];

  approvedUpdates.forEach(u => {
    const previousValue = getValueAtPath(data, u.path);
    const newValue = u.userEditedValue !== null && u.userEditedValue !== "" ? coerceLikePrevious(previousValue, u.userEditedValue) : u.proposedValue;
    setValueAtPath(data, u.path, newValue);
    appliedLog.push({
      metricKey: u.metricKey, label: u.label, previousValue, newValue,
      dateChanged: now, reason: u.reason, userEdited: u.userEditedValue !== null && u.userEditedValue !== ""
    });
  });

  approvedNotes.forEach(n => {
    const prefix = `[${draft.reviewType} review ${draft.periodStart}] `;
    data.profile.notes = (data.profile.notes ? data.profile.notes + "\n" : "") + prefix + n.note;
  });

  approvedTasks.forEach(t => {
    data.tasks.push({
      id: uid(), title: t.title, description: "", category: t.category || "general", priority: t.priority || "medium",
      dueDate: null, completed: false, completedAt: null, source: "review", relatedReviewId: null,
      createdAt: now, updatedAt: now
    });
  });

  const reviewRecord = {
    id: uid(), reviewType: draft.reviewType, periodStart: draft.periodStart, periodEnd: draft.periodEnd,
    status: (approvedUpdates.length + approvedNotes.length + approvedTasks.length) < (draft.proposedUpdates.length + draft.knowledgeNotes.length + draft.proposedTasks.length) ? "partially_applied" : "applied",
    overallScore: draft.overallScore, summary: draft.summary,
    source: draft.sourceFilename ? "upload" : "app",
    sourceFilename: draft.sourceFilename || null,
    findings: draft.findings, proposedUpdates: draft.proposedUpdates, knowledgeNotes: draft.knowledgeNotes,
    appliedLog,
    createdAt: now, approvedAt: now, appliedAt: now
  };
  data.reviews.push(reviewRecord);
  saveData(data);
  draft = null;
  refreshAll();
  alert(`Review applied: ${appliedLog.length} metric(s) updated, ${approvedNotes.length} note(s) added, ${approvedTasks.length} task(s) created.`);
}

function coerceLikePrevious(previousValue, editedStr) {
  if (typeof previousValue === "number") { const n = Number(editedStr); return Number.isNaN(n) ? previousValue : n; }
  return editedStr;
}

// ==================== TIMELINE + TABS ====================

export function setReviewTab(tab) {
  activeReviewTab = tab;
  draft = null;
  renderReviewCentre(getData());
}

function reviewStatusBadgeClass(status) {
  if (["applied", "approved"].includes(status)) return "status-on-target";
  if (["rejected", "failed"].includes(status)) return "status-under";
  return "";
}

function timelineItemHtml(r) {
  return `
    <div class="history-item">
      <div class="section-title">
        <strong>${esc(r.reviewType === "monthly" ? "Monthly" : "Weekly")} Review — ${esc(r.periodStart)} to ${esc(r.periodEnd)}</strong>
        <span class="badge ${reviewStatusBadgeClass(r.status)}">${esc((r.status || "").replace(/_/g, " "))}</span>
      </div>
      <p class="small">${r.overallScore != null ? `Score: ${r.overallScore}/100 · ` : ""}${esc(r.summary || "")}</p>
      <p class="small">${r.appliedLog?.length ? `${r.appliedLog.length} metric(s) changed` : "No metrics changed"}${r.sourceFilename ? ` · Source: ${esc(r.sourceFilename)}` : " · Source: app-generated"}</p>
      <details><summary>Audit trail</summary>
        ${r.appliedLog?.length ? r.appliedLog.map(a => `<p class="small">${esc(a.label)}: ${a.previousValue ?? "--"} &rarr; ${a.newValue ?? "--"}${a.userEdited ? " (user-edited)" : ""} — ${esc(a.reason || "")}</p>`).join("") : "<p class='small'>No applied changes.</p>"}
      </details>
      <div class="actions"><button class="danger" data-delete="reviews" data-id="${r.id}">Delete</button></div>
    </div>`;
}

export function renderReviewCentre(data) {
  const tabsEl = $("reviewTypeTabs");
  if (!tabsEl) return; // review section not present in this build (defensive)

  tabsEl.querySelectorAll("[data-review-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.reviewTab === activeReviewTab));
  const label = $("reviewGenerateLabel");
  if (label) label.textContent = activeReviewTab === "weekly" ? "Generate This Week's Review" : "Generate This Month's Review";

  const reviewsOfType = data.reviews.filter(r => r.reviewType === activeReviewTab).slice().reverse();
  const timelineEl = $("reviewTimeline");
  if (timelineEl) {
    timelineEl.innerHTML = reviewsOfType.length ? reviewsOfType.map(timelineItemHtml).join("")
      : `<p class="small">${activeReviewTab === "weekly"
          ? "No weekly review has been completed yet. Upload a GPT review or generate your first review from tracked app data."
          : "Your first monthly review will become available once enough weekly data has been collected."}</p>`;
  }

  renderReviewDraftPreview();
}

// ==================== EVENT DELEGATION ====================

export function setupReviewEventDelegation() {
  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest("[data-review-tab]");
    if (tabBtn) { setReviewTab(tabBtn.dataset.reviewTab); return; }

    if (e.target.closest("#reviewGenerateBtn")) { generateAndPreviewAppReview(); return; }
    if (e.target.closest("#reviewApproveAllBtn")) { approveAllReviewDraft(); return; }
    if (e.target.closest("#reviewRejectAllBtn")) { rejectAllReviewDraft(); return; }
    if (e.target.closest("#reviewApplyBtn")) { applyApprovedReview(); return; }
    if (e.target.closest("#reviewCancelBtn")) { cancelReviewDraft(); return; }

    const updateBtn = e.target.closest(".review-update-approve");
    if (updateBtn) { setReviewDraftUpdateApproval(Number(updateBtn.dataset.updateIdx), updateBtn.dataset.action); return; }
    const noteBtn = e.target.closest(".review-note-approve");
    if (noteBtn) { setReviewDraftNoteApproval(Number(noteBtn.dataset.noteIdx), noteBtn.dataset.action); return; }
    const taskBtn = e.target.closest(".review-task-approve");
    if (taskBtn) { setReviewDraftTaskApproval(Number(taskBtn.dataset.taskIdx), taskBtn.dataset.action); return; }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "reviewFileInput") handleReviewUpload(e.target);
  });
  document.addEventListener("input", (e) => {
    const editInput = e.target.closest(".review-update-edit");
    if (editInput) setReviewDraftUpdateValue(Number(editInput.dataset.updateIdx), editInput.value);
  });
}
