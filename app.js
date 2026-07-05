
const START_WEIGHT = 73;
const TARGET_WEIGHT = 89;
const PROTEIN_TARGET = 170;

const historicalData = [
  { week: "Historic W1", exercise: "Bar Curl", weight: 35, reps: 10, volume: 350 },
  { week: "Historic W2", exercise: "Bar Curl", weight: 37.5, reps: 10, volume: 375 },
  { week: "Historic W3", exercise: "Bar Curl", weight: 40, reps: 8, volume: 320 },
  { week: "Historic W1", exercise: "Standing Calf Raise", weight: 60, reps: 12, volume: 720 }
];

const workouts = {
  "Day 1 - Upper Width": [
    ["Incline DB Press", "6-10", "Set 1: 1 RIR | Set 2: technical failure"],
    ["Neutral Grip Lat Pulldown", "8-12", "Weighted pull-up replacement"],
    ["Chest Supported Row", "8-12", "Upper back thickness"],
    ["Cable Lateral Raise", "12-15", "Both sets to technical failure"],
    ["Face Pull", "12-15", "Rear delts / shoulder health"],
    ["Hammer Curl", "10-12", "Brachialis / arm thickness"]
  ],
  "Day 2 - Lower Mass": [
    ["Hack Squat", "6-10", "Quads / total leg size"],
    ["Romanian Deadlift", "8-10", "Hamstrings / glutes"],
    ["Leg Press", "10-15", "High-output leg mass"],
    ["Leg Curl", "10-15", "Both sets to technical failure"],
    ["Standing Calf Raise", "12-20", "Controlled stretch and squeeze"]
  ],
  "Day 3 - Push": [
    ["Smith Incline Press", "6-10", "Upper chest priority"],
    ["Seated DB Shoulder Press", "8-10", "Shoulder mass"],
    ["Machine Chest Press", "8-12", "Safe failure pressing"],
    ["Cable Lateral Raise", "12-15", "Width builder"],
    ["Overhead Triceps Extension", "10-15", "Long-head triceps"]
  ],
  "Day 4 - Pull": [
    ["Wide Grip Lat Pulldown", "8-12", "Lat width"],
    ["Seated Cable Row", "8-12", "Mid-back thickness"],
    ["Shrugs", "10-15", "Traps"],
    ["Rear Delt Fly", "12-15", "Rear delts"],
    ["EZ Curl", "10-12", "Biceps"]
  ],
  "Day 5 - Specialisation": [
    ["Incline DB Press", "8-12", "Upper chest frequency"],
    ["Single Arm Lat Pulldown", "10-12", "Lat isolation"],
    ["Cable Lateral Raise", "12-15", "Side delt priority"],
    ["Close Grip Chest Press", "8-12", "Triceps / pressing power"],
    ["Hammer Curl", "10-12", "Arm thickness"],
    ["Manual Neck Isometrics", "3 x 20-30 sec", "Home-based alternative"]
  ]
};

const $ = (id) => document.getElementById(id);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function getData() {
  const base = { checkins: [], measurements: [], workouts: [], historical: historicalData };
  try {
    return Object.assign(base, JSON.parse(localStorage.getItem("projectReacher") || "{}"));
  } catch {
    return base;
  }
}
function saveData(data) {
  localStorage.setItem("projectReacher", JSON.stringify(data));
}
function pct(n) {
  return Math.max(0, Math.min(100, n));
}
function totalVolume(entry) {
  return entry.exercises.reduce((sum, e) => {
    const s1 = (Number(e.set1Weight) || 0) * (Number(e.set1Reps) || 0);
    const s2 = (Number(e.set2Weight) || 0) * (Number(e.set2Reps) || 0);
    return sum + s1 + s2;
  }, 0);
}

function migrateData() {
  const data = getData();
  let changed = false;
  ["checkins", "measurements", "workouts"].forEach(key => {
    data[key] = (data[key] || []).map(item => {
      if (!item.id) {
        changed = true;
        return { id: uid(), ...item };
      }
      return item;
    });
  });
  if (changed) saveData(data);
}

