// Exercise variant selection UI (Gym App spec Part 2). Reuses js/program.js's slot/variant
// helpers and js/calculations.js's variant-scoped getExerciseHistory() for all data — this
// file is presentation + interaction only. Selecting a variant here never changes the
// routine, the day, the exercise order, the target muscles, or the prescribed sets/rep
// range — it only records which equipment implementation today's session uses.
import { $, esc, fmt } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { allVariantsForExercise, findVariant, eid } from "./program.js";
import { syncActiveSplitDays } from "./training-splits.js";
import {
  getExerciseHistory, exerciseProgressionStatus, resolveVariantId, variantUsageContext, exerciseSlotAnalytics, predictNextLoad,
  previousExercisesInThisPosition, routineSlotKey, activeExerciseSubstitution, duplicateOverlapWarning
} from "./calculations.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

let openExerciseName = null;
let showCustomForm = false;
let lastFocusedBeforeModal = null;
// Corrective Update (Missing Change Dropdown and Full Exercise Library): the routine slot this
// modal was opened for — day + array index (this app's routine-slot approximation) and the
// PLANNED (programmed) exercise name, distinct from `openExerciseName` above, which tracks
// whichever exercise is currently EFFECTIVE for the slot (the plan, or today's substitution).
let openSlotDay = null;
let openSlotIndex = null;
let openPlannedName = null;
let showFullLibrary = false;
let libraryQuery = "";
let libraryEquipmentFilter = "";
let libraryPerformedFilter = "";

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

/**
 * Corrective Update (Missing Change Dropdown and Full Exercise Library, §2): compatibility
 * label for a full-library candidate against the routine slot's PLANNED exercise — this app
 * has no formal slot-contract/rule-directory architecture yet (deferred), so this is a
 * best-effort, explainable classification from the existing exercise-database metadata, not a
 * hard block. Never prevents a selection; purely informational.
 */
function compatibilityLabel(plannedDef, candidateDef) {
  if (!plannedDef || !candidateDef) return "Conditional alternative";
  if (plannedDef.primaryMuscle && plannedDef.primaryMuscle === candidateDef.primaryMuscle && plannedDef.movementPattern === candidateDef.movementPattern) {
    return "Best match";
  }
  const plannedHeads = new Set(Object.entries(plannedDef.muscleHeadContributions || {}).filter(([, w]) => w >= 1).map(([h]) => h));
  const sharesHead = Object.entries(candidateDef.muscleHeadContributions || {}).some(([h, w]) => w >= 1 && plannedHeads.has(h));
  if (sharesHead) return "Same target";
  if (plannedDef.primaryMuscle && plannedDef.primaryMuscle === candidateDef.primaryMuscle) return "Cross-pattern alternative";
  return "Conditional alternative";
}

function libraryResultCardHtml(data, plannedDef, candidateDef) {
  const history = getExerciseHistory(data.workouts, candidateDef.name);
  const label = compatibilityLabel(plannedDef, candidateDef);
  const labelClass = { "Best match": "status-on-target", "Same target": "status-on-target", "Cross-pattern alternative": "", "Conditional alternative": "status-under" }[label] || "";
  return `
    <div class="history-item">
      <div class="section-title"><strong>${esc(candidateDef.name)}</strong><span class="badge-row"><span class="badge ${labelClass}">${esc(label)}</span></span></div>
      <p class="small">${esc(candidateDef.primaryMuscle || "")}${candidateDef.movementPattern ? ` · ${esc(candidateDef.movementPattern)}` : ""}${candidateDef.equipment ? ` · ${esc(candidateDef.equipment)}` : ""}</p>
      ${history.lastSession
        ? `<p class="small">Last: ${esc(formatSetLine(history.lastSession))}${history.lastSession.date ? ` · ${esc(history.lastSession.date)}` : ""}</p><p class="small">Best: ${esc(formatSetLine(history.previousBest))}</p>`
        : `<p class="small">Never performed — no history yet on this exercise.</p>`}
      ${history.lastSession?.notes ? `<p class="small">Last note: ${esc(history.lastSession.notes)}</p>` : ""}
      <div class="actions">
        <button type="button" data-use-for-workout="${esc(candidateDef.name)}">Use for this workout</button>
        <button type="button" class="secondary" data-replace-in-routine="${esc(candidateDef.name)}">Replace in routine</button>
      </div>
    </div>`;
}

