// Data layer: localStorage persistence, versioned schema, non-destructive migration.
import { DEFAULT_TRAINING_PROGRAM, EXERCISE_DATABASE, DEFAULT_SUPPLEMENTS, DEFAULT_PRS } from "./program.js";

export const STORAGE_KEY = "projectReacher";
export const SCHEMA_VERSION = 2;

export const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const legacyHistoricalData = [
  { week: "Historic W1", exercise: "Bar Curl", weight: 35, reps: 10, volume: 350 },
  { week: "Historic W2", exercise: "Bar Curl", weight: 37.5, reps: 10, volume: 375 },
  { week: "Historic W3", exercise: "Bar Curl", weight: 40, reps: 8, volume: 320 },
  { week: "Historic W1", exercise: "Standing Calf Raise", weight: 60, reps: 12, volume: 720 }
];

export const DEFAULT_PROFILE = {
  age: 20,
  height: "5'11\"",
  startingWeight: 73,
  currentWeight: 73,
  targetWeight: 89,
  realisticTargetWeightMin: 83,
  realisticTargetWeightMax: 87,
  ambitiousTargetWeight: 89,
  targetBodyFatMin: 10,
  targetBodyFatMax: 15,
  currentPhase: "Lean Bulk 1",
  targetWeeklyGain: 0.25,
  trainingStyle: "2 hard working sets per exercise",
  sleepConstraint: "Fixed 5-6 hours/night (non-negotiable)",
  notes: "",
  visualModeEnabled: false
};

// Merge defaults under an existing record without ever discarding a field the user already has,
// including falsy-but-meaningful values like 0, false, or "".
function withDefaults(item, defaults) {
  return { ...defaults, ...item };
}

function emptyData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: { ...DEFAULT_PROFILE },
    trainingProgram: structuredClone(DEFAULT_TRAINING_PROGRAM),
    exercises: structuredClone(EXERCISE_DATABASE),
    checkins: [],
    measurements: [],
    workouts: [],
    bodyweightLogs: [],
    nutritionLogs: [],
    recoveryLogs: [],
    stimulantLogs: [],
    supplements: structuredClone(DEFAULT_SUPPLEMENTS),
    supplementLogs: [],
    mealLogs: [],
    progressPhotos: [],
    prs: structuredClone(DEFAULT_PRS),
    monthlyReviews: [],
    motivationalVisuals: [],
    historical: legacyHistoricalData,
    libraryFavorites: [],
    libraryRecentlyViewed: [],
    activeWorkoutDraft: null
  };
}

export function getData() {
  const base = emptyData();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return Object.assign(base, stored);
  } catch {
    return base;
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("reacher:data-changed"));
}