function renderWorkout() {
  const day = $("daySelect").value;
  $("workoutList").innerHTML = workouts[day].map((x, i) => `
    <div class="exercise" data-exercise="${x[0]}">
      <h3>${i + 1}. ${x[0]}</h3>
      <div class="small">Target: ${x[1]} · ${x[2]}</div>
      <div class="set-row">
        <label>Warm-up<input class="warmup" placeholder="Optional"></label>
        <label>Set 1 Weight<input class="set1w" type="number" step="0.5" placeholder="kg"></label>
        <label>Set 1 Reps<input class="set1r" type="number" placeholder="reps"></label>
        <label>Set 2 Weight<input class="set2w" type="number" step="0.5" placeholder="kg"></label>
        <label>Set 2 Reps<input class="set2r" type="number" placeholder="reps"></label>
        <label>Notes<input class="exnotes" placeholder="form / machine / pain"></label>
      </div>
    </div>
  `).join("");
}

function saveWorkout() {
  const data = getData();
  const day = $("daySelect").value;
  const exercises = [...document.querySelectorAll(".exercise")].map(el => ({
    name: el.dataset.exercise,
    warmup: el.querySelector(".warmup").value,
    set1Weight: Number(el.querySelector(".set1w").value || 0),
    set1Reps: Number(el.querySelector(".set1r").value || 0),
    set2Weight: Number(el.querySelector(".set2w").value || 0),
    set2Reps: Number(el.querySelector(".set2r").value || 0),
    notes: el.querySelector(".exnotes").value
  }));
  data.workouts.push({ id: uid(), date: new Date().toLocaleDateString(), day, exercises });
  saveData(data);
  renderAll();
  alert("Workout saved.");
}

function renderDashboard() {
  const data = getData();
  const latest = data.checkins[data.checkins.length - 1];
  const weight = latest?.weight || START_WEIGHT;
  $("currentWeight").textContent = `${Number(weight).toFixed(1)}kg`;
  const progress = pct(((weight - START_WEIGHT) / (TARGET_WEIGHT - START_WEIGHT)) * 100);
  $("progressBar").style.width = `${progress}%`;
  $("progressText").textContent = `${progress.toFixed(1)}%`;

  if (data.checkins.length >= 2) {
    const prev = data.checkins[data.checkins.length - 2].weight;
    const gain = weight - prev;
    $("weeklyGain").textContent = `${gain >= 0 ? "+" : ""}${gain.toFixed(2)}kg`;
  }

  if (latest) {
    let score = 0;
    score += Math.min(25, (latest.protein / PROTEIN_TARGET) * 25);
    score += Math.min(25, (latest.sessions / 5) * 25);
    score += Math.min(25, (latest.recovery / 10) * 25);
    score += Math.min(25, (latest.energy / 10) * 25);
    $("score").textContent = `${Math.round(score)}/100`;
  }
}

function renderHistory() {
  const data = getData();
  $("history").innerHTML = data.checkins.slice().reverse().map(c => `
    <div class="history-item">
      <strong>${c.date}</strong> · ${c.weight}kg · Protein ${c.protein}g · Sessions ${c.sessions}/5<br>
      ${c.notes ? c.notes : ""}
      <div class="actions">
        <button class="secondary" onclick="editCheckin('${c.id}')">Edit</button>
        <button class="danger" onclick="deleteItem('checkins','${c.id}')">Delete</button>
      </div>
    </div>
  `).join("") || "<p class='small'>No check-ins yet.</p>";
}

function renderWorkoutHistory() {
  const data = getData();
  const container = $("workoutHistory");
  if (!container) return;
  container.innerHTML = data.workouts.slice().reverse().map(w => `
    <div class="history-item">
      <strong>${w.date}</strong> · ${w.day} · Volume ${Math.round(totalVolume(w))}kg<br>
      ${w.exercises.map(e => `${e.name}: ${e.set1Weight}x${e.set1Reps}, ${e.set2Weight}x${e.set2Reps}`).join("<br>")}
      <div class="actions">
        <button class="secondary" onclick="editWorkout('${w.id}')">Edit</button>
        <button class="danger" onclick="deleteItem('workouts','${w.id}')">Delete</button>
      </div>
    </div>
  `).join("") || "<p class='small'>No workouts logged yet.</p>";
}

