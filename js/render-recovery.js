import { $, esc } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import {
  calculateSleepDuration, formatHoursAsHM, sleepStats, weekendRecoveryStatus,
  hydrationStatus, caffeineLoadStatus, recoveryMealCompliance, readinessScore,
  detectFatigueReason, activeRecoveryProtocols, recoveryCoachRead, currentBodyweightKg, caffeineGradualReductionPlan
} from "./calculations.js";
import { SUPPLEMENT_DATABASE, MEDICAL_EDUCATION_DATABASE, MEDICAL_DISCLAIMERS } from "./recovery-data.js";
import { runContingencyEngine } from "./contingency-engine.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

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
    source: $("sSource")?.value || null,
    productName: $("sProductName")?.value || "",
    servingSize: $("sServingSize")?.value || "",
    betaAlanineMg: $("sBetaAlanineMg")?.value === "" ? null : Number($("sBetaAlanineMg")?.value),
    bcaaMg: $("sBcaaMg")?.value === "" ? null : Number($("sBcaaMg")?.value),
    preWorkoutMealCompleted: $("sPreWorkoutMealCompleted")?.checked ?? null,
    perceivedEffect: $("sPerceivedEffect")?.value === "" ? null : Number($("sPerceivedEffect")?.value),
    pumpQuality: $("sPumpQuality")?.value === "" ? null : Number($("sPumpQuality")?.value),
    crashLater: $("sCrashLater")?.checked ?? null,
    jittersAnxiety: $("sJittersAnxiety")?.checked ?? null,
    sleepAffected: $("sSleepAffected")?.checked ?? null,
    performanceImproved: $("sPerformanceImproved")?.checked ?? null,
    nicotineUsed: $("sNicotineUsed").checked,
    nicotineAmount: $("sNicotineAmount").value,
    nicotineTiming: $("sNicotineTiming").value,
    redFlagSymptoms: [...document.querySelectorAll(".sRedFlag:checked")].map(cb => cb.value),
    notes: $("sNotes").value
  });
  saveData(data);
  ["sCaffeineMg", "sCaffeineTiming", "sProductName", "sServingSize", "sBetaAlanineMg", "sBcaaMg", "sPerceivedEffect", "sPumpQuality", "sNicotineAmount", "sNicotineTiming", "sNotes"]
    .forEach(id => { if ($(id)) $(id).value = ""; });
  document.querySelectorAll(".sRedFlag:checked").forEach(cb => cb.checked = false);
  ["sPreWorkoutMealCompleted", "sCrashLater", "sJittersAnxiety", "sSleepAffected", "sPerformanceImproved", "sNicotineUsed"]
    .forEach(id => { if ($(id)) $(id).checked = false; });
  if ($("sSource")) $("sSource").value = "";
  window.dispatchEvent(new CustomEvent("reacher:refresh"));
  alert("Stimulant log saved.");
}

export function renderStimulantHistory(data) {
  const el = $("stimulantHistory");
  if (!el) return;
  el.innerHTML = data.stimulantLogs.slice().reverse().slice(0, 20).map(s => `
    <div class="history-item">
      <strong>${esc(s.date)}</strong> · Caffeine ${s.caffeineMg}mg ${s.caffeineTiming ? `(${esc(s.caffeineTiming)})` : ""}${s.source ? ` · ${esc(s.source)}` : ""}${s.productName ? ` — ${esc(s.productName)}` : ""} ${s.nicotineUsed ? `· Nicotine used ${esc(s.nicotineAmount || "")}` : ""}
      ${s.notes ? `<br>${esc(s.notes)}` : ""}
      <div class="actions"><button class="danger" data-delete="stimulantLogs" data-id="${s.id}">Delete</button></div>
    </div>`).join("") || "<p class='small'>No stimulant logs yet.</p>";
}

// ==================== RECOVERY COMMAND CENTRE ====================

