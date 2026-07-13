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
  visualModeEnabled: false,
  functionalTrackLengthMetres: 15,
  caffeineCutoffHours: 8,
  dailyCalorieTarget: 2800,
  proteinTargetOverrideG: null,
  sleepTargetHours: 7.5
};

// AI Specialists: consent + data-category permissions gate what the Context Builder is
// allowed to include when talking to Claude. Everything defaults OFF — the user must
// explicitly opt in per category. This object holds no secrets; the Anthropic API key
// itself is deliberately NOT stored here (see js/claude-client.js) so it can never end
// up in an exported/imported backup file.
export const DEFAULT_AI_SETTINGS = {
  consentGiven: false,
  dataCategoryPermissions: {
    training: false, nutrition: false, recovery: false, sleep: false,
    bodyweight: false, appearance: false, supplements: false
  },
  preferredModel: "claude-sonnet-5",
  auditLoggingEnabled: true
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
    sleepLogs: [],
    hydrationLogs: [],
    progressPhotos: [],
    prs: structuredClone(DEFAULT_PRS),
    monthlyReviews: [],
    motivationalVisuals: [],
    historical: legacyHistoricalData,
    libraryFavorites: [],
    libraryRecentlyViewed: [],
    activeWorkoutDraft: null,
    skinLogs: [],
    hairLogs: [],
    productExperiments: [],
    appearanceCheckins: [],
    aiConversationsPerformance: [],
    aiConversationsAppearance: [],
    aiConversationsShared: [],
    aiSavedInsights: [],
    aiProposedChanges: [],
    aiAuditLog: [],
    aiSettings: { ...DEFAULT_AI_SETTINGS, dataCategoryPermissions: { ...DEFAULT_AI_SETTINGS.dataCategoryPermissions } },
    foodTemplates: [],
    preWorkoutLogs: [],
    postWorkoutLogs: [],
    interventions: [],
    reviews: [],
    reminders: [],
    savedMeals: [],
    tasks: []
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
   "motivationalVisuals", "sleepLogs", "hydrationLogs",
   "skinLogs", "hairLogs", "productExperiments", "appearanceCheckins",
   "aiConversationsPerformance", "aiConversationsAppearance", "aiConversationsShared",
   "aiSavedInsights", "aiProposedChanges", "aiAuditLog",
   "foodTemplates", "preWorkoutLogs", "postWorkoutLogs", "interventions",
   "reviews", "reminders", "savedMeals", "tasks"].forEach(key => {
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
    rforearm: null, lforearm: null, flexedArm: null, relaxedArm: null, pumpedNote: "",
    measurementMethods: { shoulders: "circumference", chest: "circumference", waist: "circumference" }
  }));

  // Recovery Command Centre — additive fields only. Every field below defaults to
  // null/false/"" so older logs (or imports) that predate these fields are simply
  // treated as "not recorded", never as zero/false in a way that would misfire the
  // readiness/fatigue engine.
  data.stimulantLogs = data.stimulantLogs.map(s => withDefaults(s, {
    source: null, productName: "", servingSize: "", betaAlanineMg: null, bcaaMg: null,
    preWorkoutMealCompleted: null, perceivedEffect: null, pumpQuality: null,
    crashLater: null, jittersAnxiety: null, sleepAffected: null, performanceImproved: null,
    redFlagSymptoms: []
  }));

  data.mealLogs = data.mealLogs.map(m => withDefaults(m, {
    recoveryTag: null, quantity: null, unit: null, isDraft: false, source: "manual", assumptions: [],
    savedMealId: null, servingMultiplier: 1
  }));

  data.savedMeals = data.savedMeals.map(m => withDefaults(m, {
    ingredients: [], fibre: null, micronutrients: {}, notes: "", mealType: null,
    contentHash: null, timesLogged: 0, firstCreatedAt: m.createdAt || null, lastUsedAt: m.createdAt || null,
    archived: false, favourite: false
  }));

  data.reviews = data.reviews.map(r => withDefaults(r, {
    reviewType: "weekly", periodStart: null, periodEnd: null, status: "not_started",
    overallScore: null, summary: "", source: "app", sourceFilename: null,
    findings: [], proposedUpdates: [], knowledgeNotes: [], appliedLog: [],
    createdAt: r.createdAt || new Date().toISOString(), approvedAt: null, appliedAt: null
  }));

  data.tasks = data.tasks.map(t => withDefaults(t, {
    description: "", category: "general", priority: "medium", dueDate: null,
    completed: false, completedAt: null, source: "manual", relatedReviewId: null,
    createdAt: t.createdAt || new Date().toISOString(), updatedAt: t.createdAt || new Date().toISOString()
  }));

  data.reminders = data.reminders.map(r => withDefaults(r, {
    title: "", description: "", relatedEntityType: null, relatedEntityId: null,
    scheduledTime: "09:00", repeatRule: "daily", daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    timesPerDay: 1, additionalTimes: [], startDate: null, endDate: null,
    enabled: true, notificationIdentifier: null, lastFiredAt: null, suggested: false,
    createdAt: r.createdAt || new Date().toISOString(), updatedAt: r.createdAt || new Date().toISOString()
  }));

  data.sleepLogs = data.sleepLogs.map(s => withDefaults(s, {
    bedtime: null, wakeTime: null, calculatedDurationHours: null, timeToFallAsleepMinutes: null,
    awakenings: null, sleepQuality: null, morningEnergy: null, napDurationMinutes: null, napTime: null,
    caffeineCutoffTime: null, preBedRoutineCompleted: null, weekendRecoveryExtension: null, notes: ""
  }));

  data.hydrationLogs = data.hydrationLogs.map(h => withDefaults(h, {
    waterIntake: null, electrolytesUsed: null, saltIncluded: null, sweatLevel: null,
    pumpQuality: null, cramping: null, headache: null, notes: ""
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
      trackLengthMetres: null, calculatedDistanceMetres: null, weightPerHand: null,
      progressionStatus: null,
      createdAt: w.date || null, updatedAt: w.date || null
    }));
  });

  if (!data.profile) { data.profile = { ...DEFAULT_PROFILE }; changed = true; }
  else { data.profile = withDefaults(data.profile, DEFAULT_PROFILE); }

  if (!data.aiSettings) {
    data.aiSettings = { ...DEFAULT_AI_SETTINGS, dataCategoryPermissions: { ...DEFAULT_AI_SETTINGS.dataCategoryPermissions } };
    changed = true;
  } else {
    data.aiSettings = withDefaults(data.aiSettings, DEFAULT_AI_SETTINGS);
    data.aiSettings.dataCategoryPermissions = withDefaults(data.aiSettings.dataCategoryPermissions || {}, DEFAULT_AI_SETTINGS.dataCategoryPermissions);
  }

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