function renderFullLibraryContent(el, data, plannedDef) {
  const query = libraryQuery.trim().toLowerCase();
  const equipmentOptions = [...new Set((data.exercises || []).map(e => e.equipment).filter(Boolean))].sort();
  let results = (data.exercises || []).filter(e => e.active !== false);
  if (query) {
    results = results.filter(e => [e.name, e.primaryMuscle, e.movementPattern, e.equipment].some(f => (f || "").toLowerCase().includes(query)));
  }
  if (libraryEquipmentFilter) results = results.filter(e => e.equipment === libraryEquipmentFilter);
  if (libraryPerformedFilter) {
    results = results.filter(e => {
      const performed = !!getExerciseHistory(data.workouts, e.name).lastSession;
      return libraryPerformedFilter === "performed" ? performed : !performed;
    });
  }
  results = [...results].sort((a, b) => {
    const rank = l => ({ "Best match": 0, "Same target": 1, "Cross-pattern alternative": 2, "Conditional alternative": 3 })[l];
    return rank(compatibilityLabel(plannedDef, a)) - rank(compatibilityLabel(plannedDef, b)) || a.name.localeCompare(b.name);
  });

  el.innerHTML = `
    <div class="library-detail-header">
      <div>
        <p class="eyebrow">Full Exercise Library</p>
        <h2>Browse all exercises</h2>
      </div>
      <button type="button" class="close-btn" id="variantSelectorClose" aria-label="Close">✕</button>
    </div>
    <p class="small">Every active exercise in the database, not just recommended alternatives for "${esc(openPlannedName)}". Selecting one here changes which exercise this routine slot uses — never adds a new one, and never touches "${esc(openPlannedName)}"'s own history.</p>
    <div class="form-grid">
      <label>Search <input type="text" id="libSearchInput" value="${esc(libraryQuery)}" placeholder="name, muscle, equipment..."></label>
      <label>Equipment
        <select id="libEquipmentFilter">
          <option value="">All</option>
          ${equipmentOptions.map(eq => `<option value="${esc(eq)}" ${eq === libraryEquipmentFilter ? "selected" : ""}>${esc(eq)}</option>`).join("")}
        </select>
      </label>
      <label>History
        <select id="libPerformedFilter">
          <option value="" ${!libraryPerformedFilter ? "selected" : ""}>All</option>
          <option value="performed" ${libraryPerformedFilter === "performed" ? "selected" : ""}>Previously performed</option>
          <option value="never" ${libraryPerformedFilter === "never" ? "selected" : ""}>Never performed</option>
        </select>
      </label>
    </div>
    <p class="small">${results.length} exercise${results.length === 1 ? "" : "s"} found.</p>
    ${results.map(c => libraryResultCardHtml(data, plannedDef, c)).join("")}
    <button type="button" class="secondary" id="libBackBtn">&larr; Back to recommended alternatives</button>
  `;
}

