// Custom Session Builder UI (contingency training feature). Reuses the existing
// data/CRUD helpers in js/custom-sessions.js and the existing calculations.js
// completion/volume helpers — this file is presentation + interaction only.
import { $, esc } from "./dom.js";
import { getData } from "./data.js";
import {
  BODY_AREAS, bodyAreaForExercise, exercisesByBodyArea, exercisesForProgramDay,
  copySessionExercises, buildExerciseEntry, reorderCustomSessionExercises,
  createCustomSession, updateCustomSession, deleteCustomSession, getCustomSession,
  createExternalConstraintLog, getExternalConstraintLog, customSessionDayKey
} from "./custom-sessions.js";
import { customSessionVolumeWarnings } from "./calculations.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

// Rough, clearly-labelled estimates only — never presented as a logged/measured value.
const EST_MINUTES_PER_EXERCISE = 8;
const EST_SETS_PER_EXERCISE = 2;

function sessionMuscleAreas(data, exercises) {
  const byName = Object.fromEntries(data.exercises.map(e => [e.name, e]));
  return [...new Set(exercises.map(x => bodyAreaForExercise(byName[x.name])))];
}

// ---- Saved Custom Session Cards (index.html #customSessionsList) ----

export function renderCustomSessionsList(data) {
  const el = $("customSessionsList");
  if (!el) return;
  const sessions = data.customSessions || [];
  if (!sessions.length) {
    el.innerHTML = "<p class='small'>No custom sessions yet — use them when a session is missed, needs splitting across days, or exercises need redistributing to protect weekly volume.</p>";
    return;
  }
  el.innerHTML = sessions.slice().reverse().map(cs => {
    const areas = sessionMuscleAreas(data, cs.exercises);
    const moved = cs.exercises.some(e => e.sourceSession);
    const log = cs.externalConstraintLogId ? getExternalConstraintLog(data, cs.externalConstraintLogId) : null;
    const isLogged = (data.workouts || []).some(w => w.customSessionId === cs.id);
    return `
      <div class="history-item custom-session-card">
        <div class="badge-row">
          <span class="badge custom-session-label">CUSTOM SESSION</span>
          ${isLogged ? `<span class="badge status-on-target">Logged</span>` : ""}
          ${moved ? `<span class="badge">Exercises moved from another day</span>` : ""}
          ${log ? `<span class="badge">Constraint-linked</span>` : ""}
        </div>
        <strong>${esc(cs.name)}</strong>
        <p class="small">${cs.scheduledDate ? esc(cs.scheduledDate) : "No date set"} · ${cs.exercises.length} exercise${cs.exercises.length === 1 ? "" : "s"} · ~${cs.exercises.length * EST_SETS_PER_EXERCISE} planned sets · ~${cs.exercises.length * EST_MINUTES_PER_EXERCISE} min</p>
        <p class="small">Source: ${cs.sourceSessions.length ? esc(cs.sourceSessions.join(", ")) : "Built from scratch"} · Areas: ${esc(areas.join(", ") || "--")}</p>
        ${log ? `<p class="small">Reason: ${esc(log.reason)}</p>` : ""}
        <div class="actions">
          <button type="button" data-csb-start="${esc(cs.id)}">Start / Resume</button>
          <button type="button" class="secondary" data-csb-edit="${esc(cs.id)}">Edit</button>
          <button type="button" class="danger" data-csb-delete="${esc(cs.id)}">Delete</button>
        </div>
      </div>`;
  }).join("");
}

// ---- Builder modal ----

let builderState = null;

function emptyBuilderState() {
  return {
    editingId: null, name: "", exercises: [], scheduledDate: null,
    constraintReason: "", externalConstraintLogId: null,
    browseMode: null, browseArea: null, browseSession: null,
    warnings: [], warningsAcknowledged: false
  };
}

export function openCustomSessionBuilder(editingId = null) {
  const data = getData();
  if (editingId) {
    const existing = getCustomSession(data, editingId);
    if (!existing) return;
    builderState = {
      ...emptyBuilderState(), editingId,
      name: existing.name, exercises: structuredClone(existing.exercises),
      scheduledDate: existing.scheduledDate, constraintReason: existing.constraintReason,
      externalConstraintLogId: existing.externalConstraintLogId
    };
  } else {
    builderState = emptyBuilderState();
  }
  renderBuilderModal();
  $("csbBackdrop").hidden = false;
  $("csbModal").hidden = false;
}

function closeCustomSessionBuilder() {
  builderState = null;
  $("csbBackdrop").hidden = true;
  $("csbModal").hidden = true;
}