export function saveSleepLog() {
  const data = getData();
  const bedtime = $("sleepBedtime")?.value || "";
  const wakeTime = $("sleepWakeTime")?.value || "";
  const now = new Date().toISOString();
  data.sleepLogs.push({
    id: uid(),
    date: new Date().toLocaleDateString("en-CA"),
    bedtime: bedtime || null,
    wakeTime: wakeTime || null,
    calculatedDurationHours: calculateSleepDuration(bedtime, wakeTime),
    timeToFallAsleepMinutes: $("sleepTimeToFallAsleep")?.value === "" ? null : Number($("sleepTimeToFallAsleep")?.value),
    awakenings: $("sleepAwakenings")?.value === "" ? null : Number($("sleepAwakenings")?.value),
    sleepQuality: $("sleepQuality")?.value === "" ? null : Number($("sleepQuality")?.value),
    morningEnergy: $("sleepMorningEnergy")?.value === "" ? null : Number($("sleepMorningEnergy")?.value),
    napDurationMinutes: $("sleepNapDuration")?.value === "" ? null : Number($("sleepNapDuration")?.value),
    napTime: $("sleepNapTime")?.value || null,
    caffeineCutoffTime: $("sleepCaffeineCutoff")?.value || null,
    preBedRoutineCompleted: $("sleepPreBedRoutine")?.checked ?? null,
    weekendRecoveryExtension: $("sleepWeekendExtension")?.checked ?? null,
    notes: $("sleepNotes")?.value || "",
    createdAt: now, updatedAt: now
  });
  saveData(data);
  ["sleepBedtime", "sleepWakeTime", "sleepTimeToFallAsleep", "sleepAwakenings", "sleepQuality", "sleepMorningEnergy",
   "sleepNapDuration", "sleepNapTime", "sleepCaffeineCutoff", "sleepNotes"].forEach(id => { if ($(id)) $(id).value = ""; });
  ["sleepPreBedRoutine", "sleepWeekendExtension"].forEach(id => { if ($(id)) $(id).checked = false; });
  refreshAll();
  alert("Sleep log saved.");
}

export function saveHydrationLog() {
  const data = getData();
  const now = new Date().toISOString();
  data.hydrationLogs.push({
    id: uid(),
    date: new Date().toLocaleDateString("en-CA"),
    waterIntake: $("hydWaterIntake")?.value === "" ? null : Number($("hydWaterIntake")?.value),
    electrolytesUsed: $("hydElectrolytesUsed")?.checked ?? null,
    saltIncluded: $("hydSaltIncluded")?.checked ?? null,
    sweatLevel: $("hydSweatLevel")?.value || null,
    pumpQuality: $("hydPumpQuality")?.value === "" ? null : Number($("hydPumpQuality")?.value),
    cramping: $("hydCramping")?.checked ?? null,
    headache: $("hydHeadache")?.checked ?? null,
    notes: $("hydNotes")?.value || "",
    createdAt: now, updatedAt: now
  });
  saveData(data);
  ["hydWaterIntake", "hydPumpQuality", "hydNotes"].forEach(id => { if ($(id)) $(id).value = ""; });
  ["hydElectrolytesUsed", "hydSaltIncluded", "hydCramping", "hydHeadache"].forEach(id => { if ($(id)) $(id).checked = false; });
  if ($("hydSweatLevel")) $("hydSweatLevel").value = "low";
  refreshAll();
  alert("Hydration log saved.");
}

function statusGlowClass(status) {
  if (status === "green" || status === "amber-green") return "recovery-glow-green";
  if (status === "amber") return "recovery-glow-amber";
  return "recovery-glow-red";
}

