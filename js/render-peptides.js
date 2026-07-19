// Peptide Recovery Tracking UI (Phase 1). Reuses the CRUD/calculation helpers in
// js/peptides.js — this file is presentation + interaction only, mirroring the
// Custom Session Builder's modal pattern (js/render-custom-sessions.js) since this
// app has no real routing: a peptide's "dedicated page" (spec section 5) is a
// bottom-sheet modal with its own internal section switcher instead of a URL route.
import { $, esc } from "./dom.js";
import { getData, saveData } from "./data.js";
import {
  ADMIN_LOG_STATUSES, ADMIN_LOG_STATUS_LABELS,
  AMOUNT_UNITS, TIME_CATEGORIES, TIME_CATEGORY_LABELS, STATUS_LABELS,
  WORKOUT_RELATIONSHIPS, WORKOUT_RELATIONSHIP_LABELS, MEAL_RELATIONSHIPS, MEAL_RELATIONSHIP_LABELS,
  getPeptideRecord, createPeptideRecord, updatePeptideRecord, deletePeptideRecord, duplicatePeptideAsDraft,
  getSchedulesForPeptide, createAdministrationSchedule, updateAdministrationSchedule, deleteAdministrationSchedule,
  getLogsForPeptide, createAdministrationLog, updateAdministrationLog, deleteAdministrationLog,
  cycleProgress, formatDurationLabel, computeDisplayStatus, displayStatusLabel,
  adherencePct, nextScheduledAdministration, todaysAdministrationState, cycleTotals
} from "./peptides.js";
import { getReportsForPeptide, reportsByCyclePhase, CYCLE_PHASES, CYCLE_PHASE_LABELS } from "./bloodwork.js";
import { openBloodworkReport } from "./render-bloodwork.js";
import { COMPARISON_WINDOWS, COMPARISON_WINDOW_LABELS, buildCorrelationReport } from "./peptide-correlation.js";
import {
  VIAL_STATUSES, VIAL_STATUS_LABELS,
  getSourcesForPeptide, createPeptideSource, updatePeptideSource, deletePeptideSource,
  getVialsForPeptide, createVialRecord, updateVialRecord, deleteVialRecord,
  getEquipmentProfiles, createEquipmentProfile, deleteEquipmentProfile
} from "./peptide-product.js";
import {
  REFERENCE_SOURCE_TYPES, REFERENCE_SOURCE_TYPE_LABELS, EXTERNAL_REFERENCE_LABEL,
  getReferencesForPeptide, createReferenceSource, updateReferenceSource, deleteReferenceSource
} from "./peptide-references.js";
import { recordFieldChanges, getHistoryFor } from "./change-history.js";
import { exportPeptideAsJson, exportPeptideAsMarkdown } from "./peptide-export.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ==================== MAIN LIST (Recovery tab #peptidesCard) ====================

export function renderPeptidesList(data) {
  const el = $("peptidesList");
  if (!el) return;
  const referenceDate = new Date();

  const filterSelect = $("peptideStatusFilter");
  if (filterSelect && filterSelect.options.length <= 1) {
    filterSelect.innerHTML = `<option value="">All statuses</option>` +
      Object.entries(STATUS_LABELS).map(([v, label]) => `<option value="${esc(v)}">${esc(label)}</option>`).join("");
  }

  const search = ($("peptideSearchInput")?.value || "").trim().toLowerCase();
  const statusFilter = $("peptideStatusFilter")?.value || "";
  const sortBy = $("peptideSortSelect")?.value || "recentlyUpdated";

  let records = (data.peptideRecords || []).filter(p => p.status !== "draft" || p.name || p.startDate);
  if (search) records = records.filter(p => (p.name || "").toLowerCase().includes(search));
  if (statusFilter) records = records.filter(p => computeDisplayStatus(p, referenceDate) === statusFilter);

  records = records.slice().sort((a, b) => {
    if (sortBy === "startDate") return (b.startDate || "").localeCompare(a.startDate || "");
    if (sortBy === "endDate") return (b.plannedEndDate || "").localeCompare(a.plannedEndDate || "");
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });

  if (!records.length) {
    el.innerHTML = "<p class='small'>No peptide records added. Create a record to track a user-defined cycle, administrations, bloodwork, and performance data.</p>";
    return;
  }

  const schedules = data.administrationSchedules || [];
  const logs = data.administrationLogs || [];

  el.innerHTML = records.map(p => {
    const progress = cycleProgress(p, referenceDate);
    const today = todaysAdministrationState(p.id, schedules, logs, referenceDate);
    const cycleAdherence = p.startDate ? adherencePct(p.id, schedules, logs, new Date(p.startDate), referenceDate, referenceDate) : null;
    return `
      <details class="history-item expandable-card peptide-card">
        <summary>
          <strong>${esc(p.name || "Untitled peptide")}</strong>
          <span class="small">${p.startDate ? esc(p.startDate) : "--"} – ${p.plannedEndDate ? esc(p.plannedEndDate) : "--"}</span>
          <span class="badge">${esc(displayStatusLabel(p, referenceDate))}${progress.daysRemaining != null && progress.daysRemaining >= 0 ? ` · ${esc(formatDurationLabel(progress.daysRemaining))} remaining` : ""}</span>
        </summary>
        <div class="badge-row">
          ${cycleAdherence != null ? `<span class="badge">Adherence ${cycleAdherence}%</span>` : ""}
          ${today.scheduledToday ? `<span class="badge ${today.hasLoggedToday ? "status-on-target" : "status-under"}">${today.hasLoggedToday ? "Logged today" : "Due today"}</span>` : ""}
        </div>
        <div class="actions">
          <button type="button" data-peptide-open="${esc(p.id)}">Open</button>
          <button type="button" class="secondary" data-peptide-duplicate="${esc(p.id)}">Duplicate as Draft</button>
          <button type="button" class="danger" data-peptide-delete="${esc(p.id)}">Delete</button>
        </div>
      </details>`;
  }).join("");
}

export function renderEquipmentProfiles(data) {
  const el = $("equipmentProfilesList");
  if (!el) return;
  const profiles = getEquipmentProfiles(data);
  el.innerHTML = profiles.length ? profiles.map(p => `
    <div class="history-item">
      <strong>${esc(p.name || "Profile")}</strong>
      <p class="small">${[p.syringeType, p.needleLength, p.needleGauge, p.brand].filter(Boolean).map(esc).join(" · ")}</p>
      <div class="actions"><button type="button" class="danger" data-equipment-delete="${esc(p.id)}">Delete</button></div>
    </div>`).join("") : "<p class='small'>No equipment profiles yet.</p>";
}

// ==================== DEDICATED PAGE (modal) ====================

let pageState = null; // { peptideId, section, editingScheduleId, editingLogId, correlationWindow, editingSourceId, editingVialId, editingReferenceId }
const SECTIONS = [
  ["overview", "Overview"], ["cycle", "Cycle"], ["schedule", "Administration Schedule"],
  ["log", "Administration Log"], ["bloodwork", "Bloodwork"], ["correlations", "Correlations"],
  ["product", "Product & Vials"], ["references", "Sources & References"], ["history", "Change History"], ["notes", "Notes"]
];

export function openPeptidePage(id) {
  const data = getData();
  let peptideId = id;
  if (!peptideId) {
    const record = createPeptideRecord(data, {});
    saveData(data);
    peptideId = record.id;
  }
  pageState = {
    peptideId, section: "overview", editingScheduleId: null, editingLogId: null, correlationWindow: "active_cycle",
    editingSourceId: null, editingVialId: null, editingReferenceId: null
  };
  renderPeptidePage();
  $("peptideBackdrop").hidden = false;
  $("peptideModal").hidden = false;
}

