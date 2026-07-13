// IndexedDB-backed image blob storage. Kept entirely separate from js/data.js's
// localStorage blob: metadata (category, captions, ordering, links to goals/milestones)
// lives in the normal data object, but the actual image bytes live here so the app can
// hold many images without pressuring the shared localStorage quota. Still 100% on-device
// — no network/cloud involved, just a different browser storage API.

const DB_NAME = "projectReacherImages";
const DB_VERSION = 1;
const STORE_NAME = "images";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) { reject(new Error("IndexedDB is not supported in this browser.")); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export function isImageStoreSupported() {
  return "indexedDB" in window;
}

export async function putImageBlob(id, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getImageBlob(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteImageBlob(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listImageIds() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// Object URLs are cached per id so repeated gallery renders don't leak/recreate them.
// Callers never need to manage revocation themselves except via revokeImageObjectURL
// after a delete/replace.
const urlCache = new Map();

export async function getImageObjectURL(id) {
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = await getImageBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function revokeImageObjectURL(id) {
  const url = urlCache.get(id);
  if (url) { URL.revokeObjectURL(url); urlCache.delete(id); }
}

/** Reads a File, downsizes it on a canvas, and returns a compressed JPEG Blob ready to store. */
export function compressImageFile(file, { maxWidth = 1200, quality = 0.72 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`This browser can't preview "${file.name}". Try a JPG, PNG or WEBP instead.`));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error("Could not process this image.")); return; }
          resolve({ blob, width: w, height: h });
        }, "image/jpeg", quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function base64ToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Bundles every stored image as base64 so a JSON export/backup captures images too, not just metadata. */
export async function exportAllImagesAsBase64() {
  if (!isImageStoreSupported()) return {};
  const ids = await listImageIds();
  const out = {};
  for (const id of ids) {
    const blob = await getImageBlob(id);
    if (blob) out[id] = await blobToBase64(blob);
  }
  return out;
}

/** Restores a base64 image map (from an export/backup file) back into IndexedDB. Additive — never clears existing images first. */
export async function importImagesFromBase64Map(map) {
  if (!isImageStoreSupported()) return 0;
  const entries = Object.entries(map || {});
  let count = 0;
  for (const [id, dataUrl] of entries) {
    try {
      const blob = await base64ToBlob(dataUrl);
      await putImageBlob(id, blob);
      count++;
    } catch (err) {
      console.warn(`[Project Reacher] Could not restore image ${id} from backup.`, err);
    }
  }
  return count;
}