function renderRecoveryHero(data, readiness, sStats, hydration, caffeine, fatigue) {
  const el = $("recoveryHeroStatus");
  if (!el) return;
  el.className = `recovery-hero-status ${statusGlowClass(readiness.status)}`;
  el.innerHTML = `
    <div class="readiness-score-row">
      <div class="readiness-gauge-wrap">
        <div class="readiness-gauge"><span>${readiness.score}</span></div>
        <span class="tile-label">Readiness</span>
      </div>
      <div class="hero-stat-row" style="flex:1">
        <div class="hero-stat"><span>Sleep Last Night</span><strong>${sStats.hasData && sStats.lastNight != null ? formatHoursAsHM(sStats.lastNight) : "--"}</strong></div>
        <div class="hero-stat"><span>Sleep Debt</span><strong>${sStats.hasData && sStats.sleepDebtHours != null ? `${sStats.sleepDebtHours}h` : "--"}</strong></div>
        <div class="hero-stat"><span>Soreness</span><strong>${data.recoveryLogs.at(-1)?.sorenessScore ?? "--"}/5</strong></div>
        <div class="hero-stat"><span>Energy</span><strong>${data.recoveryLogs.at(-1)?.energyScore ?? "--"}/5</strong></div>
        <div class="hero-stat"><span>Caffeine Load</span><strong>${caffeine.totalMg}mg</strong></div>
        <div class="hero-stat"><span>Hydration</span><strong>${esc(hydration.status)}</strong></div>
      </div>
    </div>
    <p class="mission-tag" style="margin-top:12px">Training Mode: ${esc(readiness.trainingMode)}</p>
    <p class="small">Likely bottleneck: <strong>${esc(readiness.mainBottleneck)}</strong>${readiness.secondaryBottleneck ? ` + ${esc(readiness.secondaryBottleneck)}` : ""}</p>
    <p class="small">${esc(readiness.recommendation)}</p>
    <div class="next-objective-card" style="margin-top:10px"><p class="mission-tag">Next Recovery Objective</p><p class="small">${esc(readiness.nextObjective)}</p></div>
    <p class="small" style="margin-top:8px;opacity:.7">Confidence: ${esc(readiness.confidence)} · This is performance readiness guidance, not a medical diagnosis.</p>
  `;
}