function closePeptidePage() {
  pageState = null;
  $("peptideBackdrop").hidden = true;
  $("peptideModal").hidden = true;
  refreshAll();
}

function optionsHtml(values, labels, current) {
  return `<option value="">--</option>` + values.map(v => `<option value="${esc(v)}" ${current === v ? "selected" : ""}>${esc(labels[v] || v)}</option>`).join("");
}

function overviewSectionHtml(data, record, referenceDate) {
  const totals = cycleTotals(record, data.administrationSchedules || [], data.administrationLogs || [], referenceDate);
  const progress = cycleProgress(record, referenceDate);
  const amountLine = Object.entries(totals.byUnit).map(([unit, amt]) => `${amt}${unit}`).join(", ") || "0";
  const latestReport = getReportsForPeptide(data, record.id)[0];
  const latestBloodwork = latestReport ? (latestReport.testDate || "Date not set") : "No bloodwork linked yet";
  return `
    <div class="history-item">
      <p>Peptide: <strong>${esc(record.name || "Untitled")}</strong></p>
      <p>Status: <strong>${esc(displayStatusLabel(record, referenceDate))}</strong></p>
      <p>Cycle Started: ${record.startDate ? esc(record.startDate) : "Not set"}</p>
      <p>Planned Finish: ${record.plannedEndDate ? esc(record.plannedEndDate) : "Not set"}</p>
      ${record.actualEndDate ? `<p>Actual Finish: ${esc(record.actualEndDate)}</p>` : ""}
      <p>Time Remaining: ${progress.daysRemaining != null ? esc(formatDurationLabel(Math.max(0, progress.daysRemaining))) : "--"}</p>
      <p>Cycle Progress: ${progress.pct != null ? `${progress.pct}%` : "--"}</p>
      <p>Administrations Logged: ${totals.count}</p>
      <p>Total Logged Amount: ${esc(amountLine)}</p>
      <p>Adherence: ${totals.adherencePct != null ? `${totals.adherencePct}%` : "No schedule set yet"}</p>
      <p>Latest Bloodwork Upload: ${esc(latestBloodwork)}</p>
      <p class="small" style="opacity:.7">Total logged amount only counts completed administrations — future scheduled entries are never included.</p>
    </div>
    <div class="actions">
      ${record.status !== "paused" ? `<button type="button" class="secondary" data-peptide-set-status="paused">Pause</button>` : `<button type="button" class="secondary" data-peptide-set-status="active">Resume</button>`}
      <button type="button" class="secondary" data-peptide-complete>Complete Cycle</button>
      <button type="button" class="secondary" data-peptide-set-status="archived">Archive</button>
      <button type="button" class="danger" data-peptide-set-status="cancelled">Cancel</button>
    </div>
    <div class="actions">
      <button type="button" class="secondary" data-peptide-export-json>Export as JSON</button>
      <button type="button" class="secondary" data-peptide-export-markdown>Export as Markdown</button>
    </div>`;
}

function cycleSectionHtml(record) {
  return `
    <div class="form-grid">
      <label>Peptide Name <input type="text" id="pdName" value="${esc(record.name || "")}"></label>
      <label>Abbreviation <input type="text" id="pdAbbreviation" value="${esc(record.abbreviation || "")}"></label>
      <label>Cycle Label <input type="text" id="pdCycleLabel" value="${esc(record.cycleLabel || "")}"></label>
      <label>Cycle Start Date <input type="date" id="pdStartDate" value="${esc(record.startDate || "")}"></label>
      <label>Planned Cycle End Date <input type="date" id="pdPlannedEndDate" value="${esc(record.plannedEndDate || "")}"></label>
      <label>Actual Cycle End Date <input type="date" id="pdActualEndDate" value="${esc(record.actualEndDate || "")}"></label>
      <label>Recovery/Time-Off Start Date <input type="date" id="pdRecoveryStartDate" value="${esc(record.recoveryStartDate || "")}"></label>
      <label>Recovery/Time-Off End Date <input type="date" id="pdRecoveryEndDate" value="${esc(record.recoveryEndDate || "")}"></label>
      <label>Pause Date <input type="date" id="pdPauseDate" value="${esc(record.pauseDate || "")}"></label>
      <label>Resume Date <input type="date" id="pdResumeDate" value="${esc(record.resumeDate || "")}"></label>
    </div>
    <label class="small">Purpose / Reason for Tracking <textarea id="pdPurposeNote">${esc(record.purposeNote || "")}</textarea></label>
    <label class="small">Reason for Pause <textarea id="pdReasonForPause">${esc(record.reasonForPause || "")}</textarea></label>
    <label class="small">Reason for Early Completion <textarea id="pdReasonForEarlyCompletion">${esc(record.reasonForEarlyCompletion || "")}</textarea></label>
    <label class="small">Recovery-Period Notes <textarea id="pdRecoveryNotes">${esc(record.recoveryNotes || "")}</textarea></label>
    <label class="small">Cycle Notes <textarea id="pdCycleNotes">${esc(record.cycleNotes || "")}</textarea></label>
    <label class="checklist-row"><input type="checkbox" id="pdDashboardHidden" ${record.dashboardHidden ? "checked" : ""}> <span>Hide this peptide's widget from the main dashboard</span></label>
    <div class="actions"><button type="button" id="pdSaveCycleBtn">Save Cycle Details</button></div>
    <p class="small" style="opacity:.7">The app does not calculate or suggest an appropriate cycle length — every date above is entered by you.</p>`;
}

function scheduleRowHtml(s) {
  const days = (s.weekdays && s.weekdays.length === 7) ? "Every day" : (s.weekdays || []).map(d => DAY_LABELS[d]).join(", ");
  return `
    <div class="history-item">
      <strong>${esc(s.name || "Schedule")}</strong> · ${esc(days || "No days set")}${s.plannedTime ? ` at ${esc(s.plannedTime)}` : ""}
      <p class="small">${s.plannedAmount != null ? `${esc(String(s.plannedAmount))}${esc(s.plannedAmountUnit || "")}` : "Amount not set"}${s.timeCategory ? ` · ${esc(TIME_CATEGORY_LABELS[s.timeCategory] || s.timeCategory)}` : ""}${s.mealRelationship ? ` · ${esc(MEAL_RELATIONSHIP_LABELS[s.mealRelationship] || s.mealRelationship)}` : ""}${s.workoutRelationship ? ` · ${esc(WORKOUT_RELATIONSHIP_LABELS[s.workoutRelationship] || s.workoutRelationship)}` : ""}</p>
      ${s.notes ? `<p class="small">${esc(s.notes)}</p>` : ""}
      <div class="actions">
        <button type="button" class="secondary" data-peptide-edit-schedule="${esc(s.id)}">Edit</button>
        <button type="button" class="danger" data-peptide-delete-schedule="${esc(s.id)}">Delete</button>
      </div>
    </div>`;
}