function renderMeasurementsHistory() {
  const data = getData();
  const container = $("measurementHistory");
  if (!container) return;
  container.innerHTML = data.measurements.slice().reverse().map(m => `
    <div class="history-item">
      <strong>${m.date}</strong> · Shoulders ${m.shoulders || "-"} · Chest ${m.chest || "-"} · Waist ${m.waist || "-"} · Neck ${m.neck || "-"}
      <div class="actions">
        <button class="secondary" onclick="editMeasurement('${m.id}')">Edit</button>
        <button class="danger" onclick="deleteItem('measurements','${m.id}')">Delete</button>
      </div>
    </div>
  `).join("") || "<p class='small'>No measurements saved yet.</p>";
}

function renderCharts() {
  const data = getData();
  const weightChart = $("weightChart");
  const volumeChart = $("volumeChart");
  if (weightChart) {
    const weights = data.checkins.slice(-10);
    weightChart.innerHTML = weights.length ? weights.map(w => {
      const h = pct(((w.weight - 70) / 20) * 100);
      return `<div class="mini-bar-wrap"><div class="mini-bar" style="height:${h}%"></div><span>${w.weight}</span></div>`;
    }).join("") : "<p class='small'>Add weekly check-ins to see your weight trend.</p>";
  }
  if (volumeChart) {
    const workouts = data.workouts.slice(-10);
    volumeChart.innerHTML = workouts.length ? workouts.map(w => {
      const v = totalVolume(w);
      const max = Math.max(...workouts.map(totalVolume), 1);
      const h = pct((v / max) * 100);
      return `<div class="mini-bar-wrap"><div class="mini-bar" style="height:${h}%"></div><span>${Math.round(v)}</span></div>`;
    }).join("") : "<p class='small'>Log workouts to see volume trends.</p>";
  }
}

function renderHistoricalSummary() {
  const container = $("historicalSummary");
  if (!container) return;
  const data = getData();
  const all = [...(data.historical || []), ...data.workouts.flatMap(w => w.exercises.map(e => ({
    week: w.date,
    exercise: e.name,
    weight: Math.max(e.set1Weight, e.set2Weight),
    reps: Math.max(e.set1Reps, e.set2Reps),
    volume: (e.set1Weight * e.set1Reps) + (e.set2Weight * e.set2Reps)
  })))];

  const byExercise = {};
  all.forEach(r => {
    byExercise[r.exercise] ||= [];
    byExercise[r.exercise].push(r);
  });
  container.innerHTML = Object.entries(byExercise).map(([name, rows]) => {
    const first = rows[0];
    const best = rows.reduce((a, b) => (b.volume || 0) > (a.volume || 0) ? b : a, rows[0]);
    return `<div class="history-item"><strong>${name}</strong><br>First: ${first.weight || "-"}kg x ${first.reps || "-"} · Best volume: ${Math.round(best.volume || 0)}kg</div>`;
  }).join("");
}

function deleteItem(collection, id) {
  if (!confirm("Delete this entry? This cannot be undone unless you exported a backup.")) return;
  const data = getData();
  data[collection] = (data[collection] || []).filter(item => item.id !== id);
  saveData(data);
  renderAll();
}

