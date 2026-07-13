import { $, esc } from "./dom.js";
import { getData } from "./data.js";
import { VISION_BOARD_CATEGORIES, GOAL_CATEGORIES, MILESTONE_CATEGORIES } from "./image-constants.js";
import { resolveImageUrls, openLightbox } from "./image-gallery.js";
import { getImagesFor, removeImage, setImageArchived, reassignImage, replaceImageFile, setImageCaption } from "./vision-images.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

let searchTerm = "";
let categoryFilter = "all";
let sortBy = "newest";
let showArchived = false;

function allKnownCategories(data) {
  const seen = new Map();
  [...VISION_BOARD_CATEGORIES, ...GOAL_CATEGORIES, ...MILESTONE_CATEGORIES].forEach(c => seen.set(c.id, c.label));
  (data.imageCategories || []).forEach(c => seen.set(c.id, c.label));
  return [...seen.entries()].map(([id, label]) => ({ id, label }));
}

function relatedEntityLabel(img, data) {
  if (!img.relatedEntityType) return "Vision Board (unassigned)";
  if (img.relatedEntityType === "goal") {
    const goal = (data.goals || []).find(g => g.id === img.relatedEntityId);
    return goal ? `Goal: ${goal.title}` : "Goal (deleted)";
  }
  if (img.relatedEntityType === "milestone") {
    const m = (data.milestones || []).find(x => x.id === img.relatedEntityId);
    return m ? `Milestone: ${m.title}` : "Milestone (deleted)";
  }
  if (img.relatedEntityType === "profile-weight-target") return "Weight Target";
  if (img.relatedEntityType === "pr") {
    const pr = (data.prs || []).find(p => p.id === img.relatedEntityId);
    return pr ? `PR: ${pr.exerciseName}` : "PR (deleted)";
  }
  if (img.relatedEntityType === "visual-placement") return `Motivational visual: ${img.relatedEntityId}`;
  return img.relatedEntityType;
}

function sortImages(images) {
  const sorted = images.slice();
  if (sortBy === "newest") sorted.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
  else if (sortBy === "oldest") sorted.sort((a, b) => (a.uploadedAt || "").localeCompare(b.uploadedAt || ""));
  else if (sortBy === "category") sorted.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
  return sorted;
}

function filterImages(data) {
  let images = getImagesFor({ includeArchived: showArchived }, data);
  if (!showArchived) images = images.filter(i => i.status !== "archived");
  if (categoryFilter !== "all") images = images.filter(i => i.category === categoryFilter);
  if (searchTerm.trim()) {
    const q = searchTerm.trim().toLowerCase();
    images = images.filter(i => (i.caption || "").toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q));
  }
  return sortImages(images);
}

function libraryRowHtml(img, url, data, categories) {
  const categoryOptions = categories.map(c => `<option value="${esc(c.id)}" ${c.id === img.category ? "selected" : ""}>${esc(c.label)}</option>`).join("");
  return `
    <div class="library-image-row" data-library-image-id="${esc(img.id)}">
      <img src="${esc(url || "")}" alt="${esc(img.caption || "")}" loading="lazy" class="library-image-thumb" data-gallery-open-lightbox="${esc(img.id)}">
      <div class="library-image-meta">
        <input type="text" class="library-caption-input" data-library-caption="${esc(img.id)}" value="${esc(img.caption || "")}" placeholder="Caption">
        <div class="badge-row">
          <select class="library-category-select" data-library-reassign="${esc(img.id)}">${categoryOptions}</select>
          <span class="small">${esc(relatedEntityLabel(img, data))}</span>
          <span class="small">${esc((img.uploadedAt || "").slice(0, 10))}</span>
          ${img.status === "archived" ? `<span class="badge status-under">Archived</span>` : ""}
        </div>
        <div class="actions">
          <label class="secondary" style="cursor:pointer">Replace<input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif" data-library-replace="${esc(img.id)}" style="display:none"></label>
          <button type="button" class="secondary" data-library-archive-toggle="${esc(img.id)}">${img.status === "archived" ? "Unarchive" : "Archive"}</button>
          <button type="button" class="danger" data-library-delete="${esc(img.id)}">Delete</button>
        </div>
      </div>
    </div>`;
}