function renderContent() {
  const el = $("variantSelectorContent");
  if (!el || !openExerciseName) return;
  const data = getData();
  const plannedDef = openPlannedName ? data.exercises.find(e => e.name === openPlannedName) : null;

  if (showFullLibrary) { renderFullLibraryContent(el, data, plannedDef); return; }

  const exerciseDef = data.exercises.find(e => e.name === openExerciseName);
  if (!exerciseDef) { closeVariantSelector(); return; }

  const day = currentDay();
  const currentVariantId = selectedVariantIdFor(data, exerciseDef, day);
  const preferredVariantId = preferredVariantIdFor(data, exerciseDef);
  const slotAnalytics = exerciseSlotAnalytics(data.workouts, exerciseDef);

  // Gym App Exercise Optionality update (Section 4.4): different EXERCISES that have
  // previously occupied this same routine position, without merging their progression data.
  const positionIndex = openSlotIndex != null ? openSlotIndex : (data.trainingProgram[day] || []).findIndex(e => e.name === openExerciseName);
  const previousInPosition = positionIndex >= 0 ? previousExercisesInThisPosition(data.workouts, day, positionIndex, openExerciseName) : [];

  const substitution = (openSlotDay != null && openSlotIndex != null) ? activeExerciseSubstitution(data, openSlotDay, openSlotIndex) : null;

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
    ${substitution ? `
    <div class="important-note-banner">
      <strong>Substituted for this workout only.</strong>
      <p class="small">Planned exercise: ${esc(openPlannedName)}. Sets you log now save under ${esc(substitution.performedExerciseName)}'s own history — ${esc(openPlannedName)}'s history/progression is untouched.</p>
      <button type="button" class="secondary" id="revertSubstitutionBtn">Revert to planned exercise</button>
    </div>` : ""}
    <p class="small">Selecting a variant only changes today's equipment for this exercise. The routine, day, exercise order, target muscles, prescribed sets and rep range stay exactly as programmed.</p>
    <p class="small"><strong>Use Today</strong> applies for this session only. <strong>Make Preferred</strong> sets a persistent foreground default for this slot — it never edits the programme, and today's choice always overrides it when both are set.</p>
    ${variants.length > 1 && slotAnalytics?.totalSessions ? `
    <div class="badge-row">
      <span class="badge">${slotAnalytics.totalSessions} session${slotAnalytics.totalSessions === 1 ? "" : "s"} across all equipment</span>
      <span class="badge">${slotAnalytics.distinctVariantsUsed} variant${slotAnalytics.distinctVariantsUsed === 1 ? "" : "s"} tried</span>
      ${slotAnalytics.mostUsedVariantId ? `<span class="badge">Most used: ${esc(findVariant(exerciseDef, slotAnalytics.mostUsedVariantId)?.name || "—")}</span>` : ""}
    </div>` : ""}
    ${orderedVariants.map(v => variantCardHtml(data, exerciseDef, v, currentVariantId, preferredVariantId)).join("")}
    ${previousInPosition.length ? `
    <h4>Previous exercises used in this position</h4>
    <p class="small">Different exercises this routine slot has used before. Each keeps its own separate history — nothing here is merged.</p>
    ${previousInPosition.slice(0, 5).map(p => `
      <div class="history-item">
        <strong>${esc(p.name)}</strong>${p.date ? ` · ${esc(p.date)}` : ""}
        <p class="small">${esc(formatSetLine(p.entry))}</p>
      </div>`).join("")}
    ` : ""}
    <button type="button" class="secondary" id="variantSelectorToggleCustom" aria-expanded="${showCustomForm}">${showCustomForm ? "Hide" : "+ Add Custom Variant"}</button>
    ${showCustomForm ? customVariantFormHtml(exerciseDef) : ""}
    <button type="button" class="secondary" id="libMoreBtn">More &mdash; Browse full exercise library</button>
  `;
}

/**
 * Corrective Update §1: opened from EVERY eligible exercise node's "Change" control, not just
 * ones with extra equipment variants. `day`/`index` identify the routine slot (this app's
 * day+array-index slot approximation); `plannedName` is the programmed exercise for that slot,
 * which may differ from `exerciseName` (the currently EFFECTIVE exercise) when a substitution
 * is already active.
 */
export function openVariantSelector(exerciseName, { day = null, index = null, plannedName = null } = {}) {
  openExerciseName = exerciseName;
  openSlotDay = day;
  openSlotIndex = index;
  openPlannedName = plannedName || exerciseName;
  showCustomForm = false;
  showFullLibrary = false;
  libraryQuery = "";
  libraryEquipmentFilter = "";
  libraryPerformedFilter = "";
  renderContent();
  lastFocusedBeforeModal = document.activeElement;
  $("variantSelectorBackdrop").hidden = false;
  $("variantSelectorModal").hidden = false;
  requestAnimationFrame(() => $("variantSelectorClose")?.focus());
}

export function closeVariantSelector() {
  if (!openExerciseName) return;
  openExerciseName = null;
  openSlotDay = null;
  openSlotIndex = null;
  openPlannedName = null;
  showFullLibrary = false;
  libraryQuery = "";
  libraryEquipmentFilter = "";
  libraryPerformedFilter = "";
  $("variantSelectorBackdrop").hidden = true;
  $("variantSelectorModal").hidden = true;
  (lastFocusedBeforeModal || document.body)?.focus();
  refreshAll();
}

/**
 * Corrective Update §6-9: session-only substitution — writes to data.todaysExerciseSubstitutions
 * (never data.trainingProgram), so the planned routine is completely unchanged. Sets logged
 * after this save under the performed exercise's own name/history, never the planned one's.
 */
function useExerciseForWorkout(candidateName) {
  if (openSlotDay == null || openSlotIndex == null) {
    alert("Couldn't determine which routine slot this is for — close this and reopen Change from the exercise card.");
    return;
  }
  const data = getData();
  const existingNames = (data.trainingProgram[openSlotDay] || []).map(e => e.name);
  const warning = duplicateOverlapWarning(data, existingNames, candidateName, "It has still been used for this workout.");
  if (!data.todaysExerciseSubstitutions || data.todaysExerciseSubstitutions.day !== openSlotDay) {
    data.todaysExerciseSubstitutions = { day: openSlotDay, substitutions: {} };
  }
  data.todaysExerciseSubstitutions.substitutions[routineSlotKey(openSlotDay, openSlotIndex)] = {
    performedExerciseName: candidateName,
    plannedExerciseName: openPlannedName,
    reason: "",
    source: "full_library",
    temporaryOrPermanent: "temporary",
    selectedAt: new Date().toISOString()
  };
  saveData(data);
  openExerciseName = candidateName;
  showFullLibrary = false;
  renderContent();
  refreshAll();
  if (warning) alert(warning);
}

/**
 * Corrective Update §8: explicit, separate permanent action — rewrites data.trainingProgram
 * (and re-syncs the active split's stored days, exactly like the Program Editor's own save
 * flow), and never fires just because a temporary substitution was made. Clears any today-only
 * substitution for this slot afterward since the plan itself now matches what was substituted.
 */
function replaceExerciseInRoutine(candidateName) {
  if (openSlotDay == null || openSlotIndex == null) return;
  if (!confirm(`Replace "${openPlannedName}" with "${candidateName}" permanently in this day's programme? Logged history for both exercises stays separate and intact either way.`)) return;
  const data = getData();
  const dayExercises = data.trainingProgram[openSlotDay];
  if (!dayExercises || !dayExercises[openSlotIndex]) return;
  const existingNames = dayExercises.map(e => e.name);
  const warning = duplicateOverlapWarning(data, existingNames, candidateName, "It has still been added to the routine.");
  const candidateDef = data.exercises.find(e => e.name === candidateName);
  const repRange = candidateDef && candidateDef.repRangeMin != null && candidateDef.repRangeMax != null
    ? `${candidateDef.repRangeMin}-${candidateDef.repRangeMax}` : dayExercises[openSlotIndex].repRange;
  dayExercises[openSlotIndex] = { id: eid(candidateName), name: candidateName, repRange, note: dayExercises[openSlotIndex].note || "", sets: dayExercises[openSlotIndex].sets ?? null };
  if (data.todaysExerciseSubstitutions?.day === openSlotDay) {
    delete data.todaysExerciseSubstitutions.substitutions[routineSlotKey(openSlotDay, openSlotIndex)];
  }
  syncActiveSplitDays(data);
  saveData(data);
  openExerciseName = candidateName;
  openPlannedName = candidateName;
  showFullLibrary = false;
  renderContent();
  refreshAll();
  if (warning) alert(warning);
}

