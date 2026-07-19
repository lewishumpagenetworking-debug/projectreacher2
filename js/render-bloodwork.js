// Bloodwork UI (Peptide Recovery Tracking, Phase 2). Reuses js/bloodwork.js for all
// CRUD/calculations and js/charts.js's existing lineChart for trend graphing — this file
// is presentation + interaction only, mirroring the peptide dedicated-page modal pattern.
import { $, esc } from "./dom.js";
import { getData, saveData } from "./data.js";
import { lineChart } from "./charts.js";
import { putBloodworkFileBlob, getBloodworkFileObjectURL } from "./bloodwork-files.js";
import {
  MARKER_CATEGORIES, RECURRENCE_LABELS, CYCLE_PHASES, CYCLE_PHASE_LABELS,
  getBloodworkReport, createBloodworkReport, updateBloodworkReport, deleteBloodworkReport,
  getMarkersForReport, createBloodworkMarker, updateBloodworkMarker, deleteBloodworkMarker,
  allMarkerNames, markerHistory, markerNumericSeries, compareLatestTwo, referenceRangeStatus,
  createBloodworkReminder, deleteBloodworkReminder, dueBloodworkReminders
} from "./bloodwork.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));
const FASTING_OPTIONS = ["fasted", "non_fasted", "unknown"];
const FASTING_LABELS = { fasted: "Fasted", non_fasted: "Non-fasted", unknown: "Unknown" };
const FILE_ACCEPT = "application/pdf,.pdf,.csv,text/csv,image/jpeg,image/png,image/webp";

// ==================== MAIN CARD (Recovery tab #bloodworkCard) ====================

function optionsHtml(values, labels, current) {
  return `<option value="">--</option>` + values.map(v => `<option value="${esc(v)}" ${current === v ? "selected" : ""}>${esc(labels[v] || v)}</option>`).join("");
}

export function renderBloodworkCard(data) {
  const listEl = $("bloodworkList");
  if (!listEl) return;
  const referenceDate = new Date();
  const reports = (data.bloodworkReports || []).slice().sort((a, b) => (b.testDate || "").localeCompare(a.testDate || ""));

  const statsEl = $("bloodworkStats");
  if (statsEl) {
    const latest = reports[0];
    const linkedToActive = reports.filter(r => (r.linkedPeptideIds || []).length > 0).length;
    const missingValues = (data.bloodworkMarkers || []).filter(m => m.result == null || m.result === "").length;
    statsEl.innerHTML = `
      <div class="badge-row">
        <span class="badge">Latest upload: ${latest ? esc(latest.testDate || "--") : "None yet"}</span>
        <span class="badge">Reports: ${reports.length}</span>
        <span class="badge">Linked to a peptide: ${linkedToActive}</span>
        <span class="badge">Trend-eligible markers: ${allMarkerNames(data).length}</span>
        ${missingValues ? `<span class="badge status-under">Missing values: ${missingValues}</span>` : ""}
      </div>`;
  }

  const remindersEl = $("bloodworkReminderAlerts");
  if (remindersEl) {
    const due = dueBloodworkReminders(data, referenceDate);
    remindersEl.innerHTML = due.length
      ? due.map(r => `<div class="warning-banner">Bloodwork upload date approaching or reached (${esc(r.occurrenceDate)}).${r.notes ? ` ${esc(r.notes)}` : ""}</div>`).join("")
      : "";
  }

  const reminderListEl = $("bloodworkReminderList");
  if (reminderListEl) {
    const reminders = data.bloodworkReminders || [];
    reminderListEl.innerHTML = reminders.length
      ? reminders.map(r => `
        <div class="history-item">
          <strong>${esc(r.reminderDate || "")}</strong> · ${esc(RECURRENCE_LABELS[r.recurrence] || r.recurrence)}${r.notes ? ` · ${esc(r.notes)}` : ""}
          <div class="actions"><button type="button" class="danger" data-bw-delete-reminder="${esc(r.id)}">Delete</button></div>
        </div>`).join("")
      : "<p class='small'>No user-defined reminders yet.</p>";
  }

  listEl.innerHTML = reports.length ? reports.map(r => {
    const markerCount = getMarkersForReport(data, r.id).length;
    return `
      <div class="history-item">
        <div class="section-title"><strong>${esc(r.title || r.testDate || "Untitled report")}</strong><span class="badge">${markerCount} marker${markerCount === 1 ? "" : "s"}</span></div>
        <p class="small">${r.testDate ? esc(r.testDate) : "No date set"}${r.laboratoryName ? ` · ${esc(r.laboratoryName)}` : ""}${r.fileAttachmentId ? " · File attached" : ""}</p>
        <div class="actions">
          <button type="button" data-bw-open="${esc(r.id)}">Open</button>
          <button type="button" class="danger" data-bw-delete="${esc(r.id)}">Delete</button>
        </div>
      </div>`;
  }).join("") : "<p class='small'>No bloodwork has been recorded. Add a report to store manual results and, optionally, attach the original file.</p>";

  renderMarkerTrendPicker(data);
}

