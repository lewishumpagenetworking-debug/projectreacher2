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
  notes: ""
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
    historical: legacyHistoricalData
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
   "stimulantLogs", "supplementLogs", "mealLogs", "progressPhotos", "prs", "monthlyReviews"].forEach(key => {
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
    weight: null, calves: null, notes: ""
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

export function importData(jsonText) {
  const imported = JSON.parse(jsonText);
  if (typeof imported !== "object" || imported === null) throw new Error("Invalid backup file.");
  saveData(imported);
  return migrateData();
}

export function deleteItem(collection, id) {
  const data = getData();
  data[collection] = (data[collection] || []).filter(item => item.id !== id);
  saveData(data);
  return data;
}