function sleepWindowVisualHtml(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return `<p class="small">Enter bedtime and wake time to see your sleep window.</p>`;
  const toMinutes = (t) => { const m = String(t).match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  const axisStart = 18 * 60; // 18:00
  const axisSpan = 18 * 60; // through 12:00 next day
  const bed = toMinutes(bedtime);
  const wake = toMinutes(wakeTime);
  if (bed == null || wake == null) return "";
  let bedOffset = bed - axisStart; if (bedOffset < 0) bedOffset += 24 * 60;
  let duration = wake - bed; if (duration <= 0) duration += 24 * 60;
  const startPct = Math.max(0, Math.min(100, (bedOffset / axisSpan) * 100));
  const widthPct = Math.max(2, Math.min(100 - startPct, (duration / axisSpan) * 100));
  return `
    <div class="sleep-window-track">
      <div class="sleep-window-fill" style="left:${startPct}%;width:${widthPct}%"></div>
    </div>
    <p class="small">${esc(bedtime)} &nbsp;━━━&nbsp; ${esc(wakeTime)} &nbsp;·&nbsp; ${formatHoursAsHM(calculateSleepDuration(bedtime, wakeTime))} sleep window</p>
  `;
}

function updateSleepWindowVisual() {
  const el = $("sleepWindowVisual");
  if (!el) return;
  el.innerHTML = sleepWindowVisualHtml($("sleepBedtime")?.value, $("sleepWakeTime")?.value);
}

function renderSleepStatsOutput(sStats) {
  const el = $("sleepStatsOutput");
  if (!el) return;
  if (!sStats.hasData) { el.innerHTML = "<p class='small'>Log a sleep entry to see sleep trend outputs.</p>"; return; }
  el.innerHTML = `
    <div class="badge-row">
      <span class="badge">Last night: ${formatHoursAsHM(sStats.lastNight)}</span>
      <span class="badge">7-day avg: ${sStats.sevenDayAverage != null ? formatHoursAsHM(sStats.sevenDayAverage) : "--"}</span>
      <span class="badge">Weekday avg: ${sStats.weekdayAverage != null ? formatHoursAsHM(sStats.weekdayAverage) : "--"}</span>
      <span class="badge">Weekend avg: ${sStats.weekendAverage != null ? formatHoursAsHM(sStats.weekendAverage) : "--"}</span>
      <span class="badge">Sleep debt: ${sStats.sleepDebtHours != null ? `${sStats.sleepDebtHours}h` : "--"}</span>
      <span class="badge status-${sStats.trend === "improving" ? "on-target" : sStats.trend === "declining" ? "fast" : ""}">${esc(sStats.trend)}</span>
    </div>
    <p class="small">Best night: ${sStats.bestDay ? `${esc(sStats.bestDay.date)} (${formatHoursAsHM(sStats.bestDay.hours)})` : "--"} · Worst night: ${sStats.worstDay ? `${esc(sStats.worstDay.date)} (${formatHoursAsHM(sStats.worstDay.hours)})` : "--"}</p>
  `;
}

export function renderSleepHistory(data) {
  const el = $("sleepLogHistory");
  if (!el) return;
  el.innerHTML = data.sleepLogs.slice().reverse().slice(0, 14).map(s => `
    <div class="history-item">
      <strong>${esc(s.date)}</strong> · ${esc(s.bedtime || "--")} → ${esc(s.wakeTime || "--")} · ${s.calculatedDurationHours != null ? formatHoursAsHM(s.calculatedDurationHours) : "--"} · Quality ${s.sleepQuality ?? "-"}/5 · Energy ${s.morningEnergy ?? "-"}/5
      ${s.notes ? `<br>${esc(s.notes)}` : ""}
      <div class="actions"><button class="danger" data-delete="sleepLogs" data-id="${s.id}">Delete</button></div>
    </div>`).join("") || "<p class='small'>No sleep logs yet.</p>";
}

function renderWeekendRecoveryCard(weekend) {
  const el = $("weekendRecoveryCard");
  if (!el) return;
  el.innerHTML = `
    <div class="recovery-battery-wrap">
      <div class="recovery-battery"><div class="recovery-battery-fill" style="width:${weekend.battery}%"></div></div>
      <span class="tile-label">Weekend Recovery Battery</span>
    </div>
    <div class="badge-row">
      <span class="badge">Saturday: ${weekend.satHours != null ? formatHoursAsHM(weekend.satHours) : "--"}</span>
      <span class="badge">Sunday: ${weekend.sunHours != null ? formatHoursAsHM(weekend.sunHours) : "--"}</span>
      <span class="badge status-${weekend.status === "Recovery extended" ? "on-target" : weekend.status === "Partial recovery" ? "under" : "fast"}">${esc(weekend.status)}</span>
    </div>
    <p class="small">Target: 8-10h Saturday and Sunday, optional 20-30 min nap, high-carb recovery meals, lower caffeine.</p>
    <p class="small" style="opacity:.75">${esc(weekend.note)}</p>
  `;
}

function renderFatigueDetectorOutput(fatigue) {
  const el = $("fatigueDetectorOutput");
  if (!el) return;
  const severity = fatigue.professionalSupportWarning ? "red" : fatigue.primaryId === "insufficient-data" ? "amber" : (fatigue.confidence === "high" ? "amber" : "green");
  const severityLabel = fatigue.professionalSupportWarning ? "Adjust" : "Monitor";
  el.innerHTML = `
    ${fatigue.primaryId !== "insufficient-data" ? `<span class="ai-severity sev-${severity}">${esc(severityLabel)}</span>` : ""}
    <p><strong>Primary likely cause:</strong> ${esc(fatigue.primaryCause)}</p>
    ${fatigue.secondaryCause ? `<p><strong>Secondary cause:</strong> ${esc(fatigue.secondaryCause)}</p>` : ""}
    <p class="small">Confidence: ${esc(fatigue.confidence)}</p>
    ${fatigue.primarySignals?.length ? `<p class="small">Signals: ${fatigue.primarySignals.map(esc).join(" · ")}</p>` : ""}
    <p><strong>Today's action:</strong> ${esc(fatigue.todayAction)}</p>
    <p><strong>Next 48h action:</strong> ${esc(fatigue.next48hAction)}</p>
    ${fatigue.professionalSupportWarning ? `<div class="warning-banner">Consider professional support: sports physio, GP/doctor, bloodwork, or qualified clinician review. This app does not diagnose.</div>` : ""}
  `;
}

function renderFuelStatus(mealCompliance) {
  const el = $("recoveryFuelStatus");
  if (!el) return;
  const rows = [
    ["Pre-workout fuel", mealCompliance.preWorkoutComplete],
    ["Post-workout recovery meal", mealCompliance.postWorkoutComplete],
    ["Pre-bed protein", mealCompliance.preBedComplete],
    ["High-carb recovery meal", mealCompliance.highCarbRecoveryComplete],
    ["Protein anchor meal", mealCompliance.proteinAnchorComplete],
    ["Hydration/electrolyte entry", mealCompliance.hydrationTagComplete]
  ];
  el.innerHTML = rows.map(([label, done]) => `
    <div class="checklist-row"><span>${done ? "✅" : "⬜"}</span><span>${esc(label)}</span><span class="badge ${done ? "status-on-target" : ""}">${done ? "Complete" : "Pending"}</span></div>
  `).join("") + `
    <p class="small" style="margin-top:8px">Pre-workout: 30-80g carbs, 25-40g protein, 60-120 min before training, plus water/electrolytes. Post-workout: 30-50g protein, 60-120g carbs, fluids/electrolytes. Pre-bed: 30-50g protein. Tag meals with a Recovery Tag on the Nutrition tab to track these.</p>
  `;
}

function renderHydrationStatusOutput(hydration) {
  const el = $("hydrationStatusOutput");
  if (!el) return;
  if (!hydration.hasData) { el.innerHTML = "<p class='small'>Log a hydration entry to see status.</p>"; return; }
  el.innerHTML = `
    <div class="badge-row"><span class="badge status-${hydration.status === "Hydrated" ? "on-target" : hydration.status === "Monitor" ? "under" : "fast"}">${esc(hydration.status)}</span></div>
    ${hydration.flags.map(f => `<div class="warning-banner">${esc(f)}</div>`).join("")}
  `;
}

function renderRecoveryProtocols(protocols) {
  const el = $("recoveryProtocols");
  if (!el) return;
  if (!protocols.length) { el.innerHTML = "<p class='small'>No recovery protocols currently triggered — keep logging to stay on top of this.</p>"; return; }
  el.innerHTML = protocols.map(p => `
    <div class="protocol-card">
      <p class="mission-tag">Recovery Protocol Active</p>
      <h3 style="margin-top:0">${esc(p.title)}</h3>
      <p class="small">Why triggered: ${esc(p.triggerDescription)}</p>
      <p class="small"><strong>Today:</strong> ${esc(p.todayAction)}</p>
      <p class="small"><strong>Next 48h:</strong> ${esc(p.next48hAction)}</p>
      ${p.trainingAdjustment ? `<p class="small"><strong>Training:</strong> ${esc(p.trainingAdjustment)}</p>` : ""}
      ${p.nutritionAction ? `<p class="small"><strong>Nutrition:</strong> ${esc(p.nutritionAction)}</p>` : ""}
      ${p.hydrationAction ? `<p class="small"><strong>Hydration:</strong> ${esc(p.hydrationAction)}</p>` : ""}
      ${p.caffeineAction ? `<p class="small"><strong>Caffeine:</strong> ${esc(p.caffeineAction)}</p>` : ""}
      ${p.sleepAction ? `<p class="small"><strong>Sleep:</strong> ${esc(p.sleepAction)}</p>` : ""}
      ${p.supplementSupport ? `<p class="small"><strong>Supplement support:</strong> ${esc(p.supplementSupport)}</p>` : ""}
      ${p.escalationNote ? `<div class="warning-banner">${esc(p.escalationNote)}</div>` : ""}
    </div>
  `).join("");
}

function renderAiRecoveryCoach(coach) {
  const el = $("aiRecoveryCoach");
  if (!el) return;
  const severity = coach.status === "green" || coach.status === "amber-green" ? "green" : coach.status === "amber" ? "amber" : "red";
  el.innerHTML = `
    <div class="ai-answer">
      <span class="ai-severity sev-${severity}">${esc(coach.status)}</span>
      <p><strong>Readiness ${coach.readinessScore}</strong> · Main bottleneck: ${esc(coach.mainBottleneck)}${coach.secondaryBottleneck ? ` + ${esc(coach.secondaryBottleneck)}` : ""} · Confidence: ${esc(coach.confidence)}</p>
      <p>${esc(coach.whatThisMeans)}</p>
      <p><strong>Training:</strong> ${esc(coach.trainingRecommendation)}</p>
      <p><strong>Nutrition:</strong> ${esc(coach.nutritionAction)}</p>
      <p><strong>Hydration:</strong> ${esc(coach.hydrationAction)}</p>
      <p><strong>Caffeine:</strong> ${esc(coach.caffeineAction)}</p>
      <p><strong>Sleep:</strong> ${esc(coach.sleepAction)}</p>
      <p><strong>Supplement support:</strong> ${esc(coach.supplementSupport)}</p>
      ${coach.professionalSupportWarning ? `<div class="warning-banner">${esc(coach.professionalSupportWarning)}</div>` : ""}
    </div>
  `;
}

const RECOMMENDATION_BADGE_CLASS = {
  core: "status-on-target", optional: "", conditional: "", caution: "status-under", "low-priority": "status-under", avoid: "status-fast"
};

function renderSupplementDatabase() {
  const el = $("supplementDatabaseList");
  if (!el) return;
  el.innerHTML = SUPPLEMENT_DATABASE.map(s => `
    <div class="history-item">
      <div class="section-title"><strong>${esc(s.name)}</strong><span class="badge ${RECOMMENDATION_BADGE_CLASS[s.recommendationStyle] || ""}">${esc(s.evidenceLevel)}</span></div>
      <p class="small">${esc(s.category)} · ${esc(s.purpose)}</p>
      ${s.doseGuidance ? `<p class="small">Dose: ${esc(s.doseGuidance)}${s.timing ? ` · Timing: ${esc(s.timing)}` : ""}</p>` : ""}
      <p class="small"><strong>Project Reacher use:</strong> ${esc(s.projectReacherUse)}</p>
      ${s.cautions ? `<p class="small">Caution: ${esc(s.cautions)}</p>` : ""}
      <p class="small" style="opacity:.7">${esc(s.notReplacementNote)}</p>
    </div>
  `).join("");
}

function renderMedicalEducationDatabase() {
  const el = $("medicalEducationList");
  if (!el) return;
  el.innerHTML = MEDICAL_EDUCATION_DATABASE.map(m => `
    <div class="history-item">
      <strong>${esc(m.name)}</strong>
      <p class="small">${esc(m.whatItIs)}</p>
      <p class="small"><strong>Why people consider it:</strong> ${esc(m.whyPeopleConsiderIt)}</p>
      <p class="small"><strong>Evidence quality:</strong> ${esc(m.evidenceQuality)}</p>
      <p class="small"><strong>Risk/uncertainty:</strong> ${esc(m.riskNotes)}</p>
      <p class="small"><strong>Legal/medical caution:</strong> ${esc(m.legalMedicalCaution)}</p>
      <p class="small"><strong>When to speak to a clinician:</strong> ${esc(m.whenToSpeakToClinician)}</p>
      <div class="warning-banner">${MEDICAL_DISCLAIMERS.map(esc).join(" · ")}</div>
    </div>
  `).join("");
}

function renderCaffeineStatusCard(data, caffeine) {
  const statusEl = $("caffeineStatusCard");
  if (statusEl) {
    const cutoffHours = data.profile?.caffeineCutoffHours ?? 8;
    statusEl.innerHTML = `
      <div class="badge-row">
        <span class="badge ${caffeine.status === "Low" ? "status-on-target" : caffeine.status === "Moderate" ? "" : "status-under"}">${esc(caffeine.label)}</span>
        <span class="badge">${caffeine.totalMg}mg today</span>
        ${caffeine.mgPerKg != null ? `<span class="badge">${caffeine.mgPerKg}mg/kg</span>` : ""}
        <span class="badge">Cutoff: ${cutoffHours}h before bed</span>
      </div>
      <p class="small">${esc(caffeine.message)}</p>
      ${caffeine.redFlagEscalation ? `<div class="warning-banner">${esc(caffeine.redFlagEscalation)}</div>` : ""}
    `;
  }
  const planEl = $("caffeineReductionPlan");
  if (planEl) {
    const plan = caffeineGradualReductionPlan(data.stimulantLogs || []);
    if (!plan.hasData || !plan.needed) {
      planEl.innerHTML = `<p class="small">${esc(plan.note || "")}</p>`;
    } else {
      planEl.innerHTML = `
        <p class="small"><strong>Gradual Reduction Plan</strong> — current 14-day average: ${plan.currentAverage}mg/day.</p>
        <p class="small">${esc(plan.note)}</p>
        <div class="badge-row">${plan.steps.map(s => `<span class="badge">Week ${s.week}: ~${s.targetMg}mg</span>`).join("")}</div>
      `;
    }
  }
}

export function renderRecoveryCommandCentre(data) {
  if (!$("recoveryHeroStatus")) return;
  const referenceDate = new Date();
  const sStats = sleepStats(data.sleepLogs || [], referenceDate);
  const weekend = weekendRecoveryStatus(data.sleepLogs || [], referenceDate);
  const hydration = hydrationStatus(data.hydrationLogs || [], data.stimulantLogs || [], referenceDate);
  const caffeine = caffeineLoadStatus(data.stimulantLogs || [], referenceDate, currentBodyweightKg(data));
  const mealCompliance = recoveryMealCompliance(data.mealLogs || [], referenceDate);
  const readiness = readinessScore(data, referenceDate);
  const fatigue = detectFatigueReason(data, referenceDate);
  const protocols = activeRecoveryProtocols(data, referenceDate);
  const coach = recoveryCoachRead(data, referenceDate);

  renderRecoveryHero(data, readiness, sStats, hydration, caffeine, fatigue);
  renderCaffeineStatusCard(data, caffeine);
  updateSleepWindowVisual();
  renderSleepStatsOutput(sStats);
  renderSleepHistory(data);
  renderWeekendRecoveryCard(weekend);
  renderFatigueDetectorOutput(fatigue);
  renderFuelStatus(mealCompliance);
  renderHydrationStatusOutput(hydration);
  renderRecoveryProtocols(protocols);
  renderAiRecoveryCoach(coach);
  renderSupplementDatabase();
  renderMedicalEducationDatabase();
  renderContingencyEngineOutput(data);
  renderInterventionHistory(data);
}

// ==================== CONTINGENCY ENGINE + INTERVENTION HISTORY ====================

export function renderContingencyEngineOutput(data) {
  const el = $("contingencyEngineOutput");
  if (!el) return;
  const triggered = runContingencyEngine(data);
  if (!triggered.length) { el.innerHTML = "<p class='small'>No contingency rules triggered right now.</p>"; return; }
  el.innerHTML = triggered.map(r => `
    <div class="history-item">
      <div class="section-title"><strong>${esc(r.title)}</strong><span class="badge ${r.severity === "high" ? "status-under" : ""}">${esc(r.severity)}</span></div>
      <p class="small">${esc(r.issue)}</p>
      <p class="small"><strong>Hypothesis:</strong> ${esc(r.hypothesis)}</p>
      <p class="small"><strong>Suggested intervention:</strong> ${esc(r.suggestedIntervention)}</p>
      <button type="button" class="secondary"
        data-log-intervention-issue="${esc(r.issue)}"
        data-log-intervention-hypothesis="${esc(r.hypothesis)}"
        data-log-intervention-action="${esc(r.suggestedIntervention)}">Log as Intervention</button>
    </div>`).join("");
}

export function saveIntervention() {
  const data = getData();
  const issue = $("interventionIssue")?.value.trim();
  if (!issue) { alert("Describe the issue before logging an intervention."); return; }
  const now = new Date().toISOString();
  data.interventions.push({
    id: uid(),
    issue,
    hypothesis: $("interventionHypothesis")?.value || "",
    intervention: $("interventionAction")?.value || "",
    targetMetric: $("interventionTargetMetric")?.value || "",
    startDate: $("interventionStartDate")?.value || new Date().toLocaleDateString("en-CA"),
    reassessDate: $("interventionReassessDate")?.value || null,
    status: "Open",
    result: "",
    outcome: "Inconclusive",
    createdAt: now, updatedAt: now
  });
  saveData(data);
  ["interventionIssue", "interventionHypothesis", "interventionAction", "interventionTargetMetric", "interventionStartDate", "interventionReassessDate"]
    .forEach(id => { if ($(id)) $(id).value = ""; });
  refreshAll();
  alert("Intervention logged.");
}

export function updateInterventionField(id, field, value) {
  const data = getData();
  const item = data.interventions.find(i => i.id === id);
  if (!item) return;
  item[field] = value;
  item.updatedAt = new Date().toISOString();
  saveData(data);
}

export function renderInterventionHistory(data) {
  const el = $("interventionHistory");
  if (!el) return;
  const statuses = ["Open", "In Progress", "Resolved", "Abandoned"];
  const outcomes = ["Inconclusive", "Successful", "Unsuccessful"];
  el.innerHTML = data.interventions.slice().reverse().map(i => `
    <div class="history-item">
      <div class="section-title"><strong>${esc(i.issue)}</strong>
        <select data-intervention="${i.id}" data-field="status">
          ${statuses.map(s => `<option value="${s}" ${i.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      ${i.hypothesis ? `<p class="small"><strong>Hypothesis:</strong> ${esc(i.hypothesis)}</p>` : ""}
      ${i.intervention ? `<p class="small"><strong>Intervention:</strong> ${esc(i.intervention)}</p>` : ""}
      ${i.targetMetric ? `<p class="small"><strong>Target metric:</strong> ${esc(i.targetMetric)}</p>` : ""}
      <p class="small">Started ${esc(i.startDate)}${i.reassessDate ? ` · Reassess ${esc(i.reassessDate)}` : ""}</p>
      <textarea data-intervention="${i.id}" data-field="result" placeholder="Result / outcome">${esc(i.result || "")}</textarea>
      <label>Outcome <select data-intervention="${i.id}" data-field="outcome">
        ${outcomes.map(o => `<option value="${o}" ${(i.outcome || "Inconclusive") === o ? "selected" : ""}>${o}</option>`).join("")}
      </select></label>
      <div class="actions"><button class="danger" data-delete="interventions" data-id="${i.id}">Delete</button></div>
    </div>`).join("") || "<p class='small'>No interventions logged yet.</p>";
}

export function setupRecoveryEventDelegation() {
  document.addEventListener("input", (e) => {
    if (e.target.id === "sleepBedtime" || e.target.id === "sleepWakeTime") updateSleepWindowVisual();
  });
  document.addEventListener("click", (e) => {
    const preset = e.target.closest("[data-sleep-preset]");
    if (preset) {
      const hours = Number(preset.dataset.sleepPreset);
      const wake = $("sleepWakeTime")?.value || "07:00";
      const [wh, wm] = wake.split(":").map(Number);
      let bedMinutes = (wh * 60 + wm) - hours * 60;
      if (bedMinutes < 0) bedMinutes += 24 * 60;
      const bh = String(Math.floor(bedMinutes / 60) % 24).padStart(2, "0");
      const bm = String(bedMinutes % 60).padStart(2, "0");
      if ($("sleepBedtime")) $("sleepBedtime").value = `${bh}:${bm}`;
      if ($("sleepWakeTime") && !$("sleepWakeTime").value) $("sleepWakeTime").value = wake;
      updateSleepWindowVisual();
    }

    const logBtn = e.target.closest("[data-log-intervention-issue]");
    if (logBtn) {
      if ($("interventionIssue")) $("interventionIssue").value = logBtn.dataset.logInterventionIssue || "";
      if ($("interventionHypothesis")) $("interventionHypothesis").value = logBtn.dataset.logInterventionHypothesis || "";
      if ($("interventionAction")) $("interventionAction").value = logBtn.dataset.logInterventionAction || "";
      $("interventionIssue")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  document.addEventListener("change", (e) => {
    const field = e.target.closest("[data-intervention]");
    if (!field) return;
    updateInterventionField(field.dataset.intervention, field.dataset.field, field.value);
  });
}
