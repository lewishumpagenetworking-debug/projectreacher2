// Exercise variant selection UI (Gym App spec Part 2). Reuses js/program.js's slot/variant
// helpers and js/calculations.js's variant-scoped getExerciseHistory() for all data — this
// file is presentation + interaction only. Selecting a variant here never changes the
// routine, the day, the exercise order, the target muscles, or the prescribed sets/rep
// range — it only records which equipment implementation today's session uses.
import { $, esc, fmt } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { allVariantsForExercise, findVariant } from "./program.js";
import { getExerciseHistory, exerciseProgressionStatus, resolveVariantId, variantUsageContext, exerciseSlotAnalytics, predictNextLoad } from "./calculations.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

let openExerciseName = null;
let showCustomForm = false;
let lastFocusedBeforeModal = null;

function currentDay() {
  return $("daySelect")?.value || null;
}

function currentSelections(data, day) {
  return (data.todaysVariantSelections && data.todaysVariantSelections.day === day)
    ? data.todaysVariantSelections.selections : {};
}

/** The persistent "Make Preferred" foreground default for an exercise slot, if one is set. */
export function preferredVariantIdFor(data, exerciseDef) {
  if (!exerciseDef) return null;
  return (data.preferredVariants && data.preferredVariants[exerciseDef.name]) || null;
}

/**
 * The variant id in effect for an exercise right now: an explicit choice for today (highest
 * priority, session-only), else the persistent "Make Preferred" default, else the slot's own
 * canonical/default variant. Neither tier ever edits the program template itself.
 */
export function selectedVariantIdFor(data, exerciseDef, day = currentDay()) {
  if (!exerciseDef) return null;
  const selections = currentSelections(data, day);
  return selections[exerciseDef.name] || preferredVariantIdFor(data, exerciseDef) || exerciseDef.id;
}

function formatSetLine(e) {
  if (!e) return "no data yet";
  return `${e.set1Weight ?? "-"}kg×${e.set1Reps ?? "-"}, ${e.set2Weight ?? "-"}kg×${e.set2Reps ?? "-"}`;
}

/**
 * Predictive Load Feature (spec §7-10) — always advisory, only shown for the variant
 * actually in effect today (predicting off a variant you're not using isn't actionable).
 * The exact previous result is already shown unchanged above this block regardless of what
 * this returns; this only ever adds an optional, confidence-labelled, user-confirmed
 * suggestion on top — never a substitute for it.
 */
function predictionHtml(data, exerciseDef, variant) {
  const prediction = predictNextLoad(data.workouts, data.exercises, exerciseDef, variant.id);
  if (prediction.reason === "not_applicable" || prediction.reason === "new_variant") return "";
  if (prediction.suggestedLoad != null) {
    return `
      <div class="prediction-block">
        <p class="small"><strong>Suggested today: ${esc(String(prediction.suggestedLoad))}kg${prediction.suggestedRepRangeText ? ` × ${esc(prediction.suggestedRepRangeText)}` : ""}</strong> <span class="badge">${esc(prediction.confidence)} confidence</span></p>
        <p class="small">${esc(prediction.message)}</p>
        <p class="small">This is a suggestion only — your previous exact result above is unchanged, and nothing is applied until you confirm.</p>
        <div class="actions">
          <button type="button" data-apply-prediction="${esc(String(prediction.suggestedLoad))}">Use this suggestion</button>
        </div>
      </div>`;
  }
  if (prediction.message) {
    return `<div class="prediction-block"><p class="small">${esc(prediction.message)}</p></div>`;
  }
  return "";
}

