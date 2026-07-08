import { $, esc, fmt } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { average, weeklyRateOfGain, sevenDayAverage, ratios, weeklyVolumeByMuscleGroup, workoutsInWeek } from "./calculations.js";
import { parseLogDate, isSameWeek, startOfWeek, isLegacySlashDate } from "./dates.js";

export function renderProfileForm(data) {
  const p = data.profile;
  $("pAge").value = p.age ?? "";
  $("pHeight").value = p.height ?? "";
  $("pStartingWeight").value = p.startingWeight ?? "";
  $("pRealisticMin").value = p.realisticTargetWeightMin ?? "";
  $("pRealisticMax").value = p.realisticTargetWeightMax ?? "";
  $("pAmbitious").value = p.ambitiousTargetWeight ?? "";
  $("pBfMin").value = p.targetBodyFatMin ?? "";
  $("pBfMax").value = p.targetBodyFatMax ?? "";
  $("pPhase").value = p.currentPhase ?? "";
  $("pWeeklyGain").value = p.targetWeeklyGain ?? "";
  $("pNotes").value = p.notes ?? "";
}

export function saveProfile() {
  const data = getData();
  Object.assign(data.profile, {
    age: Number($("pAge").value || data.profile.age),
    height: $("pHeight").value || data.profile.height,
    startingWeight: Number($("pStartingWeight").value || data.profile.startingWeight),
    realisticTargetWeightMin: Number($("pRealisticMin").value || data.profile.realisticTargetWeightMin),
    realisticTargetWeightMax: Number($("pRealisticMax").value || data.profile.realisticTargetWeightMax),
    ambitiousTargetWeight: Number($("pAmbitious").value || data.profile.ambitiousTargetWeight),
    targetBodyFatMin: Number($("pBfMin").value || data.profile.targetBodyFatMin),
    targetBodyFatMax: Number($("pBfMax").value || data.profile.targetBodyFatMax),
    currentPhase: $("pPhase").value || data.profile.currentPhase,
    targetWeeklyGain: Number($("pWeeklyGain").value || data.profile.targetWeeklyGain),
    notes: $("pNotes").value
  });
  saveData(data);
  window.dispatchEvent(new CustomEvent("reacher:refresh"));
  alert("Profile saved.");
}

export function generateWeeklyCheckin() {
  const data = getData();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const inWeek = (d) => { const parsed = parseLogDate(d); return parsed && isSameWeek(parsed, now); };

  const bw = data.bodyweightLogs.filter(b => inWeek(b.date));
  const nut = data.nutritionLogs.filter(n => inWeek(n.date));
  const rec = data.recoveryLogs.filter(r => inWeek(r.date));
  const sessions = workoutsInWeek(data.workouts, now);
  const increases = sessions.flatMap(w => (w.exercises || []).filter(e => e.increaseNextWeek));

  const weekNumber = data.checkins.filter(c => c.weekNumber != null).length + 1;
  const summary = {
    id: uid(),
    date: now.toLocaleDateString("en-CA"),
    weekNumber,
    startDate: weekStart.toLocaleDateString("en-CA"),
    endDate: weekEnd.toLocaleDateString("en-CA"),
    weight: bw.at(-1)?.morningBodyweight ?? null,
    morningBodyweightAverage: average(bw.map(b => b.morningBodyweight)),
    sevenDayAverage: sevenDayAverage(bw, "morningBodyweight"),
    weeklyRateOfGain: weeklyRateOfGain(data.bodyweightLogs),
    proteinAverage: average(nut.map(n => n.protein)),
    proteinAvg: average(nut.map(n => n.protein)),
    calorieAverage: average(nut.map(n => n.calories)),
    sleepAverage: average(rec.map(r => r.sleepDuration)),
    sessionsCompleted: sessions.length,
    sessions: sessions.length,
    recoveryAverage: average(rec.map(r => r.recoveryScore)),
    energyAverage: average(rec.map(r => r.energyScore)),
    recovery: average(rec.map(r => r.recoveryScore)),
    energy: average(rec.map(r => r.energyScore)),
    protein: Math.round(average(nut.map(n => n.protein)) || 0),
    sleep: average(rec.map(r => r.sleepDuration)),
    strengthProgressSummary: increases.length ? `${increases.length} exercise(s) flagged to increase load.` : "No load increases flagged this week.",
    notes: "",
    recommendation: sessions.length >= 4 ? "Keep plan" : "Review adherence — fewer than 4 sessions logged this week."
  };
  data.checkins.push(summary);
  saveData(data);
  window.dispatchEvent(new CustomEvent("reacher:refresh"));
  alert("Weekly summary generated and added to Progress History.");
}