export async function renderImageLibrary(data) {
  const listEl = $("imageLibraryList");
  const countEl = $("imageLibraryCount");
  if (!listEl) return;

  const categories = allKnownCategories(data);
  const filterSelect = $("imageLibraryCategoryFilter");
  if (filterSelect && filterSelect.dataset.built !== "true") {
    filterSelect.innerHTML = `<option value="all">All categories</option>` + categories.map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join("");
    filterSelect.dataset.built = "true";
  }

  const images = filterImages(data);
  if (countEl) countEl.textContent = `${images.length} image${images.length === 1 ? "" : "s"}`;

  if (!images.length) {
    listEl.innerHTML = "<p class='small'>No images match this search/filter yet. Upload some via the Vision Board, a Goal, or a Milestone.</p>";
    return;
  }

  const urlMap = await resolveImageUrls(images);
  listEl.innerHTML = images.map(img => libraryRowHtml(img, urlMap.get(img.id), data, categories)).join("");

  listEl.querySelectorAll("[data-gallery-open-lightbox]").forEach(el => {
    el.addEventListener("click", () => openLightbox(images, urlMap, el.dataset.galleryOpenLightbox));
  });
}

function setupControls() {
  $("imageLibrarySearch")?.addEventListener("input", (e) => { searchTerm = e.target.value; renderImageLibrary(getData()); });
  $("imageLibraryCategoryFilter")?.addEventListener("change", (e) => { categoryFilter = e.target.value; renderImageLibrary(getData()); });
  $("imageLibrarySort")?.addEventListener("change", (e) => { sortBy = e.target.value; renderImageLibrary(getData()); });
  $("imageLibraryShowArchived")?.addEventListener("change", (e) => { showArchived = e.target.checked; renderImageLibrary(getData()); });
}

export function setupImageLibraryEventDelegation() {
  setupControls();

  document.addEventListener("click", (e) => {
    const archiveBtn = e.target.closest("[data-library-archive-toggle]");
    if (archiveBtn) {
      const id = archiveBtn.dataset.libraryArchiveToggle;
      const data = getData();
      const img = (data.images || []).find(i => i.id === id);
      setImageArchived(id, img?.status !== "archived");
      refreshAll();
      return;
    }
    const deleteBtn = e.target.closest("[data-library-delete]");
    if (deleteBtn) {
      if (!confirm("Delete this image permanently? This cannot be undone.")) return;
      removeImage(deleteBtn.dataset.libraryDelete).then(refreshAll);
      return;
    }
  });

  document.addEventListener("change", (e) => {
    const reassignSelect = e.target.closest("[data-library-reassign]");
    if (reassignSelect) {
      const id = reassignSelect.dataset.libraryReassign;
      const data = getData();
      const img = (data.images || []).find(i => i.id === id);
      // Reassigning to a different category via the Library detaches the image from
      // whatever goal/milestone it was linked to — it becomes a plain Vision Board image
      // in the new category, since a goal/milestone link only makes sense within its own category.
      reassignImage(id, { category: reassignSelect.value, relatedEntityType: img?.category === reassignSelect.value ? img.relatedEntityType : null, relatedEntityId: img?.category === reassignSelect.value ? img.relatedEntityId : null });
      refreshAll();
      return;
    }
    const replaceInput = e.target.closest("[data-library-replace]");
    if (replaceInput && replaceInput.files?.length) {
      replaceImageFile(replaceInput.dataset.libraryReplace, replaceInput.files[0]).then(({ errors }) => {
        if (errors.length) alert(`Could not replace image:\n${errors.join("\n")}`);
        refreshAll();
      });
      replaceInput.value = "";
      return;
    }
  });

  document.addEventListener("blur", (e) => {
    const captionInput = e.target.closest?.("[data-library-caption]");
    if (captionInput) setImageCaption(captionInput.dataset.libraryCaption, captionInput.value);
  }, true);
}