function exerciseRowHtml(entry) {
  return `
    <div class="csb-exercise-row" draggable="true" data-local-id="${esc(entry.localId)}">
      <span class="csb-exercise-drag-handle" aria-hidden="true">⠿</span>
      <div class="csb-exercise-info">
        <strong>${esc(entry.name)}</strong>
        <span class="small">${esc(entry.repRange || "")}${entry.sourceSession ? ` · from ${esc(entry.sourceSession)}` : ""}</span>
      </div>
      <div class="csb-exercise-row-controls">
        <button type="button" class="image-tile-btn" data-csb-move-up="${esc(entry.localId)}" aria-label="Move earlier">&uarr;</button>
        <button type="button" class="image-tile-btn" data-csb-move-down="${esc(entry.localId)}" aria-label="Move later">&darr;</button>
        <button type="button" class="image-tile-btn image-tile-btn-danger" data-csb-remove="${esc(entry.localId)}" aria-label="Remove exercise">&times;</button>
      </div>
    </div>`;
}

function browsePanelHtml(data) {
  if (!builderState.browseMode) {
    return `
      <div class="actions">
        <button type="button" class="secondary" data-csb-browse-mode="area">Browse by Body Area</button>
        <button type="button" class="secondary" data-csb-browse-mode="session">Browse by Existing Session</button>
      </div>`;
  }
  if (builderState.browseMode === "area") {
    if (!builderState.browseArea) {
      return `
        <div class="chart-type-toggle">${BODY_AREAS.map(a => `<button type="button" data-csb-pick-area="${esc(a)}">${esc(a)}</button>`).join("")}</div>
        <button type="button" class="link-button" data-csb-browse-mode="">&larr; Back</button>`;
    }
    const list = exercisesByBodyArea(data, builderState.browseArea);
    return `
      <p class="small"><strong>${esc(builderState.browseArea)}</strong> · <button type="button" class="link-button" data-csb-browse-area="">Change area</button></p>
      <div class="csb-browse-results">
        ${list.length ? list.map(e => `
          <div class="csb-browse-item">
            <span>${esc(e.name)} <span class="small">${esc(e.primaryMuscle || "")}</span></span>
            <button type="button" class="secondary" data-csb-add-exercise="${esc(e.name)}" data-csb-source-session="">Add</button>
          </div>`).join("") : "<p class='small'>No exercises in this area yet.</p>"}
      </div>
      <button type="button" class="link-button" data-csb-browse-mode="">&larr; Back</button>`;
  }
  // browseMode === "session"
  if (!builderState.browseSession) {
    const days = Object.keys(data.trainingProgram);
    return `
      <div class="chart-type-toggle">${days.map(d => `<button type="button" data-csb-pick-session="${esc(d)}">${esc(d)}</button>`).join("")}</div>
      <button type="button" class="link-button" data-csb-browse-mode="">&larr; Back</button>`;
  }
  const sessionExercises = exercisesForProgramDay(data, builderState.browseSession);
  return `
    <p class="small"><strong>${esc(builderState.browseSession)}</strong> · <button type="button" class="link-button" data-csb-browse-session="">Change session</button></p>
    <div class="csb-browse-results">
      ${sessionExercises.map(x => `
        <div class="csb-browse-item">
          <span>${esc(x.name)} <span class="small">${esc(x.repRange || "")}</span></span>
          <button type="button" class="secondary" data-csb-add-exercise="${esc(x.name)}" data-csb-source-session="${esc(builderState.browseSession)}">Add</button>
        </div>`).join("")}
    </div>
    <button type="button" class="link-button" data-csb-browse-mode="">&larr; Back</button>`;
}

function constraintLogPickerHtml(data) {
  const logs = data.externalConstraintLogs || [];
  return `
    <details class="category-section">
      <summary><strong>Reason for Custom Session (optional)</strong></summary>
      <p class="small">Links this session to an External Constraint Log so the weekly review understands the change was caused by a scheduling constraint, not adherence or motivation.</p>
      ${logs.length ? `
        <label class="small">Use an existing reason
          <select id="csbExistingLog">
            <option value="">— None —</option>
            ${logs.slice().reverse().map(l => `<option value="${esc(l.id)}" ${builderState.externalConstraintLogId === l.id ? "selected" : ""}>${esc(l.date)} — ${esc(l.reason.slice(0, 60))}</option>`).join("")}
          </select>
        </label>` : ""}
      <label class="small">Or add a new reason
        <textarea id="csbNewReason" placeholder="e.g. Original session missed because mobile data was unavailable at the gym.">${esc(builderState.constraintReason || "")}</textarea>
      </label>
    </details>`;
}

function warningsHtml() {
  if (!builderState.warnings.length) return "";
  return `
    <div class="status-banner status-warning">
      <span class="status-icon">🟠</span>
      <span>This session includes exercises already completed this week: <strong>${esc(builderState.warnings.join(", "))}</strong>. Continuing may increase weekly volume beyond the current programme. You can still proceed.</span>
    </div>`;
}

