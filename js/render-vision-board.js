import { $, esc } from "./dom.js";
import { VISION_BOARD_CATEGORIES } from "./image-constants.js";
import { galleryGridHtml, galleryUploaderHtml, resolveImageUrls, bindGalleryContainer } from "./image-gallery.js";
import { getImagesFor, addImagesFromFiles, removeImage, reorderImages, addCustomCategory } from "./vision-images.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

function allVisionCategories(data) {
  return [...VISION_BOARD_CATEGORIES, ...(data.imageCategories || []).map(c => ({ id: c.id, label: c.label }))];
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
  });
  document.addEventListener("change", (e) => {
    const input = e.target.closest("#visionBoardCategories [data-gallery-upload]");
    if (input && input.files?.length) {
      handleVisionCategoryUpload(input.dataset.galleryUpload, input.files);
      input.value = "";
    }
  });
}
