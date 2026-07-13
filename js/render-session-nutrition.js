// Session-specific pre/post-workout nutrition UI. Nutrient/macro/hydration/electrolyte
// targets only — never meals, foods, recipes, supplements, or stimulants. See
// js/session-nutrition.js for the canonical config this module renders.
import { $, esc } from "./dom.js";
import {
  macroTargets, currentBodyweightKg, preWorkoutWindow, postWorkoutWindow, sessionNutritionWindowTotals
} from "./calculations.js";
import {
  getSessionNutritionForDay, scaleSessionNutritionToDaily, isBodyweightChangeMaterial,
  resolveWorkoutSessionNutrition, SESSION_NUTRITION_REFERENCE_WEIGHT_KG
} from "./session-nutrition.js";

function dailyTargetsFor(data) {
  const weight = currentBodyweightKg(data);
  return macroTargets(weight);
}

/** Applies the section-8 daily-target safeguard and returns {preWorkout, postWorkout, duringWorkout, scaled}. */
function resolveDisplaySessionNutrition(data, day) {
  const raw = getSessionNutritionForDay(data, day);
  return scaleSessionNutritionToDaily(raw, dailyTargetsFor(data));
}

function nutrientCellHtml(label, value, unit, { isLimit = false } = {}) {
  if (value == null) return "";
  return `<div class="session-nutrition-cell">
    <span class="session-nutrition-label">${esc(label)}</span>
    <span class="session-nutrition-value">${isLimit ? "&le;" : ""}${esc(value)}${esc(unit)}</span>
  </div>`;
}

function progressRowHtml(label, consumed, target, unit) {
  return `<div class="session-nutrition-progress-row"><span>${esc(label)}</span><span>${esc(consumed)} / ${esc(target)}${esc(unit)}</span></div>`;
}

function scaledNoticeHtml(scaled) {
  if (!scaled?.protein && !scaled?.carbohydrate) return "";
  const parts = [];
  if (scaled.carbohydrate) parts.push("carbohydrate");
  if (scaled.protein) parts.push("protein");
  return `<div class="status-banner status-info"><span class="status-icon">🔵</span><span>These ${parts.join(" and ")} values have been scaled down so they fit within today's daily targets — nothing is added on top of your daily plan.</span></div>`;
}

function duringWorkoutRowHtml(duringWorkout) {
  const hasRange = duringWorkout.carbohydrateGramsMin != null || duringWorkout.sodiumMgMin != null;
  return `
    <details class="category-section session-nutrition-during">
      <summary><strong>During training</strong></summary>
      <p class="small">Water: ${esc(duringWorkout.waterGuidance)}</p>
      ${hasRange && duringWorkout.carbohydrateGramsMin != null
        ? `<p class="small">Additional carbohydrate: ${esc(duringWorkout.carbohydrateGramsMin)}-${esc(duringWorkout.carbohydrateGramsMax)} g</p>` : ""}
      ${hasRange && duringWorkout.sodiumMgMin != null
        ? `<p class="small">Sodium: ${esc(duringWorkout.sodiumMgMin)}-${esc(duringWorkout.sodiumMgMax)} mg</p>` : ""}
      <p class="small">${esc(duringWorkout.condition)}</p>
    </details>`;
}

/** { hasTime, protein, carbs } tracking rows, or the honest "no time" fallback — never a claimed achieved/not-achieved state without a real timestamp. */
function progressSectionHtml(label, window, mealLogs, target) {
  if (!window) {
    return `<p class="small session-nutrition-no-time">Add a workout time to track this window automatically.</p>`;
  }
  const totals = sessionNutritionWindowTotals(mealLogs, window);
  return `<div class="session-nutrition-progress">
    ${progressRowHtml(`${label} protein`, totals.protein, target.proteinGrams, "g")}
    ${progressRowHtml(`${label} carbohydrates`, totals.carbs, target.carbohydrateGrams, "g")}
  </div>`;
}

function preWorkoutCardHtml(pre, duringWorkout, scaled, progressHtml) {
  return `
    <section class="card session-nutrition-card" id="preWorkoutFuelCard">
      <h2>Fuel Before Training</h2>
      <p class="small">Consume approximately ${esc(pre.timingMinMinutes)}-${esc(pre.timingMaxMinutes)} minutes before training.</p>
      <div class="session-nutrition-grid">
        ${nutrientCellHtml("Protein", pre.proteinGrams, "g")}
        ${nutrientCellHtml("Carbohydrates", pre.carbohydrateGrams, "g")}
        ${nutrientCellHtml("Fat", pre.fatMaxGrams, "g", { isLimit: true })}
        ${nutrientCellHtml("Fibre", pre.fibreMaxGrams, "g", { isLimit: true })}
        ${nutrientCellHtml("Water", pre.waterMl, "ml")}
        ${nutrientCellHtml("Sodium", pre.sodiumMg, "mg")}
      </div>
      <p class="small session-nutrition-explanation">${esc(pre.explanation)}</p>
      <p class="small session-nutrition-daily-note">Counts toward today's targets</p>
      ${scaledNoticeHtml(scaled)}
      ${progressHtml}
      ${duringWorkoutRowHtml(duringWorkout)}
    </section>`;
}