function variantCardHtml(data, exerciseDef, variant, currentVariantId, preferredVariantId) {
  const history = getExerciseHistory(data.workouts, exerciseDef.name, { variantId: variant.id, canonicalVariantId: exerciseDef.id });
  const isCurrent = variant.id === currentVariantId;
  const isPreferred = variant.id === preferredVariantId;
  const target = history.lastSession ? exerciseProgressionStatus(history.lastSession, exerciseDef, { previousEntry: history.previousWeek }) : null;
  const usage = variantUsageContext(history);

  const badges = [
    isCurrent ? `<span class="badge status-on-target">Current</span>` : "",
    isPreferred ? `<span class="badge">Preferred</span>` : "",
    variant.isDefault ? `<span class="badge">Default</span>` : "",
    variant.isCustom ? `<span class="badge">Custom</span>` : ""
  ].filter(Boolean).join(" ");

  const body = history.lastSession
    ? `
      <p class="small">Previous: ${esc(formatSetLine(history.lastSession))}${history.lastSession.date ? ` · ${esc(history.lastSession.date)}` : ""}${history.lastSession.set1RIR != null ? ` · RIR ${esc(String(history.lastSession.set1RIR))}` : ""}</p>
      <p class="small">Best: ${esc(formatSetLine(history.previousBest))}</p>
      ${target ? `<p class="small">Next target guidance: ${esc(target.status)} — ${esc(target.reason)}</p>` : ""}
      ${usage.status === "returning" ? `<p class="small">${esc(usage.message)}</p>` : ""}
    `
    : `<p class="small">No performance history yet on this variant. Start with a conservative setup and record today's result — this session will establish the baseline for this variant.</p>`;

  return `
    <div class="history-item variant-card" data-variant-id="${esc(variant.id)}">
      <div class="section-title"><strong>${esc(variant.name)}</strong><span class="badge-row">${badges}</span></div>
      <p class="small">${esc(variant.equipmentType || "")}${variant.unilateral ? " · unilateral" : ""}</p>
      ${body}
      ${variant.techniqueNotes ? `<p class="small">${esc(variant.techniqueNotes)}</p>` : ""}
      ${isCurrent ? predictionHtml(data, exerciseDef, variant) : ""}
      <div class="actions">
        <button type="button" class="${isCurrent ? "secondary" : ""}" data-select-variant="${esc(variant.id)}" ${isCurrent ? "disabled" : ""}>${isCurrent ? "Selected for today" : "Use Today"}</button>
        <button type="button" class="${isPreferred ? "secondary" : ""}" data-make-preferred="${esc(variant.id)}" ${isPreferred ? "disabled" : ""}>${isPreferred ? "Preferred default" : "Make Preferred"}</button>
      </div>
    </div>`;
}

function customVariantFormHtml(exerciseDef) {
  return `
    <div class="history-item">
      <h4>Add Custom Variant</h4>
      <p class="small">Your machine isn't listed? Add it here. Custom variants are your own records and never overwrite the built-in list.</p>
      <div class="form-grid">
        <label>Variant Name <input type="text" id="cvName" placeholder="e.g. Precor Selectorised Row"></label>
        <label>Equipment Type <input type="text" id="cvEquipmentType" placeholder="e.g. selectorised machine"></label>
        <label>Weight Unit <select id="cvWeightUnit"><option value="kg">kg</option><option value="lb">lb</option></select></label>
        <label>Increment Options <input type="text" id="cvIncrementOptions" placeholder="e.g. 2.5, 5, 10"></label>
        <label>Gym / Machine Label <input type="text" id="cvGymLabel" placeholder="optional — e.g. Home Gym"></label>
        <label class="checklist-row"><input type="checkbox" id="cvUnilateral"> <span>Unilateral (one side at a time)</span></label>
      </div>
      <label class="small">Notes <textarea id="cvNotes" placeholder="optional"></textarea></label>
      <div class="actions"><button type="button" id="cvSaveBtn">Save Custom Variant</button></div>
      <p class="small">Primary muscle and movement pattern are inherited from <strong>${esc(exerciseDef.name)}</strong> automatically — a custom variant stays within this exercise slot's role in the routine.</p>
    </div>`;
}

