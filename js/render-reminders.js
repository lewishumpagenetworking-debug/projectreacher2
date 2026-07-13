import { $, esc } from "./dom.js";
import { getData, saveData, uid } from "./data.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

const REPEAT_LABELS = {
  daily: "Every day",
  weekdays: "Weekdays (Mon-Fri)",
  weekends: "Weekends (Sat-Sun)",
  custom: "Custom days"
};
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Native browser notifications only fire while this tab is open — there is no service
// worker / background scheduling in this dependency-free static app. The interval below
// is the entire "scheduler"; duplicate-prevention is done by stamping lastFiredAt with
// today's date + the exact time slot that fired, so a slot never re-fires within the
// same minute-window or after the tab is left open past it.
let checkTimer = null;

export function startReminderScheduler() {
  if (checkTimer) return;
  checkTimer = setInterval(checkAndFireReminders, 30000);
  checkAndFireReminders();
}

function requestNotificationPermission() {
  if (!("Notification" in window)) return Promise.resolve("unsupported");
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Promise.resolve(Notification.permission);
  }
  return Notification.requestPermission();
}

function daysMatch(reminder, date) {
  const dow = date.getDay();
  if (reminder.repeatRule === "daily") return true;
  if (reminder.repeatRule === "weekdays") return dow >= 1 && dow <= 5;
  if (reminder.repeatRule === "weekends") return dow === 0 || dow === 6;
  if (reminder.repeatRule === "custom") return (reminder.daysOfWeek || []).includes(dow);
  return true;
}

function withinActiveWindow(reminder, todayISO) {
  if (reminder.startDate && todayISO < reminder.startDate) return false;
  if (reminder.endDate && todayISO > reminder.endDate) return false;
  return true;
}

function checkAndFireReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const data = getData();
  const now = new Date();
  const todayISO = now.toLocaleDateString("en-CA");
  const hhmm = now.toTimeString().slice(0, 5);
  let changed = false;

  (data.reminders || []).forEach(r => {
    if (!r.enabled || r.suggested) return;
    if (!daysMatch(r, now)) return;
    if (!withinActiveWindow(r, todayISO)) return;

    const times = [r.scheduledTime, ...(r.additionalTimes || [])].filter(Boolean);
    const dueTime = times.find(t => t === hhmm);
    if (!dueTime) return;

    const fireKey = `${todayISO}T${dueTime}`;
    if (r.lastFiredAt === fireKey) return; // duplicate-prevention: this exact slot already fired today

    new Notification(r.title || "Project Reacher reminder", {
      body: r.description || "Time for your scheduled reminder.",
      tag: r.id
    });
    r.lastFiredAt = fireKey;
    changed = true;
  });

  if (changed) saveData(data);
}

/** Reminders the app can suggest based on existing tracked habits — never auto-enabled, always opt-in. */
function computeSuggestedReminders(data) {
  const existingTitles = new Set((data.reminders || []).map(r => r.title));
  const suggestions = [];
  if (!existingTitles.has("Log pre-workout fuel")) {
    suggestions.push({ title: "Log pre-workout fuel", description: "Log your pre-workout meal before training.", scheduledTime: "16:30", repeatRule: "weekdays" });
  }
  if (!existingTitles.has("Log recovery & sleep")) {
    suggestions.push({ title: "Log recovery & sleep", description: "Log last night's sleep and today's recovery score.", scheduledTime: "09:00", repeatRule: "daily" });
  }
  if (!existingTitles.has("Weekly review")) {
    suggestions.push({ title: "Weekly review", description: "Generate or upload this week's review in the Review Centre.", scheduledTime: "18:00", repeatRule: "custom", daysOfWeek: [0] });
  }
  return suggestions;
}

export function renderReminders(data) {
  const listEl = $("reminderList");
  const suggestedEl = $("reminderSuggestions");
  const permissionEl = $("reminderPermissionStatus");
  if (!listEl) return;

  if (permissionEl) {
    const supported = "Notification" in window;
    const perm = supported ? Notification.permission : "unsupported";
    const label = !supported ? "Notifications aren't supported in this browser." :
      perm === "granted" ? "Notifications enabled." :
      perm === "denied" ? "Notifications blocked — enable them in your browser's site settings to receive reminders." :
      "Notifications need your permission to fire.";
    const cls = perm === "granted" ? "status-success" : perm === "denied" ? "status-error" : "status-info";
    permissionEl.innerHTML = `<div class="status-banner ${cls}"><span class="status-icon">${perm === "granted" ? "✅" : perm === "denied" ? "🔴" : "🔵"}</span><span>${esc(label)}</span></div>` +
      (supported && perm === "default" ? `<button type="button" class="secondary" id="enableNotificationsBtn">Enable Notifications</button>` : "");
  }

  const active = (data.reminders || []).filter(r => !r.suggested);
  listEl.innerHTML = active.length
    ? active.map(reminderRowHtml).join("")
    : "<p class='small'>No reminders yet. Add one below, or accept a suggestion.</p>";

  if (suggestedEl) {
    const suggestions = computeSuggestedReminders(data);
    suggestedEl.innerHTML = suggestions.length
      ? suggestions.map(s => `
        <div class="checklist-row">
          <span>💡</span><span>${esc(s.title)} <span class="small">(${esc(REPEAT_LABELS[s.repeatRule])} at ${esc(s.scheduledTime)})</span></span>
          <button type="button" class="secondary" data-accept-suggestion='${esc(JSON.stringify(s))}'>Add</button>
        </div>`).join("")
      : "<p class='small'>No suggestions right now.</p>";
  }
}

