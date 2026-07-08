// Offline-first sync orchestration. localStorage stays the fast, always-available
// read/write layer (nothing about existing screens changes); this module's only
// job is keeping a Supabase row in sync with it whenever a connection + login exist.
import { getData, saveData, SCHEMA_VERSION } from "./data.js";
import { isCloudConfigured, getSession, onAuthStateChange, pushToCloud, pullFromCloud, signIn, signUp, signOut } from "./cloud.js";

const PUSH_DEBOUNCE_MS = 2000;

const STATUS = {
  NOT_CONFIGURED: "not_configured",
  SIGNED_OUT: "signed_out",
  OFFLINE: "offline",
  SYNCING: "syncing",
  SYNCED: "synced",
  ERROR: "error"
};
export { STATUS };

let state = {
  status: isCloudConfigured() ? STATUS.SIGNED_OUT : STATUS.NOT_CONFIGURED,
  userId: null,
  userEmail: null,
  lastSyncedAt: null,
  lastError: null
};
const listeners = new Set();
let pushTimer = null;
let applyingRemoteChange = false; // guards against a pull's local save re-triggering a push
let pendingPushWhileOffline = false;

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach(fn => fn(state));
}

export function onSyncStatusChange(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function getSyncState() {
  return state;
}

const ID_COLLECTIONS = [
  "checkins", "measurements", "workouts", "bodyweightLogs", "nutritionLogs",
  "recoveryLogs", "stimulantLogs", "supplementLogs", "mealLogs", "progressPhotos", "prs",
  "monthlyReviews", "exercises", "supplements"
];

/** Union of two id-keyed arrays. On an id collision the local record wins — it reflects the device currently in front of the user. */
function mergeArraysById(localArr = [], cloudArr = []) {
  const byId = new Map();
  cloudArr.forEach(item => { if (item?.id) byId.set(item.id, item); });
  localArr.forEach(item => { if (item?.id) byId.set(item.id, item); });
  return Array.from(byId.values());
}

/** Merges a freshly-pulled cloud blob into the local blob without ever dropping a record from either side. */
function mergeCloudIntoLocal(local, cloud) {
  const merged = { ...local };
  ID_COLLECTIONS.forEach(key => {
    merged[key] = mergeArraysById(local[key], cloud[key]);
  });
  return merged;
}

function schedulePush() {
  if (state.status === STATUS.NOT_CONFIGURED || !state.userId) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(flushPush, PUSH_DEBOUNCE_MS);
}

async function flushPush() {
  if (!state.userId) return;
  if (!navigator.onLine) {
    pendingPushWhileOffline = true;
    setState({ status: STATUS.OFFLINE });
    return;
  }
  setState({ status: STATUS.SYNCING, lastError: null });
  try {
    await pushToCloud(state.userId, getData(), SCHEMA_VERSION);
    pendingPushWhileOffline = false;
    setState({ status: STATUS.SYNCED, lastSyncedAt: new Date().toISOString() });
  } catch (err) {
    console.warn("[Project Reacher] Cloud push failed", err);
    setState({ status: STATUS.ERROR, lastError: err.message || String(err) });
  }
}

/** Runs once right after sign-in: reconciles local data with whatever's already in the cloud, then pushes the merged result back up. */
async function pullAndMerge() {
  setState({ status: STATUS.SYNCING, lastError: null });
  try {
    const remote = await pullFromCloud(state.userId);
    applyingRemoteChange = true;
    if (remote) {
      const merged = mergeCloudIntoLocal(getData(), remote.data);
      saveData(merged);
    }
    applyingRemoteChange = false;
    await pushToCloud(state.userId, getData(), SCHEMA_VERSION);
    setState({ status: STATUS.SYNCED, lastSyncedAt: new Date().toISOString() });
  } catch (err) {
    applyingRemoteChange = false;
    console.warn("[Project Reacher] Initial cloud sync failed", err);
    setState({ status: STATUS.ERROR, lastError: err.message || String(err) });
  }
}

export async function syncNow() {
  if (!state.userId) return;
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  await flushPush();
}

export async function cloudSignUp(email, password) {
  await signUp(email, password);
}

export async function cloudSignIn(email, password) {
  await signIn(email, password);
}

export async function cloudSignOut() {
  await signOut();
  setState({ status: STATUS.SIGNED_OUT, userId: null, userEmail: null });
}

export async function initSync() {
  if (!isCloudConfigured()) {
    setState({ status: STATUS.NOT_CONFIGURED });
    return;
  }

  window.addEventListener("reacher:data-changed", () => {
    if (applyingRemoteChange) return;
    schedulePush();
  });
  window.addEventListener("online", () => {
    if (pendingPushWhileOffline && state.userId) flushPush();
  });
  window.addEventListener("offline", () => {
    if (state.userId) setState({ status: STATUS.OFFLINE });
  });

  const session = await getSession().catch(() => null);
  if (session?.user) {
    setState({ status: STATUS.SYNCING, userId: session.user.id, userEmail: session.user.email });
    await pullAndMerge();
  } else {
    setState({ status: STATUS.SIGNED_OUT });
  }

  onAuthStateChange(async (session) => {
    if (session?.user) {
      setState({ userId: session.user.id, userEmail: session.user.email });
      await pullAndMerge();
    } else {
      setState({ status: STATUS.SIGNED_OUT, userId: null, userEmail: null });
    }
  });
}
