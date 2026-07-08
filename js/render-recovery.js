import { $, esc } from "./dom.js";
import { getData, saveData, uid } from "./data.js";

export function saveRecovery() {
  const data = getData();
  data.recoveryLogs.push({
    id: uid(),
    date: new Date().toLocaleDateString("en-CA"),
    sleepDuration: Number($("rSleepDuration").value || 0),
    sleepQuality: Number($("rSleepQuality").value || 0),
    recoveryScore: Number($("rRecoveryScore").value || 0),
    energyScore: Number($("rEnergyScore").value || 0),
    motivationScore: Number($("rMotivation").value || 0),
    sorenessScore: Number($("rSoreness").value || 0),
    restingHeartRate: $("rRestingHR").value === "" ? null : Number($("rRestingHR").value),
    notes: $("rNotes").value
  });
  saveData(data);
  ["rSleepDuration", "rSleepQuality", "rRecoveryScore", "rEnergyScore", "rMotivation", "rSoreness", "rRestingHR", "rNotes"].forEach(id => $(id).value = "");
  window.dispatchEvent(new CustomEvent("reacher:refresh"));
  alert("Recovery log saved.");
}

export function renderRecoveryHistory(data) {
  const el = $("recoveryHistory");
  if (!el) return;
  el.innerHTML = data.recoveryLogs.slice().reverse().slice(0, 20).map(r => `
    <div class="history-item">
      <strong>${esc(r.date)}</strong> · Sleep ${r.sleepDuration}h (Q${r.sleepQuality}/5) · Recovery ${r.recoveryScore}/5 · Energy ${r.energyScore}/5 · Soreness ${r.sorenessScore}/5
      ${r.notes ? `<br>${esc(r.notes)}` : ""}
      <div class="actions"><button class="danger" data-delete="recoveryLogs" data-id="${r.id}">Delete</button></div>
    </div>`).join("") || "<p class='small'>No recovery logs yet. Note: your fixed 5-6hr sleep schedule is treated as normal here — warnings only fire on performance/recovery trends, not sleep duration alone.</p>";
}

export function saveStimulants() {
  const data = getData();
  data.stimulantLogs.push({
    id: uid(),
    date: new Date().toLocaleDateString("en-CA"),
    caffeineMg: Number($("sCaffeineMg").value || 0),
    caffeineTiming: $("sCaffeineTiming").value,
    nicotineUsed: $("sNicotineUsed").checked,
    nicotineAmount: $("sNicotineAmount").value,
    nicotineTiming: $("sNicotineTiming").value,
    notes: $("sNotes").value
  });
  saveData(data);
  $("sCaffeineMg").value = ""; $("sCaffeineTiming").value = "";
  $("sNicotineUsed").checked = false; $("sNicotineAmount").value = ""; $("sNicotineTiming").value = ""; $("sNotes").value = "";
  window.dispatchEvent(new CustomEvent("reacher:refresh"));
  alert("Stimulant log saved.");
}

export function renderStimulantHistory(data) {
  const el = $("stimulantHistory");
  if (!el) return;
  el.innerHTML = data.stimulantLogs.slice().reverse().slice(0, 20).map(s => `
    <div class="history-item">
      <strong>${esc(s.date)}</strong> · Caffeine ${s.caffeineMg}mg ${s.caffeineTiming ? `(${esc(s.caffeineTiming)})` : ""} ${s.nicotineUsed ? `· Nicotine used ${esc(s.nicotineAmount || "")}` : ""}
      ${s.notes ? `<br>${esc(s.notes)}` : ""}
      <div class="actions"><button class="danger" data-delete="stimulantLogs" data-id="${s.id}">Delete</button></div>
    </div>`).join("") || "<p class='small'>No stimulant logs yet.</p>";
}