function editCheckin(id) {
  const data = getData();
  const item = data.checkins.find(x => x.id === id);
  if (!item) return;
  const weight = prompt("Morning weight", item.weight);
  if (weight === null) return;
  const protein = prompt("Protein average", item.protein);
  if (protein === null) return;
  const sleep = prompt("Sleep average", item.sleep);
  if (sleep === null) return;
  const sessions = prompt("Training sessions", item.sessions);
  if (sessions === null) return;
  const recovery = prompt("Recovery 1-10", item.recovery);
  if (recovery === null) return;
  const energy = prompt("Energy 1-10", item.energy);
  if (energy === null) return;
  const notes = prompt("Notes", item.notes || "");
  if (notes === null) return;
  Object.assign(item, {
    weight: Number(weight),
    protein: Number(protein),
    sleep: Number(sleep),
    sessions: Number(sessions),
    recovery: Number(recovery),
    energy: Number(energy),
    notes
  });
  saveData(data);
  renderAll();
}

function editMeasurement(id) {
  const data = getData();
  const item = data.measurements.find(x => x.id === id);
  if (!item) return;
  ["shoulders", "chest", "waist", "neck", "rarm", "larm", "rthigh", "lthigh"].forEach(k => {
    const v = prompt(k, item[k] || "");
    if (v !== null) item[k] = v;
  });
  saveData(data);
  renderAll();
}

function editWorkout(id) {
  const data = getData();
  const item = data.workouts.find(x => x.id === id);
  if (!item) return;
  item.day = prompt("Workout day", item.day) || item.day;
  item.exercises.forEach(e => {
    const s1w = prompt(`${e.name} set 1 weight`, e.set1Weight);
    if (s1w !== null) e.set1Weight = Number(s1w);
    const s1r = prompt(`${e.name} set 1 reps`, e.set1Reps);
    if (s1r !== null) e.set1Reps = Number(s1r);
    const s2w = prompt(`${e.name} set 2 weight`, e.set2Weight);
    if (s2w !== null) e.set2Weight = Number(s2w);
    const s2r = prompt(`${e.name} set 2 reps`, e.set2Reps);
    if (s2r !== null) e.set2Reps = Number(s2r);
    const notes = prompt(`${e.name} notes`, e.notes || "");
    if (notes !== null) e.notes = notes;
  });
  saveData(data);
  renderAll();
}

function importBackup(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      saveData(imported);
      migrateData();
      renderAll();
      alert("Backup imported.");
    } catch {
      alert("Could not import this file.");
    }
  };
  reader.readAsText(file);
}

function renderAll() {
  renderDashboard();
  renderHistory();
  renderWorkoutHistory();
  renderMeasurementsHistory();
  renderCharts();
  renderHistoricalSummary();
}

Object.keys(workouts).forEach(day => {
  const opt = document.createElement("option");
  opt.value = day;
  opt.textContent = day;
  $("daySelect").appendChild(opt);
});
$("daySelect").addEventListener("change", renderWorkout);

$("saveCheckin").addEventListener("click", () => {
  const data = getData();
  data.checkins.push({
    id: uid(),
    date: new Date().toLocaleDateString(),
    weight: Number($("weightInput").value || START_WEIGHT),
    protein: Number($("proteinInput").value || 0),
    sleep: Number($("sleepInput").value || 0),
    sessions: Number($("sessionsInput").value || 0),
    recovery: Number($("recoveryInput").value || 0),
    energy: Number($("energyInput").value || 0),
    notes: $("notesInput").value
  });
  saveData(data);
  renderAll();
  alert("Weekly check-in saved.");
});

$("saveMeasurements").addEventListener("click", () => {
  const data = getData();
  data.measurements.push({
    id: uid(),
    date: new Date().toLocaleDateString(),
    shoulders: $("shoulders").value,
    chest: $("chest").value,
    waist: $("waist").value,
    neck: $("neck").value,
    rarm: $("rarm").value,
    larm: $("larm").value,
    rthigh: $("rthigh").value,
    lthigh: $("lthigh").value
  });
  saveData(data);
  renderAll();
  alert("Measurements saved.");
});

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "project-reacher-data.json";
  a.click();
});

if ($("saveWorkout")) $("saveWorkout").addEventListener("click", saveWorkout);
if ($("importBackup")) $("importBackup").addEventListener("change", importBackup);

migrateData();
renderWorkout();
renderAll();