function renderMarkerTrendPicker(data) {
  const select = $("bloodworkMarkerSelect");
  if (!select) return;
  const names = allMarkerNames(data);
  const current = select.value;
  select.innerHTML = `<option value="">Select a marker…</option>` + names.map(n => `<option value="${esc(n)}" ${current === n ? "selected" : ""}>${esc(n)}</option>`).join("");
  if (current && names.includes(current)) renderMarkerTrend(data, current);
}

function renderMarkerTrend(data, markerName) {
  const el = $("bloodworkTrendChart");
  if (!el) return;
  if (!markerName) { el.innerHTML = ""; return; }
  const series = markerNumericSeries(data, markerName);
  if (!series.length) { el.innerHTML = "<p class='small'>There is not enough aligned data to compare this period yet.</p>"; return; }
  const comparison = compareLatestTwo(series);
  const latestEntry = markerHistory(data, markerName).at(-1);
  const rangeStatus = latestEntry ? referenceRangeStatus(latestEntry) : "No comparable data";
  el.innerHTML = `
    ${lineChart(series, { formatValue: v => `${v}${series[0]?.unit || ""}` })}
    <p class="small">Latest: ${series.at(-1).value}${series.at(-1).unit || ""} on ${esc(series.at(-1).testDate)} · ${esc(comparison.trend)} vs. previous entry · ${esc(rangeStatus)}</p>
    <p class="small" style="opacity:.7">Uses actual test dates only — missing periods are never interpolated as measured results.</p>`;
}

// ==================== REPORT MODAL ====================

let bwState = null; // { reportId, editingMarkerId }

export function openBloodworkReport(id, prefillPeptideId = null) {
  const data = getData();
  let reportId = id;
  if (!reportId) {
    const report = createBloodworkReport(data, prefillPeptideId ? { linkedPeptideIds: [prefillPeptideId] } : {});
    saveData(data);
    reportId = report.id;
  }
  bwState = { reportId, editingMarkerId: null };
  renderBloodworkModal();
  $("bwBackdrop").hidden = false;
  $("bwModal").hidden = false;
}

function closeBloodworkModal() {
  bwState = null;
  $("bwBackdrop").hidden = true;
  $("bwModal").hidden = true;
  refreshAll();
}

function peptideLinkCheckboxesHtml(data, report) {
  const linked = new Set(report.linkedPeptideIds || []);
  const records = data.peptideRecords || [];
  if (!records.length) return "<p class='small'>No peptide records exist yet.</p>";
  return `<div class="checklist-row-group">${records.map(p => `
    <label class="checklist-row"><input type="checkbox" class="bwLinkPeptide" value="${esc(p.id)}" ${linked.has(p.id) ? "checked" : ""}> <span>${esc(p.name || "Untitled")}</span></label>`).join("")}</div>`;
}