function renderContent() {
  const el = $("variantSelectorContent");
  if (!el || !openExerciseName) return;
  const data = getData();
  const exerciseDef = data.exercises.find(e => e.name === openExerciseName);
  if (!exerciseDef) { closeVariantSelector(); return; }

  const day = currentDay();
  const currentVariantId = selectedVariantIdFor(data, exerciseDef, day);
  const preferredVariantId = preferredVariantIdFor(data, exerciseDef);
  const slotAnalytics = exerciseSlotAnalytics(data.workouts, exerciseDef);

  // The variant in effect right now (today's choice, else preferred, else canonical) is
  // moved to the front of the list — the rest keep their existing relative order.
  const variants = allVariantsForExercise(exerciseDef);
  const orderedVariants = [
    ...variants.filter(v => v.id === currentVariantId),
    ...variants.filter(v => v.id !== currentVariantId)
  ];

  el.innerHTML = `
    <div class="library-detail-header">
      <div>
        <p class="eyebrow" id="variantSelectorTitle">${esc(exerciseDef.primaryMuscle || "")}${exerciseDef.movementPattern ? ` · ${esc(exerciseDef.movementPattern)}` : ""}</p>
        <h2>${esc(exerciseDef.name)}</h2>
      </div>
      <button type="button" class="close-btn" id="variantSelectorClose" aria-label="Close">✕</button>
    </div>
    <p class="small">Selecting a variant only changes today's equipment for this exercise. The routine, day, exercise order, target muscles, prescribed sets and rep range stay exactly as programmed.</p>
    <p class="small"><strong>Use Today</strong> applies for this session only. <strong>Make Preferred</strong> sets a persistent foreground default for this slot — it never edits the programme, and today's choice always overrides it when both are set.</p>
    ${variants.length > 1 && slotAnalytics?.totalSessions ? `
    <div class="badge-row">
      <span class="badge">${slotAnalytics.totalSessions} session${slotAnalytics.totalSessions === 1 ? "" : "s"} across all equipment</span>
      <span class="badge">${slotAnalytics.distinctVariantsUsed} variant${slotAnalytics.distinctVariantsUsed === 1 ? "" : "s"} tried</span>
      ${slotAnalytics.mostUsedVariantId ? `<span class="badge">Most used: ${esc(findVariant(exerciseDef, slotAnalytics.mostUsedVariantId)?.name || "—")}</span>` : ""}
    </div>` : ""}
    ${orderedVariants.map(v => variantCardHtml(data, exerciseDef, v, currentVariantId, preferredVariantId)).join("")}
    <button type="button" class="secondary" id="variantSelectorToggleCustom" aria-expanded="${showCustomForm}">${showCustomForm ? "Hide" : "+ Add Custom Variant"}</button>
    ${showCustomForm ? customVariantFormHtml(exerciseDef) : ""}
  `;
}

export function openVariantSelector(exerciseName) {
  openExerciseName = exerciseName;
  showCustomForm = false;
  renderContent();
  lastFocusedBeforeModal = document.activeElement;
  $("variantSelectorBackdrop").hidden = false;
  $("variantSelectorModal").hidden = false;
  requestAnimationFrame(() => $("variantSelectorClose")?.focus());
}

export function closeVariantSelector() {
  if (!openExerciseName) return;
  openExerciseName = null;
  $("variantSelectorBackdrop").hidden = true;
  $("variantSelectorModal").hidden = true;
  (lastFocusedBeforeModal || document.body)?.focus();
  refreshAll();
}

function selectVariantForToday(variantId) {
  const day = currentDay();
  if (!day || !openExerciseName) return;
  const data = getData();
  if (!data.todaysVariantSelections || data.todaysVariantSelections.day !== day) {
    data.todaysVariantSelections = { day, selections: {} };
  }
  data.todaysVariantSelections.selections[openExerciseName] = variantId;
  saveData(data);
  renderContent();
  refreshAll();
}

