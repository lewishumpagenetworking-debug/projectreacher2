// Global ProgressTask generation + prioritisation (spec sections 3-6). Every task is
// derived DETERMINISTICALLY from current app state each time this runs — nothing is
// persisted as a separate "task record," so a task can never be duplicated and always
// resolves automatically the moment its underlying action is completed (the next render
// simply won't produce it again). This consolidates (not replaces) the existing Daily/
// Monthly Checklist, Attention Panel, active constraint cases, and manual data.tasks —
// all of those keep rendering exactly as before, reading the same shared signal functions.
import {
  dailyChecklist, monthlyChecklist, attentionSignals, isSessionReviewComplete
} from "./calculations.js";
import { computeAnalysisReadiness } from "./analysis-readiness.js";
import { detectSafetyFlags, summarizeSafetyFlags } from "./safety-escalation.js";
import { parseLogDate } from "./dates.js";

export const TASK_SECTIONS = {
  ACT_NOW: "act-now", COMPLETE_TODAY: "complete-today", PROTECT_WEEK: "protect-week",
  ACTIVE_PLAN: "active-plan", UPCOMING: "upcoming", WAITING: "waiting", COMPLETED: "completed"
};

export const TASK_SECTION_LABELS = {
  [TASK_SECTIONS.ACT_NOW]: "Act Now",
  [TASK_SECTIONS.COMPLETE_TODAY]: "Complete Today",
  [TASK_SECTIONS.PROTECT_WEEK]: "Protect This Week's Data",
  [TASK_SECTIONS.ACTIVE_PLAN]: "Active Plan",
  [TASK_SECTIONS.UPCOMING]: "Upcoming",
  [TASK_SECTIONS.WAITING]: "Waiting",
  [TASK_SECTIONS.COMPLETED]: "Completed"
};

const PRIORITY_RANK = { critical: 0, high: 1, normal: 2, low: 3 };
const SECTION_RANK = {
  [TASK_SECTIONS.ACT_NOW]: 0, [TASK_SECTIONS.ACTIVE_PLAN]: 1, [TASK_SECTIONS.PROTECT_WEEK]: 2,
  [TASK_SECTIONS.COMPLETE_TODAY]: 3, [TASK_SECTIONS.UPCOMING]: 4, [TASK_SECTIONS.WAITING]: 5, [TASK_SECTIONS.COMPLETED]: 6
};

const TASK_ENGINE_VERSION = "1.0.0";

function Task(overrides) {
  const now = new Date().toISOString();
  return {
    id: "", type: "", title: "", instruction: "", reason: "",
    priority: "normal", urgencyState: "upcoming",
    dueAt: null, generatedAt: now, completedAt: null,
    sourceEntityType: null, sourceEntityId: null,
    destination: { route: null, params: {}, anchor: null, mode: null },
    completionRule: null, dependencies: [], blocksWeeklyAnalysis: false, blocksSessionCompletion: false,
    relatedConstraintCaseId: null, evidenceContribution: [], dismissible: true, dismissalReasonRequired: false,
    recurringRuleId: null, version: TASK_ENGINE_VERSION, section: TASK_SECTIONS.UPCOMING,
    ...overrides
  };
}

function withinDays(dateStr, referenceDate, days) {
  const d = parseLogDate(dateStr);
  return d && (referenceDate - d) / 86400000 <= days;
}

