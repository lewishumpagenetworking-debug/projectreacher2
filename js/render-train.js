import { $, esc } from "./dom.js";
import { recommendProgression, getExerciseHistory, localExerciseAdvice, readinessScore, farmersCarryAnalytics, exerciseProgressionStatus, recoveryMealCompliance, preWorkoutReadinessToday, sessionReviewMissingFields, exerciseCompletedInCustomSessionThisWeek } from "./calculations.js";
import { getData, saveData, uid, DEFAULT_SESSION_REVIEW } from "./data.js";
import { metricLabel } from "./metric-info.js";
import { showMissionStart, celebrateSetRow, celebrateExerciseComplete, showOperationComplete, formatVolumeComparison } from "./reward-system.js";
import { getSessionNutritionForDay } from "./session-nutrition.js";
import { renderSavedWorkoutSessionNutrition } from "./render-session-nutrition.js";
import { CONSTRAINT_ENGINE_VERSION } from "./constraint-engine.js";
import { CONSTRAINT_LIBRARY_VERSION } from "./constraint-library.js";
import { generateProgressTasks, TASK_SECTIONS } from "./task-engine.js";
import { isCustomSessionDay, customSessionIdFromDay, getCustomSession } from "./custom-sessions.js";
import { selectedVariantIdFor, variantDisplayName } from "./render-exercise-variants.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

// Sentinel daySelect value for the bottom "Create Custom Session" dropdown option (spec:
// contingency training feature). Never a real program day or a "custom:<id>" key, so it
// can never collide with a real session or accidentally get treated as one to render/save.
export const CREATE_CUSTOM_SESSION_VALUE = "__create_custom_session__";

/** A day's exercise list, whether it's a real programme day or a custom session's own list — same {name, repRange, note}-shaped entries either way, so every caller downstream (card rendering, mission focus points, saving) needs no further branching. */
function getSessionExercises(data, day) {
  if (isCustomSessionDay(day)) {
    const cs = getCustomSession(data, customSessionIdFromDay(day));
    return cs ? cs.exercises : [];
  }
  return data.trainingProgram[day] || [];
}

function customSessionForDay(data, day) {
  return isCustomSessionDay(day) ? getCustomSession(data, customSessionIdFromDay(day)) : null;
}

// In-memory only — resets on page reload, i.e. "remembered for the current workout".
// Also persisted into the active workout draft (see below) so it survives a reload too.
const expandedExercises = new Set();

// ---- Active workout draft: autosave + restore, so unsaved Train tab values are never
// wiped by navigation or by an unrelated save action elsewhere in the app triggering a
// global refreshAll() (which rebuilds #workoutList from clean storage data). The draft
// lives in data.activeWorkoutDraft via the existing saveData()/getData() persistence
// layer — no new storage mechanism, no rebuild of the save system. ----
let draftSaveTimer = null;
let conflictAsked = false;
let hasShownRestoredOnce = false;

function totalVolume(entry) {
  return (entry.exercises || []).reduce((sum, e) => {
    const s1 = (Number(e.set1Weight) || 0) * (Number(e.set1Reps) || 0);
    const s2 = (Number(e.set2Weight) || 0) * (Number(e.set2Reps) || 0);
    return sum + s1 + s2;
  }, 0);
}

function formatSet(e) {
  if (!e) return "no data yet";
  return `${e.set1Weight ?? "-"}kg×${e.set1Reps ?? "-"}, ${e.set2Weight ?? "-"}kg×${e.set2Reps ?? "-"}`;
}

/** Farmer's Carry-only display: shows weight-per-hand × lengths and the resulting distance. */
function formatDistanceSet(e, trackLength) {
  if (!e) return "no data yet";
  const dist = e.calculatedDistanceMetres != null ? `${e.calculatedDistanceMetres}m` : calcDistance(e, trackLength) + "m";
  return `${e.set1Weight ?? "-"}kg/hand×${e.set1Reps ?? "-"} lengths, ${e.set2Weight ?? "-"}kg/hand×${e.set2Reps ?? "-"} lengths (${dist} total)`;
}

function calcDistance(entry, trackLength) {
  const lengths = (Number(entry?.set1Reps) || 0) + (Number(entry?.set2Reps) || 0) + (Number(entry?.optionalSet3Reps) || 0);
  return Math.round(lengths * (trackLength || 15) * 10) / 10;
}

export function renderDaySelect(data) {
  const select = $("daySelect");
  const previousValue = select.value;
  const days = Object.keys(data.trainingProgram);
  const customOptions = (data.customSessions || []).map(cs =>
    `<option value="custom:${esc(cs.id)}">⚡ ${esc(cs.name)} (Custom)</option>`
  ).join("");
  select.innerHTML =
    days.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("") +
    customOptions +
    `<option value="${CREATE_CUSTOM_SESSION_VALUE}">Create Custom Session</option>`;
  // Rebuilding innerHTML always resets a <select> to its first option unless the previous
  // selection is restored explicitly — every refreshAll() call (e.g. after saving a workout,
  // or after this phase's variant selector closes) was silently kicking the visible day back
  // to Day 1 regardless of what the user actually had open. Pre-existing bug, unrelated to
  // this phase's work but directly exposed by it — restore it here if it still exists.
  if (previousValue && [...select.options].some(o => o.value === previousValue)) {
    select.value = previousValue;
  }
}

const VALID_REP_ITEMS = [
  ["fullROM", "Full useful range of motion"],
  ["controlledEccentric", "Controlled eccentric"],
  ["targetMuscleLoaded", "Target muscle loaded"],
  ["noPain", "No pain"],
  ["noMomentum", "No uncontrolled momentum"],
  ["sameFormAsLastWeek", "Same form as last week"]
];

function cueList(title, items) {
  if (!items || !items.length) return "";
  return `<p class="small"><strong>${esc(title)}:</strong> ${items.map(esc).join(" · ")}</p>`;
}

function renderGuideContent(def) {
  if (!def || !def.targetMuscleCue) {
    return "<p class='small'>No form guide available for this exercise yet.</p>";
  }
  return `
    <p class="small"><strong>Target muscle:</strong> ${esc(def.targetMuscleCue)}</p>
    <p class="small"><strong>Tempo:</strong> ${esc(def.tempoDescription || "--")}</p>
    ${cueList("Setup", def.setupCues)}
    ${cueList("Execution", def.executionCues)}
    <p class="small"><strong>Range of motion:</strong> ${esc(def.rangeOfMotionStandard || "--")}</p>
    ${cueList("Valid rep", def.validRepCriteria)}
    ${cueList("Common mistakes", def.commonMistakes)}
    ${def.safetyNotes && def.safetyNotes.length ? `<div class="warning-banner">${def.safetyNotes.map(esc).join(" · ")}</div>` : ""}
    <p class="small"><strong>Today's focus:</strong> ${esc(def.todayFocusCue || "--")}</p>

    <div class="valid-rep-checklist">
      ${VALID_REP_ITEMS.map(([key, label]) => `
        <label class="checklist-row"><input type="checkbox" class="rep-check" data-check="${key}"> <span>${esc(label)}</span></label>
      `).join("")}
    </div>

    <div class="form-grid">
      ${metricLabel("rom", "ROM 1-5", `<input class="romq" type="number" min="1" max="5">`)}
      ${metricLabel("tempo", "Tempo 1-5", `<input class="tempoq" type="number" min="1" max="5">`)}
      ${metricLabel("pain", "Pain / Discomfort", `<input class="painflag" type="checkbox">`)}
      <label>Form Note<input class="formnote" placeholder="quick note"></label>
    </div>

    <button type="button" class="secondary ask-ai-btn">Ask AI About This Exercise</button>
    <div class="ai-answer small" hidden></div>
  `;
}