function markerRowHtml(m) {
  return `
    <div class="history-item">
      <strong>${esc(m.markerName)}</strong>${m.category ? ` <span class="small">(${esc(m.category)})</span>` : ""}
      <p class="small">${m.result != null ? esc(String(m.result)) : "--"}${m.unit ? esc(m.unit) : ""}${m.referenceLow != null || m.referenceHigh != null ? ` · Reference: ${m.referenceLow ?? "?"}–${m.referenceHigh ?? "?"}` : ""}${m.laboratoryFlag ? ` · Flag: ${esc(m.laboratoryFlag)}` : ""}</p>
      <p class="small" style="opacity:.7">${esc(referenceRangeStatus(m))}</p>
      ${m.notes ? `<p class="small">${esc(m.notes)}</p>` : ""}
      <div class="actions">
        <button type="button" class="secondary" data-bw-edit-marker="${esc(m.id)}">Edit</button>
        <button type="button" class="danger" data-bw-delete-marker="${esc(m.id)}">Delete</button>
      </div>
    </div>`;
}

function markerFormHtml(editing) {
  const m = editing || { category: "", markerName: "", result: "", unit: "", referenceLow: "", referenceHigh: "", laboratoryFlag: "", notes: "" };
  return `
    <div class="history-item">
      <h4>${editing ? "Edit Marker" : "Add Marker"}</h4>
      <div class="form-grid">
        <label>Marker Name <input type="text" id="bmMarkerName" value="${esc(m.markerName || "")}"></label>
        <label>Category <select id="bmCategory"><option value="">--</option>${MARKER_CATEGORIES.map(c => `<option value="${esc(c)}" ${m.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
        <label>Result <input type="text" id="bmResult" value="${esc(m.result ?? "")}"></label>
        <label>Unit <input type="text" id="bmUnit" value="${esc(m.unit || "")}"></label>
        <label>Lab Reference Low <input type="number" step="any" id="bmReferenceLow" value="${m.referenceLow ?? ""}"></label>
        <label>Lab Reference High <input type="number" step="any" id="bmReferenceHigh" value="${m.referenceHigh ?? ""}"></label>
        <label>Laboratory Flag <input type="text" id="bmLaboratoryFlag" value="${esc(m.laboratoryFlag || "")}" placeholder="e.g. High, Low, Normal"></label>
      </div>
      <label class="small">Notes <textarea id="bmNotes">${esc(m.notes || "")}</textarea></label>
      <div class="actions">
        <button type="button" id="bmSaveBtn">${editing ? "Save Marker" : "Add Marker"}</button>
        ${editing ? `<button type="button" class="secondary" id="bmCancelEditBtn">Cancel</button>` : ""}
      </div>
      <p class="small" style="opacity:.7">This is a user-entered record — the app does not extract or verify values from an uploaded file.</p>
    </div>`;
}

function fileSectionHtml(report) {
  return `
    <h4>Original Report File</h4>
    ${report.fileAttachmentId
      ? `<p class="small">${esc(report.fileName || "File")} (${esc(report.fileType || "")})</p>
         <div class="actions">
           <button type="button" class="secondary" id="bwDownloadFileBtn">View / Download</button>
           <button type="button" class="danger" id="bwRemoveFileBtn">Remove File</button>
         </div>`
      : `<label class="secondary" style="cursor:pointer;display:inline-block">Upload PDF / Image / CSV<input type="file" id="bwFileInput" accept="${FILE_ACCEPT}" style="display:none"></label>`}
    <p class="small" style="opacity:.7">The original file is stored exactly as uploaded. Values are never automatically extracted — enter them manually as markers below.</p>`;
}

function renderBloodworkModal() {
  const content = $("bwModalContent");
  if (!content || !bwState) return;
  const data = getData();
  const report = getBloodworkReport(data, bwState.reportId);
  if (!report) { closeBloodworkModal(); return; }

  const markers = getMarkersForReport(data, report.id);
  const editingMarker = bwState.editingMarkerId ? markers.find(m => m.id === bwState.editingMarkerId) : null;

  content.innerHTML = `
    <div class="section-title">
      <h2 id="bwTitle">${esc(report.title || "Bloodwork Report")}</h2>
      <button type="button" class="close-btn" id="bwCloseBtn" aria-label="Close">&times;</button>
    </div>
    <div class="form-grid">
      <label>Report Title <input type="text" id="bwTitleInput" value="${esc(report.title || "")}"></label>
      <label>Test Date <input type="date" id="bwTestDate" value="${esc(report.testDate || "")}"></label>
      <label>Laboratory Name <input type="text" id="bwLabName" value="${esc(report.laboratoryName || "")}"></label>
      <label>Ordering Clinician <input type="text" id="bwClinician" value="${esc(report.orderingClinician || "")}"></label>
      <label>Fasting Status <select id="bwFastingStatus">${optionsHtml(FASTING_OPTIONS, FASTING_LABELS, report.fastingStatus)}</select></label>
      <label>Time Collected <input type="time" id="bwCollectionTime" value="${esc(report.collectionTime || "")}"></label>
      <label>Linked Cycle Phase <select id="bwCyclePhase">${optionsHtml(CYCLE_PHASES, CYCLE_PHASE_LABELS, report.linkedCyclePhase)}</select></label>
    </div>
    <p class="small">Linked Peptide Records</p>
    ${peptideLinkCheckboxesHtml(data, report)}
    <label class="small">Notes <textarea id="bwNotes">${esc(report.notes || "")}</textarea></label>
    <div class="actions"><button type="button" id="bwSaveReportBtn">Save Report Details</button></div>

    ${fileSectionHtml(report)}

    <h3>Markers (${markers.length})</h3>
    ${markers.length ? markers.map(markerRowHtml).join("") : "<p class='small'>No markers entered yet.</p>"}
    ${markerFormHtml(editingMarker)}

    <div class="actions"><button type="button" class="danger" id="bwDeleteReportBtn">Delete Report</button></div>`;
}

// ==================== ACTIONS ====================

function handleSaveReport() {
  const data = getData();
  const linkedPeptideIds = [...document.querySelectorAll(".bwLinkPeptide:checked")].map(cb => cb.value);
  updateBloodworkReport(data, bwState.reportId, {
    title: $("bwTitleInput")?.value || "", testDate: $("bwTestDate")?.value || null,
    laboratoryName: $("bwLabName")?.value || "", orderingClinician: $("bwClinician")?.value || "",
    fastingStatus: $("bwFastingStatus")?.value || null, collectionTime: $("bwCollectionTime")?.value || null,
    linkedCyclePhase: $("bwCyclePhase")?.value || null, notes: $("bwNotes")?.value || "",
    linkedPeptideIds
  });
  saveData(data);
  renderBloodworkModal();
  refreshAll();
}

async function handleFileUpload(file) {
  if (!file) return;
  const data = getData();
  const report = getBloodworkReport(data, bwState.reportId);
  const fileId = report.fileAttachmentId || `bwfile-${bwState.reportId}`;
  try {
    await putBloodworkFileBlob(fileId, file);
  } catch (err) {
    alert("Could not store this file: " + err.message);
    return;
  }
  updateBloodworkReport(data, bwState.reportId, { fileAttachmentId: fileId, fileName: file.name, fileType: file.type, fileSize: file.size });
  saveData(data);
  renderBloodworkModal();
}

async function handleRemoveFile() {
  const data = getData();
  const report = getBloodworkReport(data, bwState.reportId);
  if (report.fileAttachmentId) {
    const { deleteBloodworkFileBlob } = await import("./bloodwork-files.js");
    try { await deleteBloodworkFileBlob(report.fileAttachmentId); } catch { /* best-effort */ }
  }
  updateBloodworkReport(data, bwState.reportId, { fileAttachmentId: null, fileName: "", fileType: "", fileSize: null });
  saveData(data);
  renderBloodworkModal();
}

async function handleDownloadFile() {
  const data = getData();
  const report = getBloodworkReport(data, bwState.reportId);
  if (!report.fileAttachmentId) return;
  const url = await getBloodworkFileObjectURL(report.fileAttachmentId);
  if (url) window.open(url, "_blank");
}

function readMarkerForm() {
  return {
    reportId: bwState.reportId,
    markerName: $("bmMarkerName")?.value.trim() || "", category: $("bmCategory")?.value || "",
    result: $("bmResult")?.value ?? "", unit: $("bmUnit")?.value || "",
    referenceLow: $("bmReferenceLow")?.value === "" ? null : Number($("bmReferenceLow").value),
    referenceHigh: $("bmReferenceHigh")?.value === "" ? null : Number($("bmReferenceHigh").value),
    laboratoryFlag: $("bmLaboratoryFlag")?.value || "", notes: $("bmNotes")?.value || "", userConfirmed: true
  };
}

function handleSaveMarker() {
  const fields = readMarkerForm();
  if (!fields.markerName) { alert("Give this marker a name before saving."); return; }
  const data = getData();
  if (bwState.editingMarkerId) updateBloodworkMarker(data, bwState.editingMarkerId, fields);
  else createBloodworkMarker(data, fields);
  saveData(data);
  bwState.editingMarkerId = null;
  renderBloodworkModal();
  refreshAll();
}

async function handleDeleteReport(id) {
  if (!confirm("Delete this bloodwork report? Its markers and any attached file will be removed too. This cannot be undone unless you exported a backup.")) return;
  const data = getData();
  await deleteBloodworkReport(data, id);
  saveData(data);
  if (bwState && bwState.reportId === id) closeBloodworkModal();
  else refreshAll();
}

function handleAddReminder() {
  const reminderDate = $("bwReminderDate")?.value;
  if (!reminderDate) { alert("Set a date for this reminder."); return; }
  const data = getData();
  createBloodworkReminder(data, {
    reminderDate, recurrence: $("bwReminderRecurrence")?.value || "none",
    recurrenceN: $("bwReminderN")?.value === "" ? null : Number($("bwReminderN")?.value),
    notes: $("bwReminderNotes")?.value || ""
  });
  saveData(data);
  ["bwReminderDate", "bwReminderN", "bwReminderNotes"].forEach(id => { if ($(id)) $(id).value = ""; });
  refreshAll();
}

export function setupBloodworkEventDelegation() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("#bloodworkNewBtn")) { openBloodworkReport(null); return; }
    if (e.target.closest("#bwAddReminderBtn")) { handleAddReminder(); return; }

    const openBtn = e.target.closest("[data-bw-open]");
    if (openBtn) { openBloodworkReport(openBtn.dataset.bwOpen); return; }

    const deleteBtn = e.target.closest("[data-bw-delete]");
    if (deleteBtn) { handleDeleteReport(deleteBtn.dataset.bwDelete); return; }

    const deleteReminderBtn = e.target.closest("[data-bw-delete-reminder]");
    if (deleteReminderBtn) {
      const data = getData();
      deleteBloodworkReminder(data, deleteReminderBtn.dataset.bwDeleteReminder);
      saveData(data);
      refreshAll();
      return;
    }

    if (!bwState) return; // everything below only matters while the report modal is open

    if (e.target.closest("#bwCloseBtn") || e.target.closest("#bwBackdrop")) { closeBloodworkModal(); return; }
    if (e.target.closest("#bwSaveReportBtn")) { handleSaveReport(); return; }
    if (e.target.closest("#bwDeleteReportBtn")) { handleDeleteReport(bwState.reportId); return; }
    if (e.target.closest("#bwRemoveFileBtn")) { handleRemoveFile(); return; }
    if (e.target.closest("#bwDownloadFileBtn")) { handleDownloadFile(); return; }

    const editMarkerBtn = e.target.closest("[data-bw-edit-marker]");
    if (editMarkerBtn) { bwState.editingMarkerId = editMarkerBtn.dataset.bwEditMarker; renderBloodworkModal(); return; }
    if (e.target.closest("#bmCancelEditBtn")) { bwState.editingMarkerId = null; renderBloodworkModal(); return; }
    if (e.target.closest("#bmSaveBtn")) { handleSaveMarker(); return; }
    const deleteMarkerBtn = e.target.closest("[data-bw-delete-marker]");
    if (deleteMarkerBtn) {
      if (!confirm("Delete this marker?")) return;
      const data = getData();
      deleteBloodworkMarker(data, deleteMarkerBtn.dataset.bwDeleteMarker);
      saveData(data);
      renderBloodworkModal();
      refreshAll();
      return;
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "bwFileInput") { handleFileUpload(e.target.files[0]); return; }
    if (e.target.id === "bloodworkMarkerSelect") { renderMarkerTrend(getData(), e.target.value); return; }
  });
}