// Keeps a timestamped snapshot of the pre-migration blob so a bad migration is always recoverable
// even if the user never manually exported.
function backupBeforeMigration(rawData, fromVersion) {
  try {
    const key = `projectReacher_backup_v${fromVersion}_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify(rawData));
    console.info(`[Project Reacher] Backup saved before migration: ${key}`);
  } catch (err) {
    console.warn("[Project Reacher] Could not save pre-migration backup (storage may be full).", err);
  }
}

/**
 * Non-destructive migration: only ADDS missing fields/collections with safe defaults.
 * Never renames, deletes, or overwrites an existing user-entered value.
 */
export function migrateData() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  const incomingVersion = raw?.schemaVersion || (raw ? 1 : SCHEMA_VERSION);

  const data = getData();
  let changed = false;

  if (raw && incomingVersion < SCHEMA_VERSION) {
    backupBeforeMigration(raw, incomingVersion);
    changed = true;
  }

  // v1 -> v2: legacy collections got ids already; ensure every record across every
  // collection still has an id, then layer on the new optional fields additively.
  ["checkins", "measurements", "workouts", "bodyweightLogs", "nutritionLogs", "recoveryLogs",
   "stimulantLogs", "supplementLogs", "mealLogs", "progressPhotos", "prs", "monthlyReviews",
   "motivationalVisuals"].forEach(key => {
    if (raw && !(key in raw)) changed = true; // persist newly-introduced collections immediately, not lazily
    data[key] = (data[key] || []).map(item => {
      if (!item.id) {
        changed = true;
        item = { id: uid(), ...item };
      }
      return item;
    });
  });

  data.checkins = data.checkins.map(c => withDefaults(c, {
    weekNumber: null, startDate: null, endDate: null,
    morningBodyweightAverage: null, sevenDayAverage: null, weeklyRateOfGain: null,
    proteinAverage: null, calorieAverage: null, sleepAverage: null,
    sessionsCompleted: null, recoveryAverage: null, energyAverage: null,
    strengthProgressSummary: "", recommendation: ""
  }));

  data.measurements = data.measurements.map(m => withDefaults(m, {
    weight: null, calves: null, notes: "",
    rforearm: null, lforearm: null, flexedArm: null, relaxedArm: null, pumpedNote: ""
  }));

  data.workouts = data.workouts.map(w => withDefaults(w, {
    programDay: w.day || null, sessionName: w.day || null
  }));
  data.workouts.forEach(w => {
    w.exercises = (w.exercises || []).map(e => withDefaults(e, {
      exerciseId: null,
      set1RIR: null, set2RIR: null,
      optionalSet3Weight: null, optionalSet3Reps: null,
      RPE: null, technicalFailureReached: false,
      formQuality: null, targetMuscleConnection: null,
      increaseNextWeek: false, progressionRecommendation: "",
      createdAt: w.date || null, updatedAt: w.date || null
    }));
  });

  if (!data.profile) { data.profile = { ...DEFAULT_PROFILE }; changed = true; }
  else { data.profile = withDefaults(data.profile, DEFAULT_PROFILE); }

  if (!data.trainingProgram) { data.trainingProgram = structuredClone(DEFAULT_TRAINING_PROGRAM); changed = true; }

  if (!data.exercises || !data.exercises.length) {
    data.exercises = structuredClone(EXERCISE_DATABASE);
    changed = true;
  } else {
    // Backfill newly-added guide fields (form cues, tempo, etc.) onto exercises the
    // user already has stored, without touching anything already on their record.
    const byId = Object.fromEntries(EXERCISE_DATABASE.map(e => [e.id, e]));
    data.exercises = data.exercises.map(ex => {
      const dbMatch = ex.id && byId[ex.id];
      if (!dbMatch) return ex;
      const merged = withDefaults(ex, dbMatch);
      if (Object.keys(merged).length !== Object.keys(ex).length) changed = true;
      return merged;
    });
  }

  if (!data.supplements || !data.supplements.length) { data.supplements = structuredClone(DEFAULT_SUPPLEMENTS); changed = true; }
  if (!data.prs || !data.prs.length) { data.prs = structuredClone(DEFAULT_PRS); changed = true; }

  if (!Array.isArray(data.libraryFavorites)) { data.libraryFavorites = []; changed = true; }
  if (!Array.isArray(data.libraryRecentlyViewed)) { data.libraryRecentlyViewed = []; changed = true; }
  if (data.activeWorkoutDraft === undefined) { data.activeWorkoutDraft = null; changed = true; }

  // Restore any training day the currently-running app knows about (program.js) but
  // that this stored/imported data is entirely missing — e.g. data saved before Day 6
  // was introduced. Days that already exist are never touched here, so any user edits
  // made via the Program Editor are preserved exactly as-is.
  Object.entries(DEFAULT_TRAINING_PROGRAM).forEach(([day, exercises]) => {
    if (!(day in data.trainingProgram)) {
      data.trainingProgram[day] = structuredClone(exercises);
      changed = true;
    }
  });

  // Restore any exercise the currently-running app knows about but that is entirely
  // absent from this stored/imported exercises array (e.g. Day 6's new exercises on
  // data saved/imported before they existed). Exercises that already exist by id are
  // left to the per-field guide backfill above — this only ADDS missing ones.
  {
    const presentIds = new Set(data.exercises.map(e => e.id));
    EXERCISE_DATABASE.forEach(canonical => {
      if (!presentIds.has(canonical.id)) {
        data.exercises.push(structuredClone(canonical));
        changed = true;
      }
    });
  }

  if (data.schemaVersion !== SCHEMA_VERSION) {
    data.schemaVersion = SCHEMA_VERSION;
    changed = true;
  }

  if (changed) {
    saveData(data);
    console.info(`[Project Reacher] Migrated data to schema v${SCHEMA_VERSION}.`);
  }
  return data;
}

export function exportData() {
  const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `project-reacher-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const COLLECTION_KEYS = [
  "checkins", "measurements", "workouts", "bodyweightLogs", "nutritionLogs", "recoveryLogs",
  "stimulantLogs", "supplementLogs", "mealLogs", "progressPhotos", "monthlyReviews", "motivationalVisuals"
];

// Extra "this is really the same record" keys per collection, for backups whose ids
// don't line up (e.g. re-exported from a different device) but whose content clearly
// represents the same logged entry — avoids double-counting on repeated imports.
const SECONDARY_DEDUPE_KEY = {
  workouts: (w) => `${w.date}__${w.day || w.programDay || ""}`
};

/**
 * Merges an imported list into the current list by id, current's fields always
 * winning on a conflict (so a stale imported record can never overwrite a live one)
 * while still backfilling any field the current record happens to be missing.
 * Records only present in the import are ADDED, never used to replace or drop a
 * current-only record. Returns { merged, added, skippedDuplicate }.
 */
function mergeById(currentList, importedList, secondaryKeyFn) {
  const currentArr = Array.isArray(currentList) ? currentList : [];
  const importedArr = Array.isArray(importedList) ? importedList : [];
  const byId = new Map();
  currentArr.forEach(item => { if (item && item.id) byId.set(item.id, item); });
  const secondarySeen = new Set(secondaryKeyFn ? currentArr.map(secondaryKeyFn).filter(Boolean) : []);

  let added = 0;
  let skippedDuplicate = 0;
  importedArr.forEach(item => {
    if (!item || typeof item !== "object") return;
    if (item.id && byId.has(item.id)) {
      byId.set(item.id, withDefaults(byId.get(item.id), item));
      return;
    }
    const key = secondaryKeyFn ? secondaryKeyFn(item) : null;
    if (key && secondarySeen.has(key)) { skippedDuplicate++; return; }
    if (key) secondarySeen.add(key);
    const id = item.id || uid();
    byId.set(id, { ...item, id });
    added++;
  });
  return { merged: [...byId.values()], added, skippedDuplicate };
}

function mergeArraysUnique(currentArr, importedArr) {
  return [...new Set([...(currentArr || []), ...(importedArr || [])])];
}

/**
 * Merges an imported top-level state object onto the current live state.
 * Current always wins for anything it already has (structure, program days,
 * exercise guidance, user-editable values); the import only ADDS what's missing —
 * this is what stops an older/partial backup from ever downgrading a newer app
 * state, while still letting a genuinely-empty (e.g. fresh device) current state
 * be fully populated from the import.
 */
function mergeProjectReacherState(current, imported) {
  const merged = { ...current };
  const summary = { collections: {}, day6Preserved: false, activeDraftAction: "none" };

  COLLECTION_KEYS.forEach(key => {
    const { merged: mergedList, added, skippedDuplicate } = mergeById(current[key], imported[key], SECONDARY_DEDUPE_KEY[key]);
    merged[key] = mergedList;
    summary.collections[key] = {
      foundInImport: Array.isArray(imported[key]) ? imported[key].length : 0,
      added, skippedDuplicate
    };
  });

  // Profile: current's values win for anything it already has; import only fills
  // in fields the current profile doesn't have set.
  merged.profile = withDefaults(current.profile || {}, imported.profile || {});

  // Training program + exercises: current already has every day/exercise the running
  // app's code defines (see emptyData()/migrateData()), so this only matters for a
  // day or exercise that exists in the import but not in current at all — e.g.
  // restoring onto a state that somehow lost one. Never overwrites an existing day
  // or exercise, so Day 6 (and any other current feature) is never removed by an
  // older import.
  merged.trainingProgram = { ...current.trainingProgram };
  let addedDays = 0;
  Object.entries(imported.trainingProgram || {}).forEach(([day, exercises]) => {
    if (!(day in merged.trainingProgram) && Array.isArray(exercises) && exercises.length) {
      merged.trainingProgram[day] = exercises;
      addedDays++;
    }
  });
  summary.day6Preserved = "Day 6 - Arm + Forearm + Delt Specialisation" in merged.trainingProgram;
  summary.programDaysAdded = addedDays;

  {
    const byId = new Map((current.exercises || []).map(e => [e.id, e]));
    let exercisesAdded = 0;
    (imported.exercises || []).forEach(ex => {
      if (!ex || !ex.id) return;
      if (!byId.has(ex.id)) { byId.set(ex.id, ex); exercisesAdded++; }
      // else: current already has this exercise — keep it exactly as-is, including
      // any guidance fields already backfilled by migrateData().
    });
    merged.exercises = [...byId.values()];
    summary.exercisesAdded = exercisesAdded;
  }

  merged.supplements = mergeById(current.supplements, imported.supplements, s => s.supplementName).merged;
  merged.prs = mergeById(current.prs, imported.prs, p => p.exerciseId || p.exerciseName).merged;

  merged.libraryFavorites = mergeArraysUnique(current.libraryFavorites, imported.libraryFavorites);
  merged.libraryRecentlyViewed = mergeArraysUnique(current.libraryRecentlyViewed, imported.libraryRecentlyViewed).slice(0, 8);

  merged.historical = (current.historical && current.historical.length) ? current.historical : (imported.historical || current.historical);

  // Active draft: never let an import silently discard in-progress unsaved workout
  // values. If current has none, a draft in the import is offered back.
  if (current.activeWorkoutDraft) {
    merged.activeWorkoutDraft = current.activeWorkoutDraft;
    summary.activeDraftAction = "kept-current";
  } else if (imported.activeWorkoutDraft) {
    merged.activeWorkoutDraft = imported.activeWorkoutDraft;
    summary.activeDraftAction = "restored-from-import";
  } else {
    merged.activeWorkoutDraft = null;
  }

  merged.schemaVersion = SCHEMA_VERSION;
  return { merged, summary };
}

/**
 * Imports a backup file by MERGING it onto the current live state — never by
 * replacing it. Older or partial backups can only ADD missing records/fields; they
 * can never remove a workout, meal log, exercise, program day (e.g. Day 6) or any
 * other current feature that the live app already has. Returns { data, summary }.
 */
export function importData(jsonText) {
  const imported = JSON.parse(jsonText);
  if (typeof imported !== "object" || imported === null) throw new Error("Invalid backup file.");

  const current = getData();
  try {
    localStorage.setItem(`projectReacher_backup_pre_import_${Date.now()}`, JSON.stringify(current));
  } catch (err) {
    console.warn("[Project Reacher] Could not save pre-import safety backup (storage may be full).", err);
  }

  const { merged, summary } = mergeProjectReacherState(current, imported);
  saveData(merged);
  const data = migrateData();
  return { data, summary };
}

export function deleteItem(collection, id) {
  const data = getData();
  data[collection] = (data[collection] || []).filter(item => item.id !== id);
  saveData(data);
  return data;
}