export function renderWorkoutForm(data) {
  const day = $("daySelect").value || Object.keys(data.trainingProgram)[0];
  if (day === CREATE_CUSTOM_SESSION_VALUE) return; // handled by main.js's daySelect change handler, which opens the builder instead
  const exercises = getSessionExercises(data, day);
  const activeCustomSession = customSessionForDay(data, day);
  const trackLength = data.profile?.functionalTrackLengthMetres || 15;
  const readiness = readinessScore(data);
  const rawMealCompliance = recoveryMealCompliance(data.mealLogs);
  const mealCompliance = { ...rawMealCompliance, preWorkoutComplete: rawMealCompliance.preWorkoutComplete || !!preWorkoutReadinessToday(data.preWorkoutLogs) };

  $("workoutList").innerHTML = exercises.map((x, i) => {
    const exerciseDef = data.exercises.find(e => e.name === x.name);
    const isDistanceBased = !!exerciseDef?.distanceBased;
    // Gym App spec Part 2: history/progression are scoped to whichever equipment variant is
    // selected for today (defaulting to the exercise's own canonical form) — never blended
    // across variants, so switching equipment never inherits another variant's numbers.
    const selectedVariantId = selectedVariantIdFor(data, exerciseDef, day);
    const selectedVariant = exerciseDef ? { id: selectedVariantId, name: variantDisplayName({ selectedVariantId }, exerciseDef) } : null;
    const hasVariants = !!(exerciseDef?.variants && exerciseDef.variants.length);
    const history = getExerciseHistory(data.workouts, x.name, { variantId: selectedVariantId, canonicalVariantId: exerciseDef?.id });
    const isExpanded = expandedExercises.has(x.name);
    // Always live-computed from the last logged entry's raw fields (never trusts a
    // possibly-null stored snapshot) — this is what makes a fully-qualifying session
    // logged before this feature existed (e.g. a historical Hammer Curl PR) surface
    // its earned "Increase Load" status on the very next exposure automatically.
    const nextSession = history.lastSession
      ? exerciseProgressionStatus(history.lastSession, exerciseDef, { previousEntry: history.previousWeek, readiness, mealCompliance })
      : null;
    const recBadge = nextSession
      ? `<span class="badge ${nextSession.status === "Increase Load" ? "status-on-target" : ["Pain Review", "Reduce Load"].includes(nextSession.status) ? "status-under" : ""}">NEXT SESSION: ${esc(nextSession.status)}</span>`
      : "";
    const reasonLine = nextSession ? `<p class="small">Reason: ${esc(nextSession.reason)}</p>` : "";
    // Non-blocking context only (Gym App spec Part 1) — readiness/nutrition never change
    // nextSession.status or .reason above; this is shown separately, purely informational.
    const contextNotesLines = nextSession?.contextNotes?.length
      ? nextSession.contextNotes.map(n => `<p class="small" style="opacity:.75">${esc(n.message)}</p>`).join("")
      : "";
    const lastDisplay = isDistanceBased ? formatDistanceSet(history.lastSession, trackLength) : formatSet(history.lastSession);
    const bestDisplay = isDistanceBased ? formatDistanceSet(history.previousBest, trackLength) : formatSet(history.previousBest);
    // Custom Session Builder (contingency training feature): the app tracks exercises
    // rather than relying on session names, so an exercise already logged this week in a
    // DIFFERENT session (custom or, indirectly, the current one) is flagged here rather
    // than left looking untouched — prevents accidentally repeating it later in the week.
    const completedElsewhere = exerciseCompletedInCustomSessionThisWeek(data.workouts, x.name);
    const completedElsewhereBadge = (completedElsewhere && completedElsewhere.day !== day)
      ? `<span class="exercise-state-tag tag-progression">Completed in Custom Session</span>` : "";

    return `
    <div class="exercise" data-exercise="${esc(x.name)}" ${isDistanceBased ? `data-distance-based="true" data-track-length="${trackLength}"` : ""}>
      <div class="exercise-header">
        <div class="exercise-header-info" data-toggle-guide="${esc(x.name)}">
          <h3>${i + 1}. ${esc(x.name)}</h3>
          <div class="exercise-state-row">
            <span class="exercise-state-tag tag-active" hidden>Active Exercise</span>
            <span class="exercise-state-tag tag-complete" hidden>Exercise Complete</span>
            ${exerciseDef?.primaryMuscle ? `<span class="exercise-state-tag tag-muscle">${esc(exerciseDef.primaryMuscle)}</span>` : ""}
            ${completedElsewhereBadge}
          </div>
          <div class="small">Target: ${esc(x.repRange)} · Last: ${lastDisplay} · Best: ${bestDisplay}</div>
          ${hasVariants ? `<div class="small">Equipment: <strong>${esc(selectedVariant?.name || exerciseDef.name)}</strong> <button type="button" class="link-button" data-open-variants="${esc(x.name)}">Change / View History</button></div>` : ""}
          ${recBadge ? `<div class="badge-row">${recBadge}</div>` : ""}
          ${reasonLine}
          ${contextNotesLines}
        </div>
        <button type="button" class="technique-btn" data-toggle-guide="${esc(x.name)}" aria-expanded="${isExpanded}" aria-label="${isExpanded ? "Hide" : "See"} technique guide for ${esc(x.name)}">
          <span class="technique-btn-icon">${isExpanded ? "▴" : "🎯"}</span>
          <span class="technique-btn-label">${isExpanded ? "Hide Technique" : "See Technique"}</span>
        </button>
      </div>
      ${isDistanceBased ? `<p class="small distance-helper">1 length = current gym track length (${trackLength}m, change in More &gt; Gym Profile). <strong class="calc-distance-readout">Total distance: 0m</strong></p>` : ""}
      <div class="set-row">
        <label>Warm-up<input class="warmup" placeholder="Optional"></label>
        ${isDistanceBased
          ? metricLabel("weight", "Set 1 Weight Per Hand", `<input class="set1w" type="number" step="0.5" placeholder="kg per hand">`)
          : metricLabel("weight", "Set 1 Weight", `<input class="set1w" type="number" step="0.5" placeholder="kg">`)}
        ${isDistanceBased
          ? metricLabel("reps", "Set 1 Lengths", `<input class="set1r" type="number" placeholder="lengths">`)
          : metricLabel("reps", "Set 1 Reps", `<input class="set1r" type="number" placeholder="reps">`)}
        ${metricLabel("rir", "Set 1 RIR", `<input class="set1rir" type="number" min="0" max="5" placeholder="~1 for compounds">`)}
        ${isDistanceBased
          ? metricLabel("weight", "Set 2 Weight Per Hand", `<input class="set2w" type="number" step="0.5" placeholder="kg per hand">`)
          : metricLabel("weight", "Set 2 Weight", `<input class="set2w" type="number" step="0.5" placeholder="kg">`)}
        ${isDistanceBased
          ? metricLabel("reps", "Set 2 Lengths", `<input class="set2r" type="number" placeholder="lengths">`)
          : metricLabel("reps", "Set 2 Reps", `<input class="set2r" type="number" placeholder="reps">`)}
        ${metricLabel("rir", "Set 2 RIR", `<input class="set2rir" type="number" min="0" max="5" placeholder="0 = failure">`)}
        ${isDistanceBased
          ? metricLabel("weight", "Optional Set 3 Weight Per Hand", `<input class="set3w" type="number" step="0.5" placeholder="kg per hand">`)
          : metricLabel("weight", "Optional Set 3 Weight", `<input class="set3w" type="number" step="0.5" placeholder="kg">`)}
        ${isDistanceBased
          ? metricLabel("reps", "Optional Set 3 Lengths", `<input class="set3r" type="number" placeholder="lengths">`)
          : metricLabel("reps", "Optional Set 3 Reps", `<input class="set3r" type="number" placeholder="reps">`)}
        ${metricLabel("rpe", "RPE", `<input class="rpe" type="number" min="1" max="10">`)}
        <label>Technical Failure Reached<input class="techfail" type="checkbox"></label>
        ${metricLabel("formQuality", "Form Quality 1-5", `<input class="formq" type="number" min="1" max="5">`)}
        ${metricLabel("targetMuscle", "Target Muscle Connection 1-5", `<input class="mmc" type="number" min="1" max="5">`)}
        ${metricLabel("notes", "Notes", `<input class="exnotes" placeholder="form / machine / pain">`)}
      </div>
      <div class="form-guide" ${isExpanded ? "" : "hidden"}>
        ${renderGuideContent(exerciseDef)}
      </div>
    </div>`;
  }).join("");

  applyDraftAfterRender(data, day);
  initializeRewardState();
  renderTrainReadinessChip(data);
  updateAllDistanceReadouts();
}

