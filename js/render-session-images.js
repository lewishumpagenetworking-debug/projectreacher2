// Session-specific image display on the Train tab (spec 8.3) — form-check photos or
// reference images attached to a specific training day. Reuses the existing generic
// image system (data.images + image-store.js) via the same relatedEntityType/relatedEntityId
// linking pattern already used for goals/PRs/milestones; "trainingDay" is just a new
// relatedEntityType value, no new storage mechanism.
import { $ } from "./dom.js";
import { galleryGridHtml, galleryUploaderHtml, resolveImageUrls, bindGalleryContainer } from "./image-gallery.js";
import { getImagesFor, addImagesFromFiles, removeImage, reorderImages } from "./vision-images.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

let currentDay = null;

export async function renderSessionImages(data, day) {
  const galleryEl = $("sessionImagesGallery");
  const uploaderEl = $("sessionImagesUploader");
  const countEl = $("sessionImagesCount");
  if (!galleryEl || !day) return;
  currentDay = day;

  const images = getImagesFor({ relatedEntityType: "trainingDay", relatedEntityId: day }, data);
  if (countEl) countEl.textContent = `${images.length}`;

  const urlMap = await resolveImageUrls(images);
  galleryEl.innerHTML = galleryGridHtml(images, urlMap);
  bindGalleryContainer(galleryEl, images, urlMap, {
    onRemove: async (id) => { await removeImage(id); refreshAll(); },
    onReorder: (ids) => { reorderImages(ids); refreshAll(); }
  });

  if (uploaderEl) uploaderEl.innerHTML = galleryUploaderHtml("session-images", { label: "Add Session Images" });
}

async function handleSessionImageUpload(fileList) {
  if (!currentDay) return;
  const { addedCount, errors } = await addImagesFromFiles(fileList, {
    category: "custom", relatedEntityType: "trainingDay", relatedEntityId: currentDay
  });
  if (errors.length) alert(`Some images couldn't be uploaded:\n${errors.join("\n")}`);
  if (addedCount) refreshAll();
}

export function setupSessionImagesEventDelegation() {
  document.addEventListener("change", (e) => {
    const input = e.target.closest("#sessionImagesUploader [data-gallery-upload]");
    if (input && input.files?.length) {
      handleSessionImageUpload(input.files);
      input.value = "";
    }
  });
}