// ==================== IMPORT / MERGE SYSTEM ====================
// An uploaded backup is historical DATA — a "notebook" of past progress. The
// current app (this code: its schema, program template, exercise database and
// feature set) is always the source of truth ("the operating system"). An import
// can only ADD workouts/logs/history into the current app; it can never replace,
// downgrade or remove any current structure or feature. See importAndMergeData().

const COLLECTION_KEYS = [
  "checkins", "measurements", "workouts", "bodyweightLogs", "nutritionLogs", "recoveryLogs",
  "stimulantLogs", "supplementLogs", "mealLogs", "progressPhotos", "monthlyReviews", "motivationalVisuals",
  "sleepLogs", "hydrationLogs",
  "skinLogs", "hairLogs", "productExperiments", "appearanceCheckins",
  "aiConversationsPerformance", "aiConversationsAppearance", "aiConversationsShared", "aiSavedInsights",
  "foodTemplates", "preWorkoutLogs", "postWorkoutLogs", "interventions",
  "reviews", "savedMeals", "tasks"
  // "reminders" is deliberately excluded — per-device notification scheduling state,
  // the same reasoning as aiProposedChanges/aiAuditLog below.
];

function normalizeSetSignature(e) {
  return `${e?.name || ""}:${e?.set1Weight ?? ""}x${e?.set1Reps ?? ""}:${e?.set2Weight ?? ""}x${e?.set2Reps ?? ""}`;
}

/** id or legacyLocalId match — the baseline duplicate check shared by every simple collection. */
function detectDuplicateById(existingList, candidate) {
  if (!candidate) return null;
  if (candidate.id) { const m = existingList.find(x => x.id === candidate.id); if (m) return m; }
  if (candidate.legacyLocalId) { const m = existingList.find(x => x.legacyLocalId && x.legacyLocalId === candidate.legacyLocalId); if (m) return m; }
  return null;
}