/** Farmer's Carry-only: recomputes the "Total distance" readout from lengths × track length. */
function updateDistanceReadout(card) {
  if (!card || card.dataset.distanceBased !== "true") return;
  const trackLength = Number(card.dataset.trackLength) || 15;
  const lengths = (Number(card.querySelector(".set1r")?.value) || 0) + (Number(card.querySelector(".set2r")?.value) || 0) + (Number(card.querySelector(".set3r")?.value) || 0);
  const distance = Math.round(lengths * trackLength * 10) / 10;
  const readout = card.querySelector(".calc-distance-readout");
  if (readout) readout.textContent = `Total distance: ${distance}m`;
}

function updateAllDistanceReadouts() {
  document.querySelectorAll('#workoutList .exercise[data-distance-based="true"]').forEach(updateDistanceReadout);
}

/** Small, non-blocking readiness chip at the top of the Train tab — never interrupts logging. */
export function renderTrainReadinessChip(data) {
  const el = $("trainReadinessChip");
  if (!el) return;
  const readiness = readinessScore(data);
  const cls = (readiness.status === "green" || readiness.status === "amber-green") ? "chip-green" : (readiness.status === "amber" ? "chip-amber" : "chip-red");
  el.innerHTML = `
    <span class="readiness-chip ${cls}">Readiness: ${readiness.score} — ${esc(readiness.trainingMode)}</span>
    <span class="readiness-chip-note">${esc(readiness.mainBottleneck)}</span>
  `;
}

// ---- Visual reward state (active/complete card highlighting, session progress bar,
// set/exercise completion micro-rewards). Session-only, recomputed on every render —
// never persisted, so it can't drift from or affect the real save/draft data. ----
let exerciseCompletionState = {};
let setCompletionState = {};

function numVal(card, selector) { return Number(card.querySelector(selector)?.value || 0); }
function exerciseIsComplete(card) { return numVal(card, ".set1r") > 0 && numVal(card, ".set2r") > 0; }
function setSlotFilled(card, weightSel, repsSel) { return numVal(card, weightSel) > 0 && numVal(card, repsSel) > 0; }

function initializeRewardState() {
  exerciseCompletionState = {};
  setCompletionState = {};
  document.querySelectorAll("#workoutList .exercise").forEach(card => {
    const name = card.dataset.exercise;
    exerciseCompletionState[name] = exerciseIsComplete(card);
    setCompletionState[name] = { set1: setSlotFilled(card, ".set1w", ".set1r"), set2: setSlotFilled(card, ".set2w", ".set2r") };
  });
  updateExerciseVisualStates();
  updateWorkoutProgress();
}

function updateExerciseVisualStates() {
  const cards = [...document.querySelectorAll("#workoutList .exercise")];
  let activeCard = cards.find(c => c.querySelector(".form-guide") && !c.querySelector(".form-guide").hidden);
  if (!activeCard) activeCard = cards.find(c => !exerciseIsComplete(c)) || null;
  cards.forEach(card => {
    const isComplete = exerciseIsComplete(card);
    const isActive = card === activeCard && !isComplete;
    card.classList.toggle("is-active", isActive);
    card.classList.toggle("is-complete", isComplete);
    const activeTag = card.querySelector(".tag-active");
    const completeTag = card.querySelector(".tag-complete");
    if (activeTag) activeTag.hidden = !isActive;
    if (completeTag) completeTag.hidden = !isComplete;
  });
}

function updateWorkoutProgress() {
  const cards = [...document.querySelectorAll("#workoutList .exercise")];
  const fill = $("workoutProgressFill");
  const text = $("workoutProgressText");
  if (!fill) return;
  if (!cards.length) { fill.style.width = "0%"; if (text) text.textContent = "0%"; return; }
  const completeCount = cards.filter(exerciseIsComplete).length;
  const pct = Math.round((completeCount / cards.length) * 100);
  fill.style.width = `${pct}%`;
  if (text) text.textContent = `${completeCount}/${cards.length} exercises · ${pct}%`;
}

function handleWorkoutInputReward(target) {
  const card = target.closest?.(".exercise");
  if (!card) return;
  const name = card.dataset.exercise;
  const setRow = card.querySelector(".set-row");

  const prevSets = setCompletionState[name] || { set1: false, set2: false };
  const nowSet1 = setSlotFilled(card, ".set1w", ".set1r");
  const nowSet2 = setSlotFilled(card, ".set2w", ".set2r");
  if ((nowSet1 && !prevSets.set1) || (nowSet2 && !prevSets.set2)) {
    celebrateSetRow(setRow, "SET LOCKED");
  }
  setCompletionState[name] = { set1: nowSet1, set2: nowSet2 };

  const wasComplete = exerciseCompletionState[name];
  const isComplete = exerciseIsComplete(card);
  if (isComplete && !wasComplete) {
    const data = getData();
    const history = getExerciseHistory(data.workouts, name);
    const currentVol = totalVolume({ exercises: [readEntryFromCard(card)] });
    const prevVol = history.lastSession ? totalVolume({ exercises: [history.lastSession] }) : null;
    const note = formatVolumeComparison(currentVol, prevVol) || `${Math.round(currentVol)}kg total volume`;
    celebrateExerciseComplete(card, `Exercise complete — ${note}`);
  }
  exerciseCompletionState[name] = isComplete;

  updateExerciseVisualStates();
  updateWorkoutProgress();
}

export function getMissionFocusPoints(data, day) {
  const exercises = getSessionExercises(data, day);
  const cues = [];
  exercises.forEach(x => {
    const def = data.exercises.find(e => e.name === x.name);
    if (def?.todayFocusCue && !cues.includes(def.todayFocusCue)) cues.push(def.todayFocusCue);
  });
  return cues.length ? cues.slice(0, 2) : ["Controlled eccentrics, full contractions, no ego reps."];
}

