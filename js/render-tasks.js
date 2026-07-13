import { $, esc } from "./dom.js";
import { getData, saveData, uid } from "./data.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

export function renderTasks(data) {
  const listEl = $("taskList");
  const countEl = $("tasksOpenCount");
  if (!listEl) return;

  const todayISO = new Date().toLocaleDateString("en-CA");
  const open = (data.tasks || []).filter(t => !t.completed);
  const done = (data.tasks || []).filter(t => t.completed);
  if (countEl) countEl.textContent = `${open.length} open`;

  const sorted = open.slice().sort((a, b) => {
    const overdueDiff = (isOverdue(b, todayISO) ? 1 : 0) - (isOverdue(a, todayISO) ? 1 : 0);
    if (overdueDiff) return overdueDiff;
    return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
  });

  listEl.innerHTML = [
    ...sorted.map(t => taskRowHtml(t, todayISO)),
    ...done.slice(-5).reverse().map(t => taskRowHtml(t, todayISO))
  ].join("") || "<p class='small'>No tasks yet. Approved review action items will appear here automatically.</p>";
}

function isOverdue(t, todayISO) {
  return !t.completed && t.dueDate && t.dueDate < todayISO;
}

function taskRowHtml(t, todayISO) {
  const overdue = isOverdue(t, todayISO);
  return `
    <div class="checklist-row" data-task-id="${esc(t.id)}">
      <input type="checkbox" data-task-toggle="${esc(t.id)}" ${t.completed ? "checked" : ""} />
      <span class="${t.completed ? "small" : ""}">${esc(t.title || t.description || "Untitled task")}</span>
      <span class="badge ${overdue ? "status-under" : t.completed ? "status-on-target" : ""}">${overdue ? "Overdue" : t.completed ? "Done" : esc(t.priority || "medium")}</span>
    </div>`;
}

export function addTask() {
  const input = $("newTaskTitle");
  const title = input?.value.trim();
  if (!title) return;
  const data = getData();
  const now = new Date().toISOString();
  data.tasks.push({
    id: uid(), title, description: "", category: "general", priority: "medium",
    dueDate: null, completed: false, completedAt: null, source: "manual", relatedReviewId: null,
    createdAt: now, updatedAt: now
  });
  saveData(data);
  input.value = "";
  refreshAll();
}

export function toggleTaskComplete(id) {
  const data = getData();
  const task = (data.tasks || []).find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  task.updatedAt = new Date().toISOString();
  saveData(data);
  refreshAll();
}

export function setupTasksEventDelegation() {
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest("#addTaskBtn");
    if (addBtn) { addTask(); return; }
  });
  document.addEventListener("change", (e) => {
    const toggle = e.target.closest("[data-task-toggle]");
    if (toggle) { toggleTaskComplete(toggle.dataset.taskToggle); return; }
  });
  $("newTaskTitle")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); addTask(); }
  });
}
