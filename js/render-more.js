import { $, esc, fmt } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import {
  average, weeklyRateOfGain, sevenDayAverage, ratios, weeklyVolumeByMuscleGroup, workoutsInWeek, armForearmBalance, volumeStatus, armForearmDeltWarnings,
  weeklyRecoveryDebrief, monthlyRecoveryTrajectory
} from "./calculations.js";
import { parseLogDate, isSameWeek, startOfWeek, isLegacySlashDate } from "./dates.js";
import {
  DEFAULT_SESSION_NUTRITION, SAFE_FALLBACK_SESSION_NUTRITION, getSessionNutritionForDay, isValidSessionNutritionNumber
} from "./session-nutrition.js";
import { eid } from "./program.js";
import { allSplits, activeSplit, createSplit, renameSplit, deleteSplit, switchActiveSplit, syncActiveSplitDays } from "./training-splits.js";
import { PRIORITY_TIER_LABELS, DEFAULT_PRIORITY_HEAD_ORDER } from "./hypertrophy-warnings.js";
import { hypertrophyAllocationPass } from "./hypertrophy-allocation.js";

export function renderVisualModeToggle(data) {
  const checkbox = $("visualModeToggle");
  const note = $("visualModeNote");
  if (!checkbox) return;
  checkbox.checked = !!data.profile.visualModeEnabled;
  if (note) note.textContent = data.profile.visualModeEnabled ? "Private personal visual mode enabled." : "";
}

export function toggleVisualMode() {
  const data = getData();
  data.profile.visualModeEnabled = $("visualModeToggle").checked;
  saveData(data);
  window.dispatchEvent(new CustomEvent("reacher:refresh"));
}

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
  if ($("pTrackLength")) $("pTrackLength").value = p.functionalTrackLengthMetres ?? 15;
  if ($("pCaffeineCutoff")) $("pCaffeineCutoff").value = p.caffeineCutoffHours ?? 8;
}

