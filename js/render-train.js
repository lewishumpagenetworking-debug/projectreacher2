import { $, esc } from "./dom.js";
import { recommendProgression } from "./calculations.js";
import { getData, saveData, uid } from "./data.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

function totalVolume(entry) {
  return (entry.exercises || []).reduce((sum, e) => {
    const s1 = (Number(e.set1Weight) || 0) * (Number(e.set1Reps) || 0);
    const s2 = (Number(e.set2Weight) || 0) * (Number(e.set2Reps) || 0);
    return sum + s1 + s2;
  }, 0);
}

export function renderDaySelect(data) {
  const select = $("daySelect");
  const days = Object.keys(data.trainingProgram);
  select.innerHTML = days.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
}

export function renderWorkoutForm(data) {
  const day = $("daySelect").value || Object.keys(data.trainingProgram)[0];
  const exercises = data.trainingProgram[day] || [];
  $("workoutList").innerHTML = exercises.map((x, i) => `
    <div class="exercise" data-exercise="${esc(x.name)}">
      <h3>${i + 1}. ${esc(x.name)}</h3>
      <div class="small">Target: ${esc(x.repRange)} · ${esc(x.note || "")}</div>
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
    </div>
  `).join("");
}

export function saveWorkout() {
  const data = getData();
  const day = $("daySelect").value;
  const now = new Date().toISOString();
  const exercises = [...document.querySelectorAll("#workoutList .exercise")].map(el => {
    const name = el.dataset.exercise;
    const exerciseDef = data.exercises.find(e => e.name === name);
    const entry = {
      exerciseId: exerciseDef?.id || null,
      name,
      warmup: el.querySelector(".warmup").value,
      set1Weight: Number(el.querySelector(".set1w").value || 0),
      set1Reps: Number(el.querySelector(".set1r").value || 0),
      set1RIR: el.querySelector(".set1rir").value === "" ? null : Number(el.querySelector(".set1rir").value),
      set2Weight: Number(el.querySelector(".set2w").value || 0),
      set2Reps: Number(el.querySelector(".set2r").value || 0),
      set2RIR: el.querySelector(".set2rir").value === "" ? null : Number(el.querySelector(".set2rir").value),
      optionalSet3Weight: el.querySelector(".set3w").value === "" ? null : Number(el.querySelector(".set3w").value),
      optionalSet3Reps: el.querySelector(".set3r").value === "" ? null : Number(el.querySelector(".set3r").value),
      RPE: el.querySelector(".rpe").value === "" ? null : Number(el.querySelector(".rpe").value),
      technicalFailureReached: el.querySelector(".techfail").checked,
      formQuality: el.querySelector(".formq").value === "" ? null : Number(el.querySelector(".formq").value),
      targetMuscleConnection: el.querySelector(".mmc").value === "" ? null : Number(el.querySelector(".mmc").value),
      notes: el.querySelector(".exnotes").value,
      createdAt: now,
      updatedAt: now
    };
    const rec = recommendProgression(entry, exerciseDef);
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