export function renderWeeklyCheckinSummary(data) {
  const el = $("weeklyCheckinSummary");
  const last = [...data.checkins].reverse().find(c => c.weekNumber != null);
  if (!last) { el.innerHTML = "<p class='small'>No auto-generated weekly summary yet.</p>"; return; }
  el.innerHTML = `
    <div class="history-item">
      <strong>Week ${last.weekNumber}</strong> (${esc(last.startDate)} – ${esc(last.endDate)})<br>
      7d avg: ${fmt(last.sevenDayAverage)}kg · Rate: ${last.weeklyRateOfGain != null ? fmt(last.weeklyRateOfGain, 2) + "kg/wk" : "--"}<br>
      Protein avg: ${fmt(last.proteinAverage)}g · Calorie avg: ${fmt(last.calorieAverage, 0)}kcal · Sleep avg: ${fmt(last.sleepAverage)}h<br>
      Sessions: ${last.sessionsCompleted} · Recovery avg: ${fmt(last.recoveryAverage)}/5 · Energy avg: ${fmt(last.energyAverage)}/5<br>
      ${esc(last.strengthProgressSummary)}<br>
      <strong>${esc(last.recommendation)}</strong>
    </div>`;
}

export function generateMonthlyReview() {
  const data = getData();
  const decision = $("monthlyReviewDecision")?.value || "keep plan";
  const now = new Date();
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 28);
  const inMonth = (d) => { const parsed = parseLogDate(d); return parsed && parsed >= monthAgo && parsed <= now; };

  const bw = data.bodyweightLogs.filter(b => inMonth(b.date));
  const measurementsInMonth = data.measurements.filter(m => inMonth(m.date));
  const first = measurementsInMonth[0];
  const last = measurementsInMonth.at(-1) || data.measurements.at(-1);
  const nut = data.nutritionLogs.filter(n => inMonth(n.date));
  const rec = data.recoveryLogs.filter(r => inMonth(r.date));
  const stim = data.stimulantLogs.filter(s => inMonth(s.date));
  const volumeTotals = weeklyVolumeByMuscleGroup(data.workouts, data.exercises);

  const review = {
    id: uid(),
    month: now.toLocaleDateString("en-CA").slice(0, 7),
    createdAt: now.toISOString(),
    weightTrend: bw.length ? `${bw[0].morningBodyweight}kg -> ${bw.at(-1).morningBodyweight}kg` : "No bodyweight data",
    measurementChange: (first && last) ? `Waist ${first.waist}->${last.waist}, Chest ${first.chest}->${last.chest}, Shoulders ${first.shoulders}->${last.shoulders}` : "Not enough measurement data",
    ratios: last ? ratios(last) : {},
    macroAdherenceNote: nut.length ? `${nut.length} nutrition logs this period, avg protein ${Math.round(average(nut.map(n => n.protein)) || 0)}g` : "No nutrition logs",
    recoveryTrend: rec.length ? `Avg recovery ${fmt(average(rec.map(r => r.recoveryScore)))}/5` : "No recovery logs",
    stimulantTrend: stim.length ? `Avg caffeine ${fmt(average(stim.map(s => s.caffeineMg)), 0)}mg, nicotine used ${stim.filter(s => s.nicotineUsed).length}/${stim.length} days` : "No stimulant logs",
    volumeByMuscleGroup: volumeTotals,
    recommendation: decision,
    notes: $("monthlyReviewNotes")?.value || ""
  };
  data.monthlyReviews.push(review);
  saveData(data);
  window.dispatchEvent(new CustomEvent("reacher:refresh"));
  alert("Monthly review generated.");
}

export function renderMonthlyReview(data) {
  const el = $("monthlyReview");
  const last = data.monthlyReviews.at(-1);
  const decisionOptions = ["keep plan", "increase calories", "reduce calories", "deload", "add volume", "reduce volume", "mini-cut", "swap exercise due to pain/stagnation"];
  const controls = `
    <div class="form-grid">
      <label>Decision<select id="monthlyReviewDecision">${decisionOptions.map(o => `<option value="${o}">${o}</option>`).join("")}</select></label>
    </div>
    <textarea id="monthlyReviewNotes" placeholder="Notes for this review"></textarea>`;

  if (!last) { el.innerHTML = `<p class="small">No monthly review yet.</p>${controls}`; return; }
  el.innerHTML = `
    <div class="history-item">
      <strong>${esc(last.month)}</strong><br>
      Weight trend: ${esc(last.weightTrend)}<br>
      Measurements: ${esc(last.measurementChange)}<br>
      Shoulder:Waist ${last.ratios?.shoulderToWaist ?? "--"} · Chest:Waist ${last.ratios?.chestToWaist ?? "--"}<br>
      Nutrition: ${esc(last.macroAdherenceNote)}<br>
      Recovery: ${esc(last.recoveryTrend)}<br>
      Stimulants: ${esc(last.stimulantTrend)}<br>
      <strong>Recommendation: ${esc(last.recommendation)}</strong>
      ${last.notes ? `<br>${esc(last.notes)}` : ""}
    </div>${controls}`;
}

