// Reusable image gallery/upload component. Purely presentational + a small amount of
// self-contained interaction wiring (lightbox, drag-reorder) — callers own all data
// persistence (js/data.js metadata + js/image-store.js blobs) and pass in already-loaded
// image records plus callback handlers. This is the ONE gallery implementation reused by
// the Image Library, Vision Board, Goal images, Milestone images, and the Dashboard
// Vision Preview, per the "reused rather than creating multiple image systems" constraint.
import { esc } from "./dom.js";
import { getImageObjectURL, compressImageFile } from "./image-store.js";

export const IMAGE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif";

/** Resolves a list of image metadata records into a Map(id -> object URL), skipping any that fail to load. */
export async function resolveImageUrls(images) {
  const map = new Map();
  for (const img of images) {
    try {
      const url = await getImageObjectURL(img.id);
      if (url) map.set(img.id, url);
    } catch { /* a missing/corrupt blob just renders as a placeholder, never breaks the gallery */ }
  }
  return map;
}

function thumbSrc(urlMap, id) {
  return urlMap.get(id) || "";
}

/** Grid layout: square tiles, remove + reorder controls, click opens the lightbox. */
export function galleryGridHtml(images, urlMap, { allowRemove = true, allowReorder = true, showCaption = true } = {}) {
  if (!images.length) return "<p class='small'>No images yet.</p>";
  return `<div class="image-grid">${images.map((img, i) => `
    <figure class="image-tile" draggable="${allowReorder}" data-image-id="${esc(img.id)}">
      <img src="${esc(thumbSrc(urlMap, img.id))}" alt="${esc(img.caption || "")}" loading="lazy" data-gallery-open-lightbox="${esc(img.id)}" />
      ${showCaption && img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ""}
      <div class="image-tile-controls">
        ${allowReorder ? `
          <button type="button" class="image-tile-btn" data-gallery-move-up="${esc(img.id)}" ${i === 0 ? "disabled" : ""} aria-label="Move earlier">&uarr;</button>
          <button type="button" class="image-tile-btn" data-gallery-move-down="${esc(img.id)}" ${i === images.length - 1 ? "disabled" : ""} aria-label="Move later">&darr;</button>
        ` : ""}
        ${allowRemove ? `<button type="button" class="image-tile-btn image-tile-btn-danger" data-gallery-remove="${esc(img.id)}" aria-label="Remove image">&times;</button>` : ""}
      </div>
    </figure>`).join("")}</div>`;
}

/** Carousel layout: horizontal scroll-snap, no JS animation engine needed. */
export function galleryCarouselHtml(images, urlMap, { allowRemove = true, showCaption = true } = {}) {
  if (!images.length) return "<p class='small'>No images yet.</p>";
  return `<div class="image-carousel">${images.map(img => `
    <figure class="image-carousel-item" data-image-id="${esc(img.id)}">
      <img src="${esc(thumbSrc(urlMap, img.id))}" alt="${esc(img.caption || "")}" loading="lazy" data-gallery-open-lightbox="${esc(img.id)}" />
      ${showCaption && img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ""}
      ${allowRemove ? `<button type="button" class="image-tile-btn image-tile-btn-danger image-carousel-remove" data-gallery-remove="${esc(img.id)}" aria-label="Remove image">&times;</button>` : ""}
    </figure>`).join("")}</div>`;
}

/** Single-image slot: Upload / Replace / Remove / Preview for a one-image-only field. */
export function uploadSlotHtml(fieldId, image, urlMap, { label = "Image" } = {}) {
  const inputId = `${fieldId}-file-input`;
  if (image) {
    return `
      <div class="image-upload-slot image-upload-slot-filled">
        <img src="${esc(thumbSrc(urlMap, image.id))}" alt="${esc(image.caption || label)}" loading="lazy" data-gallery-open-lightbox="${esc(image.id)}" />
        <div class="actions">
          <label class="secondary" style="cursor:pointer">Replace<input type="file" accept="${IMAGE_ACCEPT}" id="${esc(inputId)}" data-gallery-upload="${esc(fieldId)}" data-gallery-replace="${esc(image.id)}" style="display:none"></label>
          <button type="button" class="danger" data-gallery-remove="${esc(image.id)}">Remove</button>
        </div>
      </div>`;
  }
  return `
    <div class="image-upload-slot">
      <label class="image-upload-dropzone" for="${esc(inputId)}">
        <span>+ Upload ${esc(label)}</span>
        <input type="file" accept="${IMAGE_ACCEPT}" id="${esc(inputId)}" data-gallery-upload="${esc(fieldId)}" style="display:none">
      </label>
    </div>`;
}

/** Compact multi-file uploader button, for feeding a gallery (grid/carousel) rather than a single slot. */
export function galleryUploaderHtml(fieldId, { label = "Add Images", multiple = true } = {}) {
  const inputId = `${fieldId}-file-input`;
  return `<label class="secondary image-upload-btn" style="cursor:pointer">${esc(label)}
    <input type="file" accept="${IMAGE_ACCEPT}" ${multiple ? "multiple" : ""} id="${esc(inputId)}" data-gallery-upload="${esc(fieldId)}" style="display:none">
  </label>`;
}