export function startMission(data) {
  const day = $("daySelect")?.value || Object.keys(data.trainingProgram)[0];
  if (!day || day === CREATE_CUSTOM_SESSION_VALUE) return;
  const displayName = customSessionForDay(data, day)?.name || day;
  showMissionStart(displayName, getMissionFocusPoints(data, day));
}

function readEntryFromCard(el) {
  const q = (sel) => el.querySelector(sel);
  const numOrNull = (sel) => { const f = q(sel); return (!f || f.value === "") ? null : Number(f.value); };
  return {
    warmup: q(".warmup").value,
    set1Weight: Number(q(".set1w").value || 0),
    set1Reps: Number(q(".set1r").value || 0),
    set1RIR: numOrNull(".set1rir"),
    set2Weight: Number(q(".set2w").value || 0),
    set2Reps: Number(q(".set2r").value || 0),
    set2RIR: numOrNull(".set2rir"),
    optionalSet3Weight: numOrNull(".set3w"),
    optionalSet3Reps: numOrNull(".set3r"),
    RPE: numOrNull(".rpe"),
    technicalFailureReached: q(".techfail").checked,
    formQuality: numOrNull(".formq"),
    targetMuscleConnection: numOrNull(".mmc"),
    notes: q(".exnotes").value,
    rangeOfMotionQuality: numOrNull(".romq"),
    tempoControl: numOrNull(".tempoq"),
    painFlag: q(".painflag") ? q(".painflag").checked : false,
    formNote: q(".formnote") ? q(".formnote").value : "",
    validRepChecklist: Object.fromEntries([...el.querySelectorAll(".rep-check")].map(cb => [cb.dataset.check, cb.checked]))
  };
}

// ---- Draft helpers ----

function isEntryEmpty(entry) {
  if (!entry) return true;
  const zeroableEmpty = !entry.set1Weight && !entry.set1Reps && !entry.set2Weight && !entry.set2Reps;
  const optionalEmpty = ["set1RIR", "set2RIR", "optionalSet3Weight", "optionalSet3Reps", "RPE",
    "formQuality", "targetMuscleConnection", "rangeOfMotionQuality", "tempoControl"].every(k => entry[k] == null);
  const textEmpty = !entry.warmup && !entry.notes && !entry.formNote;
  const flagsEmpty = !entry.technicalFailureReached && !entry.painFlag;
  const checklistEmpty = !entry.validRepChecklist || Object.values(entry.validRepChecklist).every(v => !v);
  return zeroableEmpty && optionalEmpty && textEmpty && flagsEmpty && checklistEmpty;
}

function isDraftEmpty(exercisesMap) {
  return Object.values(exercisesMap || {}).every(isEntryEmpty);
}

function buildDraftFromDOM(day) {
  const exercises = {};
  document.querySelectorAll("#workoutList .exercise").forEach(card => {
    const name = card.dataset.exercise;
    const aiAnswerEl = card.querySelector(".ai-answer");
    exercises[name] = {
      ...readEntryFromCard(card),
      expanded: expandedExercises.has(name),
      aiAdvice: (aiAnswerEl && !aiAnswerEl.hidden) ? aiAnswerEl.innerHTML : null
    };
  });
  return { day, lastEditedAt: new Date().toISOString(), status: "draft", exercises };
}

function fillField(card, selector, value, { allowZero = false } = {}) {
  const field = card.querySelector(selector);
  if (!field) return;
  const hasValue = allowZero ? value != null : !!value;
  if (!hasValue) return;
  if (field.type === "checkbox") field.checked = !!value;
  else field.value = value;
}

function applyEntryToCard(card, entry) {
  fillField(card, ".warmup", entry.warmup);
  fillField(card, ".set1w", entry.set1Weight);
  fillField(card, ".set1r", entry.set1Reps);
  fillField(card, ".set1rir", entry.set1RIR, { allowZero: true });
  fillField(card, ".set2w", entry.set2Weight);
  fillField(card, ".set2r", entry.set2Reps);
  fillField(card, ".set2rir", entry.set2RIR, { allowZero: true });
  fillField(card, ".set3w", entry.optionalSet3Weight, { allowZero: true });
  fillField(card, ".set3r", entry.optionalSet3Reps, { allowZero: true });
  fillField(card, ".rpe", entry.RPE, { allowZero: true });
  fillField(card, ".techfail", entry.technicalFailureReached);
  fillField(card, ".formq", entry.formQuality, { allowZero: true });
  fillField(card, ".mmc", entry.targetMuscleConnection, { allowZero: true });
  fillField(card, ".exnotes", entry.notes);
  fillField(card, ".romq", entry.rangeOfMotionQuality, { allowZero: true });
  fillField(card, ".tempoq", entry.tempoControl, { allowZero: true });
  fillField(card, ".painflag", entry.painFlag);
  fillField(card, ".formnote", entry.formNote);
  card.querySelectorAll(".rep-check").forEach(cb => {
    if (entry.validRepChecklist?.[cb.dataset.check]) cb.checked = true;
  });
  if (entry.aiAdvice) {
    const aiEl = card.querySelector(".ai-answer");
    if (aiEl) { aiEl.innerHTML = entry.aiAdvice; aiEl.hidden = false; }
  }
}

function applyDraftAfterRender(data, day) {
  const draft = data.activeWorkoutDraft;
  const resumeBanner = $("draftResumeBanner");

  if (draft && draft.day === day && !isDraftEmpty(draft.exercises)) {
    document.querySelectorAll("#workoutList .exercise").forEach(card => {
      const entry = draft.exercises[card.dataset.exercise];
      if (entry) {
        applyEntryToCard(card, entry);
        if (entry.expanded) expandedExercises.add(card.dataset.exercise);
      }
    });
    // Re-apply expanded state to any card whose guide should now show as open.
    document.querySelectorAll("#workoutList .exercise").forEach(card => {
      const name = card.dataset.exercise;
      if (!expandedExercises.has(name)) return;
      const guide = card.querySelector(".form-guide");
      const btn = card.querySelector(".technique-btn");
      if (guide) guide.hidden = false;
      if (btn) {
        btn.setAttribute("aria-expanded", "true");
        btn.querySelector(".technique-btn-icon").textContent = "▴";
        btn.querySelector(".technique-btn-label").textContent = "Hide Technique";
      }
    });
    if (resumeBanner) resumeBanner.hidden = true;
    if (!hasShownRestoredOnce) { updateDraftStatusUI("restored"); hasShownRestoredOnce = true; }
    else updateDraftStatusUI("saved");
    conflictAsked = false;
    return;
  }

  if (draft && draft.day && draft.day !== day && !isDraftEmpty(draft.exercises)) {
    if (resumeBanner) {
      resumeBanner.hidden = false;
      resumeBanner.innerHTML = `You have an unsaved draft for "${esc(draft.day)}". ` +
        `<button type="button" id="resumeDraftInlineBtn" class="secondary">Resume that draft</button> ` +
        `<button type="button" id="discardOtherDraftBtn" class="secondary">Discard it</button>`;
    }
    updateDraftStatusUI("clean");
    return;
  }

  if (resumeBanner) resumeBanner.hidden = true;
  updateDraftStatusUI("clean");
}

