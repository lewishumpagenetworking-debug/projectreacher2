import { $, esc } from "./dom.js";
import { VISION_BOARD_CATEGORIES } from "./image-constants.js";
import { galleryGridHtml, galleryUploaderHtml, uploadSlotHtml, resolveImageUrls, bindGalleryContainer } from "./image-gallery.js";
import { getImagesFor, addImagesFromFiles, replaceImageFile, removeImage, reorderImages, addCustomCategory } from "./vision-images.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

// "physique" gets its own dedicated Target Physique Board card (cinematic cover treatment,
// spec section 8.1) instead of living in the generic accordion — same underlying category
// and images, just a different presentation, so nothing about image storage/filtering changes.
function allVisionCategories(data) {
  return [...VISION_BOARD_CATEGORIES.filter(c => c.id !== "physique"), ...(data.imageCategories || []).map(c => ({ id: c.id, label: c.label }))];
}

const PHYSIQUE_COVER_FIELD = "physique-board-cover";

export async function renderTargetPhysiqueBoard(data) {
  const coverEl = $("physiqueBoardCover");
  const galleryEl = $("physiqueBoardGallery");
  const uploaderEl = $("physiqueBoardUploader");
  if (!coverEl || !galleryEl) return;

  const images = getImagesFor({ category: "physique", relatedEntityType: null }, data);
  const urlMap = await resolveImageUrls(images);
  const cover = images[0] || null;

  coverEl.hidden = false;
  coverEl.classList.toggle("physique-board-cover-filled", !!cover);
  coverEl.innerHTML = `
    ${cover && urlMap.has(cover.id) ? `<span class="physique-board-tag">Primary Target</span>` : ""}
    ${uploadSlotHtml(PHYSIQUE_COVER_FIELD, cover, urlMap, { label: "Target Physique" })}`;

  const rest = images.slice(1);
  const restUrlMap = new Map([...urlMap].filter(([id]) => rest.some(i => i.id === id)));
  galleryEl.innerHTML = rest.length ? galleryGridHtml(rest, restUrlMap) : "";
  bindGalleryContainer(galleryEl, rest, restUrlMap, {
    onRemove: async (id) => { await removeImage(id); refreshAll(); },
    onReorder: (ids) => { reorderImages([cover.id, ...ids]); refreshAll(); }
  });

  if (uploaderEl) uploaderEl.innerHTML = images.length ? galleryUploaderHtml("physique-board", { label: "Add More Target Images" }) : "";
}

async function handlePhysiqueBoardCoverUpload(fileList) {
  const { addedCount, errors } = await addImagesFromFiles(fileList, { category: "physique", relatedEntityType: null });
  if (errors.length) alert(`Some images couldn't be uploaded:\n${errors.join("\n")}`);
  if (addedCount) refreshAll();
}

async function handlePhysiqueBoardCoverReplace(imageId, file) {
  const { errors } = await replaceImageFile(imageId, file);
  if (errors.length) alert(`Couldn't replace this image:\n${errors.join("\n")}`);
  refreshAll();
}

async function handlePhysiqueBoardCoverRemove(imageId) {
  await removeImage(imageId);
  refreshAll();
}

async function handlePhysiqueBoardUpload(fileList) {
  const { addedCount, errors } = await addImagesFromFiles(fileList, { category: "physique", relatedEntityType: null });
  if (errors.length) alert(`Some images couldn't be uploaded:\n${errors.join("\n")}`);
  if (addedCount) refreshAll();
}

/** Renders the Vision Board: one expandable subsection per category (built-in + custom), each with its own gallery. Pure Vision Board images only — relatedEntityType:null excludes goal/milestone-linked images even if they share a category label. */
export async function renderVisionBoard(data) {
  const container = $("visionBoardCategories");
  if (!container) return;
  const categories = allVisionCategories(data);
  const previouslyOpen = new Set([...container.querySelectorAll("details[open]")].map(d => d.dataset.visionCategory));

  container.innerHTML = categories.map(cat => `
    <details class="category-section" data-vision-category="${esc(cat.id)}" ${previouslyOpen.has(cat.id) ? "open" : ""}>
      <summary><strong>${esc(cat.label)}</strong> <span class="badge" id="vision-count-${esc(cat.id)}"></span></summary>
      <div class="image-gallery-slot" id="vision-gallery-${esc(cat.id)}"></div>
      ${galleryUploaderHtml(`vision-${cat.id}`, { label: "Add Images" })}
    </details>`).join("") || "<p class='small'>No categories yet.</p>";

  for (const cat of categories) {
    const images = getImagesFor({ category: cat.id, relatedEntityType: null }, data);
    const countBadge = document.getElementById(`vision-count-${cat.id}`);
    if (countBadge) countBadge.textContent = `${images.length}`;
    const galleryEl = document.getElementById(`vision-gallery-${cat.id}`);
    if (!galleryEl) continue;
    const urlMap = await resolveImageUrls(images);
    galleryEl.innerHTML = galleryGridHtml(images, urlMap);
    bindGalleryContainer(galleryEl, images, urlMap, {
      onRemove: async (id) => { await removeImage(id); refreshAll(); },
      onReorder: (ids) => { reorderImages(ids); refreshAll(); }
    });
  }
}

async function handleVisionCategoryUpload(fieldId, fileList) {
  const categoryId = fieldId.replace(/^vision-/, "");
  const { addedCount, errors } = await addImagesFromFiles(fileList, { category: categoryId, relatedEntityType: null });
  if (errors.length) alert(`Some images couldn't be uploaded:\n${errors.join("\n")}`);
  if (addedCount) refreshAll();
}

function addVisionCategory() {
  const input = $("newVisionCategoryName");
  const label = input?.value.trim();
  if (!label) return;
  addCustomCategory(label);
  input.value = "";
  refreshAll();
}

export function setupVisionBoardEventDelegation() {
  document.addEventListener("click", (e) => {
    if (e.target.closest("#addVisionCategoryBtn")) { addVisionCategory(); return; }
    const coverRemoveBtn = e.target.closest("#physiqueBoardCover [data-gallery-remove]");
    if (coverRemoveBtn) { handlePhysiqueBoardCoverRemove(coverRemoveBtn.dataset.galleryRemove); return; }
  });
  document.addEventListener("change", (e) => {
    const categoryInput = e.target.closest("#visionBoardCategories [data-gallery-upload]");
    if (categoryInput && categoryInput.files?.length) {
      handleVisionCategoryUpload(categoryInput.dataset.galleryUpload, categoryInput.files);
      categoryInput.value = "";
      return;
    }
    const coverInput = e.target.closest("#physiqueBoardCover [data-gallery-upload]");
    if (coverInput && coverInput.files?.length) {
      const replaceId = coverInput.dataset.galleryReplace;
      if (replaceId) handlePhysiqueBoardCoverReplace(replaceId, coverInput.files[0]);
      else handlePhysiqueBoardCoverUpload(coverInput.files);
      coverInput.value = "";
      return;
    }
    const moreInput = e.target.closest("#physiqueBoardUploader [data-gallery-upload]");
    if (moreInput && moreInput.files?.length) {
      handlePhysiqueBoardUpload(moreInput.files);
      moreInput.value = "";
    }
  });
}