/** Workouts additionally dedupe on date+day, and on exercise-name+set-data content, for backups re-exported from a different device whose ids don't line up. */
function detectDuplicateWorkout(existingList, candidate) {
  const byId = detectDuplicateById(existingList, candidate);
  if (byId) return byId;
  const day = candidate.day || candidate.programDay || candidate.sessionName || "";
  const byDateDay = existingList.find(w => w.date === candidate.date && (w.day || w.programDay || w.sessionName || "") === day);
  if (byDateDay) return byDateDay;
  const candidateSig = (candidate.exercises || []).map(normalizeSetSignature).sort().join("|");
  if (!candidateSig) return null;
  return existingList.find(w => (w.exercises || []).map(normalizeSetSignature).sort().join("|") === candidateSig) || null;
}

/** Meals additionally dedupe on date+time+name+calories, for the same reason. */
function detectDuplicateMeal(existingList, candidate) {
  const byId = detectDuplicateById(existingList, candidate);
  if (byId) return byId;
  const sig = (m) => `${m.date || ""}__${m.time || ""}__${(m.mealName || m.rawDescription || "").toLowerCase()}__${m.calories ?? ""}`;
  const candidateSig = sig(candidate);
  return existingList.find(m => sig(m) === candidateSig) || null;
}

/**
 * Generic merge: current always wins a field conflict (a stale imported record can
 * never overwrite a live one); imported-only records are ADDED, never used to
 * replace or drop a current-only record. A duplicate that turns out to add a field
 * current was missing counts as "enriched" rather than a plain skip.
 */
function mergeByIdGeneric(currentList, importedList, duplicateDetector) {
  const currentArr = Array.isArray(currentList) ? currentList : [];
  const importedArr = Array.isArray(importedList) ? importedList : [];
  const result = [...currentArr];
  let added = 0, skippedDuplicate = 0, enriched = 0;

  importedArr.forEach(item => {
    if (!item || typeof item !== "object") return;
    const existing = duplicateDetector(result, item);
    if (existing) {
      const before = Object.keys(existing).length;
      const filled = withDefaults(existing, item);
      if (Object.keys(filled).length > before) { Object.assign(existing, filled); enriched++; }
      else skippedDuplicate++;
      return;
    }
    result.push({ ...item, id: item.id || uid() });
    added++;
  });
  return { merged: result, added, skippedDuplicate, enriched };
}

/** Maps historic exercise names onto the CURRENT exercise database's id where possible; always keeps the original name, and marks an unmatched entry "legacy_unknown" rather than guessing. */
function mapLegacyExerciseNames(exercises, currentExercises) {
  const byName = new Map((currentExercises || []).map(e => [e.name.toLowerCase(), e.id]));
  const validIds = new Set((currentExercises || []).map(e => e.id));
  return (exercises || []).map(e => {
    if (e.exerciseId && validIds.has(e.exerciseId)) return e; // already a valid current exerciseId — leave untouched
    const matchedId = e.name ? byName.get(e.name.toLowerCase()) : null;
    // No match: mark unknown rather than silently keeping a stale/invalid id from the import.
    return { ...e, exerciseId: matchedId || "legacy_unknown" };
  });
}

function mergeWorkouts(current, imported, currentExercises) {
  const mapped = (imported || []).map(w => ({ ...w, exercises: mapLegacyExerciseNames(w.exercises, currentExercises) }));
  return mergeByIdGeneric(current, mapped, detectDuplicateWorkout);
}
function mergeMealLogs(current, imported) { return mergeByIdGeneric(current, imported, detectDuplicateMeal); }
function mergeRecoveryLogs(current, imported) { return mergeByIdGeneric(current, imported, detectDuplicateById); }
function mergeStimulantLogs(current, imported) { return mergeByIdGeneric(current, imported, detectDuplicateById); }
function mergeBodyweightLogs(current, imported) { return mergeByIdGeneric(current, imported, detectDuplicateById); }
function mergeMeasurements(current, imported) { return mergeByIdGeneric(current, imported, detectDuplicateById); }
function mergeProgressPhotos(current, imported) { return mergeByIdGeneric(current, imported, detectDuplicateById); }
function mergeCheckins(current, imported) { return mergeByIdGeneric(current, imported, detectDuplicateById); }
function mergeMonthlyReviews(current, imported) { return mergeByIdGeneric(current, imported, detectDuplicateById); }
function mergeMotivationalVisuals(current, imported) { return mergeByIdGeneric(current, imported, detectDuplicateById); }