function updateDraftStatusUI(state, extraDay) {
  const el = $("draftStatus");
  const clearBtn = $("clearDraftBtn");
  if (!el) return;
  const labels = {
    unsaved: "Unsaved changes…",
    saved: "Draft saved",
    restored: "Draft restored",
    workoutSaved: "Workout saved",
    blocked: extraDay ? `Not saved here — switch back to "${extraDay}" to keep that draft, or discard it first.` : "Not saved.",
    error: "Could not save — your values are still here. Please try again."
  };
  const text = labels[state];
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    if (clearBtn) clearBtn.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = text;
  el.className = `draft-status draft-status-${state}`;
  if (clearBtn) clearBtn.hidden = false;
}

function scheduleDraftAutosave() {
  updateDraftStatusUI("unsaved");
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(persistDraftFromDOM, 500);
}

function persistDraftFromDOM() {
  const day = $("daySelect")?.value;
  if (!day || !document.querySelector("#workoutList .exercise")) return;
  const data = getData();
  const existing = data.activeWorkoutDraft;

  if (existing && existing.day && existing.day !== day && !isDraftEmpty(existing.exercises) && !conflictAsked) {
    conflictAsked = true;
    const discard = confirm(
      `You have unsaved workout values for "${existing.day}". Press OK to discard that draft and continue logging ` +
      `"${day}". Press Cancel to stop typing here and switch back to "${existing.day}" to save or keep it.`
    );
    if (!discard) {
      updateDraftStatusUI("blocked", existing.day);
      return;
    }
  }

  const draft = buildDraftFromDOM(day);
  if (isDraftEmpty(draft.exercises)) {
    if (existing && existing.day === day) {
      data.activeWorkoutDraft = null;
      saveData(data);
    }
    updateDraftStatusUI("clean");
    return;
  }
  draft.startedAt = (existing && existing.day === day && existing.startedAt) ? existing.startedAt : draft.lastEditedAt;
  data.activeWorkoutDraft = draft;
  saveData(data);
  conflictAsked = false;
  updateDraftStatusUI("saved");
}

function clearDraft() {
  const data = getData();
  if (!data.activeWorkoutDraft) return;
  if (!confirm("Clear this draft? Any unsaved values will be permanently discarded.")) return;
  data.activeWorkoutDraft = null;
  saveData(data);
  conflictAsked = false;
  renderWorkoutForm(getData());
}

function resumeDraftForCurrentDaySelect() {
  const data = getData();
  const draft = data.activeWorkoutDraft;
  if (!draft) return;
  $("daySelect").value = draft.day;
  conflictAsked = false;
  renderWorkoutForm(getData());
}

function discardOtherDayDraft() {
  if (!confirm("Discard the unsaved draft for the other day? This cannot be undone.")) return;
  const data = getData();
  data.activeWorkoutDraft = null;
  saveData(data);
  conflictAsked = false;
  renderWorkoutForm(getData());
}

function buildCompletionSummary(workout, exercises, data, prs) {
  const setCount = exercises.reduce((sum, e) => {
    let c = 0;
    if (Number(e.set1Reps) > 0) c++;
    if (Number(e.set2Reps) > 0) c++;
    if (Number(e.optionalSet3Reps) > 0) c++;
    return sum + c;
  }, 0);
  const totalVol = exercises.reduce((sum, e) => sum + totalVolume({ exercises: [e] }), 0);
  const progressionCandidates = exercises.filter(e => e.increaseNextWeek).map(e => e.name);
  const progressionStatuses = exercises.map(e => ({ name: e.name, status: e.progressionStatus || "Insufficient Data" }));
  const musclesTrained = [...new Set(exercises.map(e => {
    const def = data.exercises.find(d => d.name === e.name);
    return def?.primaryMuscle;
  }).filter(Boolean))];
  const nextObjective = progressionCandidates.length
    ? `Add reps or load to ${progressionCandidates[0]} next session.`
    : "Repeat this session's loads with cleaner form and full range of motion.";
  return {
    day: workout.sessionName || workout.day,
    date: workout.date,
    exerciseCount: exercises.length,
    setCount,
    totalVolume: totalVol,
    progressionCandidates,
    progressionStatuses,
    musclesTrained,
    prs,
    nextObjective
  };
}

const SESSION_REVIEW_SELECT_FIELDS = ["srEnergy", "srMuscularFatigue", "srCardioFatigue", "srTechniqueQuality", "srFocus"];
const SESSION_REVIEW_CHECKBOX_FIELDS = [
  "srGripLimitation", "srPainOrDiscomfort", "srPreWorkoutNutritionMet", "srPostWorkoutNutritionMet",
  "srHydrationMet", "srRestPeriodsFollowed", "srExerciseSetupChanged"
];

/** Reads the static Session Review form (index.html #sessionReviewSection) at save time. Every field is optional. */
function readSessionReviewFromLiveForm() {
  const review = {
    performanceVsExpected: $("srPerformanceVsExpected")?.value || null,
    mainLimitingFactor: $("srMainLimitingFactor")?.value || null,
    energy: $("srEnergy")?.value ? Number($("srEnergy").value) : null,
    muscularFatigue: $("srMuscularFatigue")?.value ? Number($("srMuscularFatigue").value) : null,
    cardioFatigue: $("srCardioFatigue")?.value ? Number($("srCardioFatigue").value) : null,
    gripLimitation: $("srGripLimitation")?.checked || false,
    painOrDiscomfort: $("srPainOrDiscomfort")?.checked || false,
    painNote: $("srPainNote")?.value || "",
    techniqueQuality: $("srTechniqueQuality")?.value ? Number($("srTechniqueQuality").value) : null,
    focus: $("srFocus")?.value ? Number($("srFocus").value) : null,
    preWorkoutNutritionMet: $("srPreWorkoutNutritionMet")?.checked || false,
    postWorkoutNutritionMet: $("srPostWorkoutNutritionMet")?.checked || false,
    hydrationMet: $("srHydrationMet")?.checked || false,
    restPeriodsFollowed: $("srRestPeriodsFollowed")?.checked || false,
    exerciseSetupChanged: $("srExerciseSetupChanged")?.checked || false,
    setupChangeNote: $("srSetupChangeNote")?.value || "",
    notes: $("srNotes")?.value || "",
    reviewedAt: null
  };
  const hasAnyInput = review.performanceVsExpected || review.mainLimitingFactor || review.energy != null ||
    review.muscularFatigue != null || review.cardioFatigue != null || review.gripLimitation || review.painOrDiscomfort ||
    review.techniqueQuality != null || review.focus != null || review.preWorkoutNutritionMet || review.postWorkoutNutritionMet ||
    review.hydrationMet || review.restPeriodsFollowed || review.exerciseSetupChanged || review.notes.trim();
  review.reviewedAt = hasAnyInput ? new Date().toISOString() : null;
  return review;
}

function resetSessionReviewForm() {
  $("srPerformanceVsExpected") && ($("srPerformanceVsExpected").value = "");
  $("srMainLimitingFactor") && ($("srMainLimitingFactor").value = "");
  SESSION_REVIEW_SELECT_FIELDS.forEach(id => { if ($(id)) $(id).value = ""; });
  SESSION_REVIEW_CHECKBOX_FIELDS.forEach(id => { if ($(id)) $(id).checked = false; });
  ["srPainNote", "srSetupChangeNote", "srNotes"].forEach(id => { if ($(id)) $(id).value = ""; });
}