function renderBuilderModal() {
  const data = getData();
  const content = $("csbModalContent");
  if (!content || !builderState) return;

  content.innerHTML = `
    <div class="section-title">
      <h2 id="csbTitle">${builderState.editingId ? "Edit Custom Session" : "Create Custom Session"}</h2>
      <button type="button" class="close-btn" id="csbCloseBtn" aria-label="Close">&times;</button>
    </div>
    <label class="small">Session Name
      <input type="text" id="csbName" value="${esc(builderState.name)}" placeholder="e.g. Arm Split - Saturday">
    </label>
    <div class="actions">
      <select id="csbCopySessionSelect">
        <option value="">Copy Existing Session…</option>
        ${Object.keys(data.trainingProgram).map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("")}
      </select>
      <button type="button" class="secondary" id="csbCopySessionBtn">Copy Exercises</button>
    </div>

    <h3>Exercises (${builderState.exercises.length})</h3>
    <div id="csbExerciseList">
      ${builderState.exercises.length ? builderState.exercises.map(exerciseRowHtml).join("") : "<p class='small'>No exercises yet — copy a session or add exercises below.</p>"}
    </div>

    <div id="csbAddExercisePanel">
      <h3>Add Exercise</h3>
      ${browsePanelHtml(data)}
    </div>

    <label class="small">Scheduled Date
      <input type="date" id="csbScheduledDate" value="${esc(builderState.scheduledDate || "")}">
    </label>

    ${constraintLogPickerHtml(data)}

    <div id="csbWarnings">${warningsHtml()}</div>

    <div class="actions">
      <button type="button" id="csbSaveBtn">${builderState.warnings.length ? "Save Anyway" : "Save Custom Session"}</button>
      <button type="button" class="secondary" id="csbCancelBtn">Cancel</button>
    </div>`;

  wireExerciseDragAndDrop();
}

function wireExerciseDragAndDrop() {
  const list = $("csbExerciseList");
  if (!list) return;
  let dragId = null;
  list.querySelectorAll(".csb-exercise-row").forEach(row => {
    row.addEventListener("dragstart", () => { dragId = row.dataset.localId; row.classList.add("dragging"); });
    row.addEventListener("dragend", () => { dragId = null; row.classList.remove("dragging"); });
    row.addEventListener("dragover", (e) => e.preventDefault());
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      const targetId = row.dataset.localId;
      if (!dragId || dragId === targetId) return;
      const ids = builderState.exercises.map(x => x.localId);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(targetId);
      if (from === -1 || to === -1) return;
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      builderState.exercises = reorderCustomSessionExercises(builderState.exercises, ids);
      renderBuilderModal();
    });
  });
}