/** Reads File objects from an <input>, compresses each, and returns [{blob, width, height, file}] — throws with a clear message on an unsupported/corrupt file rather than silently dropping it. */
export async function processUploadedFiles(fileList) {
  const results = [];
  const errors = [];
  for (const file of Array.from(fileList)) {
    try {
      const { blob, width, height } = await compressImageFile(file);
      results.push({ blob, width, height, file });
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }
  return { results, errors };
}

// ---- Lightbox: one shared fullscreen instance, reused by every gallery on the page ----

let lightboxState = { images: [], urlMap: new Map(), index: 0 };

function ensureLightboxDom() {
  if (document.getElementById("imageLightboxBackdrop")) return;
  const backdrop = document.createElement("div");
  backdrop.id = "imageLightboxBackdrop";
  backdrop.className = "nav-backdrop image-lightbox-backdrop";
  backdrop.hidden = true;
  const modal = document.createElement("div");
  modal.id = "imageLightboxModal";
  modal.className = "image-lightbox-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div class="image-lightbox-content">
      <button type="button" class="close-btn image-lightbox-close" id="imageLightboxClose" aria-label="Close">&times;</button>
      <button type="button" class="image-lightbox-nav image-lightbox-prev" id="imageLightboxPrev" aria-label="Previous image">&larr;</button>
      <img id="imageLightboxImg" alt="" />
      <button type="button" class="image-lightbox-nav image-lightbox-next" id="imageLightboxNext" aria-label="Next image">&rarr;</button>
      <p class="small image-lightbox-caption" id="imageLightboxCaption"></p>
    </div>`;
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  backdrop.addEventListener("click", closeLightbox);
  document.getElementById("imageLightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("imageLightboxPrev").addEventListener("click", () => stepLightbox(-1));
  document.getElementById("imageLightboxNext").addEventListener("click", () => stepLightbox(1));
  document.addEventListener("keydown", (e) => {
    if (document.getElementById("imageLightboxModal")?.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });
}

function renderLightboxFrame() {
  const img = lightboxState.images[lightboxState.index];
  if (!img) return;
  const imgEl = document.getElementById("imageLightboxImg");
  const captionEl = document.getElementById("imageLightboxCaption");
  imgEl.src = lightboxState.urlMap.get(img.id) || "";
  imgEl.alt = img.caption || "";
  captionEl.textContent = img.caption || "";
  document.getElementById("imageLightboxPrev").hidden = lightboxState.images.length <= 1;
  document.getElementById("imageLightboxNext").hidden = lightboxState.images.length <= 1;
}

function stepLightbox(delta) {
  if (!lightboxState.images.length) return;
  lightboxState.index = (lightboxState.index + delta + lightboxState.images.length) % lightboxState.images.length;
  renderLightboxFrame();
}

export function openLightbox(images, urlMap, startId) {
  ensureLightboxDom();
  lightboxState = { images, urlMap, index: Math.max(0, images.findIndex(i => i.id === startId)) };
  renderLightboxFrame();
  document.getElementById("imageLightboxBackdrop").hidden = false;
  document.getElementById("imageLightboxModal").hidden = false;
}

export function closeLightbox() {
  const backdrop = document.getElementById("imageLightboxBackdrop");
  const modal = document.getElementById("imageLightboxModal");
  if (backdrop) backdrop.hidden = true;
  if (modal) modal.hidden = true;
}

// ---- Container-scoped interaction wiring (drag reorder + delegated clicks) ----
// Each gallery instance binds its own container rather than a single global listener,
// since many independent galleries (Vision Board categories, goal images, library) can
// coexist on one page at once.

/**
 * Wires click/drag interactions for one gallery container. `images` and `urlMap` are the
 * currently-rendered data (needed so the lightbox and reorder math have something to act
 * on); `handlers` are the caller's persistence callbacks: onRemove(id), onReorder(orderedIds),
 * onUploadFiles(fieldId, fileList). Safe to call again after every re-render — it only
 * attaches to the container element itself (not document), so repeated calls just rebind.
 */
export function bindGalleryContainer(containerEl, images, urlMap, handlers = {}) {
  if (!containerEl) return;

  containerEl.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-gallery-open-lightbox]");
    if (openBtn) { openLightbox(images, urlMap, openBtn.dataset.galleryOpenLightbox); return; }
    const removeBtn = e.target.closest("[data-gallery-remove]");
    if (removeBtn) { handlers.onRemove?.(removeBtn.dataset.galleryRemove); return; }
    const upBtn = e.target.closest("[data-gallery-move-up]");
    if (upBtn) { reorder(upBtn.dataset.galleryMoveUp, -1); return; }
    const downBtn = e.target.closest("[data-gallery-move-down]");
    if (downBtn) { reorder(downBtn.dataset.galleryMoveDown, 1); return; }
  });

  containerEl.addEventListener("change", (e) => {
    const uploadInput = e.target.closest("[data-gallery-upload]");
    if (uploadInput && uploadInput.files?.length) {
      handlers.onUploadFiles?.(uploadInput.dataset.galleryUpload, uploadInput.files, uploadInput.dataset.galleryReplace || null);
      uploadInput.value = "";
    }
  });

  function reorder(id, delta) {
    const ids = images.map(i => i.id);
    const idx = ids.indexOf(id);
    const swapWith = idx + delta;
    if (idx === -1 || swapWith < 0 || swapWith >= ids.length) return;
    [ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]];
    handlers.onReorder?.(ids);
  }

  // Native HTML5 drag-and-drop reorder (desktop only — the up/down buttons above are the
  // always-available fallback for touch devices where drag-and-drop isn't practical).
  let dragId = null;
  containerEl.querySelectorAll("[draggable='true']").forEach(tile => {
    tile.addEventListener("dragstart", () => { dragId = tile.dataset.imageId; tile.classList.add("dragging"); });
    tile.addEventListener("dragend", () => { dragId = null; tile.classList.remove("dragging"); });
    tile.addEventListener("dragover", (e) => { e.preventDefault(); });
    tile.addEventListener("drop", (e) => {
      e.preventDefault();
      const targetId = tile.dataset.imageId;
      if (!dragId || dragId === targetId) return;
      const ids = images.map(i => i.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(targetId);
      if (from === -1 || to === -1) return;
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      handlers.onReorder?.(ids);
    });
  });
}