/** Deterministically generates the full ProgressTask list from current app state. Pure, read-only. */
export function generateProgressTasks(data, referenceDate = new Date()) {
  const tasks = [];

  // 1. Safety — critical, Act Now, never dismissible, ignores weekly cadence entirely.
  const safetyFlags = summarizeSafetyFlags(detectSafetyFlags(data, { referenceDate }));
  safetyFlags.forEach(f => tasks.push(Task({
    id: `safety-${f.id}`, type: "safety", title: `Possible safety concern: ${f.label}`,
    instruction: "Review this note now. If this is severe or persistent, consider professional care.",
    reason: `Detected in a recent note: "${f.sourceText}"`, priority: "critical", urgencyState: "due_now",
    destination: { route: f.source === "recovery-log" ? "recovery" : "train", anchor: f.source === "recovery-log" ? null : "workoutHistory" },
    dismissible: false, section: TASK_SECTIONS.ACT_NOW
  })));

  // 2. Today's sequenced daily flow (existing dailyChecklist()) — Complete Today.
  const daily = dailyChecklist(data, referenceDate);
  daily.items.filter(i => !i.done).forEach(i => tasks.push(Task({
    id: `daily-${i.id}`, type: "daily-log", title: i.label, instruction: `Complete: ${i.label}`,
    reason: "Part of today's sequenced daily flow — needed to keep the week's trend usable.",
    priority: "high", urgencyState: "due_today",
    destination: { route: i.tab, anchor: i.anchor }, section: TASK_SECTIONS.COMPLETE_TODAY
  })));

  // 3. Monthly cadence (existing monthlyChecklist()) — Upcoming.
  const monthly = monthlyChecklist(data, referenceDate);
  monthly.items.filter(i => !i.done).forEach(i => tasks.push(Task({
    id: `monthly-${i.id}`, type: "monthly-log", title: i.label, instruction: `Complete: ${i.label}`,
    reason: "Monthly tracking cadence.", priority: "normal", urgencyState: "upcoming",
    destination: { route: i.tab, anchor: i.anchor }, section: TASK_SECTIONS.UPCOMING
  })));

  // 4. Attention signals (existing attentionSignals(), shared with the Dashboard Attention Panel).
  const severityToPriority = { error: "high", warning: "high", info: "normal" };
  attentionSignals(data, referenceDate).forEach(sig => tasks.push(Task({
    id: `attention-${sig.id}`, type: "attention", title: sig.title, instruction: sig.detail, reason: sig.detail,
    priority: severityToPriority[sig.severity] || "normal", urgencyState: sig.severity === "error" ? "overdue" : "due_today",
    destination: { route: sig.gotoTab, anchor: sig.gotoAnchor || null },
    section: sig.severity === "error" ? TASK_SECTIONS.ACT_NOW : TASK_SECTIONS.COMPLETE_TODAY
  })));

  // 5. Incomplete Session Reviews this week — Protect This Week's Data, blocks weekly analysis.
  const sessionsThisWeek = (data.workouts || []).filter(w => withinDays(w.date, referenceDate, 7));
  sessionsThisWeek.filter(w => !isSessionReviewComplete(w.sessionReview)).forEach(w => tasks.push(Task({
    id: `session-review-${w.id}`, type: "session-review", title: `Finish session review: ${w.sessionName || w.day || w.programDay || "session"}`,
    instruction: "The workout is saved, but required review fields are missing. Complete them before the weekly analysis.",
    reason: "Weekly analysis needs this review to judge whether this session is usable evidence.",
    priority: "high", urgencyState: "due_today",
    destination: { route: "train", anchor: "workoutHistory" }, sourceEntityType: "workout", sourceEntityId: w.id,
    blocksWeeklyAnalysis: true, section: TASK_SECTIONS.PROTECT_WEEK
  })));

  // 6. Analysis-readiness missing items — Protect This Week's Data, blocks weekly analysis.
  const readiness = computeAnalysisReadiness(data, referenceDate);
  readiness.missing.forEach(m => tasks.push(Task({
    id: `readiness-${m.id}`, type: "readiness", title: m.label, instruction: m.label,
    reason: "Missing data reduces this week's diagnostic confidence.", priority: "high", urgencyState: "due_today",
    destination: { route: m.tab, anchor: m.anchor || null }, blocksWeeklyAnalysis: true, section: TASK_SECTIONS.PROTECT_WEEK
  })));

  // 7. Active constraint-case plan actions — Active Plan.
  (data.constraintCases || []).filter(c => ["active", "improving", "escalated"].includes(c.status)).forEach(c => tasks.push(Task({
    id: `plan-${c.id}`, type: "active-plan", title: `Follow plan: ${c.rankedCauses?.[0]?.title || c.primaryRuleId}`,
    instruction: c.selectedPlan?.immediateAction || "Follow the current plan for this constraint.",
    reason: `This is the controlled variable being tested this week (status: ${c.status}).`,
    priority: "high", urgencyState: "due_today",
    destination: { route: "constraint", anchor: null }, relatedConstraintCaseId: c.id,
    section: TASK_SECTIONS.ACTIVE_PLAN
  })));

  // 8. Weekly review readiness — a single task once the week is ready to analyse.
  if (readiness.level === "Ready" || readiness.level === "Mostly ready") {
    tasks.push(Task({
      id: "weekly-review-ready", type: "weekly-review", title: "Complete this week's constraint review",
      instruction: "All required data is present. Analyse the week and decide the next action.",
      reason: `Analysis readiness: ${readiness.level} (${readiness.pct}%).`, priority: "high", urgencyState: "due_today",
      destination: { route: "constraint", anchor: "completeWeeklyReviewBtn" }, section: TASK_SECTIONS.UPCOMING
    }));
  } else if (readiness.missing.length) {
    tasks.push(Task({
      id: "weekly-review-blocked", type: "weekly-review", title: "Weekly review not ready yet",
      instruction: "Repair the missing data above before this week's diagnosis will be reliable.",
      reason: `Analysis readiness: ${readiness.level} (${readiness.pct}%).`, priority: "normal", urgencyState: "waiting_for_data",
      destination: { route: "constraint", anchor: null }, dependencies: readiness.missing.map(m => `readiness-${m.id}`),
      section: TASK_SECTIONS.WAITING
    }));
  }

  // 9. Manual/user-created tasks (existing data.tasks CRUD) — folded in, not replaced.
  const todayISO = referenceDate.toLocaleDateString("en-CA");
  (data.tasks || []).filter(t => !t.completed).forEach(t => {
    const overdue = t.dueDate && t.dueDate < todayISO;
    const dueToday = t.dueDate === todayISO;
    tasks.push(Task({
      id: `manual-${t.id}`, type: "manual", title: t.title || t.description || "Task",
      instruction: t.description || t.title || "", reason: "Manually added task.",
      priority: overdue ? "high" : (t.priority === "high" ? "high" : t.priority === "low" ? "low" : "normal"),
      urgencyState: overdue ? "overdue" : (dueToday ? "due_today" : "upcoming"),
      destination: { route: "more", anchor: "tasksCard" }, sourceEntityType: "task", sourceEntityId: t.id,
      section: overdue ? TASK_SECTIONS.ACT_NOW : (dueToday ? TASK_SECTIONS.COMPLETE_TODAY : TASK_SECTIONS.UPCOMING)
    }));
  });

  return sortTasks(tasks);
}