/**
 * Sets the persistent "Make Preferred" foreground default for this exercise slot. Never
 * touches the program template — only changes which variant the slot resolves to when
 * there's no explicit today-selection in effect.
 */
function makeVariantPreferred(variantId) {
  if (!openExerciseName) return;
  const data = getData();
  if (!data.preferredVariants || typeof data.preferredVariants !== "object") data.preferredVariants = {};
  data.preferredVariants[openExerciseName] = variantId;
  saveData(data);
  renderContent();
  refreshAll();
}

/**
 * Applies a confirmed predicted load suggestion (spec §7: "require user confirmation") to
 * today's workout form for this exercise — never to any saved record. Only fills the weight
 * field if it's currently empty, so it can never silently overwrite a value the user already
 * typed; the user can still edit it freely before saving, and nothing is logged until they
 * explicitly save the workout as normal.
 */
function applyPredictedLoad(weight) {
  if (!openExerciseName) return;
  const exerciseName = openExerciseName;
  closeVariantSelector();
  requestAnimationFrame(() => {
    const card = document.querySelector(`.exercise[data-exercise="${CSS.escape(exerciseName)}"]`);
    const input = card?.querySelector(".set1w");
    if (input && !input.value) input.value = weight;
  });
}

function saveCustomVariant() {
  const data = getData();
  const exerciseDef = data.exercises.find(e => e.name === openExerciseName);
  if (!exerciseDef) return;
  const name = $("cvName")?.value.trim();
  if (!name) { alert("Enter a variant name."); return; }

  const custom = {
    id: `${exerciseDef.id}__custom_${uid()}`,
    exerciseSlotId: exerciseDef.id,
    name,
    equipmentType: $("cvEquipmentType")?.value.trim() || "",
    loadingType: null,
    unilateral: !!$("cvUnilateral")?.checked,
    weightUnit: $("cvWeightUnit")?.value || "kg",
    incrementOptions: $("cvIncrementOptions")?.value.trim() || null,
    setupInstructions: "",
    techniqueNotes: $("cvNotes")?.value.trim() || "",
    isActive: true,
    isDefault: false,
    isCustom: true,
    gymLabel: $("cvGymLabel")?.value.trim() || ""
  };

  exerciseDef.variants = [...(exerciseDef.variants || []), custom];
  saveData(data);
  showCustomForm = false;
  renderContent();
  refreshAll();
}

export function setupVariantSelectorEventDelegation() {
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open-variants]");
    if (openBtn) { openVariantSelector(openBtn.dataset.openVariants); return; }

    if (!openExerciseName) return;

    if (e.target.closest("#variantSelectorClose") || e.target.closest("#variantSelectorBackdrop")) { closeVariantSelector(); return; }

    const selectBtn = e.target.closest("[data-select-variant]");
    if (selectBtn && !selectBtn.disabled) { selectVariantForToday(selectBtn.dataset.selectVariant); return; }

    const preferBtn = e.target.closest("[data-make-preferred]");
    if (preferBtn && !preferBtn.disabled) { makeVariantPreferred(preferBtn.dataset.makePreferred); return; }

    const applyPredictionBtn = e.target.closest("[data-apply-prediction]");
    if (applyPredictionBtn) { applyPredictedLoad(applyPredictionBtn.dataset.applyPrediction); return; }

    if (e.target.closest("#variantSelectorToggleCustom")) { showCustomForm = !showCustomForm; renderContent(); return; }
    if (e.target.closest("#cvSaveBtn")) { saveCustomVariant(); return; }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openExerciseName) closeVariantSelector();
  });
}

/** Resolves an entry's variant name for display (e.g. in workout history/session review). */
export function variantDisplayName(entry, exerciseDef) {
  if (!exerciseDef) return null;
  const variantId = resolveVariantId(entry);
  const v = findVariant(exerciseDef, variantId);
  return v ? v.name : null;
}
