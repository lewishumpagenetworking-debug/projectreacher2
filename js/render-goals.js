import { $, esc } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { GOAL_CATEGORIES } from "./image-constants.js";
import { galleryGridHtml, galleryUploaderHtml, resolveImageUrls, bindGalleryContainer } from "./image-gallery.js";
import { getImagesFor, addImagesFromFiles, removeImage, reorderImages } from "./vision-images.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

// Fixed relatedEntityId for the single profile-level weight target, so it can carry
// images the same way a custom goal or a PR can, without inventing a fake data.goals record.
const WEIGHT_TARGET_ANCHOR_ID = "profile-weight-target";

function categoryLabel(id) {
  return GOAL_CATEGORIES.find(c => c.id === id)?.label || id;
}

function goalCardHtml(goal) {
  return `
    <details class="history-item expandable-card" data-goal-id="${esc(goal.id)}">
      <summary><strong>${esc(goal.title)}</strong> · ${esc(categoryLabel(goal.category))} <span class="badge ${goal.status === "achieved" ? "status-on-target" : ""}">${esc(goal.status)}</span></summary>
      ${goal.description ? `<p class="small">${esc(goal.description)}</p>` : ""}
      <div class="image-gallery-slot" id="goal-gallery-${esc(goal.id)}"></div>
      ${galleryUploaderHtml(`goal-${goal.id}`, { label: "Add Images" })}
      <div class="actions">
        <button type="button" class="secondary" data-toggle-goal-status="${esc(goal.id)}">${goal.status === "achieved" ? "Mark Active" : "Mark Achieved"}</button>
        <button type="button" class="danger" data-delete-goal="${esc(goal.id)}">Delete</button>
      </div>
    </details>`;
}

function linkedAnchorCardHtml(id, title, subtitle, relatedEntityType, relatedEntityId) {
  return `
    <details class="history-item expandable-card" data-goal-anchor="${esc(relatedEntityId)}">
      <summary><strong>${esc(title)}</strong> <span class="small">${esc(subtitle)}</span></summary>
      <div class="image-gallery-slot" id="anchor-gallery-${esc(id)}"></div>
      ${galleryUploaderHtml(`anchor-${id}`, { label: "Add Images" })}
    </details>`;
}

export async function renderGoals(data) {
  const listEl = $("goalList");
  if (!listEl) return;

  const customGoals = (data.goals || []).filter(g => g.status !== "archived");
  const prs = data.prs || [];
  const profile = data.profile;

  const previouslyOpenGoals = new Set([...listEl.querySelectorAll("details[data-goal-id][open]")].map(d => d.dataset.goalId));
  const previouslyOpenAnchors = new Set([...listEl.querySelectorAll("details[data-goal-anchor][open]")].map(d => d.dataset.goalAnchor));

  const weightAnchorHtml = linkedAnchorCardHtml(
    "weight-target", "Weight Target",
    `Realistic ${profile.realisticTargetWeightMin}-${profile.realisticTargetWeightMax}kg · Ambitious ${profile.ambitiousTargetWeight}kg`,
    "profile-weight-target", WEIGHT_TARGET_ANCHOR_ID
  );
  const prAnchorsHtml = prs.map(p => linkedAnchorCardHtml(p.id, p.exerciseName, `Goal: ${p.goal}`, "pr", p.id)).join("");
  const customGoalsHtml = customGoals.map(goalCardHtml).join("");

  listEl.innerHTML = `
    <h3>Weight &amp; Strength Goals</h3>
    ${weightAnchorHtml}
    ${prAnchorsHtml}
    <h3>Custom Goals</h3>
    ${customGoalsHtml || "<p class='small'>No custom goals yet. Add a business, financial, skill, or physique goal below.</p>"}
  `;

  // restore expand state, then load each gallery
  listEl.querySelectorAll("details[data-goal-id]").forEach(d => { if (previouslyOpenGoals.has(d.dataset.goalId)) d.open = true; });
  listEl.querySelectorAll("details[data-goal-anchor]").forEach(d => { if (previouslyOpenAnchors.has(d.dataset.goalAnchor)) d.open = true; });

  for (const goal of customGoals) {
    await mountGallery(`goal-gallery-${goal.id}`, { relatedEntityType: "goal", relatedEntityId: goal.id }, data);
  }
  await mountGallery("anchor-gallery-weight-target", { relatedEntityType: "profile-weight-target", relatedEntityId: WEIGHT_TARGET_ANCHOR_ID }, data);
  for (const p of prs) {
    await mountGallery(`anchor-gallery-${p.id}`, { relatedEntityType: "pr", relatedEntityId: p.id }, data);
  }
}