function mergeLibraryState(currentArr, importedArr, cap) {
  const merged = [...new Set([...(currentArr || []), ...(importedArr || [])])];
  return cap ? merged.slice(0, cap) : merged;
}

/** PRs: the current goal always wins. A conflicting imported goal is never silently dropped — it's preserved on the record as a labelled legacy reference. */
function mergePRs(current, imported) {
  const currentArr = Array.isArray(current) ? [...current] : [];
  const importedArr = Array.isArray(imported) ? imported : [];
  let added = 0, legacyGoalsPreserved = 0;
  importedArr.forEach(p => {
    if (!p) return;
    const key = p.exerciseId || p.exerciseName;
    const existing = currentArr.find(c => (c.exerciseId || c.exerciseName) === key);
    if (existing) {
      if (p.goal && p.goal !== existing.goal && !existing.importedLegacyGoal) {
        existing.importedLegacyGoal = p.goal;
        legacyGoalsPreserved++;
      }
      return;
    }
    currentArr.push({ ...p, id: p.id || uid() });
    added++;
  });
  return { merged: currentArr, added, legacyGoalsPreserved };
}

/** Never lets an older/partial import remove a training day the current app's code defines (e.g. Day 6) — only ADDS entirely-missing days. Existing days, including Program Editor edits, are left untouched. */
function preserveCurrentProgramTemplate(current, imported) {
  const merged = { ...current };
  let daysAdded = 0;
  Object.entries(imported || {}).forEach(([day, exercises]) => {
    if (!(day in merged) && Array.isArray(exercises) && exercises.length) { merged[day] = exercises; daysAdded++; }
  });
  return { merged, daysAdded };
}

/** Never lets an older/partial import remove an exercise (or the form-guide fields already backfilled onto it) the current app's code defines — only ADDS entirely-missing exercises. */
function preserveCurrentExerciseDatabase(current, imported) {
  const byId = new Map((current || []).map(e => [e.id, e]));
  let added = 0;
  (imported || []).forEach(ex => {
    if (!ex || !ex.id) return;
    if (!byId.has(ex.id)) { byId.set(ex.id, ex); added++; }
  });
  return { merged: [...byId.values()], added };
}

function createPreImportBackup(current) {
  const key = `projectReacher_backup_pre_import_${Date.now()}`;
  try {
    localStorage.setItem(key, JSON.stringify(current));
    return key;
  } catch (err) {
    console.warn("[Project Reacher] Could not save pre-import safety backup (storage may be full).", err);
    return null;
  }
}

function rollbackImport(preImportState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preImportState));
  console.warn("[Project Reacher] Import failed — rolled back to the pre-import state.");
}

/**
 * Converts an imported blob's records into current-shape objects (every record
 * gets an id; workouts get their programDay/sessionName defaults) BEFORE it's
 * merged onto current — this is the "convert old data into the current schema"
 * step, kept separate from the merge itself so partially-shaped legacy records
 * never propagate their gaps into current.
 */
function migrateImportedDataToCurrentSchema(imported) {
  const migrated = { ...imported };
  COLLECTION_KEYS.concat(["checkins"]).forEach(key => {
    if (!Array.isArray(migrated[key])) return;
    migrated[key] = migrated[key].map(item => (item && !item.id) ? { id: uid(), ...item } : item);
  });
  if (Array.isArray(migrated.workouts)) {
    migrated.workouts = migrated.workouts.map(w => withDefaults(w, { programDay: w.day || null, sessionName: w.day || null }));
  }
  return migrated;
}

function generateImportSummary({ collectionResults, programDaysAdded, exercisesAdded, prResult, day6Preserved, activeDraftAction, errors }) {
  return {
    collections: collectionResults,
    programDaysAdded, exercisesAdded,
    prsAdded: prResult.added,
    prLegacyGoalsPreserved: prResult.legacyGoalsPreserved,
    day6Preserved, activeDraftAction,
    errors: errors || []
  };
}

