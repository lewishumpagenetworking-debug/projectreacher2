import { $, esc } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { getMotivationalCaption, pickContextForPlacement, getVisualForPlacement, isValidImageUrl, PLACEMENT_LABELS } from "./visuals.js";
import { workoutsInWeek } from "./calculations.js";

function containerIdFor(placement) { return `visual-${placement}`; }

/** Renders one visual card in place. Safe to call repeatedly — only touches its own container. */
export function renderVisualCard(placement, signals = {}) {
  const el = $(containerIdFor(placement));
  if (!el) return;

  const data = getData();
  if (!data.profile.visualModeEnabled) { el.innerHTML = ""; return; }

  const visual = getVisualForPlacement(data, placement);
  const context = pickContextForPlacement(placement, signals);
  const caption = getMotivationalCaption(context);
  const hasImage = visual && visual.enabled && visual.imageUrl;

  el.innerHTML = `
    <div class="visual-card" data-visual-placement="${esc(placement)}">
      ${hasImage ? `<div class="visual-image-wrap"><img src="${esc(visual.imageUrl)}" alt="${esc(PLACEMENT_LABELS[placement] || "")}" loading="lazy"></div>` : `<div class="visual-placeholder">${esc(PLACEMENT_LABELS[placement] || "Visual")}</div>`}
      <p class="visual-caption">"${esc(caption)}"</p>
      <div class="visual-controls">
        <input class="visual-url-input" type="url" placeholder="https://... CloudFront or other HTTPS image URL" value="${hasImage ? esc(visual.imageUrl) : ""}">
        <div class="actions">
          <button type="button" class="secondary visual-save-btn">${hasImage ? "Replace" : "Save"}</button>
          ${visual && visual.enabled ? `<button type="button" class="secondary visual-hide-btn">Hide</button>` : (visual ? `<button type="button" class="secondary visual-show-btn">Show</button>` : "")}
        </div>
      </div>
    </div>`;
}

function handleSave(btn) {
  const card = btn.closest(".visual-card");
  const placement = card.dataset.visualPlacement;
  const input = card.querySelector(".visual-url-input");
  const url = input.value.trim();
  if (!isValidImageUrl(url)) { alert("Enter a valid HTTPS image URL (e.g. a CloudFront link)."); return; }

  const data = getData();
  const now = new Date().toISOString();
  let visual = data.motivationalVisuals.find(v => v.placement === placement);
  if (visual) {
    visual.imageUrl = url;
    visual.enabled = true;
    visual.updatedAt = now;
  } else {
    visual = {
      id: uid(), placement, title: PLACEMENT_LABELS[placement] || placement,
      caption: "", imageUrl: url, provider: "manual", enabled: true,
      createdAt: now, updatedAt: now
    };
    data.motivationalVisuals.push(visual);
  }
  saveData(data);
  renderVisualCard(placement);
}

function handleHide(btn) {
  const card = btn.closest(".visual-card");
  const placement = card.dataset.visualPlacement;
  const data = getData();
  const visual = data.motivationalVisuals.find(v => v.placement === placement);
  if (!visual) return;
  visual.enabled = false;
  visual.updatedAt = new Date().toISOString();
  saveData(data);
  renderVisualCard(placement);
}

function handleShow(btn) {
  const card = btn.closest(".visual-card");
  const placement = card.dataset.visualPlacement;
  const data = getData();
  const visual = data.motivationalVisuals.find(v => v.placement === placement);
  if (!visual) return;
  visual.enabled = true;
  visual.updatedAt = new Date().toISOString();
  saveData(data);
  renderVisualCard(placement);
}

/** Lightweight, honest heuristics for which caption tone fits today — not a scoring system. */
function computeSignals(data) {
  const lastWorkout = data.workouts.at(-1);
  const daysSinceLastWorkout = lastWorkout ? (Date.now() - new Date(lastWorkout.date).getTime()) / 86400000 : Infinity;
  const latestNutrition = data.nutritionLogs.at(-1);
  const target = data.profile.currentPhase && data.profile.startingWeight ? 140 : 140; // baseline protein target
  const avgFormQuality = lastWorkout
    ? (lastWorkout.exercises || []).reduce((sum, e, _, arr) => sum + (Number(e.formQuality) || 0) / arr.length, 0)
    : null;

  return {
    workoutMissedToday: daysSinceLastWorkout >= 2,
    proteinBehind: latestNutrition ? latestNutrition.protein < target * 0.85 : false,
    formQualityLow: avgFormQuality != null && avgFormQuality > 0 && avgFormQuality < 3,
    weeklyScoreHigh: workoutsInWeek(data.workouts).length >= 4
  };
}

/** Renders every placement's visual card in one pass — call from the global refresh. */
export function renderAllVisuals(data) {
  const signals = computeSignals(data);
  Object.keys(PLACEMENT_LABELS).forEach(placement => renderVisualCard(placement, signals));
}

export function setupVisualsEventDelegation() {
  document.addEventListener("click", (e) => {
    const saveBtn = e.target.closest(".visual-save-btn");
    if (saveBtn) { handleSave(saveBtn); return; }
    const hideBtn = e.target.closest(".visual-hide-btn");
    if (hideBtn) { handleHide(hideBtn); return; }
    const showBtn = e.target.closest(".visual-show-btn");
    if (showBtn) { handleShow(showBtn); return; }
  });
}
