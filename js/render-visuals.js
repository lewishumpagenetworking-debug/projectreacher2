import { $, esc } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { getMotivationalCaption, pickContextForPlacement, getVisualForPlacement, PLACEMENT_LABELS } from "./visuals.js";
import { workoutsInWeek } from "./calculations.js";
import { IMAGE_ACCEPT, uploadSlotHtml, resolveImageUrls } from "./image-gallery.js";
import { getImagesFor, addImagesFromFiles, replaceImageFile, removeImage } from "./vision-images.js";

function containerIdFor(placement) { return `visual-${placement}`; }
function fieldIdFor(placement) { return `visual-${placement}`; }

// Backward-compat only: older records may still carry a pasted HTTPS imageUrl from before
// local upload existed. That image is never deleted or replaced automatically — it just
// keeps rendering until the user explicitly uploads a local replacement or removes it.
function legacyImageSlotHtml(placement, url) {
  const fieldId = fieldIdFor(placement);
  return `
    <div class="image-upload-slot image-upload-slot-filled">
      <img src="${esc(url)}" alt="${esc(PLACEMENT_LABELS[placement] || "")}" loading="lazy">
      <div class="actions">
        <label class="secondary" style="cursor:pointer">Replace<input type="file" accept="${IMAGE_ACCEPT}" data-gallery-upload="${esc(fieldId)}" style="display:none"></label>
        <button type="button" class="danger" data-visual-remove-legacy="${esc(placement)}">Remove</button>
      </div>
    </div>`;
}

/** Renders one visual card in place. Safe to call repeatedly — only touches its own container. */
export async function renderVisualCard(placement, signals = {}) {
  const el = $(containerIdFor(placement));
  if (!el) return;

  const data = getData();
  if (!data.profile.visualModeEnabled) { el.innerHTML = ""; return; }

  const visual = getVisualForPlacement(data, placement);
  const context = pickContextForPlacement(placement, signals);
  const caption = getMotivationalCaption(context);

  const localImage = getImagesFor({ relatedEntityType: "visual-placement", relatedEntityId: placement }, data)[0] || null;
  const hasAnyImage = !!(localImage || visual?.imageUrl);
  const isEnabled = !visual || visual.enabled !== false;

  // Hiding never deletes the stored image/record — it just stops this card from
  // displaying it (matches the original Hide/Show behaviour), so an empty upload slot
  // shows instead while hidden even though the image is still saved underneath.
  const showImage = isEnabled && hasAnyImage;
  const urlMap = (showImage && localImage) ? await resolveImageUrls([localImage]) : new Map();

  const imageSectionHtml = showImage
    ? (localImage
        ? uploadSlotHtml(fieldIdFor(placement), localImage, urlMap, { label: PLACEMENT_LABELS[placement] || "Image" })
        : legacyImageSlotHtml(placement, visual.imageUrl))
    : uploadSlotHtml(fieldIdFor(placement), null, urlMap, { label: PLACEMENT_LABELS[placement] || "Image" });

  el.innerHTML = `
    <div class="visual-card" data-visual-placement="${esc(placement)}">
      ${imageSectionHtml}
      <p class="visual-caption">"${esc(caption)}"</p>
      ${hasAnyImage ? `<div class="actions">
        ${isEnabled ? `<button type="button" class="secondary visual-hide-btn">Hide</button>` : `<button type="button" class="secondary visual-show-btn">Show</button>`}
      </div>` : ""}
    </div>`;
}

function ensureVisualRecord(data, placement) {
  let visual = data.motivationalVisuals.find(v => v.placement === placement);
  if (!visual) {
    visual = {
      id: uid(), placement, title: PLACEMENT_LABELS[placement] || placement,
      caption: "", imageUrl: null, provider: "local-upload", enabled: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    data.motivationalVisuals.push(visual);
  }
  return visual;
}

async function handleUpload(placement, fileList) {
  const { addedCount, errors } = await addImagesFromFiles(fileList, {
    category: "custom", relatedEntityType: "visual-placement", relatedEntityId: placement
  });
  if (errors.length) alert(`Couldn't upload this image:\n${errors.join("\n")}`);
  if (!addedCount) return;
  const data = getData();
  const visual = ensureVisualRecord(data, placement);
  visual.enabled = true;
  visual.updatedAt = new Date().toISOString();
  saveData(data);
  renderVisualCard(placement);
}

async function handleReplace(placement, imageId, file) {
  const { errors } = await replaceImageFile(imageId, file);
  if (errors.length) alert(`Couldn't replace this image:\n${errors.join("\n")}`);
  renderVisualCard(placement);
}

async function handleRemoveLocal(placement, imageId) {
  await removeImage(imageId);
  renderVisualCard(placement);
}

function handleRemoveLegacy(placement) {
  const data = getData();
  const visual = data.motivationalVisuals.find(v => v.placement === placement);
  if (!visual) return;
  visual.imageUrl = null;
  visual.updatedAt = new Date().toISOString();
  saveData(data);
  renderVisualCard(placement);
}

function handleHide(placement) {
  const data = getData();
  const visual = ensureVisualRecord(data, placement);
  visual.enabled = false;
  visual.updatedAt = new Date().toISOString();
  saveData(data);
  renderVisualCard(placement);
}

function handleShow(placement) {
  const data = getData();
  const visual = ensureVisualRecord(data, placement);
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
    const hideBtn = e.target.closest(".visual-hide-btn");
    if (hideBtn) { handleHide(hideBtn.closest(".visual-card").dataset.visualPlacement); return; }
    const showBtn = e.target.closest(".visual-show-btn");
    if (showBtn) { handleShow(showBtn.closest(".visual-card").dataset.visualPlacement); return; }
    const removeLocalBtn = e.target.closest("[data-gallery-remove]");
    if (removeLocalBtn && removeLocalBtn.closest(".visual-card")) {
      handleRemoveLocal(removeLocalBtn.closest(".visual-card").dataset.visualPlacement, removeLocalBtn.dataset.galleryRemove);
      return;
    }
    const removeLegacyBtn = e.target.closest("[data-visual-remove-legacy]");
    if (removeLegacyBtn) { handleRemoveLegacy(removeLegacyBtn.dataset.visualRemoveLegacy); return; }
  });

  document.addEventListener("change", (e) => {
    const card = e.target.closest(".visual-card");
    if (!card) return;
    const placement = card.dataset.visualPlacement;
    const uploadInput = e.target.closest("[data-gallery-upload]");
    if (uploadInput && uploadInput.files?.length) {
      const replaceId = uploadInput.dataset.galleryReplace;
      if (replaceId) handleReplace(placement, replaceId, uploadInput.files[0]);
      else handleUpload(placement, uploadInput.files);
      uploadInput.value = "";
    }
  });
}