/**
 * The adaptive-merge orchestrator. `imported` is treated purely as historical
 * progress data to fold into `current` — the current app's schema, program
 * template, exercise database and every other structural feature always wins.
 * Imported records can only ADD workouts/logs/history; nothing here can replace,
 * downgrade or remove anything the live app already has.
 */
export function importAndMergeData(importedRaw, currentState) {
  const imported = migrateImportedDataToCurrentSchema(importedRaw);
  const current = currentState;
  const merged = { ...current };
  const collectionResults = {};
  const record = (key, result) => {
    merged[key] = result.merged;
    collectionResults[key] = {
      foundInImport: Array.isArray(imported[key]) ? imported[key].length : 0,
      added: result.added, skippedDuplicate: result.skippedDuplicate || 0, enriched: result.enriched || 0
    };
  };

  record("checkins", mergeCheckins(current.checkins, imported.checkins));
  record("measurements", mergeMeasurements(current.measurements, imported.measurements));
  record("workouts", mergeWorkouts(current.workouts, imported.workouts, current.exercises));
  record("bodyweightLogs", mergeBodyweightLogs(current.bodyweightLogs, imported.bodyweightLogs));
  record("nutritionLogs", mergeByIdGeneric(current.nutritionLogs, imported.nutritionLogs, detectDuplicateById));
  record("recoveryLogs", mergeRecoveryLogs(current.recoveryLogs, imported.recoveryLogs));
  record("stimulantLogs", mergeStimulantLogs(current.stimulantLogs, imported.stimulantLogs));
  record("supplementLogs", mergeByIdGeneric(current.supplementLogs, imported.supplementLogs, detectDuplicateById));
  record("mealLogs", mergeMealLogs(current.mealLogs, imported.mealLogs));
  record("progressPhotos", mergeProgressPhotos(current.progressPhotos, imported.progressPhotos));
  record("monthlyReviews", mergeMonthlyReviews(current.monthlyReviews, imported.monthlyReviews));
  record("motivationalVisuals", mergeMotivationalVisuals(current.motivationalVisuals, imported.motivationalVisuals));
  record("sleepLogs", mergeByIdGeneric(current.sleepLogs, imported.sleepLogs, detectDuplicateById));
  record("hydrationLogs", mergeByIdGeneric(current.hydrationLogs, imported.hydrationLogs, detectDuplicateById));
  record("skinLogs", mergeByIdGeneric(current.skinLogs, imported.skinLogs, detectDuplicateById));
  record("hairLogs", mergeByIdGeneric(current.hairLogs, imported.hairLogs, detectDuplicateById));
  record("productExperiments", mergeByIdGeneric(current.productExperiments, imported.productExperiments, detectDuplicateById));
  record("appearanceCheckins", mergeByIdGeneric(current.appearanceCheckins, imported.appearanceCheckins, detectDuplicateById));
  record("aiConversationsPerformance", mergeByIdGeneric(current.aiConversationsPerformance, imported.aiConversationsPerformance, detectDuplicateById));
  record("aiConversationsAppearance", mergeByIdGeneric(current.aiConversationsAppearance, imported.aiConversationsAppearance, detectDuplicateById));
  record("aiConversationsShared", mergeByIdGeneric(current.aiConversationsShared, imported.aiConversationsShared, detectDuplicateById));
  record("aiSavedInsights", mergeByIdGeneric(current.aiSavedInsights, imported.aiSavedInsights, detectDuplicateById));
  record("foodTemplates", mergeByIdGeneric(current.foodTemplates, imported.foodTemplates, (list, c) => list.find(x => (x.name || "").toLowerCase() === (c.name || "").toLowerCase())));
  record("preWorkoutLogs", mergeByIdGeneric(current.preWorkoutLogs, imported.preWorkoutLogs, detectDuplicateById));
  record("postWorkoutLogs", mergeByIdGeneric(current.postWorkoutLogs, imported.postWorkoutLogs, detectDuplicateById));
  record("interventions", mergeByIdGeneric(current.interventions, imported.interventions, detectDuplicateById));
  record("reviews", mergeByIdGeneric(current.reviews, imported.reviews, detectDuplicateById));
  record("savedMeals", mergeByIdGeneric(current.savedMeals, imported.savedMeals, (list, c) => list.find(x => x.contentHash && x.contentHash === c.contentHash) || detectDuplicateById(list, c)));
  record("tasks", mergeByIdGeneric(current.tasks, imported.tasks, detectDuplicateById));
  // reminders deliberately not merged — never restore stale/old notification schedules from a backup.

  // aiSettings: current device's consent/permissions always win (consent must never be
  // silently granted by an import) — only additive/unset fields are backfilled from the import.
  merged.aiSettings = withDefaults(current.aiSettings || {}, imported.aiSettings || {});
  // aiProposedChanges / aiAuditLog are deliberately per-device working state, never imported.

  merged.profile = withDefaults(current.profile || {}, imported.profile || {});

  const programResult = preserveCurrentProgramTemplate(current.trainingProgram, imported.trainingProgram);
  merged.trainingProgram = programResult.merged;

  const exerciseResult = preserveCurrentExerciseDatabase(current.exercises, imported.exercises);
  merged.exercises = exerciseResult.merged;

  merged.supplements = mergeByIdGeneric(current.supplements, imported.supplements, (list, c) => list.find(x => x.supplementName === c.supplementName)).merged;
  const prResult = mergePRs(current.prs, imported.prs);
  merged.prs = prResult.merged;

  merged.libraryFavorites = mergeLibraryState(current.libraryFavorites, imported.libraryFavorites);
  merged.libraryRecentlyViewed = mergeLibraryState(current.libraryRecentlyViewed, imported.libraryRecentlyViewed, 8);

  merged.historical = (current.historical && current.historical.length) ? current.historical : (imported.historical || current.historical);

  // Active draft: never let an import silently discard in-progress unsaved workout
  // values. Default is always to keep the current draft; an imported draft is only
  // adopted when current has none at all.
  let activeDraftAction = "none";
  if (current.activeWorkoutDraft) {
    merged.activeWorkoutDraft = current.activeWorkoutDraft;
    activeDraftAction = "kept-current";
  } else if (imported.activeWorkoutDraft) {
    merged.activeWorkoutDraft = imported.activeWorkoutDraft;
    activeDraftAction = "restored-from-import";
  } else {
    merged.activeWorkoutDraft = null;
  }

  merged.schemaVersion = SCHEMA_VERSION;

  const summary = generateImportSummary({
    collectionResults, programDaysAdded: programResult.daysAdded, exercisesAdded: exerciseResult.added,
    prResult, day6Preserved: "Day 6 - Arm + Forearm + Delt Specialisation" in merged.trainingProgram,
    activeDraftAction, errors: []
  });

  return { merged, summary };
}