export function saveWorkout() {
  const data = getData();
  const day = $("daySelect").value;
  const now = new Date().toISOString();
  let summary = null;
  try {
    const prs = [];
    const readiness = readinessScore(data);
    const rawMealCompliance = recoveryMealCompliance(data.mealLogs);
    const mealCompliance = {
      ...rawMealCompliance,
      preWorkoutComplete: rawMealCompliance.preWorkoutComplete || !!preWorkoutReadinessToday(data.preWorkoutLogs)
    };
    const exercises = [...document.querySelectorAll("#workoutList .exercise")].map(el => {
      const name = el.dataset.exercise;
      const exerciseDef = data.exercises.find(e => e.name === name);
      // Gym App spec Part 2: today's selected equipment variant is attached to the saved
      // entry, and history/PR comparison is scoped to that exact variant only — a heavier
      // number logged on a different piece of equipment can never count as this variant's PR.
      const selectedVariantId = exerciseDef ? selectedVariantIdFor(data, exerciseDef, day) : null;
      const history = getExerciseHistory(data.workouts, name, { variantId: selectedVariantId, canonicalVariantId: exerciseDef?.id });
      const entry = { exerciseId: exerciseDef?.id || null, selectedVariantId, name, ...readEntryFromCard(el), createdAt: now, updatedAt: now };
      if (exerciseDef?.distanceBased) {
        const trackLength = data.profile?.functionalTrackLengthMetres || 15;
        entry.trackLengthMetres = trackLength;
        entry.calculatedDistanceMetres = calcDistance(entry, trackLength);
        entry.weightPerHand = entry.set1Weight;
      }
      const rec = recommendProgression(entry, exerciseDef, history.lastSession);
      entry.increaseNextWeek = rec.increaseNextWeek;
      entry.progressionRecommendation = rec.recommendation;

      const statusResult = exerciseProgressionStatus(entry, exerciseDef, { previousEntry: history.lastSession, readiness, mealCompliance });
      entry.progressionStatus = statusResult.status;

      const newVol = totalVolume({ exercises: [entry] });
      const prevBestVol = history.previousBest ? totalVolume({ exercises: [history.previousBest] }) : 0;
      if (history.previousBest && newVol > 0 && newVol > prevBestVol) {
        prs.push({ name, oldBest: formatSet(history.previousBest), newBest: formatSet(entry) });
      }
      return entry;
    });
    // Captured once, at the moment of saving, so a later Programme Editor change to this
    // day's nutrition targets can never retroactively alter what was actually recommended
    // for this specific completed session (see js/session-nutrition.js).
    const startedAt = (data.activeWorkoutDraft && data.activeWorkoutDraft.day === day && data.activeWorkoutDraft.startedAt)
      ? data.activeWorkoutDraft.startedAt : now;
    const sessionNutritionSnapshot = structuredClone(getSessionNutritionForDay(data, day));
    const sessionReview = readSessionReviewFromLiveForm();

    // Historical snapshot + versioning (spec section 26): captured once, at the exact
    // moment of saving, so a later constraint-case status change or task-list state can
    // never retroactively alter what this specific completed session's record shows.
    const activeInterventionSnapshot = structuredClone(
      (data.constraintCases || []).filter(c => ["active", "improving", "escalated"].includes(c.status))
    );
    const nowDate = new Date();
    const taskCompletionSnapshot = structuredClone(
      generateProgressTasks(data, nowDate)
        .filter(t => [TASK_SECTIONS.ACT_NOW, TASK_SECTIONS.COMPLETE_TODAY].includes(t.section))
        .map(t => ({ id: t.id, title: t.title, priority: t.priority, section: t.section }))
    );

    // Custom Session Builder (contingency training feature): a custom session's "day" is
    // its own synthetic key (never a real programme day, so it can never be mistaken for
    // completing that programme day) — programDay stays null since a split/redistributed
    // session usually isn't "standing in" for exactly one day, sessionName carries the
    // human-readable name instead, and sourceSessions/constraintReason are copied from
    // the plan so a completed workout still shows where its exercises originally came
    // from even if the plan is edited or deleted later.
    const activeCustomSession = customSessionForDay(data, day);
    const workout = {
      id: uid(),
      date: new Date().toLocaleDateString("en-CA"),
      day,
      programDay: activeCustomSession ? null : day,
      sessionName: activeCustomSession ? activeCustomSession.name : day,
      exercises,
      startedAt, completedAt: now, sessionNutritionSnapshot, sessionReview,
      activeInterventionSnapshot, taskCompletionSnapshot,
      engineVersion: `${CONSTRAINT_ENGINE_VERSION}+${CONSTRAINT_LIBRARY_VERSION}`,
      isCustomSession: !!activeCustomSession,
      customSessionId: activeCustomSession ? activeCustomSession.id : null,
      sourceSessions: activeCustomSession ? activeCustomSession.sourceSessions : [],
      constraintReason: activeCustomSession ? (activeCustomSession.constraintReason || null) : null
    };
    data.workouts.push(workout);
    data.activeWorkoutDraft = null;
    saveData(data);
    summary = buildCompletionSummary(workout, exercises, data, prs);
    resetSessionReviewForm();
  } catch (err) {
    console.error("[Project Reacher] Failed to save workout", err);
    updateDraftStatusUI("error");
    alert("Could not save this workout: " + (err?.message || "unknown error") + ". Your entered values are still here — please try again.");
    return;
  }
  conflictAsked = false;
  clearTimeout(draftSaveTimer);
  refreshAll();
  updateDraftStatusUI("workoutSaved");
  setTimeout(() => updateDraftStatusUI("clean"), 2500);
  if (summary) showOperationComplete(summary);
}

function handleToggleGuide(toggle) {
  const card = toggle.closest(".exercise");
  const guide = card?.querySelector(".form-guide");
  const btn = card?.querySelector(".technique-btn");
  if (!guide) return;
  guide.hidden = !guide.hidden;
  const name = toggle.dataset.toggleGuide;
  const isExpanded = !guide.hidden;
  if (isExpanded) expandedExercises.add(name); else expandedExercises.delete(name);
  if (btn) {
    btn.setAttribute("aria-expanded", String(isExpanded));
    btn.setAttribute("aria-label", `${isExpanded ? "Hide" : "See"} technique guide for ${name}`);
    btn.querySelector(".technique-btn-icon").textContent = isExpanded ? "▴" : "🎯";
    btn.querySelector(".technique-btn-label").textContent = isExpanded ? "Hide Technique" : "See Technique";
  }
}