export function saveProfile() {
  const data = getData();
  const clampedTrackLength = Math.min(25, Math.max(10, Number($("pTrackLength")?.value || data.profile.functionalTrackLengthMetres || 15)));
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
    notes: $("pNotes").value,
    functionalTrackLengthMetres: clampedTrackLength,
    caffeineCutoffHours: $("pCaffeineCutoff")?.value === "" ? data.profile.caffeineCutoffHours : Number($("pCaffeineCutoff")?.value ?? data.profile.caffeineCutoffHours)
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

  const ARM_FOREARM_DELT_EXERCISES = new Set([
    "Incline DB Curl", "Hammer Curl", "EZ Curl", "Reverse Curl",
    "Overhead Triceps Extension", "Reverse-Grip Bar Extension", "Triceps Pushdown", "Close Grip Chest Press",
    "Wrist Curl", "Reverse Wrist Curl", "Farmer's Carry", "Trap Bar Hold",
    "Cable Lateral Raise", "Seated DB Lateral Raise", "Face Pull", "Rear Delt Fly"
  ]);
  const armForearmDeltEntries = sessions.flatMap(w => (w.exercises || []).filter(e => ARM_FOREARM_DELT_EXERCISES.has(e.name)));
  const bestArmForearmDeltLift = armForearmDeltEntries.reduce((best, e) => {
    const vol = (Number(e.set1Weight) || 0) * (Number(e.set1Reps) || 0) + (Number(e.set2Weight) || 0) * (Number(e.set2Reps) || 0);
    const bestVol = best ? (Number(best.set1Weight) || 0) * (Number(best.set1Reps) || 0) + (Number(best.set2Weight) || 0) * (Number(best.set2Reps) || 0) : -1;
    return vol > bestVol ? e : best;
  }, null);
  const weekVolume = weeklyVolumeByMuscleGroup(data.workouts, data.exercises, now);
  const armForearmDeltReview = {
    bicepsSets: weekVolume["biceps"] || 0,
    brachialisSets: weekVolume["brachialis"] || 0,
    tricepsSets: weekVolume["triceps"] || 0,
    forearmSets: (weekVolume["forearms"] || 0) + (weekVolume["forearm-flexors"] || 0) + (weekVolume["forearm-extensors"] || 0),
    gripSets: weekVolume["grip"] || 0,
    sideDeltSets: weekVolume["side delts"] || 0,
    bestLift: bestArmForearmDeltLift ? `${bestArmForearmDeltLift.name}: ${bestArmForearmDeltLift.set1Weight}kg x ${bestArmForearmDeltLift.set1Reps}` : "No arm/forearm/delt sets logged this week.",
    forearmCatchingUp: volumeStatus("forearms", (weekVolume["forearms"] || 0) + (weekVolume["forearm-flexors"] || 0) + (weekVolume["forearm-extensors"] || 0)).status !== "under",
    sideDeltProductive: volumeStatus("side delts", weekVolume["side delts"] || 0).status !== "under",
    warnings: armForearmDeltWarnings({ workouts: data.workouts, exercises: data.exercises }, now)
  };

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
    armForearmDeltReview,
    recoveryDebrief: weeklyRecoveryDebrief(data, now),
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
      ${last.armForearmDeltReview ? renderArmForearmDeltReview(last.armForearmDeltReview) : ""}
      ${last.recoveryDebrief ? renderWeeklyRecoveryDebrief(last.recoveryDebrief) : ""}
    </div>`;
}

function renderWeeklyRecoveryDebrief(d) {
  return `
    <div class="library-quick-explain-box">
      <p class="mission-tag">Weekly Recovery Debrief</p>
      <p class="small">Avg sleep: ${d.averageSleep ?? "--"}h (weekday ${d.weekdaySleepAverage ?? "--"}h · weekend ${d.weekendSleepAverage ?? "--"}h) · Sleep debt estimate: ${d.sleepDebtEstimate ?? "--"}h</p>
      <p class="small">Best night: ${d.bestSleepNight ? `${esc(d.bestSleepNight.date)} (${d.bestSleepNight.hours}h)` : "--"} · Worst night: ${d.worstSleepNight ? `${esc(d.worstSleepNight.date)} (${d.worstSleepNight.hours}h)` : "--"}</p>
      <p class="small">Caffeine avg: ${d.caffeineAverage ?? "--"}mg · High-caffeine days: ${d.highCaffeineDays}</p>
      <p class="small">Pre-workout fuel compliance: ${d.preWorkoutFuelCompliance ?? "--"}% · Post-workout recovery compliance: ${d.postWorkoutRecoveryCompliance ?? "--"}%</p>
      <p class="small">Pre-bed routine compliance: ${d.preBedRoutineCompliance ?? "--"}% · Hydration/electrolyte compliance: ${d.hydrationElectrolyteCompliance ?? "--"}%</p>
      <p class="small">Average soreness: ${d.averageSoreness ?? "--"}/5 · Recovery bottleneck of the week: <strong>${esc(d.recoveryBottleneckOfWeek)}</strong></p>
      <p class="small"><strong>Next week objective:</strong> ${esc(d.nextWeekObjective)}</p>
    </div>`;
}

function renderArmForearmDeltReview(review) {
  return `
    <div class="library-quick-explain-box">
      <strong>Arm + Forearm + Delt Specialisation Review</strong>
      <p class="small">Biceps ${review.bicepsSets} sets · Brachialis ${review.brachialisSets} sets · Triceps ${review.tricepsSets} sets</p>
      <p class="small">Forearm ${review.forearmSets} sets (${review.forearmCatchingUp ? "catching up" : "still behind — keep pushing"}) · Grip ${review.gripSets} sets</p>
      <p class="small">Side delts ${review.sideDeltSets} sets (${review.sideDeltProductive ? "productive volume" : "below productive threshold"})</p>
      <p class="small">Best lift this week: ${esc(review.bestLift)}</p>
      ${review.warnings.map(w => `<div class="warning-banner">${esc(w)}</div>`).join("")}
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
    armForearmBalance: (first && last) ? armForearmBalance(first, last) : { status: "insufficient-data", message: "Not enough measurement data yet." },
    recoveryTrajectory: monthlyRecoveryTrajectory(data, now),
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
      ${last.armForearmBalance ? `Arm change: ${last.armForearmBalance.armChange ?? "--"}cm avg · Forearm change: ${last.armForearmBalance.forearmChange ?? "--"}cm avg — <strong>${esc(last.armForearmBalance.message)}</strong><br>` : ""}
      Nutrition: ${esc(last.macroAdherenceNote)}<br>
      Recovery: ${esc(last.recoveryTrend)}<br>
      Stimulants: ${esc(last.stimulantTrend)}<br>
      <strong>Recommendation: ${esc(last.recommendation)}</strong>
      ${last.notes ? `<br>${esc(last.notes)}` : ""}
      ${last.recoveryTrajectory ? renderMonthlyRecoveryTrajectory(last.recoveryTrajectory) : ""}
    </div>${controls}`;
}

function renderMonthlyRecoveryTrajectory(t) {
  return `
    <div class="library-quick-explain-box">
      <p class="mission-tag">Monthly Recovery Trajectory</p>
      <p class="small">Monthly avg sleep: ${t.monthlyAverageSleep ?? "--"}h · Weekday vs weekend gap: ${t.weekdayVsWeekendGap ?? "--"}h</p>
      <p class="small">Caffeine trend: ${t.caffeineTrend ?? "--"}mg/day · Recovery score trend: ${t.recoveryScoreTrend ?? "--"}/5</p>
      <p class="small">Bodyweight gain this month: ${t.bodyweightGain ?? "--"}kg (target ~${t.targetGainForMonth ?? "--"}kg) · Sessions logged: ${t.sessionsLogged}</p>
      <p class="small">6-day training sustainability: ${t.sixDaySustainable ? "On track" : "At risk"}</p>
      <p class="small"><strong>${esc(t.label)}</strong> — ${esc(t.nextMonthPriority)}</p>
    </div>`;
}

function sessionNutritionNumberFieldHtml(section, field, label, value, unit) {
  return `<label class="small">${esc(label)}${unit ? ` (${esc(unit)})` : ""}
    <input type="number" min="0" step="1" data-section="${esc(section)}" data-field="${esc(field)}" value="${value == null ? "" : esc(value)}">
  </label>`;
}

function renderSessionNutritionEditorHtml(day, config) {
  const pre = config.preWorkout, during = config.duringWorkout, post = config.postWorkout;
  return `
    <details class="category-section session-nutrition-editor" data-day="${esc(day)}">
      <summary><strong>Session Nutrition</strong></summary>
      <h4>Pre-Workout</h4>
      <div class="form-grid">
        ${sessionNutritionNumberFieldHtml("preWorkout", "timingMinMinutes", "Timing min", pre.timingMinMinutes, "minutes before")}
        ${sessionNutritionNumberFieldHtml("preWorkout", "timingMaxMinutes", "Timing max", pre.timingMaxMinutes, "minutes before")}
        ${sessionNutritionNumberFieldHtml("preWorkout", "proteinGrams", "Protein", pre.proteinGrams, "g")}
        ${sessionNutritionNumberFieldHtml("preWorkout", "carbohydrateGrams", "Carbohydrates", pre.carbohydrateGrams, "g")}
        ${sessionNutritionNumberFieldHtml("preWorkout", "fatMaxGrams", "Fat max", pre.fatMaxGrams, "g")}
        ${sessionNutritionNumberFieldHtml("preWorkout", "fibreMaxGrams", "Fibre max", pre.fibreMaxGrams, "g")}
        ${sessionNutritionNumberFieldHtml("preWorkout", "waterMl", "Water", pre.waterMl, "ml")}
        ${sessionNutritionNumberFieldHtml("preWorkout", "sodiumMg", "Sodium", pre.sodiumMg, "mg")}
      </div>
      <label class="small">Explanation
        <textarea data-section="preWorkout" data-field="explanation" rows="2">${esc(pre.explanation || "")}</textarea>
      </label>

      <h4>During Training (optional)</h4>
      <div class="form-grid">
        <label class="small">Water guidance
          <input type="text" data-section="duringWorkout" data-field="waterGuidance" value="${esc(during.waterGuidance || "")}">
        </label>
        ${sessionNutritionNumberFieldHtml("duringWorkout", "carbohydrateGramsMin", "Carb min", during.carbohydrateGramsMin, "g")}
        ${sessionNutritionNumberFieldHtml("duringWorkout", "carbohydrateGramsMax", "Carb max", during.carbohydrateGramsMax, "g")}
        ${sessionNutritionNumberFieldHtml("duringWorkout", "sodiumMgMin", "Sodium min", during.sodiumMgMin, "mg")}
        ${sessionNutritionNumberFieldHtml("duringWorkout", "sodiumMgMax", "Sodium max", during.sodiumMgMax, "mg")}
      </div>
      <label class="small">Condition
        <input type="text" data-section="duringWorkout" data-field="condition" value="${esc(during.condition || "")}">
      </label>

      <h4>Post-Workout</h4>
      <div class="form-grid">
        ${sessionNutritionNumberFieldHtml("postWorkout", "timingMaxMinutes", "Timing max", post.timingMaxMinutes, "minutes after")}
        ${sessionNutritionNumberFieldHtml("postWorkout", "proteinGrams", "Protein", post.proteinGrams, "g")}
        ${sessionNutritionNumberFieldHtml("postWorkout", "carbohydrateGrams", "Carbohydrates", post.carbohydrateGrams, "g")}
        ${sessionNutritionNumberFieldHtml("postWorkout", "fatMaxGrams", "Fat max", post.fatMaxGrams, "g")}
        ${sessionNutritionNumberFieldHtml("postWorkout", "waterMl", "Water", post.waterMl, "ml")}
        ${sessionNutritionNumberFieldHtml("postWorkout", "sodiumMg", "Sodium", post.sodiumMg, "mg")}
      </div>
      <label class="small">Explanation
        <textarea data-section="postWorkout" data-field="explanation" rows="2">${esc(post.explanation || "")}</textarea>
      </label>

      <button type="button" class="session-nutrition-restore-defaults" data-day="${esc(day)}">Restore recommended defaults</button>
    </details>`;
}

function applySessionNutritionEditorToData(el, d) {
  const skippedDays = [];
  el.querySelectorAll(".session-nutrition-editor").forEach(editorEl => {
    const day = editorEl.dataset.day;
    const existing = getSessionNutritionForDay(d, day);
    const updated = structuredClone(existing);
    const invalidFields = [];
    editorEl.querySelectorAll("[data-section][data-field]").forEach(input => {
      const section = input.dataset.section;
      const field = input.dataset.field;
      if (input.tagName === "TEXTAREA" || input.type === "text") {
        updated[section][field] = input.value;
        return;
      }
      if (!isValidSessionNutritionNumber(input.value)) {
        invalidFields.push(`${section}.${field}`);
        return;
      }
      updated[section][field] = input.value === "" ? null : Number(input.value);
    });
    if (invalidFields.length) {
      skippedDays.push(day);
      return;
    }
    if (!d.sessionNutrition) d.sessionNutrition = {};
    d.sessionNutrition[day] = updated;
  });
  return skippedDays;
}

function programEditorRowHtml(e, i) {
  return `
    <tr data-idx="${i}">
      <td><input data-field="name" value="${esc(e.name)}"></td>
      <td><input data-field="repRange" value="${esc(e.repRange)}"></td>
      <td><input data-field="note" value="${esc(e.note || "")}"></td>
      <td class="program-editor-row-actions">
        <button type="button" class="row-move-up" title="Move up">&uarr;</button>
        <button type="button" class="row-move-down" title="Move down">&darr;</button>
        <button type="button" class="row-remove" title="Remove exercise">&times;</button>
      </td>
    </tr>`;
}

/**
 * Split Versioning (Hypertrophy Intelligence Engine spec): switch which named split is
 * active, or create/rename/delete a split. Switching only ever replaces which day-map
 * data.trainingProgram resolves to — it never touches workouts/PRs/exercises, so history,
 * predicted loads and progression graphs for every exercise are completely unaffected by
 * which split is active.
 */
function renderSplitSwitcherHtml(data) {
  const splits = allSplits(data);
  return `
    <div class="split-switcher">
      <label>Active training split
        <select id="splitSwitcherSelect">
          ${splits.map(s => `<option value="${esc(s.id)}" ${s.id === data.activeSplitId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}
        </select>
      </label>
      <button type="button" id="newSplitBtn">New split</button>
      <button type="button" id="renameSplitBtn">Rename split</button>
      <button type="button" id="deleteSplitBtn">Delete split</button>
      <p class="small">Splits are named, swappable versions of the whole programme below. Switching splits never deletes or alters any exercise history, PRs, predicted loads, notes or progression graphs — those all stay tied to the exercise itself, not to which split is active.</p>
    </div>`;
}

/** Human-readable default priority-tier order (index 0-6), for when no custom order is saved. */
function currentPriorityTierOrder(data) {
  const order = data.physiquePriorityTierOrder;
  if (Array.isArray(order) && order.length === DEFAULT_PRIORITY_HEAD_ORDER.length
    && new Set(order).size === DEFAULT_PRIORITY_HEAD_ORDER.length
    && order.every(i => Number.isInteger(i) && i >= 0 && i < DEFAULT_PRIORITY_HEAD_ORDER.length)) {
    return order;
  }
  return DEFAULT_PRIORITY_HEAD_ORDER.map((_, i) => i);
}

/**
 * Priority Physique Allocation (Hypertrophy Intelligence Engine spec Phase 8): lets a user
 * reorder the tiers Weak Point Analysis (js/hypertrophy-warnings.js weakPointRanking) uses to
 * decide which under-target/plateaued structure to surface first. Purely a ranking preference
 * — it never changes anything actually programmed.
 */
export function renderPhysiquePriorityOrder(data) {
  const el = $("physiquePriorityOrder");
  if (!el) return;
  const order = currentPriorityTierOrder(data);

  el.innerHTML = `
    <ol class="priority-tier-list">
      ${order.map((tierIndex, position) => `
        <li data-tier-index="${tierIndex}">
          <span>${position + 1}. ${PRIORITY_TIER_LABELS[tierIndex]}</span>
          <span class="program-editor-row-actions">
            <button type="button" class="tier-move-up" title="Move up">&uarr;</button>
            <button type="button" class="tier-move-down" title="Move down">&darr;</button>
          </span>
        </li>`).join("")}
    </ol>
    <button type="button" id="resetPriorityOrderBtn">Reset to default order</button>`;

  el.querySelectorAll(".tier-move-up, .tier-move-down").forEach(btn => {
    btn.addEventListener("click", () => {
      const li = btn.closest("li[data-tier-index]");
      if (btn.classList.contains("tier-move-up")) {
        const prev = li.previousElementSibling;
        if (prev) li.parentElement.insertBefore(li, prev);
      } else {
        const next = li.nextElementSibling;
        if (next) li.parentElement.insertBefore(next, li);
      }
      const newOrder = [...el.querySelectorAll("li[data-tier-index]")].map(x => Number(x.dataset.tierIndex));
      const d = getData();
      d.physiquePriorityTierOrder = newOrder;
      saveData(d);
      window.dispatchEvent(new CustomEvent("reacher:refresh"));
    });
  });

  $("resetPriorityOrderBtn")?.addEventListener("click", () => {
    const d = getData();
    d.physiquePriorityTierOrder = null;
    saveData(d);
    window.dispatchEvent(new CustomEvent("reacher:refresh"));
  });
}

const ALLOCATION_SECTION_LABEL = {
  warnings: "programme warning", fatigueBudgetWarnings: "fatigue budget warning",
  adaptiveVolumeWarnings: "volume warning", weakPoints: "weak point",
  orderSuggestions: "suggested day re-order", evolutionRecommendations: "programme evolution suggestion",
  relocationSuggestions: "relocation suggestion"
};

/**
 * Hypertrophy Allocation Pass (Hypertrophy Intelligence Engine spec Phase 8): the
 * consolidated read of Phases 1-7's output for the currently active split, recomputed after
 * every Program Editor save or split switch. Purely informational — a count-and-summary
 * view, not a new source of truth (every underlying number still lives in its own phase).
 */
export function renderHypertrophyAllocationSummary(data) {
  const el = $("hypertrophyAllocationSummary");
  if (!el) return;
  const pass = hypertrophyAllocationPass(data, new Date());
  const sections = Object.keys(ALLOCATION_SECTION_LABEL);
  const totalCount = sections.reduce((sum, key) => sum + (pass[key]?.length || 0), 0);

  if (!totalCount) {
    el.innerHTML = "<p class='small'>No overlap, fatigue, placement or stimulus-satisfaction issues found for the active split right now.</p>";
    return;
  }

  el.innerHTML = `<ul class="allocation-pass-summary">${sections
    .filter(key => pass[key]?.length)
    .map(key => `<li>${pass[key].length} ${esc(ALLOCATION_SECTION_LABEL[key])}${pass[key].length === 1 ? "" : "s"}</li>`)
    .join("")}</ul>`;
}

export function renderProgramEditor(data) {
  renderPhysiquePriorityOrder(data);
  renderHypertrophyAllocationSummary(data);
  const el = $("programEditor");
  el.innerHTML = renderSplitSwitcherHtml(data) + Object.entries(data.trainingProgram).map(([day, exercises]) => {
    const dayExerciseNames = new Set(exercises.map(e => e.name));
    const availableToAdd = (data.exercises || []).filter(ex => ex.active !== false && !dayExerciseNames.has(ex.name));
    return `
    <h3>${esc(day)}</h3>
    <div class="table-wrap"><table class="data-table" data-day="${esc(day)}">
      <thead><tr><th>Exercise</th><th>Rep Range</th><th>Note</th><th>Actions</th></tr></thead>
      <tbody>
        ${exercises.map((e, i) => programEditorRowHtml(e, i)).join("")}
      </tbody>
    </table></div>
    <div class="program-editor-add-row">
      <select data-add-exercise-select data-day="${esc(day)}">
        <option value="">Add exercise&hellip;</option>
        ${availableToAdd.map(ex => `<option value="${esc(ex.name)}">${esc(ex.name)}</option>`).join("")}
      </select>
      <button type="button" class="add-exercise-btn" data-day="${esc(day)}">Add to ${esc(day)}</button>
    </div>
    ${renderSessionNutritionEditorHtml(day, getSessionNutritionForDay(data, day))}
  `;
  }).join("") + `<button id="saveProgram">Save Program Changes</button>`;

  $("splitSwitcherSelect")?.addEventListener("change", (ev) => {
    const d = getData();
    switchActiveSplit(d, ev.target.value);
    window.dispatchEvent(new CustomEvent("reacher:refresh"));
  });

  $("newSplitBtn")?.addEventListener("click", () => {
    const name = prompt("New split name:");
    if (name == null) return;
    const d = getData();
    const newId = createSplit(d, name, { copyFromActive: true });
    if (!newId) { alert("Split name can't be empty."); return; }
    switchActiveSplit(d, newId);
    window.dispatchEvent(new CustomEvent("reacher:refresh"));
  });

  $("renameSplitBtn")?.addEventListener("click", () => {
    const d = getData();
    const current = activeSplit(d);
    const name = prompt("Rename split:", current?.name || "");
    if (name == null) return;
    if (!renameSplit(d, d.activeSplitId, name)) { alert("Split name can't be empty."); return; }
    window.dispatchEvent(new CustomEvent("reacher:refresh"));
  });

  $("deleteSplitBtn")?.addEventListener("click", () => {
    const d = getData();
    if (!confirm("Delete this split? Its exercise names/structure will be removed, but nothing in your logged history, PRs or progression is affected.")) return;
    const result = deleteSplit(d, d.activeSplitId);
    if (!result.ok) {
      const messages = {
        "at-least-one-required": "You need at least one split — create another before deleting this one.",
        "cannot-delete-active": "Switch to a different split first, then delete this one.",
        "not-found": "That split no longer exists."
      };
      alert(messages[result.reason] || "Couldn't delete that split.");
      return;
    }
    window.dispatchEvent(new CustomEvent("reacher:refresh"));
  });

  el.querySelectorAll(".add-exercise-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.day;
      const select = el.querySelector(`select[data-add-exercise-select][data-day="${CSS.escape(day)}"]`);
      const name = select?.value;
      if (!name) return;
      const table = el.querySelector(`table[data-day="${CSS.escape(day)}"]`);
      const tbody = table.querySelector("tbody");
      const alreadyPresent = [...tbody.querySelectorAll('[data-field="name"]')].some(input => input.value === name);
      if (alreadyPresent) { alert(`${name} is already on ${day}.`); return; }
      const exerciseDef = (data.exercises || []).find(ex => ex.name === name);
      const repRange = exerciseDef && exerciseDef.repRangeMin != null && exerciseDef.repRangeMax != null
        ? `${exerciseDef.repRangeMin}-${exerciseDef.repRangeMax}` : "";
      const wrapper = document.createElement("tbody");
      wrapper.innerHTML = programEditorRowHtml({ name, repRange, note: "" }, tbody.children.length);
      tbody.appendChild(wrapper.firstElementChild);
      select.value = "";
    });
  });

  el.addEventListener("click", (ev) => {
    const row = ev.target.closest("tr[data-idx]");
    if (!row) return;
    if (ev.target.classList.contains("row-remove")) {
      row.remove();
    } else if (ev.target.classList.contains("row-move-up")) {
      const prev = row.previousElementSibling;
      if (prev) row.parentElement.insertBefore(row, prev);
    } else if (ev.target.classList.contains("row-move-down")) {
      const next = row.nextElementSibling;
      if (next) row.parentElement.insertBefore(next, row);
    }
  });

  $("saveProgram").addEventListener("click", () => {
    const d = getData();
    el.querySelectorAll("table[data-day]").forEach(table => {
      const day = table.dataset.day;
      const rows = [...table.querySelectorAll("tbody tr")];
      d.trainingProgram[day] = rows.map(row => {
        const name = row.querySelector('[data-field="name"]').value.trim();
        const repRange = row.querySelector('[data-field="repRange"]').value;
        const note = row.querySelector('[data-field="note"]').value;
        return { id: eid(name), name, repRange, note };
      }).filter(entry => entry.name);
    });
    const skippedDays = applySessionNutritionEditorToData(el, d);
    syncActiveSplitDays(d);
    window.dispatchEvent(new CustomEvent("reacher:refresh"));
    const skippedNote = skippedDays.length
      ? ` Session nutrition for ${skippedDays.join(", ")} was left unchanged because it contained a negative value.`
      : "";
    alert(`Program updated. Future sessions will use the new exercise names/targets — past logs are untouched.${skippedNote}`);
  });

  el.querySelectorAll(".session-nutrition-restore-defaults").forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.dataset.day;
      const d = getData();
      if (!d.sessionNutrition) d.sessionNutrition = {};
      d.sessionNutrition[day] = structuredClone(DEFAULT_SESSION_NUTRITION[day] || SAFE_FALLBACK_SESSION_NUTRITION);
      saveData(d);
      window.dispatchEvent(new CustomEvent("reacher:refresh"));
      alert(`Session nutrition for ${day} restored to recommended defaults.`);
    });
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
  const label = SYNC_STATUS_LABELS[state.status] || state.status;
  const badgeText = state.status === "synced" && state.lastSyncedAt
    ? `Synced ${new Date(state.lastSyncedAt).toLocaleTimeString()}`
    : label;

  const badge = $("cloudBadge");
  if (badge) {
    badge.className = `sync-badge status-${state.status}`;
    badge.textContent = badgeText;
  }
  const drawerStatus = $("drawerSyncStatus");
  if (drawerStatus) drawerStatus.innerHTML = `<span class="sync-badge status-${state.status}">${badgeText}</span>`;

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