function reminderRowHtml(r) {
  const scheduleLine = r.repeatRule === "custom"
    ? `${(r.daysOfWeek || []).map(d => DAY_LABELS[d]).join(", ") || "No days set"} at ${esc(r.scheduledTime)}`
    : `${esc(REPEAT_LABELS[r.repeatRule] || r.repeatRule)} at ${esc(r.scheduledTime)}`;
  const extraTimes = (r.additionalTimes || []).length ? ` + ${r.additionalTimes.length} more time(s)/day` : "";
  return `
    <details class="history-item expandable-card">
      <summary><strong>${esc(r.title || "Untitled reminder")}</strong> · ${scheduleLine}${extraTimes} <span class="badge ${r.enabled ? "status-on-target" : ""}">${r.enabled ? "On" : "Off"}</span></summary>
      ${r.description ? `<p class="small">${esc(r.description)}</p>` : ""}
      <div class="actions">
        <button type="button" class="secondary" data-toggle-reminder="${esc(r.id)}">${r.enabled ? "Turn Off" : "Turn On"}</button>
        <button type="button" class="danger" data-delete-reminder="${esc(r.id)}">Delete</button>
      </div>
    </details>`;
}

export function addReminder() {
  const title = $("reminderTitle")?.value.trim();
  if (!title) { alert("Give the reminder a title."); return; }
  const scheduledTime = $("reminderTime")?.value || "09:00";
  const repeatRule = $("reminderRepeat")?.value || "daily";
  const daysOfWeek = [...document.querySelectorAll(".reminder-day-check:checked")].map(cb => Number(cb.value));
  const description = $("reminderDescription")?.value.trim() || "";

  const data = getData();
  // Duplicate-prevention: same title + same time + same repeat rule is treated as the same reminder.
  const isDuplicate = (data.reminders || []).some(r =>
    !r.suggested && r.title === title && r.scheduledTime === scheduledTime && r.repeatRule === repeatRule);
  if (isDuplicate) { alert("A reminder with this title, time and repeat schedule already exists."); return; }

  const now = new Date().toISOString();
  data.reminders.push({
    id: uid(), title, description, relatedEntityType: null, relatedEntityId: null,
    scheduledTime, repeatRule, daysOfWeek: repeatRule === "custom" ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
    timesPerDay: 1, additionalTimes: [], startDate: null, endDate: null,
    enabled: true, notificationIdentifier: null, lastFiredAt: null, suggested: false,
    createdAt: now, updatedAt: now
  });
  saveData(data);
  requestNotificationPermission();

  ["reminderTitle", "reminderDescription"].forEach(id => { if ($(id)) $(id).value = ""; });
  document.querySelectorAll(".reminder-day-check").forEach(cb => cb.checked = false);
  refreshAll();
}

export function toggleReminder(id) {
  const data = getData();
  const r = (data.reminders || []).find(x => x.id === id);
  if (!r) return;
  r.enabled = !r.enabled;
  r.updatedAt = new Date().toISOString();
  saveData(data);
  refreshAll();
}

export function deleteReminder(id) {
  const data = getData();
  data.reminders = (data.reminders || []).filter(r => r.id !== id);
  saveData(data);
  refreshAll();
}

function acceptSuggestion(suggestionJson) {
  const s = JSON.parse(suggestionJson);
  const data = getData();
  const isDuplicate = (data.reminders || []).some(r => !r.suggested && r.title === s.title);
  if (isDuplicate) { refreshAll(); return; }
  const now = new Date().toISOString();
  data.reminders.push({
    id: uid(), title: s.title, description: s.description || "", relatedEntityType: null, relatedEntityId: null,
    scheduledTime: s.scheduledTime, repeatRule: s.repeatRule, daysOfWeek: s.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
    timesPerDay: 1, additionalTimes: [], startDate: null, endDate: null,
    enabled: true, notificationIdentifier: null, lastFiredAt: null, suggested: false,
    createdAt: now, updatedAt: now
  });
  saveData(data);
  requestNotificationPermission();
  refreshAll();
}

export function setupRemindersEventDelegation() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("#addReminderBtn")) { addReminder(); return; }
    if (e.target.closest("#enableNotificationsBtn")) { requestNotificationPermission().then(() => renderReminders(getData())); return; }
    const toggleBtn = e.target.closest("[data-toggle-reminder]");
    if (toggleBtn) { toggleReminder(toggleBtn.dataset.toggleReminder); return; }
    const deleteBtn = e.target.closest("[data-delete-reminder]");
    if (deleteBtn) { deleteReminder(deleteBtn.dataset.deleteReminder); return; }
    const acceptBtn = e.target.closest("[data-accept-suggestion]");
    if (acceptBtn) { acceptSuggestion(acceptBtn.dataset.acceptSuggestion); return; }
  });
  $("reminderRepeat")?.addEventListener("change", (e) => {
    const customRow = $("reminderCustomDays");
    if (customRow) customRow.hidden = e.target.value !== "custom";
  });
}
