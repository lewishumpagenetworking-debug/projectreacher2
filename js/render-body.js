import { $, esc, fmt } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { sevenDayAverage, weeklyRateOfGain, ratios } from "./calculations.js";
import { lineChart } from "./charts.js";
import { parseLogDate } from "./dates.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

const START_WEIGHT = 73;

export function saveBodyweight() {
  const data = getData();
  const weight = Number($("bwInput").value);
  if (!weight) { alert("Enter a morning weight."); return; }
  data.bodyweightLogs.push({
    id: uid(),
    date: new Date().toLocaleDateString("en-CA"),
    morningBodyweight: weight,
    sevenDayAverage: null,
    weeklyRateOfGain: null,
    notes: $("bwNotes").value
  });
  data.bodyweightLogs.at(-1).sevenDayAverage = sevenDayAverage(data.bodyweightLogs, "morningBodyweight");
  data.bodyweightLogs.at(-1).weeklyRateOfGain = weeklyRateOfGain(data.bodyweightLogs);
  saveData(data);
  $("bwInput").value = "";
  $("bwNotes").value = "";
  refreshAll();
}

export function renderBodyweight(data) {
  const container = $("bodyweightHistory");
  if (container) {
    container.innerHTML = data.bodyweightLogs.slice().reverse().slice(0, 20).map(b => `
      <details class="history-item expandable-card">
        <summary><strong>${esc(b.date)}</strong> · ${b.morningBodyweight}kg ${b.sevenDayAverage != null ? `· 7d avg ${fmt(b.sevenDayAverage)}kg` : ""}</summary>
        ${b.notes ? `<p class="small">${esc(b.notes)}</p>` : ""}
        <div class="actions"><button class="danger" data-delete="bodyweightLogs" data-id="${b.id}">Delete</button></div>
      </details>`).join("") || "<p class='small'>No bodyweight entries yet.</p>";
  }
  const chart = $("weightChart");
  if (chart) {
    const weights = data.bodyweightLogs.slice(-10);
    chart.innerHTML = weights.length ? weights.map(w => {
      const h = Math.max(0, Math.min(100, ((w.morningBodyweight - 70) / 20) * 100));
      return `<div class="mini-bar-wrap"><div class="mini-bar" style="height:${h}%"></div><span>${w.morningBodyweight}</span></div>`;
    }).join("") : "<p class='small'>Add bodyweight entries to see your trend.</p>";
  }
}

export function saveCheckin() {
  const data = getData();
  data.checkins.push({
    id: uid(),
    date: new Date().toLocaleDateString("en-CA"),
    weight: Number($("weightInput").value || START_WEIGHT),
    protein: Number($("proteinInput").value || 0),
    sleep: Number($("sleepInput").value || 0),
    sessions: Number($("sessionsInput").value || 0),
    recovery: Number($("recoveryInput").value || 0),
    energy: Number($("energyInput").value || 0),
    notes: $("notesInput").value,
    weekNumber: null, startDate: null, endDate: null,
    morningBodyweightAverage: null, sevenDayAverage: null, weeklyRateOfGain: null,
    proteinAverage: null, calorieAverage: null, sleepAverage: null,
    sessionsCompleted: null, recoveryAverage: null, energyAverage: null,
    strengthProgressSummary: "", recommendation: ""
  });
  saveData(data);
  refreshAll();
  alert("Weekly check-in saved.");
}

export function renderCheckinHistory(data) {
  $("history").innerHTML = data.checkins.slice().reverse().map(c => `
    <details class="history-item expandable-card">
      <summary><strong>${esc(c.date)}</strong> · ${c.weight}kg · Protein ${c.protein}g · Sessions ${c.sessions}/5</summary>
      ${c.notes ? `<p class="small">${esc(c.notes)}</p>` : ""}
      <div class="actions"><button class="danger" data-delete="checkins" data-id="${c.id}">Delete</button></div>
    </details>`).join("") || "<p class='small'>No check-ins yet.</p>";

  const chart = $("bodyweightChart");
  if (chart) {
    const points = data.checkins.slice(-12).map(c => ({ label: c.date.slice(5), value: c.weight }));
    chart.innerHTML = lineChart(points, { labelEvery: Math.ceil(points.length / 6) || 1, formatValue: v => `${v}kg` });
  }
}

export function saveMeasurements() {
  const data = getData();
  data.measurements.push({
    id: uid(),
    date: new Date().toLocaleDateString("en-CA"),
    weight: $("mWeight").value === "" ? null : Number($("mWeight").value),
    shoulders: $("shoulders").value,
    chest: $("chest").value,
    waist: $("waist").value,
    neck: $("neck").value,
    rarm: $("rarm").value,
    larm: $("larm").value,
    rforearm: $("rforearm").value,
    lforearm: $("lforearm").value,
    rthigh: $("rthigh").value,
    lthigh: $("lthigh").value,
    calves: $("calves").value,
    flexedArm: $("flexedArm").value,
    relaxedArm: $("relaxedArm").value,
    pumpedNote: $("pumpedNote").value,
    notes: $("measurementNotes").value,
    measurementMethods: {
      shoulders: $("shouldersMethod")?.value || "circumference",
      chest: $("chestMethod")?.value || "circumference",
      waist: $("waistMethod")?.value || "circumference"
    }
  });
  saveData(data);
  refreshAll();
  alert("Measurements saved.");
}

