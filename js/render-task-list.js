// Global Task List UI (spec sections 3+6) and small page-level task widgets (spec section 7).
// Reuses the app-wide data-goto-tab/data-goto-anchor deep-link primitive already handled by
// the delegated click listener in js/render-meals.js — no new navigation mechanism needed.
import { $, esc } from "./dom.js";
import { generateProgressTasks, groupTasksBySection, taskListSummary, TASK_SECTIONS, TASK_SECTION_LABELS } from "./task-engine.js";

const OPEN_BY_DEFAULT = new Set([TASK_SECTIONS.ACT_NOW, TASK_SECTIONS.COMPLETE_TODAY, TASK_SECTIONS.PROTECT_WEEK, TASK_SECTIONS.ACTIVE_PLAN]);

const PRIORITY_BADGE_CLASS = { critical: "status-under", high: "status-under", normal: "", low: "" };

function taskRowHtml(t) {
  return `
    <div class="checklist-row deep-link-row" data-goto-tab="${esc(t.destination.route)}" ${t.destination.anchor ? `data-goto-anchor="${esc(t.destination.anchor)}"` : ""}>
      <span class="badge ${PRIORITY_BADGE_CLASS[t.priority] || ""}">${esc(t.priority)}</span>
      <div class="attention-body">
        <div class="attention-title">${esc(t.title)}</div>
        <div class="attention-detail">${esc(t.reason || t.instruction)}</div>
      </div>
    </div>`;
}

function sectionHtml(sectionKey, tasks) {
  if (!tasks.length) return "";
  return `
    <details class="category-section" ${OPEN_BY_DEFAULT.has(sectionKey) ? "open" : ""}>
      <summary><strong>${esc(TASK_SECTION_LABELS[sectionKey])}</strong> <span class="badge">${tasks.length}</span></summary>
      ${tasks.map(taskRowHtml).join("")}
    </details>`;
}

export function renderProgressTaskList(data, referenceDate = new Date()) {
  const summaryEl = $("progressTaskSummary");
  const sectionsEl = $("progressTaskSections");
  if (!summaryEl || !sectionsEl) return;

  const tasks = generateProgressTasks(data, referenceDate);
  const grouped = groupTasksBySection(tasks);
  const todayTasks = [...grouped[TASK_SECTIONS.ACT_NOW], ...grouped[TASK_SECTIONS.COMPLETE_TODAY]];
  const summary = taskListSummary(tasks, 0, todayTasks.length);

  summaryEl.innerHTML = `
    <div class="badge-row">
      <span class="badge ${summary.criticalCount ? "status-under" : ""}">${summary.criticalCount} critical</span>
      <span class="badge ${summary.blockingCount ? "status-under" : ""}">${summary.blockingCount} blocking weekly analysis</span>
      <span class="badge ${summary.activePlanCount ? "status-on-target" : ""}">${summary.activePlanCount} active plan action(s)</span>
    </div>
    ${summary.topTask ? `
      <div class="next-objective-card deep-link-row" data-goto-tab="${esc(summary.topTask.destination.route)}" ${summary.topTask.destination.anchor ? `data-goto-anchor="${esc(summary.topTask.destination.anchor)}"` : ""}>
        <p class="mission-tag">Highest-priority next action</p>
        <p class="small">${esc(summary.topTask.title)}</p>
      </div>` : `<div class="ok-banner">Nothing outstanding right now.</div>`}`;

  sectionsEl.innerHTML = [
    TASK_SECTIONS.ACT_NOW, TASK_SECTIONS.COMPLETE_TODAY, TASK_SECTIONS.PROTECT_WEEK,
    TASK_SECTIONS.ACTIVE_PLAN, TASK_SECTIONS.UPCOMING, TASK_SECTIONS.WAITING
  ].map(key => sectionHtml(key, grouped[key])).join("") || "<p class='small'>All caught up — nothing outstanding.</p>";
}

/**
 * A small page-level task widget: the subset of the SAME global task list relevant to one
 * page, filtered by destination route. Never a separate/duplicate task source — this is the
 * one ProgressTask engine, just scoped down. Used on Train/Nutrition/Body/Recovery per spec
 * section 7; no-ops if the target container doesn't exist on this page.
 */
export function renderPageTasks(data, routeKey, containerId, referenceDate = new Date()) {
  const el = $(containerId);
  if (!el) return;
  const tasks = generateProgressTasks(data, referenceDate).filter(t => t.destination.route === routeKey);
  if (!tasks.length) { el.innerHTML = ""; el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `
    <div class="status-banner status-info"><span class="status-icon">🔵</span><span>${tasks.length} task(s) on this page need attention.</span></div>
    ${tasks.map(taskRowHtml).join("")}`;
}
