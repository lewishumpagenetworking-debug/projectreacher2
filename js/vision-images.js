// Shared controller for image metadata (data.images) + blob storage (image-store.js).
// Every feature that attaches images to something (Vision Board categories, goals,
// milestones, the Image Library, the former motivational-visual placements) goes through
// these functions rather than touching data.images or image-store.js directly, so the
// duplicate-prevention/ordering/archiving rules stay identical everywhere.
import { getData, saveData, uid } from "./data.js";
import { putImageBlob, deleteImageBlob, revokeImageObjectURL } from "./image-store.js";
import { processUploadedFiles } from "./image-gallery.js";

/** All non-archived-by-default images matching a filter. Pass includeArchived:true to include archived ones too. */
export function getImagesFor({ category = null, relatedEntityType = null, relatedEntityId = null, includeArchived = false } = {}, data = getData()) {
  return (data.images || [])
    .filter(img => {
      if (!includeArchived && img.status === "archived") return false;
      if (category != null && img.category !== category) return false;
      if (relatedEntityType != null && img.relatedEntityType !== relatedEntityType) return false;
      if (relatedEntityId != null && img.relatedEntityId !== relatedEntityId) return false;
      return true;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Compresses + stores each file, creates one metadata record per successful file. Returns {addedCount, errors}. */
export async function addImagesFromFiles(fileList, { category = "custom", relatedEntityType = null, relatedEntityId = null } = {}) {
  const { results, errors } = await processUploadedFiles(fileList);
  if (!results.length) return { addedCount: 0, errors };

  const data = getData();
  const siblingCount = getImagesFor({ category, relatedEntityType, relatedEntityId }, data).length;
  const now = new Date().toISOString();

  for (let i = 0; i < results.length; i++) {
    const { blob, width, height } = results[i];
    const id = uid();
    await putImageBlob(id, blob);
    data.images.push({
      id, category, relatedEntityType, relatedEntityId,
      caption: "", order: siblingCount + i, status: "active",
      width, height, uploadedAt: now
    });
  }
  saveData(data);
  return { addedCount: results.length, errors };
}

/** Replaces the blob behind an existing image record in place — metadata (caption/order/links) is untouched. */
export async function replaceImageFile(imageId, file) {
  const { results, errors } = await processUploadedFiles([file]);
  if (!results.length) return { replaced: false, errors };
  await putImageBlob(imageId, results[0].blob);
  revokeImageObjectURL(imageId);

  const data = getData();
  const record = (data.images || []).find(i => i.id === imageId);
  if (record) {
    record.width = results[0].width;
    record.height = results[0].height;
    record.uploadedAt = new Date().toISOString();
    saveData(data);
  }
  return { replaced: true, errors };
}

export async function removeImage(imageId) {
  const data = getData();
  data.images = (data.images || []).filter(i => i.id !== imageId);
  saveData(data);
  revokeImageObjectURL(imageId);
  try { await deleteImageBlob(imageId); } catch { /* metadata is already gone either way */ }
}

export function setImageCaption(imageId, caption) {
  const data = getData();
  const record = (data.images || []).find(i => i.id === imageId);
  if (!record) return;
  record.caption = caption;
  saveData(data);
}

export function setImageArchived(imageId, archived) {
  const data = getData();
  const record = (data.images || []).find(i => i.id === imageId);
  if (!record) return;
  record.status = archived ? "archived" : "active";
  saveData(data);
}

export function reassignImage(imageId, { category, relatedEntityType = null, relatedEntityId = null }) {
  const data = getData();
  const record = (data.images || []).find(i => i.id === imageId);
  if (!record) return;
  record.category = category;
  record.relatedEntityType = relatedEntityType;
  record.relatedEntityId = relatedEntityId;
  record.order = getImagesFor({ category, relatedEntityType, relatedEntityId }, data).length;
  saveData(data);
}

/** Applies a caller-supplied ordered id list to the `order` field of that same scoped set of images. */
export function reorderImages(orderedIds) {
  const data = getData();
  orderedIds.forEach((id, index) => {
    const record = (data.images || []).find(i => i.id === id);
    if (record) record.order = index;
  });
  saveData(data);
}

export function addCustomCategory(label) {
  const trimmed = (label || "").trim();
  if (!trimmed) return null;
  const data = getData();
  const existing = (data.imageCategories || []).find(c => c.label.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;
  const record = { id: uid(), label: trimmed, createdAt: new Date().toISOString() };
  data.imageCategories.push(record);
  saveData(data);
  return record;
}