/**
 * Imports a backup file as historical data merged onto the current live app — the
 * uploaded file can only ADD workouts/logs/history; it never replaces the app's
 * schema, program template, exercise database or any other current feature.
 * Snapshots the pre-import state first and rolls back automatically if the merge
 * or save fails partway through, so a bad import never leaves the app half-changed.
 */
export function importData(jsonText) {
  const imported = JSON.parse(jsonText);
  if (typeof imported !== "object" || imported === null) throw new Error("Invalid backup file.");

  const current = getData();
  createPreImportBackup(current);

  try {
    const { merged, summary } = importAndMergeData(imported, current);
    saveData(merged);
    const data = migrateData();
    return { data, summary };
  } catch (err) {
    rollbackImport(current);
    throw new Error(`Import failed and was rolled back to your previous data: ${err.message}`);
  }
}

/**
 * Advanced/dangerous full restore: replaces the current app state with the
 * uploaded file verbatim. NEVER the default import path — only reachable through
 * an explicit, separately-confirmed UI action. Still snapshots the pre-restore
 * state first, and still runs migrateData() afterward so current-app repairs
 * (e.g. restoring Day 6 if the restored file predates it) still apply on top.
 */
export function fullRestoreFromBackup(jsonText) {
  const imported = JSON.parse(jsonText);
  if (typeof imported !== "object" || imported === null) throw new Error("Invalid backup file.");
  const current = getData();
  createPreImportBackup(current);
  try {
    saveData(imported);
    return migrateData();
  } catch (err) {
    rollbackImport(current);
    throw new Error(`Full restore failed and was rolled back to your previous data: ${err.message}`);
  }
}

export function deleteItem(collection, id) {
  const data = getData();
  data[collection] = (data[collection] || []).filter(item => item.id !== id);
  saveData(data);
  return data;
}