function sortTasks(tasks) {
  return tasks.slice().sort((a, b) => {
    const pr = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
    if (pr) return pr;
    const sr = (SECTION_RANK[a.section] ?? 4) - (SECTION_RANK[b.section] ?? 4);
    if (sr) return sr;
    return a.title.localeCompare(b.title);
  });
}

/** Groups a task list into the 7 spec'd sections, in display order. */
export function groupTasksBySection(tasks) {
  const groups = {};
  Object.values(TASK_SECTIONS).forEach(s => { groups[s] = []; });
  tasks.forEach(t => { (groups[t.section] ||= []).push(t); });
  return groups;
}

/** Header summary: completion %, critical count, weekly-analysis blockers, top action. */
export function taskListSummary(tasks, completedTodayCount = 0, totalTodayCount = 0) {
  const criticalCount = tasks.filter(t => t.priority === "critical").length;
  const blockingCount = tasks.filter(t => t.blocksWeeklyAnalysis).length;
  const activePlanCount = tasks.filter(t => t.section === TASK_SECTIONS.ACTIVE_PLAN).length;
  return {
    todayCompletionPct: totalTodayCount ? Math.round((completedTodayCount / totalTodayCount) * 100) : 100,
    criticalCount, blockingCount, activePlanCount,
    topTask: tasks[0] || null
  };
}