function revertSubstitution() {
  if (openSlotDay == null || openSlotIndex == null) return;
  const data = getData();
  if (data.todaysExerciseSubstitutions?.day === openSlotDay) {
    delete data.todaysExerciseSubstitutions.substitutions[routineSlotKey(openSlotDay, openSlotIndex)];
    saveData(data);
  }
  openExerciseName = openPlannedName;
  renderContent();
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
    if (openBtn) {
      const index = openBtn.dataset.openVariantsIndex != null ? Number(openBtn.dataset.openVariantsIndex) : null;
      openVariantSelector(openBtn.dataset.openVariants, { day: currentDay(), index, plannedName: openBtn.dataset.openVariantsPlanned || openBtn.dataset.openVariants });
      return;
    }

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

    // Corrective Update (Missing Change Dropdown and Full Exercise Library)
    if (e.target.closest("#libMoreBtn")) { showFullLibrary = true; renderContent(); return; }
    if (e.target.closest("#libBackBtn")) { showFullLibrary = false; renderContent(); return; }
    if (e.target.closest("#revertSubstitutionBtn")) { revertSubstitution(); return; }

    const useBtn = e.target.closest("[data-use-for-workout]");
    if (useBtn) { useExerciseForWorkout(useBtn.dataset.useForWorkout); return; }

    const replaceBtn = e.target.closest("[data-replace-in-routine]");
    if (replaceBtn) { replaceExerciseInRoutine(replaceBtn.dataset.replaceInRoutine); return; }
  });

  document.addEventListener("input", (e) => {
    if (!openExerciseName || !showFullLibrary) return;
    if (e.target.id === "libSearchInput") {
      libraryQuery = e.target.value;
      const selectionStart = e.target.selectionStart;
      renderContent();
      const refocused = $("libSearchInput");
      if (refocused) { refocused.focus(); refocused.setSelectionRange(selectionStart, selectionStart); }
    }
  });

  document.addEventListener("change", (e) => {
    if (!openExerciseName || !showFullLibrary) return;
    if (e.target.id === "libEquipmentFilter") { libraryEquipmentFilter = e.target.value; renderContent(); }
    if (e.target.id === "libPerformedFilter") { libraryPerformedFilter = e.target.value; renderContent(); }
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
