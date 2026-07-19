// IndexedDB-backed bloodwork file storage (PDF/image/CSV report attachments). Mirrors
// js/image-store.js's separation of metadata (in js/data.js) from bytes (here), but
// deliberately skips image-store.js's canvas/JPEG recompression step — a PDF or CSV
// would fail that pipeline, and a bloodwork report must be stored exactly as uploaded,
// never lossily re-encoded. Kept in its own IndexedDB database so this feature can
// never collide with or be affected by the image store's schema/version.

const DB_NAME = "projectReacherBloodworkFiles";
const DB_VERSION = 1;
const STORE_NAME = "files";

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

export function isBloodworkFileStoreSupported() {
  return "indexedDB" in window;
}

export async function putBloodworkFileBlob(id, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBloodworkFileBlob(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBloodworkFileBlob(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listBloodworkFileIds() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

const urlCache = new Map();

export async function getBloodworkFileObjectURL(id) {
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = await getBloodworkFileBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function revokeBloodworkFileObjectURL(id) {
  const url = urlCache.get(id);
  if (url) { URL.revokeObjectURL(url); urlCache.delete(id); }
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

/** Bundles every stored bloodwork file as base64 so a JSON export/backup captures original reports too, not just metadata/marker values. */
export async function exportAllBloodworkFilesAsBase64() {
  if (!isBloodworkFileStoreSupported()) return {};
  const ids = await listBloodworkFileIds();
  const out = {};
  for (const id of ids) {
    const blob = await getBloodworkFileBlob(id);
    if (blob) out[id] = await blobToBase64(blob);
  }
  return out;
}

/** Restores a base64 file map (from an export/backup) back into IndexedDB. Additive — never clears existing files first. */
export async function importBloodworkFilesFromBase64Map(map) {
  if (!isBloodworkFileStoreSupported()) return 0;
  const entries = Object.entries(map || {});
  let count = 0;
  for (const [id, dataUrl] of entries) {
    try {
      const blob = await base64ToBlob(dataUrl);
      await putBloodworkFileBlob(id, blob);
      count++;
    } catch (err) {
      console.warn(`[Project Reacher] Could not restore bloodwork file ${id} from backup.`, err);
    }
  }
  return count;
}