async function mountGallery(elementId, filter, data) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const images = getImagesFor(filter, data);
  const urlMap = await resolveImageUrls(images);
  el.innerHTML = galleryGridHtml(images, urlMap);
  bindGalleryContainer(el, images, urlMap, {
    onRemove: async (id) => { await removeImage(id); refreshAll(); },
    onReorder: (ids) => { reorderImages(ids); refreshAll(); }
  });
}

function addGoal() {
  const title = $("newGoalTitle")?.value.trim();
  if (!title) { alert("Give the goal a title."); return; }
  const category = $("newGoalCategory")?.value || "custom";
  const description = $("newGoalDescription")?.value.trim() || "";
  const data = getData();
  const now = new Date().toISOString();
  data.goals.push({ id: uid(), title, category, description, status: "active", createdAt: now, updatedAt: now });
  saveData(data);
  ["newGoalTitle", "newGoalDescription"].forEach(id => { if ($(id)) $(id).value = ""; });
  refreshAll();
}

function toggleGoalStatus(goalId) {
  const data = getData();
  const goal = (data.goals || []).find(g => g.id === goalId);
  if (!goal) return;
  goal.status = goal.status === "achieved" ? "active" : "achieved";
  goal.updatedAt = new Date().toISOString();
  saveData(data);
  refreshAll();
}

function deleteGoal(goalId) {
  if (!confirm("Delete this goal? Its attached images stay in the Image Library and can be reassigned.")) return;
  const data = getData();
  data.goals = (data.goals || []).filter(g => g.id !== goalId);
  // Images keep their relatedEntityId pointing at a now-deleted goal — harmless (they just
  // stop appearing on a goal card) and fully recoverable via the Image Library's reassign action.
  saveData(data);
  refreshAll();
}

async function handleGoalImageUpload(fieldId, fileList) {
  let relatedEntityType, relatedEntityId, category;
  if (fieldId.startsWith("goal-")) {
    relatedEntityId = fieldId.slice("goal-".length);
    relatedEntityType = "goal";
    const data = getData();
    category = (data.goals || []).find(g => g.id === relatedEntityId)?.category || "custom";
  } else if (fieldId === "anchor-weight-target") {
    relatedEntityType = "profile-weight-target";
    relatedEntityId = WEIGHT_TARGET_ANCHOR_ID;
    category = "weight";
  } else if (fieldId.startsWith("anchor-")) {
    relatedEntityId = fieldId.slice("anchor-".length);
    relatedEntityType = "pr";
    category = "physique";
  } else {
    return;
  }
  const { addedCount, errors } = await addImagesFromFiles(fileList, { category, relatedEntityType, relatedEntityId });
  if (errors.length) alert(`Some images couldn't be uploaded:\n${errors.join("\n")}`);
  if (addedCount) refreshAll();
}

export function setupGoalsEventDelegation() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("#addGoalBtn")) { addGoal(); return; }
    const toggleBtn = e.target.closest("[data-toggle-goal-status]");
    if (toggleBtn) { toggleGoalStatus(toggleBtn.dataset.toggleGoalStatus); return; }
    const deleteBtn = e.target.closest("[data-delete-goal]");
    if (deleteBtn) { deleteGoal(deleteBtn.dataset.deleteGoal); return; }
  });
  document.addEventListener("change", (e) => {
    const input = e.target.closest("#goalList [data-gallery-upload]");
    if (input && input.files?.length) {
      handleGoalImageUpload(input.dataset.galleryUpload, input.files);
      input.value = "";
    }
  });
}
