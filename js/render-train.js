import { $, esc } from "./dom.js";
import { recommendProgression, getExerciseHistory, localExerciseAdvice } from "./calculations.js";
import { getData, saveData, uid } from "./data.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

// In-memory only — resets on page reload, i.e. "remembered for the current workout".
const expandedExercises = new Set();

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

export function renderDaySelect(data) {
  const select = $("daySelect");
  const days = Object.keys(data.trainingProgram);
  select.innerHTML = days.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
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
      <label>Range of Motion 1-5<input class="romq" type="number" min="1" max="5"></label>
      <label>Tempo Control 1-5<input class="tempoq" type="number" min="1" max="5"></label>
      <label>Pain/Discomfort<input class="painflag" type="checkbox"></label>
      <label>Form Note<input class="formnote" placeholder="quick note"></label>
    </div>

    <button type="button" class="secondary ask-ai-btn">Ask AI About This Exercise</button>
    <div class="ai-answer small" hidden></div>
  `;
}

export function renderWorkoutForm(data) {
  const day = $("daySelect").value || Object.keys(data.trainingProgram)[0];
  const exercises = data.trainingProgram[day] || [];

  $("workoutList").innerHTML = exercises.map((x, i) => {
    const exerciseDef = data.exercises.find(e => e.name === x.name);
    const history = getExerciseHistory(data.workouts, x.name);
    const isExpanded = expandedExercises.has(x.name);
    const recBadge = history.lastSession?.progressionRecommendation
      ? `<span class="badge ${history.lastSession.increaseNextWeek ? "status-on-target" : ""}">${history.lastSession.increaseNextWeek ? "⬆ Increase" : "Hold"}</span>`
      : "";

    return `
    <div class="exercise" data-exercise="${esc(x.name)}">
      <div class="exercise-header" data-toggle-guide="${esc(x.name)}">
        <div>
          <h3>${i + 1}. ${esc(x.name)}</h3>
          <div class="small">Target: ${esc(x.repRange)} · Last: ${formatSet(history.lastSession)} · Best: ${formatSet(history.previousBest)}</div>
          ${recBadge ? `<div class="badge-row">${recBadge}</div>` : ""}
        </div>
        <button type="button" class="chevron-btn">${isExpanded ? "▴ Form" : "▾ Form"}</button>
      </div>
      <div class="set-row">
        <label>Warm-up<input class="warmup" placeholder="Optional"></label>
        <label>Set 1 Weight<input class="set1w" type="number" step="0.5" placeholder="kg"></label>
        <label>Set 1 Reps<input class="set1r" type="number" placeholder="reps"></label>
        <label>Set 1 RIR<input class="set1rir" type="number" min="0" max="5" placeholder="~1 for compounds"></label>
        <label>Set 2 Weight<input class="set2w" type="number" step="0.5" placeholder="kg"></label>
        <label>Set 2 Reps<input class="set2r" type="number" placeholder="reps"></label>
        <label>Set 2 RIR<input class="set2rir" type="number" min="0" max="5" placeholder="0 = failure"></label>
        <label>Optional Set 3 Weight<input class="set3w" type="number" step="0.5" placeholder="kg"></label>
        <label>Optional Set 3 Reps<input class="set3r" type="number" placeholder="reps"></label>
        <label>RPE<input class="rpe" type="number" min="1" max="10"></label>
        <label>Technical Failure Reached<input class="techfail" type="checkbox"></label>
        <label>Form Quality 1-5<input class="formq" type="number" min="1" max="5"></label>
        <label>Target Muscle Connection 1-5<input class="mmc" type="number" min="1" max="5"></label>
        <label>Notes<input class="exnotes" placeholder="form / machine / pain"></label>
      </div>
      <div class="form-guide" ${isExpanded ? "" : "hidden"}>
        ${renderGuideContent(exerciseDef)}
      </div>
    </div>`;
  }).join("");
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

export function saveWorkout() {
  const data = getData();
  const day = $("daySelect").value;
  const now = new Date().toISOString();
  const exercises = [...document.querySelectorAll("#workoutList .exercise")].map(el => {
    const name = el.dataset.exercise;
    const exerciseDef = data.exercises.find(e => e.name === name);
    const history = getExerciseHistory(data.workouts, name);
    const entry = { exerciseId: exerciseDef?.id || null, name, ...readEntryFromCard(el), createdAt: now, updatedAt: now };
    const rec = recommendProgression(entry, exerciseDef, history.lastSession);
    entry.increaseNextWeek = rec.increaseNextWeek;
    entry.progressionRecommendation = rec.recommendation;
    return entry;
  });
  data.workouts.push({
    id: uid(),
    date: new Date().toLocaleDateString("en-CA"),
    day,
    programDay: day,
    sessionName: day,
    exercises
  });
  saveData(data);
  refreshAll();
  alert("Workout saved.");
}

function handleToggleGuide(toggle) {
  const card = toggle.closest(".exercise");
  const guide = card?.querySelector(".form-guide");
  const chevronBtn = card?.querySelector(".chevron-btn");
  if (!guide) return;
  guide.hidden = !guide.hidden;
  const name = toggle.dataset.toggleGuide;
  if (guide.hidden) expandedExercises.delete(name); else expandedExercises.add(name);
  if (chevronBtn) chevronBtn.textContent = guide.hidden ? "▾ Form" : "▴ Form";
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
  el.innerHTML = `
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
    if (toggle) { handleToggleGuide(toggle); return; }

    const askBtn = e.target.closest(".ask-ai-btn");
    if (askBtn) { handleAskAI(askBtn); return; }
  });
}

export function renderWorkoutHistory(data) {
  const full = $("workoutHistory");
  if (full) {
    full.innerHTML = data.workouts.slice().reverse().map(w => `
      <div class="history-item">
        <strong>${esc(w.date)}</strong> · ${esc(w.day)} · Volume ${Math.round(totalVolume(w))}kg<br>
        ${(w.exercises || []).map(e => `${esc(e.name)}: ${e.set1Weight}x${e.set1Reps}, ${e.set2Weight}x${e.set2Reps}${e.increaseNextWeek ? " ⬆️" : ""}`).join("<br>")}
        <div class="actions">
          <button class="danger" data-delete="workouts" data-id="${w.id}">Delete</button>
        </div>
      </div>`).join("") || "<p class='small'>No workouts logged yet.</p>";
  }
  const recent = $("sessionHistory");
  if (recent) {
    recent.innerHTML = data.workouts.slice(-5).reverse().map(w => `
      <div class="history-item"><strong>${esc(w.date)}</strong> · ${esc(w.day)} · Volume ${Math.round(totalVolume(w))}kg</div>
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