function handleAskAI(btn) {
  const card = btn.closest(".exercise");
  if (!card) return;
  const data = getData();
  const name = card.dataset.exercise;
  const exerciseDef = data.exercises.find(e => e.name === name);
  const history = getExerciseHistory(data.workouts, name);
  const entry = readEntryFromCard(card);
  const advice = localExerciseAdvice(entry, exerciseDef, history.lastSession);

  const el = card.querySelector(".ai-answer");
  if (!el) return;
  el.hidden = false;
  const severity = advice.safetyWarning ? "red" : advice.formLimitingProgression ? "amber" : "green";
  const severityLabel = severity === "red" ? "Adjust" : severity === "amber" ? "Monitor" : "On Track";
  el.innerHTML = `
    <span class="ai-severity sev-${severity}">${esc(severityLabel)}</span>
    <p><strong>Quick local analysis</strong> (rule-based from your logged data, not a live AI chat):</p>
    <p>Set counted: ${advice.setCounted ? "Yes" : "Not yet — reps below target range"}</p>
    <p>Next time: <strong>${advice.progressionDecision === "increase" ? "Increase load" : "Hold load"}</strong> — ${esc(advice.reason)}</p>
    <p>Focus next set: ${esc(advice.nextSetCue)}</p>
    ${advice.formLimitingProgression ? "<p>Form, range of motion, or tempo is currently limiting progression on this exercise.</p>" : ""}
    ${advice.substitutionSuggested ? "<p>Worth considering a substitution for this movement.</p>" : ""}
    ${advice.safetyWarning ? `<div class="warning-banner">${esc(advice.safetyWarning)}</div>` : ""}
  `;
}

export function setupTrainEventDelegation() {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-toggle-guide]");
    if (toggle) { handleToggleGuide(toggle); scheduleDraftAutosave(); updateExerciseVisualStates(); return; }

    const askBtn = e.target.closest(".ask-ai-btn");
    if (askBtn) { handleAskAI(askBtn); scheduleDraftAutosave(); return; }

    const clearBtn = e.target.closest("#clearDraftBtn");
    if (clearBtn) { clearDraft(); return; }

    const resumeInline = e.target.closest("#resumeDraftInlineBtn");
    if (resumeInline) { resumeDraftForCurrentDaySelect(); return; }

    const discardOther = e.target.closest("#discardOtherDraftBtn");
    if (discardOther) { discardOtherDayDraft(); return; }

    const resumeDash = e.target.closest("#resumeDraftBtn");
    if (resumeDash) {
      document.querySelector('.nav-drawer .nav-btn[data-tab="train"], .side-nav .nav-btn[data-tab="train"]')?.click();
      resumeDraftForCurrentDaySelect();
      return;
    }

    const saveReviewBtn = e.target.closest("[data-save-review]");
    if (saveReviewBtn) { saveSessionReviewForWorkout(saveReviewBtn.dataset.saveReview, saveReviewBtn.closest(".session-review-editor")); return; }
  });

  document.addEventListener("input", (e) => {
    if (!e.target.closest("#workoutList")) return;
    scheduleDraftAutosave();
    handleWorkoutInputReward(e.target);
    updateDistanceReadout(e.target.closest(".exercise"));
  });
  document.addEventListener("change", (e) => {
    if (!e.target.closest("#workoutList")) return;
    scheduleDraftAutosave();
    handleWorkoutInputReward(e.target);
    updateDistanceReadout(e.target.closest(".exercise"));
  });
}

const SELECT_1TO5 = `<option value="">Not set</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>`;

function selectedAttr(current, value) { return String(current) === String(value) ? "selected" : ""; }

/** Post-hoc-editable Session Review block for a saved workout (spec 21: reviews may be finished after saving). */
function sessionReviewEditorHtml(w) {
  const r = w.sessionReview || DEFAULT_SESSION_REVIEW;
  const missing = sessionReviewMissingFields(r);
  return `
    <details class="category-section session-review-editor" data-workout-id="${esc(w.id)}">
      <summary><strong>Session Review</strong>${missing.length ? ` <span class="badge status-under">Incomplete</span>` : ` <span class="badge status-on-target">Complete</span>`}</summary>
      <div class="form-grid">
        <label class="small">Performance vs expected
          <select data-field="performanceVsExpected">
            <option value="">Not set</option>
            <option value="better" ${selectedAttr(r.performanceVsExpected, "better")}>Better than expected</option>
            <option value="similar" ${selectedAttr(r.performanceVsExpected, "similar")}>Similar to expected</option>
            <option value="worse" ${selectedAttr(r.performanceVsExpected, "worse")}>Worse than expected</option>
          </select>
        </label>
        <label class="small">Main limiting factor
          <select data-field="mainLimitingFactor">
            <option value="">Not set</option>
            ${["none", "grip", "energy", "technique", "pain", "equipment", "cardio", "muscular-fatigue", "other"].map(v =>
              `<option value="${v}" ${selectedAttr(r.mainLimitingFactor, v)}>${esc(v === "none" ? "Nothing limited me" : v === "muscular-fatigue" ? "Muscular fatigue" : v[0].toUpperCase() + v.slice(1))}</option>`).join("")}
          </select>
        </label>
        <label class="small">Energy (1-5) <select data-field="energy">${SELECT_1TO5.replace(`>${r.energy}<`, ` selected>${r.energy}<`)}</select></label>
        <label class="small">Muscular fatigue (1-5) <select data-field="muscularFatigue">${SELECT_1TO5.replace(`>${r.muscularFatigue}<`, ` selected>${r.muscularFatigue}<`)}</select></label>
        <label class="small">Cardiovascular fatigue (1-5) <select data-field="cardioFatigue">${SELECT_1TO5.replace(`>${r.cardioFatigue}<`, ` selected>${r.cardioFatigue}<`)}</select></label>
        <label class="small">Technique quality (1-5) <select data-field="techniqueQuality">${SELECT_1TO5.replace(`>${r.techniqueQuality}<`, ` selected>${r.techniqueQuality}<`)}</select></label>
        <label class="small">Focus (1-5) <select data-field="focus">${SELECT_1TO5.replace(`>${r.focus}<`, ` selected>${r.focus}<`)}</select></label>
      </div>
      <div class="checklist-row"><input type="checkbox" data-field="gripLimitation" ${r.gripLimitation ? "checked" : ""}><span>Grip limitation</span></div>
      <div class="checklist-row"><input type="checkbox" data-field="painOrDiscomfort" ${r.painOrDiscomfort ? "checked" : ""}><span>Pain or discomfort</span></div>
      <input type="text" data-field="painNote" value="${esc(r.painNote || "")}" placeholder="Pain/discomfort note (optional)">
      <div class="checklist-row"><input type="checkbox" data-field="preWorkoutNutritionMet" ${r.preWorkoutNutritionMet ? "checked" : ""}><span>Pre-workout nutrition target met</span></div>
      <div class="checklist-row"><input type="checkbox" data-field="postWorkoutNutritionMet" ${r.postWorkoutNutritionMet ? "checked" : ""}><span>Post-workout nutrition target met</span></div>
      <div class="checklist-row"><input type="checkbox" data-field="hydrationMet" ${r.hydrationMet ? "checked" : ""}><span>Hydration target met</span></div>
      <div class="checklist-row"><input type="checkbox" data-field="restPeriodsFollowed" ${r.restPeriodsFollowed ? "checked" : ""}><span>Planned rest periods followed</span></div>
      <div class="checklist-row"><input type="checkbox" data-field="exerciseSetupChanged" ${r.exerciseSetupChanged ? "checked" : ""}><span>Exercise setup changed from usual</span></div>
      <input type="text" data-field="setupChangeNote" value="${esc(r.setupChangeNote || "")}" placeholder="Setup change note (optional)">
      <textarea data-field="notes" placeholder="Session notes (optional, free text)">${esc(r.notes || "")}</textarea>
      <div class="actions"><button type="button" class="secondary" data-save-review="${esc(w.id)}">Save Review</button></div>
    </details>`;
}