function postWorkoutCardHtml(post, scaled, progressHtml) {
  return `
    <section class="card session-nutrition-card" id="postWorkoutRecoveryCard">
      <h2>Recover After Training</h2>
      <p class="small">Target within 0-2 hours after the final working set</p>
      <div class="session-nutrition-grid">
        ${nutrientCellHtml("Protein", post.proteinGrams, "g")}
        ${nutrientCellHtml("Carbohydrates", post.carbohydrateGrams, "g")}
        ${nutrientCellHtml("Fat", post.fatMaxGrams, "g", { isLimit: true })}
        ${nutrientCellHtml("Water", post.waterMl, "ml")}
        ${nutrientCellHtml("Sodium", post.sodiumMg, "mg")}
      </div>
      <p class="small session-nutrition-explanation">${esc(post.explanation)}</p>
      <p class="small session-nutrition-daily-note">Counts toward today's targets</p>
      ${scaledNoticeHtml(scaled)}
      ${progressHtml}
    </section>`;
}

/** Renders the live (not-yet-saved) session's Pre-Workout Fuel + Post-Workout Recovery cards for the currently selected training day. */
export function renderSessionNutritionCards(data, day) {
  const preContainer = $("preWorkoutFuelCardSlot");
  const postContainer = $("postWorkoutRecoveryCardSlot");
  if (!preContainer || !postContainer) return;
  if (!day) { preContainer.innerHTML = ""; postContainer.innerHTML = ""; return; }

  const { preWorkout, postWorkout, duringWorkout, scaled } = resolveDisplaySessionNutrition(data, day);

  const draft = data.activeWorkoutDraft;
  const liveStart = (draft && draft.day === day && draft.startedAt) ? new Date(draft.startedAt) : null;
  const preWindow = liveStart ? preWorkoutWindow(liveStart) : null;
  const preProgressHtml = progressSectionHtml("Pre-workout", preWindow, data.mealLogs, preWorkout);

  // A live, unsaved session has no completion time yet — recovery-window tracking only
  // becomes meaningful once the workout is actually saved (see renderWorkoutHistory).
  const postProgressHtml = `<p class="small session-nutrition-no-time">Recovery-window tracking starts once this session is saved.</p>`;

  preContainer.innerHTML = preWorkoutCardHtml(preWorkout, duringWorkout, scaled, preProgressHtml);
  postContainer.innerHTML = postWorkoutCardHtml(postWorkout, scaled, postProgressHtml);
}

/** Resolved guidance + real window progress for a SAVED workout, for use in renderWorkoutHistory. */
export function renderSavedWorkoutSessionNutrition(workout, data) {
  const { sessionNutrition, isSnapshot } = resolveWorkoutSessionNutrition(workout, data);
  const { preWorkout, postWorkout, duringWorkout, scaled } = scaleSessionNutritionToDaily(sessionNutrition, dailyTargetsFor(data));

  const preWindow = workout.startedAt ? preWorkoutWindow(new Date(workout.startedAt)) : null;
  const postWindow = workout.completedAt ? postWorkoutWindow(new Date(workout.completedAt)) : null;
  const preProgressHtml = progressSectionHtml("Pre-workout", preWindow, data.mealLogs, preWorkout);
  const postProgressHtml = progressSectionHtml("Post-workout", postWindow, data.mealLogs, postWorkout);

  const labelHtml = !isSnapshot
    ? `<p class="small session-nutrition-resolved-label">Current session guidance</p>` : "";

  return `
    <div class="session-nutrition-history">
      ${labelHtml}
      ${preWorkoutCardHtml(preWorkout, duringWorkout, scaled, preProgressHtml)}
      ${postWorkoutCardHtml(postWorkout, scaled, postProgressHtml)}
    </div>`;
}

/** Section 9: prompts a review (never a silent change) once bodyweight has drifted materially from the reference the defaults were built for. */
export function renderBodyweightReviewNotice(data) {
  const el = $("sessionNutritionBodyweightNotice");
  if (!el) return;
  const current = currentBodyweightKg(data);
  if (!isBodyweightChangeMaterial(current, SESSION_NUTRITION_REFERENCE_WEIGHT_KG)) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<div class="status-banner status-warning"><span class="status-icon">🟠</span><span>Your bodyweight has changed enough to review session nutrition targets.</span></div>`;
}
