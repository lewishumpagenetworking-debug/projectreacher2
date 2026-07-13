import { $, esc } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { MILESTONE_CATEGORIES } from "./image-constants.js";
import { galleryGridHtml, galleryUploaderHtml, resolveImageUrls, bindGalleryContainer } from "./image-gallery.js";
import { getImagesFor, addImagesFromFiles, removeImage, reorderImages } from "./vision-images.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

function categoryLabel(id) {
  return MILESTONE_CATEGORIES.find(c => c.id === id)?.label || id;
}

function milestoneCardHtml(m) {
  return `
    <details class="history-item expandable-card" data-milestone-id="${esc(m.id)}">
      <summary><strong>${esc(m.title)}</strong> · ${esc(m.date || "no date")} <span class="badge">${esc(categoryLabel(m.category))}</span></summary>
      ${m.description ? `<p class="small">${esc(m.description)}</p>` : ""}
      <div class="image-gallery-slot" id="milestone-gallery-${esc(m.id)}"></div>
      ${galleryUploaderHtml(`milestone-${m.id}`, { label: "Add Images" })}
      <div class="actions">
        <button type="button" class="danger" data-delete-milestone="${esc(m.id)}">Delete</button>
      </div>
    </details>`;
}

/** Append-only historical timeline, most recent first. New entries never replace or reorder previous ones. */
export async function renderMilestonesTimeline(data) {
  const listEl = $("milestoneList");
  if (!listEl) return;

  const milestones = (data.milestones || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
  const previouslyOpen = new Set([...listEl.querySelectorAll("details[data-milestone-id][open]")].map(d => d.dataset.milestoneId));

  listEl.innerHTML = milestones.length
    ? milestones.map(milestoneCardHtml).join("")
    : "<p class='small'>No milestones logged yet. Add one below to start your timeline.</p>";

  listEl.querySelectorAll("details[data-milestone-id]").forEach(d => { if (previouslyOpen.has(d.dataset.milestoneId)) d.open = true; });

  for (const m of milestones) {
    const el = document.getElementById(`milestone-gallery-${m.id}`);
    if (!el) continue;
    const images = getImagesFor({ relatedEntityType: "milestone", relatedEntityId: m.id }, data);
    const urlMap = await resolveImageUrls(images);
    el.innerHTML = galleryGridHtml(images, urlMap);
    bindGalleryContainer(el, images, urlMap, {
      onRemove: async (id) => { await removeImage(id); refreshAll(); },
      onReorder: (ids) => { reorderImages(ids); refreshAll(); }
    });
  }
}

function addMilestone() {
  const title = $("newMilestoneTitle")?.value.trim();
  if (!title) { alert("Give the milestone a title."); return; }
  const category = $("newMilestoneCategory")?.value || "personal";
  const description = $("newMilestoneDescription")?.value.trim() || "";
  const date = $("newMilestoneDate")?.value || new Date().toLocaleDateString("en-CA");
  const data = getData();
  data.milestones.push({ id: uid(), title, category, description, date, relatedGoalId: null, createdAt: new Date().toISOString() });
  saveData(data);
  ["newMilestoneTitle", "newMilestoneDescription"].forEach(id => { if ($(id)) $(id).value = ""; });
  refreshAll();
}

function deleteMilestone(id) {
  if (!confirm("Delete this milestone entry? Its images stay in the Image Library and can be reassigned.")) return;
  const data = getData();
  data.milestones = (data.milestones || []).filter(m => m.id !== id);
  saveData(data);
  refreshAll();
}

async function handleMilestoneImageUpload(fieldId, fileList) {
  const milestoneId = fieldId.replace(/^milestone-/, "");
  const data = getData();
  const milestone = (data.milestones || []).find(m => m.id === milestoneId);
  const { addedCount, errors } = await addImagesFromFiles(fileList, {
    category: milestone?.category || "personal", relatedEntityType: "milestone", relatedEntityId: milestoneId
  });
  if (errors.length) alert(`Some images couldn't be uploaded:\n${errors.join("\n")}`);
  if (addedCount) refreshAll();
}

export function setupMilestonesEventDelegation() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("#addMilestoneBtn")) { addMilestone(); return; }
    const deleteBtn = e.target.closest("[data-delete-milestone]");
    if (deleteBtn) { deleteMilestone(deleteBtn.dataset.deleteMilestone); return; }
  });
  document.addEventListener("change", (e) => {
    const input = e.target.closest("#milestoneList [data-gallery-upload]");
    if (input && input.files?.length) {
      handleMilestoneImageUpload(input.dataset.galleryUpload, input.files);
      input.value = "";
    }
  });
}