export function renderProgramEditor(data) {
  const el = $("programEditor");
  el.innerHTML = Object.entries(data.trainingProgram).map(([day, exercises]) => `
    <h3>${esc(day)}</h3>
    <div class="table-wrap"><table class="data-table" data-day="${esc(day)}">
      <thead><tr><th>Exercise</th><th>Rep Range</th><th>Note</th></tr></thead>
      <tbody>
        ${exercises.map((e, i) => `
          <tr data-idx="${i}">
            <td><input data-field="name" value="${esc(e.name)}"></td>
            <td><input data-field="repRange" value="${esc(e.repRange)}"></td>
            <td><input data-field="note" value="${esc(e.note || "")}"></td>
          </tr>`).join("")}
      </tbody>
    </table></div>
  `).join("") + `<button id="saveProgram">Save Program Changes</button>`;

  $("saveProgram").addEventListener("click", () => {
    const d = getData();
    el.querySelectorAll("table[data-day]").forEach(table => {
      const day = table.dataset.day;
      table.querySelectorAll("tbody tr").forEach((row, i) => {
        const target = d.trainingProgram[day][i];
        if (!target) return;
        target.name = row.querySelector('[data-field="name"]').value;
        target.repRange = row.querySelector('[data-field="repRange"]').value;
        target.note = row.querySelector('[data-field="note"]').value;
      });
    });
    saveData(d);
    window.dispatchEvent(new CustomEvent("reacher:refresh"));
    alert("Program updated. Future sessions will use the new exercise names/targets — past logs are untouched.");
  });
}

const SYNC_STATUS_LABELS = {
  not_configured: "Local only",
  signed_out: "Signed out",
  offline: "Offline — will sync",
  syncing: "Syncing…",
  synced: "Synced",
  error: "Sync error"
};

export function renderCloudStatus(state) {
  const badge = $("cloudBadge");
  if (badge) {
    badge.className = `sync-badge status-${state.status}`;
    const label = SYNC_STATUS_LABELS[state.status] || state.status;
    badge.textContent = state.status === "synced" && state.lastSyncedAt
      ? `Synced ${new Date(state.lastSyncedAt).toLocaleTimeString()}`
      : label;
  }

  const statusEl = $("cloudStatus");
  const authForm = $("cloudAuthForm");
  const signedInPanel = $("cloudSignedInPanel");
  if (!statusEl) return;

  if (state.status === "not_configured") {
    statusEl.innerHTML = `<p class="small">Cloud sync isn't configured yet. Add your Supabase project URL and anon key to js/cloud-config.js to enable permanent, cross-device saving. Everything still works fully offline without it.</p>`;
    if (authForm) authForm.hidden = true;
    if (signedInPanel) signedInPanel.hidden = true;
    return;
  }

  if (state.userId) {
    statusEl.innerHTML = `
      <p class="small">Signed in as ${esc(state.userEmail || "")} · ${esc(SYNC_STATUS_LABELS[state.status] || state.status)}${state.lastSyncedAt ? ` · Last synced ${new Date(state.lastSyncedAt).toLocaleString()}` : ""}</p>
      ${state.lastError ? `<p class="small" style="color:#ff5b6e">${esc(state.lastError)}</p>` : ""}`;
    if (authForm) authForm.hidden = true;
    if (signedInPanel) signedInPanel.hidden = false;
  } else {
    statusEl.innerHTML = `<p class="small">Sign in or create an account to save your data permanently to the cloud and access it from any device.</p>`;
    if (authForm) authForm.hidden = false;
    if (signedInPanel) signedInPanel.hidden = true;
  }
}

export function renderDataHealth(data) {
  const el = $("dataHealth");
  const bytes = new Blob([JSON.stringify(data)]).size;
  const kb = (bytes / 1024).toFixed(1);
  const backups = Object.keys(localStorage).filter(k => k.startsWith("projectReacher_backup_"));

  const legacyDateCollections = ["workouts", "checkins", "measurements", "bodyweightLogs", "nutritionLogs", "recoveryLogs", "stimulantLogs"];
  const legacyDateCount = legacyDateCollections.reduce((sum, key) => sum + (data[key] || []).filter(item => isLegacySlashDate(item.date)).length, 0);

  el.innerHTML = `
    <p class="small">Schema version: ${data.schemaVersion} · Storage used: ~${kb}KB</p>
    <p class="small">Logged: ${data.workouts.length} workouts · ${data.bodyweightLogs.length} bodyweight entries · ${data.checkins.length} check-ins · ${data.measurements.length} measurements</p>
    ${backups.length ? `<p class="small">${backups.length} automatic pre-migration backup(s) stored locally.</p>` : ""}
    ${legacyDateCount ? `<p class="small">${legacyDateCount} entries use the older DD/MM/YYYY date format — these are parsed correctly by this version of the app, no action needed.</p>` : ""}`;
}