function scheduleFormHtml(editing) {
  const s = editing || { name: "", activeFrom: null, activeUntil: null, weekdays: [0, 1, 2, 3, 4, 5, 6], plannedTime: null, timeCategory: null, mealRelationship: null, workoutRelationship: null, plannedAmount: null, plannedAmountUnit: "mcg", reminderEnabled: false, notes: "" };
  const weekdaySet = new Set(s.weekdays || []);
  return `
    <div class="history-item">
      <h4>${editing ? "Edit Schedule" : "Add Schedule"}</h4>
      <div class="form-grid">
        <label>Schedule Name <input type="text" id="psName" value="${esc(s.name || "")}"></label>
        <label>Active From <input type="date" id="psActiveFrom" value="${esc(s.activeFrom || "")}"></label>
        <label>Active Until <input type="date" id="psActiveUntil" value="${esc(s.activeUntil || "")}"></label>
        <label>Planned Time <input type="time" id="psPlannedTime" value="${esc(s.plannedTime || "")}"></label>
        <label>Time Category <select id="psTimeCategory">${optionsHtml(TIME_CATEGORIES, TIME_CATEGORY_LABELS, s.timeCategory)}</select></label>
        <label>Meal Relationship <select id="psMealRelationship">${optionsHtml(MEAL_RELATIONSHIPS, MEAL_RELATIONSHIP_LABELS, s.mealRelationship)}</select></label>
        <label>Workout Relationship <select id="psWorkoutRelationship">${optionsHtml(WORKOUT_RELATIONSHIPS, WORKOUT_RELATIONSHIP_LABELS, s.workoutRelationship)}</select></label>
        <label>Planned Amount <input type="number" step="any" id="psPlannedAmount" value="${s.plannedAmount ?? ""}"></label>
        <label>Amount Unit <select id="psPlannedAmountUnit">${AMOUNT_UNITS.map(u => `<option value="${esc(u)}" ${s.plannedAmountUnit === u ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></label>
      </div>
      <p class="small">Active Days</p>
      <div class="checklist-row-group">
        ${DAY_LABELS.map((label, i) => `<label class="checklist-row"><input type="checkbox" class="psWeekday" value="${i}" ${weekdaySet.has(i) ? "checked" : ""}> <span>${label}</span></label>`).join("")}
      </div>
      <label class="checklist-row"><input type="checkbox" id="psReminderEnabled" ${s.reminderEnabled ? "checked" : ""}> <span>Suggest a reminder for this schedule</span></label>
      <label class="small">Notes <textarea id="psNotes">${esc(s.notes || "")}</textarea></label>
      <div class="actions">
        <button type="button" id="psSaveBtn">${editing ? "Save Schedule" : "Add Schedule"}</button>
        ${editing ? `<button type="button" class="secondary" id="psCancelEditBtn">Cancel</button>` : ""}
      </div>
      <p class="small" style="opacity:.7">The app does not determine optimal timing, dose, or technique — every field above is your own entry.</p>
    </div>`;
}

function scheduleSectionHtml(data, record) {
  const schedules = getSchedulesForPeptide(data, record.id);
  const editing = pageState.editingScheduleId ? schedules.find(s => s.id === pageState.editingScheduleId) : null;
  return `
    ${schedules.length ? schedules.map(scheduleRowHtml).join("") : "<p class='small'>No schedule has been created for this record.</p>"}
    ${scheduleFormHtml(editing)}`;
}

function logRowHtml(l) {
  return `
    <div class="history-item">
      <strong>${esc(l.date || "")}</strong>${l.exactTime ? ` ${esc(l.exactTime)}` : ""} · <span class="badge">${esc(ADMIN_LOG_STATUS_LABELS[l.status] || l.status)}</span>
      ${l.amount != null ? ` · ${esc(String(l.amount))}${esc(l.amountUnit || "")}` : ""}
      ${l.notes ? `<p class="small">${esc(l.notes)}</p>` : ""}
      <div class="actions">
        <button type="button" class="secondary" data-peptide-edit-log="${esc(l.id)}">Edit</button>
        <button type="button" class="danger" data-peptide-delete-log="${esc(l.id)}">Delete</button>
      </div>
    </div>`;
}

function logFormHtml(editing, referenceDate, vials, equipmentProfiles) {
  const l = editing || { date: referenceDate.toLocaleDateString("en-CA"), exactTime: null, status: "taken", amount: null, amountUnit: "mcg", timeCategory: null, mealRelationship: null, workoutRelationship: null, bodyweight: null, notes: "", vialId: null, equipmentProfileId: null, needleLength: "", needleGauge: "", administrationSite: "" };
  return `
    <div class="history-item">
      <h4>${editing ? "Edit Administration" : "Log Administration"}</h4>
      <div class="form-grid">
        <label>Date <input type="date" id="plDate" value="${esc(l.date || "")}"></label>
        <label>Exact Time <input type="time" id="plExactTime" value="${esc(l.exactTime || "")}"></label>
        <label>Status <select id="plStatus">${ADMIN_LOG_STATUSES.map(s => `<option value="${esc(s)}" ${l.status === s ? "selected" : ""}>${esc(ADMIN_LOG_STATUS_LABELS[s])}</option>`).join("")}</select></label>
        <label>Amount <input type="number" step="any" id="plAmount" value="${l.amount ?? ""}"></label>
        <label>Amount Unit <select id="plAmountUnit">${AMOUNT_UNITS.map(u => `<option value="${esc(u)}" ${l.amountUnit === u ? "selected" : ""}>${esc(u)}</option>`).join("")}</select></label>
        <label>Time Category <select id="plTimeCategory">${optionsHtml(TIME_CATEGORIES, TIME_CATEGORY_LABELS, l.timeCategory)}</select></label>
        <label>Meal Relationship <select id="plMealRelationship">${optionsHtml(MEAL_RELATIONSHIPS, MEAL_RELATIONSHIP_LABELS, l.mealRelationship)}</select></label>
        <label>Workout Relationship <select id="plWorkoutRelationship">${optionsHtml(WORKOUT_RELATIONSHIPS, WORKOUT_RELATIONSHIP_LABELS, l.workoutRelationship)}</select></label>
        <label>Bodyweight at Log (optional) <input type="number" step="any" id="plBodyweight" value="${l.bodyweight ?? ""}"></label>
        <label>Vial Used <select id="plVialId"><option value="">--</option>${vials.map(v => `<option value="${esc(v.id)}" ${l.vialId === v.id ? "selected" : ""}>${esc(v.label || "Vial")}</option>`).join("")}</select></label>
        <label>Equipment Profile <select id="plEquipmentProfileId"><option value="">--</option>${equipmentProfiles.map(e => `<option value="${esc(e.id)}" ${l.equipmentProfileId === e.id ? "selected" : ""}>${esc(e.name || "Profile")}</option>`).join("")}</select></label>
        <label>Needle Length <input type="text" id="plNeedleLength" value="${esc(l.needleLength || "")}"></label>
        <label>Needle Gauge <input type="text" id="plNeedleGauge" value="${esc(l.needleGauge || "")}"></label>
        <label>Administration Site <input type="text" id="plAdministrationSite" value="${esc(l.administrationSite || "")}"></label>
      </div>
      <label class="small">Notes <textarea id="plNotes">${esc(l.notes || "")}</textarea></label>
      <div class="actions">
        <button type="button" id="plSaveBtn">${editing ? "Save Administration" : "Log Administration"}</button>
        ${editing ? `<button type="button" class="secondary" id="plCancelEditBtn">Cancel</button>` : ""}
      </div>
      <p class="small" style="opacity:.7">Missed and skipped entries are never counted in totals or adherence. The app does not recommend needle length/gauge, injection site, or syringe units — every field above is your own entry.</p>
    </div>`;
}

function logSectionHtml(data, record, referenceDate) {
  const logs = getLogsForPeptide(data, record.id).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.exactTime || "").localeCompare(a.exactTime || ""));
  const editing = pageState.editingLogId ? logs.find(l => l.id === pageState.editingLogId) : null;
  const next = nextScheduledAdministration(record.id, data.administrationSchedules || [], data.administrationLogs || [], referenceDate);
  return `
    ${next ? `<div class="status-banner status-info"><span class="status-icon">🔵</span><span>Next user-scheduled administration: ${esc(next.date)}${next.plannedTime ? ` at ${esc(next.plannedTime)}` : ""}.</span></div>` : ""}
    ${logFormHtml(editing, referenceDate, getVialsForPeptide(data, record.id), getEquipmentProfiles(data))}
    <h4>History</h4>
    ${logs.length ? logs.map(logRowHtml).join("") : "<p class='small'>No administrations logged yet.</p>"}`;
}

function bloodworkSectionHtml(data, record) {
  const reports = getReportsForPeptide(data, record.id);
  const groups = reportsByCyclePhase(reports);
  const body = reports.length
    ? CYCLE_PHASES.map(phase => groups[phase].length ? `
        <p class="small"><strong>${esc(CYCLE_PHASE_LABELS[phase])}</strong></p>
        ${groups[phase].map(r => `
          <div class="history-item">
            <strong>${esc(r.title || r.testDate || "Untitled report")}</strong>
            <p class="small">${r.testDate ? esc(r.testDate) : "No date set"}${r.laboratoryName ? ` · ${esc(r.laboratoryName)}` : ""}</p>
            <div class="actions"><button type="button" data-peptide-open-bloodwork="${esc(r.id)}">Open</button></div>
          </div>`).join("")}` : "").join("")
    : "<p class='small'>No bloodwork has been linked to this peptide.</p>";
  return `
    ${body}
    <div class="actions"><button type="button" data-peptide-add-bloodwork="${esc(record.id)}">+ Add Bloodwork for This Peptide</button></div>
    <p class="small" style="opacity:.7">The app may describe values as increased, decreased, stable, or inside/outside the laboratory-supplied reference range — it never diagnoses a condition.</p>`;
}

function metricValueLabel(key, value) {
  if (value == null) return "--";
  if (key === "sessionCompletionPct") return `${value}%`;
  if (key === "sleepDurationAvg") return `${value}h`;
  if (key === "trainingVolumeAvgPerWeek") return `${value} sets/wk`;
  if (key === "caloriesAvg") return `${value} kcal`;
  if (key === "proteinAvg") return `${value}g`;
  if (key === "bodyweightRateOfChange") return `${value >= 0 ? "+" : ""}${value}kg/wk`;
  return String(value);
}

function correlationsSectionHtml(data, record, referenceDate) {
  const windowType = pageState.correlationWindow || "active_cycle";
  const report = buildCorrelationReport(data, record, windowType, referenceDate);
  const picker = `
    <label class="small">Compare Window <select id="pcWindowSelect">
      ${COMPARISON_WINDOWS.map(w => `<option value="${esc(w)}" ${windowType === w ? "selected" : ""}>${esc(COMPARISON_WINDOW_LABELS[w])}</option>`).join("")}
    </select></label>
    <p class="small" style="opacity:.7">Compared against this peptide's own pre-cycle baseline (the period immediately before the cycle start date you entered).</p>`;

  if (report.insufficientData) {
    return `${picker}<p class="small">${esc(report.message)}</p>`;
  }

  const tableRows = report.comparison.map(c => `
    <div class="checklist-row">
      <span>${esc(c.label)}</span>
      <span class="small">${esc(metricValueLabel(c.key, c.baselineValue))} → ${esc(metricValueLabel(c.key, c.currentValue))}</span>
      <span class="badge">${esc(c.trend)}</span>
    </div>`).join("");

  return `
    ${picker}
    <p class="small">Baseline: ${esc(report.baseline.start)} – ${esc(report.baseline.end)} · Selected period: ${esc(report.current.start)} – ${esc(report.current.end)}</p>
    ${tableRows}
    <div class="status-banner status-info"><span class="status-icon">🔵</span><span>${report.narrative.map(esc).join(" ")}</span></div>`;
}

function sourceRowHtml(s) {
  return `
    <div class="history-item">
      <strong>${esc(s.supplierName || "Unnamed source")}</strong>${s.manufacturer ? ` · ${esc(s.manufacturer)}` : ""}
      <p class="small">${s.batchNumber ? `Batch ${esc(s.batchNumber)} · ` : ""}${s.lotNumber ? `Lot ${esc(s.lotNumber)} · ` : ""}${s.expiryDate ? `Expires ${esc(s.expiryDate)}` : ""}</p>
      ${s.notes ? `<p class="small">${esc(s.notes)}</p>` : ""}
      <div class="actions">
        <button type="button" class="secondary" data-peptide-edit-source="${esc(s.id)}">Edit</button>
        <button type="button" class="danger" data-peptide-delete-source="${esc(s.id)}">Delete</button>
      </div>
    </div>`;
}

function sourceFormHtml(editing) {
  const s = editing || { supplierName: "", manufacturer: "", productUrl: "", purchaseDate: "", orderReference: "", batchNumber: "", lotNumber: "", expiryDate: "", countryOfOrigin: "", storageLocation: "", storageTemperatureText: "", openedDate: "", discardedDate: "", notes: "" };
  return `
    <div class="history-item">
      <h4>${editing ? "Edit Source" : "Add Product / Source"}</h4>
      <div class="form-grid">
        <label>Supplier / Source Name <input type="text" id="psrSupplierName" value="${esc(s.supplierName || "")}"></label>
        <label>Manufacturer <input type="text" id="psrManufacturer" value="${esc(s.manufacturer || "")}"></label>
        <label>Product URL <input type="text" id="psrProductUrl" value="${esc(s.productUrl || "")}"></label>
        <label>Purchase Date <input type="date" id="psrPurchaseDate" value="${esc(s.purchaseDate || "")}"></label>
        <label>Order Reference <input type="text" id="psrOrderReference" value="${esc(s.orderReference || "")}"></label>
        <label>Batch Number <input type="text" id="psrBatchNumber" value="${esc(s.batchNumber || "")}"></label>
        <label>Lot Number <input type="text" id="psrLotNumber" value="${esc(s.lotNumber || "")}"></label>
        <label>Expiry Date <input type="date" id="psrExpiryDate" value="${esc(s.expiryDate || "")}"></label>
        <label>Country of Origin <input type="text" id="psrCountryOfOrigin" value="${esc(s.countryOfOrigin || "")}"></label>
        <label>Storage Location <input type="text" id="psrStorageLocation" value="${esc(s.storageLocation || "")}"></label>
        <label>Storage Temperature <input type="text" id="psrStorageTemperatureText" value="${esc(s.storageTemperatureText || "")}"></label>
        <label>Date Opened <input type="date" id="psrOpenedDate" value="${esc(s.openedDate || "")}"></label>
        <label>Date Discarded <input type="date" id="psrDiscardedDate" value="${esc(s.discardedDate || "")}"></label>
      </div>
      <label class="small">Quality Notes <textarea id="psrNotes">${esc(s.notes || "")}</textarea></label>
      <div class="actions">
        <button type="button" id="psrSaveBtn">${editing ? "Save Source" : "Add Source"}</button>
        ${editing ? `<button type="button" class="secondary" id="psrCancelEditBtn">Cancel</button>` : ""}
      </div>
      <p class="small" style="opacity:.7">The app does not validate or endorse this source.</p>
    </div>`;
}

function vialRowHtml(v) {
  return `
    <div class="history-item">
      <div class="section-title"><strong>${esc(v.label || "Vial")}</strong><span class="badge">${esc(VIAL_STATUS_LABELS[v.status] || v.status)}</span></div>
      <p class="small">${v.statedAmount != null ? `${esc(String(v.statedAmount))}${esc(v.statedAmountUnit || "")}` : "Amount not set"}${v.solutionVolume != null ? ` in ${esc(String(v.solutionVolume))}${esc(v.solutionVolumeUnit || "")}` : ""}</p>
      ${v.userEnteredConcentration != null ? `<p class="small"><span class="badge">User-entered record</span> ${esc(String(v.userEnteredConcentration))}${esc(v.concentrationUnit || "")}${v.userEnteredAmountPerSyringeUnit != null ? ` · ${esc(String(v.userEnteredAmountPerSyringeUnit))} per syringe unit` : ""}</p>` : ""}
      ${v.notes ? `<p class="small">${esc(v.notes)}</p>` : ""}
      <div class="actions">
        <button type="button" class="secondary" data-peptide-edit-vial="${esc(v.id)}">Edit</button>
        <button type="button" class="danger" data-peptide-delete-vial="${esc(v.id)}">Delete</button>
      </div>
    </div>`;
}

function vialFormHtml(editing) {
  const v = editing || { label: "", sequenceNumber: "", statedAmount: "", statedAmountUnit: "mcg", numberOfVials: "", status: "unopened", openedDate: "", discardedDate: "", solutionType: "", solutionBrand: "", solutionVolume: "", solutionVolumeUnit: "mL", preparationDate: "", preparedBy: "", preparationNotes: "", storageNotes: "", solutionExpiryOrDiscardDate: "", userEnteredConcentration: "", concentrationUnit: "", userEnteredAmountPerSyringeUnit: "", concentrationNotes: "", notes: "" };
  return `
    <div class="history-item">
      <h4>${editing ? "Edit Vial" : "Add Vial"}</h4>
      <div class="form-grid">
        <label>Vial Label <input type="text" id="pvLabel" value="${esc(v.label || "")}"></label>
        <label>Sequence Number <input type="number" id="pvSequenceNumber" value="${v.sequenceNumber ?? ""}"></label>
        <label>Stated Amount <input type="number" step="any" id="pvStatedAmount" value="${v.statedAmount ?? ""}"></label>
        <label>Amount Unit <select id="pvStatedAmountUnit"><option value="mcg" ${v.statedAmountUnit === "mcg" ? "selected" : ""}>mcg</option><option value="mg" ${v.statedAmountUnit === "mg" ? "selected" : ""}>mg</option><option value="g" ${v.statedAmountUnit === "g" ? "selected" : ""}>g</option><option value="IU" ${v.statedAmountUnit === "IU" ? "selected" : ""}>IU</option><option value="custom" ${v.statedAmountUnit === "custom" ? "selected" : ""}>custom</option></select></label>
        <label>Number of Vials <input type="number" id="pvNumberOfVials" value="${v.numberOfVials ?? ""}"></label>
        <label>Vial Status <select id="pvStatus">${VIAL_STATUSES.map(s => `<option value="${esc(s)}" ${v.status === s ? "selected" : ""}>${esc(VIAL_STATUS_LABELS[s])}</option>`).join("")}</select></label>
        <label>Vial Opened Date <input type="date" id="pvOpenedDate" value="${esc(v.openedDate || "")}"></label>
        <label>Vial Discarded Date <input type="date" id="pvDiscardedDate" value="${esc(v.discardedDate || "")}"></label>
        <label>Solution Type <input type="text" id="pvSolutionType" value="${esc(v.solutionType || "")}"></label>
        <label>Solution Brand <input type="text" id="pvSolutionBrand" value="${esc(v.solutionBrand || "")}"></label>
        <label>Volume Added <input type="number" step="any" id="pvSolutionVolume" value="${v.solutionVolume ?? ""}"></label>
        <label>Volume Unit <input type="text" id="pvSolutionVolumeUnit" value="${esc(v.solutionVolumeUnit || "mL")}"></label>
        <label>Preparation Date <input type="date" id="pvPreparationDate" value="${esc(v.preparationDate || "")}"></label>
        <label>Prepared By <input type="text" id="pvPreparedBy" value="${esc(v.preparedBy || "")}"></label>
        <label>Solution Expiry / Discard Date <input type="date" id="pvSolutionExpiryOrDiscardDate" value="${esc(v.solutionExpiryOrDiscardDate || "")}"></label>
      </div>
      <label class="small">Preparation Notes <textarea id="pvPreparationNotes">${esc(v.preparationNotes || "")}</textarea></label>
      <label class="small">Storage Notes <textarea id="pvStorageNotes">${esc(v.storageNotes || "")}</textarea></label>
      <p class="small"><span class="badge">User-entered record</span> The values below are a neutral record of numbers you have already determined — the app does not calculate or verify a concentration for you.</p>
      <div class="form-grid">
        <label>User-Entered Concentration <input type="number" step="any" id="pvUserEnteredConcentration" value="${v.userEnteredConcentration ?? ""}"></label>
        <label>Concentration Unit <input type="text" id="pvConcentrationUnit" value="${esc(v.concentrationUnit || "")}"></label>
        <label>Amount per Syringe Unit <input type="number" step="any" id="pvUserEnteredAmountPerSyringeUnit" value="${v.userEnteredAmountPerSyringeUnit ?? ""}"></label>
      </div>
      <label class="small">Notes on How This Value Was Obtained <textarea id="pvConcentrationNotes">${esc(v.concentrationNotes || "")}</textarea></label>
      <label class="small">General Notes <textarea id="pvNotes">${esc(v.notes || "")}</textarea></label>
      <div class="actions">
        <button type="button" id="pvSaveBtn">${editing ? "Save Vial" : "Add Vial"}</button>
        ${editing ? `<button type="button" class="secondary" id="pvCancelEditBtn">Cancel</button>` : ""}
      </div>
    </div>`;
}

function productSectionHtml(data, record) {
  const sources = getSourcesForPeptide(data, record.id);
  const editingSource = pageState.editingSourceId ? sources.find(s => s.id === pageState.editingSourceId) : null;
  const vials = getVialsForPeptide(data, record.id);
  const editingVial = pageState.editingVialId ? vials.find(v => v.id === pageState.editingVialId) : null;
  return `
    <h3>Product & Source</h3>
    ${sources.length ? sources.map(sourceRowHtml).join("") : "<p class='small'>No source recorded yet.</p>"}
    ${sourceFormHtml(editingSource)}
    <h3>Vial & Solution Record (${vials.length})</h3>
    ${vials.length ? vials.map(vialRowHtml).join("") : "<p class='small'>No vials recorded yet.</p>"}
    ${vialFormHtml(editingVial)}
    <p class="small" style="opacity:.7">Equipment profiles are managed on the main Peptides card and can be reused across records — select one when logging an administration.</p>`;
}

function referenceRowHtml(r) {
  return `
    <div class="history-item">
      <div class="section-title"><strong>${esc(r.title || "Untitled reference")}</strong><span class="badge">${esc(REFERENCE_SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType)}</span></div>
      <p class="small">${r.creator ? `${esc(r.creator)} · ` : ""}${r.publicationDate ? esc(r.publicationDate) : ""}${r.url ? ` · ${esc(r.url)}` : ""}</p>
      ${r.quotation ? `<p class="small">"${esc(r.quotation)}"</p>` : ""}
      ${r.summary ? `<p class="small">${esc(r.summary)}</p>` : ""}
      <p class="small" style="opacity:.7">${esc(EXTERNAL_REFERENCE_LABEL)}</p>
      <div class="actions">
        <button type="button" class="secondary" data-peptide-edit-reference="${esc(r.id)}">Edit</button>
        <button type="button" class="danger" data-peptide-delete-reference="${esc(r.id)}">Delete</button>
      </div>
    </div>`;
}

function referenceFormHtml(editing) {
  const r = editing || { sourceType: "other", creator: "", title: "", publicationDate: "", url: "", timestamp: "", dateAccessed: "", quotation: "", summary: "", notes: "" };
  return `
    <div class="history-item">
      <h4>${editing ? "Edit Reference" : "Add Reference"}</h4>
      <div class="form-grid">
        <label>Source Type <select id="prSourceType">${REFERENCE_SOURCE_TYPES.map(t => `<option value="${esc(t)}" ${r.sourceType === t ? "selected" : ""}>${esc(REFERENCE_SOURCE_TYPE_LABELS[t])}</option>`).join("")}</select></label>
        <label>Title <input type="text" id="prTitle" value="${esc(r.title || "")}"></label>
        <label>Author / Creator <input type="text" id="prCreator" value="${esc(r.creator || "")}"></label>
        <label>Publication Date <input type="date" id="prPublicationDate" value="${esc(r.publicationDate || "")}"></label>
        <label>URL <input type="text" id="prUrl" value="${esc(r.url || "")}"></label>
        <label>Timestamp <input type="text" id="prTimestamp" value="${esc(r.timestamp || "")}" placeholder="e.g. 12:34"></label>
        <label>Date Accessed <input type="date" id="prDateAccessed" value="${esc(r.dateAccessed || "")}"></label>
      </div>
      <label class="small">Direct Quotation <textarea id="prQuotation">${esc(r.quotation || "")}</textarea></label>
      <label class="small">Summary <textarea id="prSummary">${esc(r.summary || "")}</textarea></label>
      <label class="small">Notes <textarea id="prNotes">${esc(r.notes || "")}</textarea></label>
      <div class="actions">
        <button type="button" id="prSaveBtn">${editing ? "Save Reference" : "Add Reference"}</button>
        ${editing ? `<button type="button" class="secondary" id="prCancelEditBtn">Cancel</button>` : ""}
      </div>
      <p class="small" style="opacity:.7">${esc(EXTERNAL_REFERENCE_LABEL)}. This is stored as reference material only and never automatically populates your protocol above.</p>
    </div>`;
}

function referencesSectionHtml(data, record) {
  const references = getReferencesForPeptide(data, record.id);
  const editing = pageState.editingReferenceId ? references.find(r => r.id === pageState.editingReferenceId) : null;
  return `
    ${references.length ? references.map(referenceRowHtml).join("") : "<p class='small'>No references linked yet.</p>"}
    ${referenceFormHtml(editing)}`;
}

function historySectionHtml(data, record) {
  const recordHistory = getHistoryFor(data, "peptideRecord", record.id);
  const logHistory = (data.administrationLogs || [])
    .filter(l => l.peptideId === record.id)
    .flatMap(l => getHistoryFor(data, "administrationLog", l.id));
  const entries = [...recordHistory, ...logHistory].sort((a, b) => (b.changedAt || "").localeCompare(a.changedAt || ""));
  if (!entries.length) return "<p class='small'>No edits recorded yet — a history entry is created whenever a saved value is changed.</p>";
  return entries.map(h => `
    <div class="history-item">
      <p class="small"><strong>${esc(h.field)}</strong> changed ${esc((h.changedAt || "").slice(0, 10))}</p>
      <p class="small">${esc(h.previousValue == null ? "(empty)" : String(h.previousValue))} → ${esc(h.newValue == null ? "(empty)" : String(h.newValue))}</p>
      ${h.reason ? `<p class="small">Reason: ${esc(h.reason)}</p>` : ""}
    </div>`).join("");
}

function notesSectionHtml(record) {
  return `
    <label class="small">General Notes <textarea id="pdNotes">${esc(record.notes || "")}</textarea></label>
    <div class="actions"><button type="button" id="pdSaveNotesBtn">Save Notes</button></div>`;
}

function renderPeptidePage() {
  const content = $("peptideModalContent");
  if (!content || !pageState) return;
  const data = getData();
  const record = getPeptideRecord(data, pageState.peptideId);
  if (!record) { closePeptidePage(); return; }
  const referenceDate = new Date();

  const sectionHtml = pageState.section === "overview" ? overviewSectionHtml(data, record, referenceDate)
    : pageState.section === "cycle" ? cycleSectionHtml(record)
    : pageState.section === "schedule" ? scheduleSectionHtml(data, record)
    : pageState.section === "log" ? logSectionHtml(data, record, referenceDate)
    : pageState.section === "bloodwork" ? bloodworkSectionHtml(data, record)
    : pageState.section === "correlations" ? correlationsSectionHtml(data, record, referenceDate)
    : pageState.section === "product" ? productSectionHtml(data, record)
    : pageState.section === "references" ? referencesSectionHtml(data, record)
    : pageState.section === "history" ? historySectionHtml(data, record)
    : notesSectionHtml(record);

  content.innerHTML = `
    <div class="section-title">
      <h2 id="peptideTitle">${esc(record.name || "Untitled Peptide")}</h2>
      <button type="button" class="close-btn" id="peptideCloseBtn" aria-label="Close">&times;</button>
    </div>
    <div class="chart-type-toggle">
      ${SECTIONS.map(([key, label]) => `<button type="button" class="${pageState.section === key ? "active" : ""}" data-peptide-section="${key}">${esc(label)}</button>`).join("")}
    </div>
    <div id="peptideSectionContent">${sectionHtml}</div>
    <div class="actions"><button type="button" class="danger" data-peptide-delete="${esc(record.id)}">Delete Record</button></div>`;
}

// ==================== ACTIONS ====================

function handleSaveCycle() {
  const data = getData();
  const patch = {
    name: $("pdName")?.value.trim() || "", abbreviation: $("pdAbbreviation")?.value || "",
    cycleLabel: $("pdCycleLabel")?.value || "", purposeNote: $("pdPurposeNote")?.value || "",
    startDate: $("pdStartDate")?.value || null, plannedEndDate: $("pdPlannedEndDate")?.value || null,
    actualEndDate: $("pdActualEndDate")?.value || null,
    recoveryStartDate: $("pdRecoveryStartDate")?.value || null, recoveryEndDate: $("pdRecoveryEndDate")?.value || null,
    recoveryNotes: $("pdRecoveryNotes")?.value || "",
    pauseDate: $("pdPauseDate")?.value || null, resumeDate: $("pdResumeDate")?.value || null,
    reasonForPause: $("pdReasonForPause")?.value || "", reasonForEarlyCompletion: $("pdReasonForEarlyCompletion")?.value || "",
    cycleNotes: $("pdCycleNotes")?.value || "", dashboardHidden: $("pdDashboardHidden")?.checked ?? false
  };
  if (!patch.name) { alert("Give this peptide a name before saving."); return; }
  if (patch.plannedEndDate && patch.startDate && patch.plannedEndDate < patch.startDate) { alert("Planned end date cannot be before the start date."); return; }
  if (patch.actualEndDate && patch.startDate && patch.actualEndDate < patch.startDate) { alert("Actual end date cannot be before the start date."); return; }
  const record = getPeptideRecord(data, pageState.peptideId);
  const before = { ...record };
  if (record.status === "draft") patch.status = "active"; // first real save promotes the record out of draft
  updatePeptideRecord(data, pageState.peptideId, patch);
  recordFieldChanges(data, "peptideRecord", pageState.peptideId, before, patch);
  saveData(data);
  renderPeptidePage();
  refreshAll();
}

function handleSaveNotes() {
  const data = getData();
  updatePeptideRecord(data, pageState.peptideId, { notes: $("pdNotes")?.value || "" });
  saveData(data);
  refreshAll();
}

function handleSetStatus(status) {
  const data = getData();
  updatePeptideRecord(data, pageState.peptideId, { status });
  saveData(data);
  renderPeptidePage();
  refreshAll();
}

function handleCompleteCycle() {
  const data = getData();
  const today = new Date().toLocaleDateString("en-CA");
  updatePeptideRecord(data, pageState.peptideId, { status: "completed", actualEndDate: today });
  saveData(data);
  renderPeptidePage();
  refreshAll();
}

function readScheduleForm() {
  const weekdays = [...document.querySelectorAll(".psWeekday:checked")].map(cb => Number(cb.value));
  return {
    peptideId: pageState.peptideId,
    name: $("psName")?.value || "", activeFrom: $("psActiveFrom")?.value || null, activeUntil: $("psActiveUntil")?.value || null,
    weekdays, plannedTime: $("psPlannedTime")?.value || null, timeCategory: $("psTimeCategory")?.value || null,
    mealRelationship: $("psMealRelationship")?.value || null, workoutRelationship: $("psWorkoutRelationship")?.value || null,
    plannedAmount: $("psPlannedAmount")?.value === "" ? null : Number($("psPlannedAmount").value),
    plannedAmountUnit: $("psPlannedAmountUnit")?.value || "mcg",
    reminderEnabled: $("psReminderEnabled")?.checked ?? false, notes: $("psNotes")?.value || ""
  };
}

function handleSaveSchedule() {
  const data = getData();
  const fields = readScheduleForm();
  if (!fields.weekdays.length) { alert("Select at least one active day for this schedule."); return; }
  if (pageState.editingScheduleId) updateAdministrationSchedule(data, pageState.editingScheduleId, fields);
  else createAdministrationSchedule(data, fields);
  saveData(data);
  pageState.editingScheduleId = null;
  renderPeptidePage();
  refreshAll();
}

function readLogForm() {
  return {
    peptideId: pageState.peptideId,
    date: $("plDate")?.value || null, exactTime: $("plExactTime")?.value || null, status: $("plStatus")?.value || "taken",
    amount: $("plAmount")?.value === "" ? null : Number($("plAmount").value), amountUnit: $("plAmountUnit")?.value || "mcg",
    timeCategory: $("plTimeCategory")?.value || null, mealRelationship: $("plMealRelationship")?.value || null,
    workoutRelationship: $("plWorkoutRelationship")?.value || null,
    bodyweight: $("plBodyweight")?.value === "" ? null : Number($("plBodyweight").value),
    vialId: $("plVialId")?.value || null, equipmentProfileId: $("plEquipmentProfileId")?.value || null,
    needleLength: $("plNeedleLength")?.value || "", needleGauge: $("plNeedleGauge")?.value || "",
    administrationSite: $("plAdministrationSite")?.value || "",
    notes: $("plNotes")?.value || ""
  };
}

function handleSaveLog() {
  const data = getData();
  const fields = readLogForm();
  if (!fields.date) { alert("Set a date for this administration entry."); return; }
  if (fields.amount != null && fields.amount < 0) { alert("Amount cannot be negative."); return; }
  if (pageState.editingLogId) {
    const before = { ...data.administrationLogs.find(l => l.id === pageState.editingLogId) };
    updateAdministrationLog(data, pageState.editingLogId, fields);
    recordFieldChanges(data, "administrationLog", pageState.editingLogId, before, fields);
  } else {
    createAdministrationLog(data, fields);
  }
  saveData(data);
  pageState.editingLogId = null;
  renderPeptidePage();
  refreshAll();
}

function readSourceForm() {
  return {
    peptideId: pageState.peptideId,
    supplierName: $("psrSupplierName")?.value || "", manufacturer: $("psrManufacturer")?.value || "",
    productUrl: $("psrProductUrl")?.value || "", purchaseDate: $("psrPurchaseDate")?.value || null,
    orderReference: $("psrOrderReference")?.value || "", batchNumber: $("psrBatchNumber")?.value || "",
    lotNumber: $("psrLotNumber")?.value || "", expiryDate: $("psrExpiryDate")?.value || null,
    countryOfOrigin: $("psrCountryOfOrigin")?.value || "", storageLocation: $("psrStorageLocation")?.value || "",
    storageTemperatureText: $("psrStorageTemperatureText")?.value || "",
    openedDate: $("psrOpenedDate")?.value || null, discardedDate: $("psrDiscardedDate")?.value || null,
    notes: $("psrNotes")?.value || ""
  };
}

function handleSaveSource() {
  const data = getData();
  const fields = readSourceForm();
  if (pageState.editingSourceId) updatePeptideSource(data, pageState.editingSourceId, fields);
  else createPeptideSource(data, fields);
  saveData(data);
  pageState.editingSourceId = null;
  renderPeptidePage();
}

function readVialForm() {
  return {
    peptideId: pageState.peptideId,
    label: $("pvLabel")?.value || "", sequenceNumber: $("pvSequenceNumber")?.value === "" ? null : Number($("pvSequenceNumber").value),
    statedAmount: $("pvStatedAmount")?.value === "" ? null : Number($("pvStatedAmount").value),
    statedAmountUnit: $("pvStatedAmountUnit")?.value || "mcg",
    numberOfVials: $("pvNumberOfVials")?.value === "" ? null : Number($("pvNumberOfVials").value),
    status: $("pvStatus")?.value || "unopened",
    openedDate: $("pvOpenedDate")?.value || null, discardedDate: $("pvDiscardedDate")?.value || null,
    solutionType: $("pvSolutionType")?.value || "", solutionBrand: $("pvSolutionBrand")?.value || "",
    solutionVolume: $("pvSolutionVolume")?.value === "" ? null : Number($("pvSolutionVolume").value),
    solutionVolumeUnit: $("pvSolutionVolumeUnit")?.value || "mL",
    preparationDate: $("pvPreparationDate")?.value || null, preparedBy: $("pvPreparedBy")?.value || "",
    preparationNotes: $("pvPreparationNotes")?.value || "", storageNotes: $("pvStorageNotes")?.value || "",
    solutionExpiryOrDiscardDate: $("pvSolutionExpiryOrDiscardDate")?.value || null,
    userEnteredConcentration: $("pvUserEnteredConcentration")?.value === "" ? null : Number($("pvUserEnteredConcentration").value),
    concentrationUnit: $("pvConcentrationUnit")?.value || "",
    userEnteredAmountPerSyringeUnit: $("pvUserEnteredAmountPerSyringeUnit")?.value === "" ? null : Number($("pvUserEnteredAmountPerSyringeUnit").value),
    concentrationNotes: $("pvConcentrationNotes")?.value || "",
    concentrationDateEntered: new Date().toLocaleDateString("en-CA"),
    notes: $("pvNotes")?.value || ""
  };
}

function handleSaveVial() {
  const data = getData();
  const fields = readVialForm();
  if (pageState.editingVialId) updateVialRecord(data, pageState.editingVialId, fields);
  else createVialRecord(data, fields);
  saveData(data);
  pageState.editingVialId = null;
  renderPeptidePage();
}

function readReferenceForm() {
  return {
    peptideId: pageState.peptideId,
    sourceType: $("prSourceType")?.value || "other", title: $("prTitle")?.value || "",
    creator: $("prCreator")?.value || "", publicationDate: $("prPublicationDate")?.value || null,
    url: $("prUrl")?.value || "", timestamp: $("prTimestamp")?.value || "",
    dateAccessed: $("prDateAccessed")?.value || null,
    quotation: $("prQuotation")?.value || "", summary: $("prSummary")?.value || "", notes: $("prNotes")?.value || ""
  };
}

function handleSaveReference() {
  const data = getData();
  const fields = readReferenceForm();
  if (pageState.editingReferenceId) updateReferenceSource(data, pageState.editingReferenceId, fields);
  else createReferenceSource(data, fields);
  saveData(data);
  pageState.editingReferenceId = null;
  renderPeptidePage();
}

function handleDeletePeptide(id) {
  if (!confirm("Delete this peptide record? Its schedule and administration log entries will be removed too. This cannot be undone unless you exported a backup.")) return;
  const data = getData();
  deletePeptideRecord(data, id);
  saveData(data);
  if (pageState && pageState.peptideId === id) closePeptidePage();
  else refreshAll();
}

export function setupPeptidesEventDelegation() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("#peptideNewBtn")) { openPeptidePage(null); return; }

    const openBtn = e.target.closest("[data-peptide-open]");
    if (openBtn) { openPeptidePage(openBtn.dataset.peptideOpen); return; }

    const dupBtn = e.target.closest("[data-peptide-duplicate]");
    if (dupBtn) {
      const data = getData();
      duplicatePeptideAsDraft(data, dupBtn.dataset.peptideDuplicate);
      saveData(data);
      refreshAll();
      return;
    }

    const deleteBtn = e.target.closest("[data-peptide-delete]");
    if (deleteBtn) { handleDeletePeptide(deleteBtn.dataset.peptideDelete); return; }

    if (e.target.closest("#epAddBtn")) {
      const data = getData();
      createEquipmentProfile(data, {
        name: $("epName")?.value || "", syringeType: $("epSyringeType")?.value || "",
        syringeCapacity: $("epSyringeCapacity")?.value || "", syringeUnitScale: $("epSyringeUnitScale")?.value || "",
        needleLength: $("epNeedleLength")?.value || "", needleGauge: $("epNeedleGauge")?.value || "",
        needleType: $("epNeedleType")?.value || "", brand: $("epBrand")?.value || "", source: $("epSource")?.value || "",
        notes: $("epNotes")?.value || ""
      });
      saveData(data);
      ["epName", "epSyringeType", "epSyringeCapacity", "epSyringeUnitScale", "epNeedleLength", "epNeedleGauge", "epNeedleType", "epBrand", "epSource", "epNotes"]
        .forEach(id => { if ($(id)) $(id).value = ""; });
      refreshAll();
      return;
    }
    const deleteEquipmentBtn = e.target.closest("[data-equipment-delete]");
    if (deleteEquipmentBtn) {
      if (!confirm("Delete this equipment profile?")) return;
      const data = getData();
      deleteEquipmentProfile(data, deleteEquipmentBtn.dataset.equipmentDelete);
      saveData(data);
      refreshAll();
      return;
    }

    if (!pageState) return; // everything below only matters while the dedicated-page modal is open

    if (e.target.closest("#peptideCloseBtn") || e.target.closest("#peptideBackdrop")) { closePeptidePage(); return; }

    const sectionBtn = e.target.closest("[data-peptide-section]");
    if (sectionBtn) {
      pageState.section = sectionBtn.dataset.peptideSection;
      pageState.editingScheduleId = null; pageState.editingLogId = null;
      pageState.editingSourceId = null; pageState.editingVialId = null; pageState.editingReferenceId = null;
      renderPeptidePage();
      return;
    }

    const openBloodworkBtn = e.target.closest("[data-peptide-open-bloodwork]");
    if (openBloodworkBtn) { const reportId = openBloodworkBtn.dataset.peptideOpenBloodwork; closePeptidePage(); openBloodworkReport(reportId); return; }
    const addBloodworkBtn = e.target.closest("[data-peptide-add-bloodwork]");
    if (addBloodworkBtn) { const peptideId = addBloodworkBtn.dataset.peptideAddBloodwork; closePeptidePage(); openBloodworkReport(null, peptideId); return; }

    const statusBtn = e.target.closest("[data-peptide-set-status]");
    if (statusBtn) { handleSetStatus(statusBtn.dataset.peptideSetStatus); return; }
    if (e.target.closest("[data-peptide-complete]")) { handleCompleteCycle(); return; }

    if (e.target.closest("#pdSaveCycleBtn")) { handleSaveCycle(); return; }
    if (e.target.closest("#pdSaveNotesBtn")) { handleSaveNotes(); return; }

    const editScheduleBtn = e.target.closest("[data-peptide-edit-schedule]");
    if (editScheduleBtn) { pageState.editingScheduleId = editScheduleBtn.dataset.peptideEditSchedule; renderPeptidePage(); return; }
    if (e.target.closest("#psCancelEditBtn")) { pageState.editingScheduleId = null; renderPeptidePage(); return; }
    if (e.target.closest("#psSaveBtn")) { handleSaveSchedule(); return; }
    const deleteScheduleBtn = e.target.closest("[data-peptide-delete-schedule]");
    if (deleteScheduleBtn) {
      if (!confirm("Delete this schedule?")) return;
      const data = getData();
      deleteAdministrationSchedule(data, deleteScheduleBtn.dataset.peptideDeleteSchedule);
      saveData(data);
      renderPeptidePage();
      refreshAll();
      return;
    }

    const editLogBtn = e.target.closest("[data-peptide-edit-log]");
    if (editLogBtn) { pageState.editingLogId = editLogBtn.dataset.peptideEditLog; renderPeptidePage(); return; }
    if (e.target.closest("#plCancelEditBtn")) { pageState.editingLogId = null; renderPeptidePage(); return; }
    if (e.target.closest("#plSaveBtn")) { handleSaveLog(); return; }
    const deleteLogBtn = e.target.closest("[data-peptide-delete-log]");
    if (deleteLogBtn) {
      if (!confirm("Delete this administration entry?")) return;
      const data = getData();
      deleteAdministrationLog(data, deleteLogBtn.dataset.peptideDeleteLog);
      saveData(data);
      renderPeptidePage();
      refreshAll();
      return;
    }

    // Product / Source
    const editSourceBtn = e.target.closest("[data-peptide-edit-source]");
    if (editSourceBtn) { pageState.editingSourceId = editSourceBtn.dataset.peptideEditSource; renderPeptidePage(); return; }
    if (e.target.closest("#psrCancelEditBtn")) { pageState.editingSourceId = null; renderPeptidePage(); return; }
    if (e.target.closest("#psrSaveBtn")) { handleSaveSource(); return; }
    const deleteSourceBtn = e.target.closest("[data-peptide-delete-source]");
    if (deleteSourceBtn) {
      if (!confirm("Delete this source record?")) return;
      const data = getData();
      deletePeptideSource(data, deleteSourceBtn.dataset.peptideDeleteSource);
      saveData(data);
      renderPeptidePage();
      return;
    }

    // Vial & Solution
    const editVialBtn = e.target.closest("[data-peptide-edit-vial]");
    if (editVialBtn) { pageState.editingVialId = editVialBtn.dataset.peptideEditVial; renderPeptidePage(); return; }
    if (e.target.closest("#pvCancelEditBtn")) { pageState.editingVialId = null; renderPeptidePage(); return; }
    if (e.target.closest("#pvSaveBtn")) { handleSaveVial(); return; }
    const deleteVialBtn = e.target.closest("[data-peptide-delete-vial]");
    if (deleteVialBtn) {
      if (!confirm("Delete this vial record?")) return;
      const data = getData();
      deleteVialRecord(data, deleteVialBtn.dataset.peptideDeleteVial);
      saveData(data);
      renderPeptidePage();
      return;
    }

    // Sources & References
    const editReferenceBtn = e.target.closest("[data-peptide-edit-reference]");
    if (editReferenceBtn) { pageState.editingReferenceId = editReferenceBtn.dataset.peptideEditReference; renderPeptidePage(); return; }
    if (e.target.closest("#prCancelEditBtn")) { pageState.editingReferenceId = null; renderPeptidePage(); return; }
    if (e.target.closest("#prSaveBtn")) { handleSaveReference(); return; }
    const deleteReferenceBtn = e.target.closest("[data-peptide-delete-reference]");
    if (deleteReferenceBtn) {
      if (!confirm("Delete this reference?")) return;
      const data = getData();
      deleteReferenceSource(data, deleteReferenceBtn.dataset.peptideDeleteReference);
      saveData(data);
      renderPeptidePage();
      return;
    }

    // Export
    if (e.target.closest("[data-peptide-export-json]")) { exportPeptideAsJson(getData(), pageState.peptideId); return; }
    if (e.target.closest("[data-peptide-export-markdown]")) { exportPeptideAsMarkdown(getData(), pageState.peptideId); return; }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "peptideSearchInput") renderPeptidesList(getData());
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "peptideStatusFilter" || e.target.id === "peptideSortSelect") renderPeptidesList(getData());
    if (e.target.id === "pcWindowSelect" && pageState) { pageState.correlationWindow = e.target.value; renderPeptidePage(); }
  });
}