function moveExercise(localId, delta) {
  const ids = builderState.exercises.map(x => x.localId);
  const i = ids.indexOf(localId);
  const j = i + delta;
  if (i === -1 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  builderState.exercises = reorderCustomSessionExercises(builderState.exercises, ids);
  renderBuilderModal();
}

function captureLiveFieldsIntoState() {
  if (!builderState) return;
  const name = $("csbName"); if (name) builderState.name = name.value;
  const date = $("csbScheduledDate"); if (date) builderState.scheduledDate = date.value || null;
  const newReason = $("csbNewReason"); if (newReason) builderState.constraintReason = newReason.value;
  const existingLog = $("csbExistingLog"); if (existingLog) builderState.externalConstraintLogId = existingLog.value || null;
}

function handleSave() {
  captureLiveFieldsIntoState();

  if (!builderState.exercises.length) { alert("Add at least one exercise before saving."); return; }

  const data = getData();

  if (!builderState.warningsAcknowledged) {
    const warnings = customSessionVolumeWarnings(builderState.exercises.map(e => e.name), data.workouts);
    if (warnings.length) {
      builderState.warnings = warnings;
      builderState.warningsAcknowledged = true; // next Save click proceeds regardless
      renderBuilderModal();
      return;
    }
  }

  let externalConstraintLogId = builderState.externalConstraintLogId;
  if (!externalConstraintLogId && builderState.constraintReason.trim()) {
    externalConstraintLogId = createExternalConstraintLog(data, { date: builderState.scheduledDate, reason: builderState.constraintReason });
  }

  const payload = {
    name: builderState.name.trim() || "Custom Session",
    exercises: builderState.exercises,
    scheduledDate: builderState.scheduledDate,
    constraintReason: builderState.constraintReason,
    externalConstraintLogId
  };

  let id;
  if (builderState.editingId) {
    updateCustomSession(data, builderState.editingId, payload);
    id = builderState.editingId;
  } else {
    id = createCustomSession(data, payload);
  }

  closeCustomSessionBuilder();
  refreshAll();
  return id;
}

function handleDelete(id) {
  if (!confirm("Delete this custom session? Any already-logged workout stays in your history — this only removes the plan.")) return;
  const data = getData();
  deleteCustomSession(data, id);
  refreshAll();
}

/** Selects this custom session on the Train tab's day dropdown and scrolls to it, so the user can begin/resume logging with the normal workout interface. */
function startCustomSession(id) {
  const select = $("daySelect");
  if (!select) return;
  const key = customSessionDayKey(id);
  if (![...select.options].some(o => o.value === key)) return; // not yet in the dropdown (renderDaySelect will add it on next refresh)
  select.value = key;
  select.dispatchEvent(new Event("change"));
  document.querySelector('.nav-drawer .nav-btn[data-tab="train"], .side-nav .nav-btn[data-tab="train"]')?.click();
  $("customSessionsCard")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

export function setupCustomSessionBuilderEventDelegation() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("#csbNewBtn")) { openCustomSessionBuilder(); return; }

    const editBtn = e.target.closest("[data-csb-edit]");
    if (editBtn) { openCustomSessionBuilder(editBtn.dataset.csbEdit); return; }

    const deleteBtn = e.target.closest("[data-csb-delete]");
    if (deleteBtn) { handleDelete(deleteBtn.dataset.csbDelete); return; }

    const startBtn = e.target.closest("[data-csb-start]");
    if (startBtn) { startCustomSession(startBtn.dataset.csbStart); return; }

    if (!builderState) return; // everything below only matters while the modal is open

    if (e.target.closest("#csbCloseBtn") || e.target.closest("#csbCancelBtn") || e.target.closest("#csbBackdrop")) {
      closeCustomSessionBuilder(); return;
    }

    // Every action below re-renders the modal from builderState, which would otherwise
    // silently discard whatever the user just typed into the name/date/reason fields
    // (those only sync into builderState here, not on every keystroke).
    captureLiveFieldsIntoState();

    if (e.target.closest("#csbCopySessionBtn")) {
      const day = $("csbCopySessionSelect")?.value;
      if (!day) return;
      const data = getData();
      builderState.exercises = [...builderState.exercises, ...copySessionExercises(data, day)];
      if (!builderState.name.trim()) builderState.name = day;
      renderBuilderModal();
      return;
    }

    const browseModeBtn = e.target.closest("[data-csb-browse-mode]");
    if (browseModeBtn) {
      builderState.browseMode = browseModeBtn.dataset.csbBrowseMode || null;
      builderState.browseArea = null;
      builderState.browseSession = null;
      renderBuilderModal();
      return;
    }

    const pickAreaBtn = e.target.closest("[data-csb-pick-area]");
    if (pickAreaBtn) { builderState.browseArea = pickAreaBtn.dataset.csbPickArea; renderBuilderModal(); return; }
    if (e.target.closest("[data-csb-browse-area]")) { builderState.browseArea = null; renderBuilderModal(); return; }

    const pickSessionBtn = e.target.closest("[data-csb-pick-session]");
    if (pickSessionBtn) { builderState.browseSession = pickSessionBtn.dataset.csbPickSession; renderBuilderModal(); return; }
    if (e.target.closest("[data-csb-browse-session]")) { builderState.browseSession = null; renderBuilderModal(); return; }

    const addExerciseBtn = e.target.closest("[data-csb-add-exercise]");
    if (addExerciseBtn) {
      const data = getData();
      const def = data.exercises.find(ex => ex.name === addExerciseBtn.dataset.csbAddExercise);
      if (!def) return;
      const sourceSession = addExerciseBtn.dataset.csbSourceSession || null;
      builderState.exercises = [...builderState.exercises, buildExerciseEntry(def, sourceSession)];
      renderBuilderModal();
      return;
    }

    const moveUpBtn = e.target.closest("[data-csb-move-up]");
    if (moveUpBtn) { moveExercise(moveUpBtn.dataset.csbMoveUp, -1); return; }
    const moveDownBtn = e.target.closest("[data-csb-move-down]");
    if (moveDownBtn) { moveExercise(moveDownBtn.dataset.csbMoveDown, 1); return; }

    const removeBtn = e.target.closest("[data-csb-remove]");
    if (removeBtn) {
      builderState.exercises = builderState.exercises.filter(e => e.localId !== removeBtn.dataset.csbRemove);
      renderBuilderModal();
      return;
    }

    if (e.target.closest("#csbSaveBtn")) { handleSave(); return; }
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "csbExistingLog" && builderState) {
      builderState.externalConstraintLogId = e.target.value || null;
    }
  });
}