export function renderMeasurementsHistory(data) {
  const container = $("measurementHistory");
  if (container) {
    container.innerHTML = data.measurements.slice().reverse().map(m => {
      const r = ratios(m);
      return `<div class="history-item">
        <strong>${esc(m.date)}</strong> · Shoulders ${m.shoulders || "-"} · Chest ${m.chest || "-"} · Waist ${m.waist || "-"} · Neck ${m.neck || "-"} · Calves ${m.calves || "-"}
        <br>Arms R/L ${m.rarm || "-"}/${m.larm || "-"} · Forearms R/L ${m.rforearm || "-"}/${m.lforearm || "-"}${m.pumpedNote ? ` (${esc(m.pumpedNote)})` : ""}
        ${r.shoulderToWaist ? `<br>Shoulder:Waist ${r.shoulderToWaist} (target 1.6-1.7) · Chest:Waist ${r.chestToWaist}` : ""}
        <div class="actions"><button class="danger" data-delete="measurements" data-id="${m.id}">Delete</button></div>
      </div>`;
    }).join("") || "<p class='small'>No measurements saved yet.</p>";
  }
  const latest = data.measurements.at(-1);
  const summary = $("ratioSummary");
  if (summary) {
    if (!latest) { summary.innerHTML = ""; return; }
    const r = ratios(latest);
    summary.innerHTML = `<div class="badge-row">
      <span class="badge ${r.shoulderToWaist >= 1.6 ? 'status-on-target' : 'status-under'}">Shoulder:Waist ${r.shoulderToWaist ?? "--"}</span>
      <span class="badge">Target arms 38-41cm</span>
      <span class="badge">Target chest 105-110cm</span>
      <span class="badge">Target neck 40-43cm</span>
    </div>
    ${r.methodWarning ? `<p class="small status-under">${esc(r.methodWarning)}</p>` : ""}`;
  }
}

export function resizeImage(file, maxWidth = 800, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function savePhotoCheckin() {
  const frontFile = $("photoFront").files[0];
  const sideFile = $("photoSide").files[0];
  const backFile = $("photoBack").files[0];
  if (!frontFile && !sideFile && !backFile) { alert("Add at least one photo."); return; }

  const [frontPhoto, sidePhoto, backPhoto] = await Promise.all([
    frontFile ? resizeImage(frontFile) : null,
    sideFile ? resizeImage(sideFile) : null,
    backFile ? resizeImage(backFile) : null
  ]);

  const data = getData();
  data.progressPhotos.push({
    id: uid(),
    date: new Date().toLocaleDateString("en-CA"),
    frontPhoto, sidePhoto, backPhoto,
    lightingNotes: $("photoLighting").value,
    bodyweightAtPhoto: $("photoBodyweight").value === "" ? null : Number($("photoBodyweight").value),
    notes: $("photoNotes").value
  });
  saveData(data);
  ["photoFront", "photoSide", "photoBack", "photoLighting", "photoBodyweight", "photoNotes"].forEach(id => $(id).value = "");
  refreshAll();
  alert("Photo check-in saved.");
}

export function renderPhotos(data) {
  const reminder = $("photoReminder");
  const last = data.progressPhotos.at(-1);
  if (reminder) {
    const daysSince = last ? (Date.now() - (parseLogDate(last.date)?.getTime() ?? Date.now())) / 86400000 : Infinity;
    reminder.textContent = daysSince >= 28
      ? "It's been 4+ weeks since your last progress photos — time for a new set."
      : last ? `Last photo check-in ${Math.round(daysSince)} days ago.` : "No progress photos yet.";
  }
  const container = $("photoHistory");
  if (!container) return;
  container.innerHTML = data.progressPhotos.slice().reverse().map(p => `
    <div class="history-item">
      <strong>${esc(p.date)}</strong> ${p.bodyweightAtPhoto ? `· ${p.bodyweightAtPhoto}kg` : ""}
      <div class="badge-row">
        ${p.frontPhoto ? `<img src="${p.frontPhoto}" alt="front" style="width:70px;border-radius:8px">` : ""}
        ${p.sidePhoto ? `<img src="${p.sidePhoto}" alt="side" style="width:70px;border-radius:8px">` : ""}
        ${p.backPhoto ? `<img src="${p.backPhoto}" alt="back" style="width:70px;border-radius:8px">` : ""}
      </div>
      ${p.notes ? `<p class="small">${esc(p.notes)}</p>` : ""}
      <div class="actions"><button class="danger" data-delete="progressPhotos" data-id="${p.id}">Delete</button></div>
    </div>`).join("") || "<p class='small'>No progress photos yet.</p>";
}