/** Post-hoc Session Review completion from Workout History — patches ONLY sessionReview on an already-saved workout, never the logged exercises/date/etc. */
function saveSessionReviewForWorkout(workoutId, containerEl) {
  if (!containerEl) return;
  const field = (name) => containerEl.querySelector(`[data-field="${name}"]`);
  const selectVal = (name) => field(name)?.value || null;
  const numVal = (name) => (field(name)?.value ? Number(field(name).value) : null);
  const checked = (name) => field(name)?.checked || false;
  const textVal = (name) => field(name)?.value || "";

  const review = {
    performanceVsExpected: selectVal("performanceVsExpected"), mainLimitingFactor: selectVal("mainLimitingFactor"),
    energy: numVal("energy"), muscularFatigue: numVal("muscularFatigue"), cardioFatigue: numVal("cardioFatigue"),
    gripLimitation: checked("gripLimitation"), painOrDiscomfort: checked("painOrDiscomfort"), painNote: textVal("painNote"),
    techniqueQuality: numVal("techniqueQuality"), focus: numVal("focus"),
    preWorkoutNutritionMet: checked("preWorkoutNutritionMet"), postWorkoutNutritionMet: checked("postWorkoutNutritionMet"),
    hydrationMet: checked("hydrationMet"), restPeriodsFollowed: checked("restPeriodsFollowed"),
    exerciseSetupChanged: checked("exerciseSetupChanged"), setupChangeNote: textVal("setupChangeNote"),
    notes: textVal("notes"), reviewedAt: new Date().toISOString()
  };

  const data = getData();
  const workout = data.workouts.find(w => w.id === workoutId);
  if (!workout) return;
  workout.sessionReview = review;
  saveData(data);
  window.dispatchEvent(new CustomEvent("reacher:refresh"));
}

export function renderWorkoutHistory(data) {
  const full = $("workoutHistory");
  if (full) {
    full.innerHTML = data.workouts.slice().reverse().map(w => `
      <details class="history-item expandable-card">
        <summary><strong>${esc(w.date)}</strong> · ${w.isCustomSession ? `<span class="badge custom-session-label">CUSTOM SESSION</span> ` : ""}${esc(w.sessionName || w.day)} · Volume ${Math.round(totalVolume(w))}kg</summary>
        <p class="small">${(w.exercises || []).map(e => `${esc(e.name)}: ${e.set1Weight}x${e.set1Reps}, ${e.set2Weight}x${e.set2Reps}${e.increaseNextWeek ? " ⬆️" : ""}`).join("<br>")}</p>
        ${w.constraintReason ? `<p class="small">Reason: ${esc(w.constraintReason)}</p>` : ""}
        ${renderSavedWorkoutSessionNutrition(w, data)}
        ${sessionReviewEditorHtml(w)}
        <div class="actions">
          <button class="danger" data-delete="workouts" data-id="${w.id}">Delete</button>
        </div>
      </details>`).join("") || "<p class='small'>No workouts logged yet.</p>";
  }
  const recent = $("sessionHistory");
  if (recent) {
    recent.innerHTML = data.workouts.slice(-5).reverse().map(w => `
      <div class="history-item"><strong>${esc(w.date)}</strong> · ${w.isCustomSession ? `<span class="badge custom-session-label">CUSTOM SESSION</span> ` : ""}${esc(w.sessionName || w.day)} · Volume ${Math.round(totalVolume(w))}kg</div>
    `).join("") || "<p class='small'>No workouts logged yet.</p>";
  }
}

export function renderMiniVolumeChart(data) {
  const el = $("volumeChart");
  if (!el) return;
  const workouts = data.workouts.slice(-10);
  el.innerHTML = workouts.length ? workouts.map(w => {
    const v = totalVolume(w);
    const max = Math.max(...workouts.map(totalVolume), 1);
    const h = Math.max(0, Math.min(100, (v / max) * 100));
    return `<div class="mini-bar-wrap"><div class="mini-bar" style="height:${h}%"></div><span>${Math.round(v)}</span></div>`;
  }).join("") : "<p class='small'>Log workouts to see volume trends.</p>";
}

export function renderHistoricalSummary(data) {
  const container = $("historicalSummary");
  if (!container) return;
  const all = [...(data.historical || []), ...data.workouts.flatMap(w => (w.exercises || []).map(e => ({
    week: w.date,
    exercise: e.name,
    weight: Math.max(e.set1Weight || 0, e.set2Weight || 0),
    reps: Math.max(e.set1Reps || 0, e.set2Reps || 0),
    volume: (e.set1Weight || 0) * (e.set1Reps || 0) + (e.set2Weight || 0) * (e.set2Reps || 0)
  })))];

  const byExercise = {};
  all.forEach(r => { (byExercise[r.exercise] ||= []).push(r); });
  container.innerHTML = Object.entries(byExercise).map(([name, rows]) => {
    const first = rows[0];
    const best = rows.reduce((a, b) => (b.volume || 0) > (a.volume || 0) ? b : a, rows[0]);
    return `<div class="history-item"><strong>${esc(name)}</strong><br>First: ${first.weight || "-"}kg x ${first.reps || "-"} · Best volume: ${Math.round(best.volume || 0)}kg</div>`;
  }).join("");
}

export function renderPrTracker(data) {
  const el = $("prTracker");
  if (!el) return;
  el.innerHTML = data.prs.map(p => `
    <div class="history-item">
      <strong>${esc(p.exerciseName)}</strong> · Goal: ${esc(p.goal)}
      <div class="form-grid">
        <label>Current Best<input data-pr="${p.id}" data-field="currentBest" value="${esc(p.currentBest || "")}"></label>
        <label>Date Achieved<input type="date" data-pr="${p.id}" data-field="dateAchieved" value="${p.dateAchieved || ""}"></label>
      </div>
      <textarea data-pr="${p.id}" data-field="notes" placeholder="Notes">${esc(p.notes || "")}</textarea>
    </div>`).join("");

  el.querySelectorAll("[data-pr]").forEach(input => {
    input.addEventListener("change", () => {
      const d = getData();
      const pr = d.prs.find(x => x.id === input.dataset.pr);
      if (!pr) return;
      pr[input.dataset.field] = input.value;
      saveData(d);
    });
  });
}

/** Farmer's Carry-only distance analytics card — hidden entirely until the exercise has been logged at least once. */
export function renderFarmersCarryAnalytics(data) {
  const card = $("farmersCarryAnalyticsCard");
  const el = $("farmersCarryAnalytics");
  if (!card || !el) return;
  const stats = farmersCarryAnalytics(data.workouts);
  if (!stats.hasData) { card.hidden = true; return; }
  card.hidden = false;
  el.innerHTML = `
    <div class="badge-row">
      <span class="badge">Longest carry: ${stats.longestCarryDistance}m</span>
      <span class="badge">Heaviest carry: ${stats.heaviestCarry}kg/hand</span>
      <span class="badge">Highest volume: ${stats.highestVolume}</span>
      <span class="badge">Estimated total load: ${stats.estimatedTotalLoad}</span>
    </div>
    <p class="small">This month: ${stats.monthlyCarryDistance}m · This year: ${stats.yearlyCarryDistance}m</p>
    <p class="small">Average distance: ${stats.averageDistance}m · Average load: ${stats.averageLoad}kg/hand · Sessions logged: ${stats.sessionsLogged}</p>
    <p class="small">Trend: <strong>${esc(stats.trend)}</strong></p>
  `;
}
