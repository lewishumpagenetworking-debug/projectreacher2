// Data layer: localStorage persistence, versioned schema, non-destructive migration.
import { DEFAULT_TRAINING_PROGRAM, EXERCISE_DATABASE, DEFAULT_SUPPLEMENTS, DEFAULT_PRS } from "./program.js";
import { exportAllImagesAsBase64, importImagesFromBase64Map } from "./image-store.js";
import { exportAllBloodworkFilesAsBase64, importBloodworkFilesFromBase64Map } from "./bloodwork-files.js";
import { DEFAULT_SESSION_NUTRITION } from "./session-nutrition.js";

export const STORAGE_KEY = "projectReacher";
export const SCHEMA_VERSION = 2;

/** Session Review defaults (spec section 21) — every field optional, never guessed. */
export const DEFAULT_SESSION_REVIEW = {
  performanceVsExpected: null, mainLimitingFactor: null,
  energy: null, muscularFatigue: null, cardioFatigue: null,
  gripLimitation: null, painOrDiscomfort: null, painNote: "",
  techniqueQuality: null, focus: null,
  preWorkoutNutritionMet: null, postWorkoutNutritionMet: null, hydrationMet: null,
  restPeriodsFollowed: null, exerciseSetupChanged: null, setupChangeNote: "",
  notes: "", reviewedAt: null
};

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
    sessionNutrition: structuredClone(DEFAULT_SESSION_NUTRITION),
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
    // Gym App spec Part 2 — which equipment variant is chosen for today's session, per
    // exercise slot. Deliberately kept separate from activeWorkoutDraft (the numeric
    // set/rep draft) so it can never interact with that draft's conflict/discard logic —
    // selecting a variant should never risk losing in-progress logged numbers or vice versa.
    todaysVariantSelections: { day: null, selections: {} },
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
    tasks: [],
    images: [],
    imageCategories: [],
    goals: [],
    milestones: [],
    constraintCases: [],
    // Custom Session Builder (contingency training feature) — session *templates* the
    // user assembles from copied/added exercises, scheduled to a date, optionally linked
    // to an externalConstraintLogs entry. Logging one produces a normal data.workouts
    // entry (see saveWorkout in render-train.js) — these records are just the plan.
    customSessions: [],
    externalConstraintLogs: [],
    // Peptide Recovery Tracking (Phase 1: cycle records + administration schedule/log —
    // a purely user-entered documentation layer, never a dosing/protocol recommender).
    // Product/vial/equipment detail, bloodwork, correlation engine, sources/references and
    // change history are later phases layered onto these same three collections.
    peptideRecords: [],
    administrationSchedules: [],
    administrationLogs: [],
    // Peptide Recovery Tracking (Phase 2: bloodwork). File bytes for a report live in
    // IndexedDB (js/bloodwork-files.js); every marker value here is either typed by the
    // user directly or manually transcribed from an uploaded file — this app never runs
    // OCR/extraction on the file, so userConfirmed is always true by construction.
    bloodworkReports: [],
    bloodworkMarkers: [],
    bloodworkReminders: [],
    // Peptide Recovery Tracking (Phase 4: product/vial/equipment detail, sources &
    // references, change history). All still purely user-entered — vialRecords/
    // equipmentProfiles never calculate or suggest a dose/volume/syringe conversion.
    peptideSources: [],
    vialRecords: [],
    equipmentProfiles: [],
    referenceSources: [],
    changeHistory: []
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
   "reviews", "reminders", "savedMeals", "tasks",
   "images", "imageCategories", "goals", "milestones", "constraintCases",
   "customSessions", "externalConstraintLogs",
   "peptideRecords", "administrationSchedules", "administrationLogs",
   "bloodworkReports", "bloodworkMarkers", "bloodworkReminders",
   "peptideSources", "vialRecords", "equipmentProfiles", "referenceSources", "changeHistory"].forEach(key => {
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
    savedMealId: null, servingMultiplier: 1,
    // Mandatory Raw Entry Acceptance — the exact value the user typed for calories,
    // kept separate from any macro-derived reference figure, and never overwritten by
    // it. `calories` itself already IS the entered value in this app (nothing here
    // ever substitutes a database/AI estimate after the user has typed their own), so
    // `enteredCalories` is stored as an explicit, unambiguous alias for anything that
    // specifically needs "what the user typed" rather than "the log's calorie field".
    enteredCalories: m.calories ?? null, calculatedCaloriesFromMacros: null,
    sourceType: "custom", isManuallyEdited: m.userCorrected ?? false,
    originalNutrition: null, loggedNutrition: null, editHistory: []
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
    createdAt: r.createdAt || new Date().toISOString(), approvedAt: null, appliedAt: null,
    // Weekly constraint-diagnosis output (spec sections 11-12) lives on the same review
    // record rather than a third parallel review system — null until a Constraint Review
    // is actually completed for this period.
    constraintAnalysis: null
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

  // Image metadata only — the actual image bytes live in IndexedDB (js/image-store.js),
  // addressed by this record's own id. relatedEntityType/relatedEntityId lets one image
  // system serve goals, milestones, and the (formerly cloud-URL) motivational visual
  // placements, the same relatedEntityType/relatedEntityId pattern already used for tasks/reminders.
  data.images = data.images.map(i => withDefaults(i, {
    category: "custom", relatedEntityType: null, relatedEntityId: null,
    caption: "", order: 0, status: "active", width: null, height: null,
    uploadedAt: i.createdAt || new Date().toISOString()
  }));

  data.imageCategories = data.imageCategories.map(c => withDefaults(c, {
    label: c.id || "Custom", createdAt: c.createdAt || new Date().toISOString()
  }));

  data.goals = data.goals.map(g => withDefaults(g, {
    title: "", category: "custom", description: "", status: "active",
    createdAt: g.createdAt || new Date().toISOString(), updatedAt: g.createdAt || new Date().toISOString()
  }));

  data.milestones = data.milestones.map(m => withDefaults(m, {
    title: "", category: "personal", description: "", date: m.createdAt ? m.createdAt.slice(0, 10) : null,
    relatedGoalId: null, createdAt: m.createdAt || new Date().toISOString()
  }));

  data.customSessions = data.customSessions.map(cs => withDefaults(cs, {
    name: "Custom Session", exercises: [], sourceSessions: [], scheduledDate: null,
    constraintReason: "", externalConstraintLogId: null,
    createdAt: cs.createdAt || new Date().toISOString(), updatedAt: cs.createdAt || new Date().toISOString()
  }));

  data.externalConstraintLogs = data.externalConstraintLogs.map(l => withDefaults(l, {
    date: l.createdAt ? l.createdAt.slice(0, 10) : new Date().toLocaleDateString("en-CA"),
    reason: "", createdAt: l.createdAt || new Date().toISOString()
  }));

  // Peptide Recovery Tracking — every field is user-entered; the app never infers, guesses,
  // or defaults a dose/schedule/status from the peptide name. `status` is the user's last
  // manual state change; display status is derived read-only from it plus the dates below
  // (see js/peptides.js) and never written back here.
  data.peptideRecords = data.peptideRecords.map(p => withDefaults(p, {
    name: "", abbreviation: "", status: "draft", purposeNote: "",
    startDate: null, plannedEndDate: null, actualEndDate: null,
    recoveryStartDate: null, recoveryEndDate: null, recoveryNotes: "",
    pauseDate: null, resumeDate: null, reasonForPause: "", reasonForEarlyCompletion: "",
    cycleLabel: "", cycleNotes: "", notes: "", dashboardHidden: false,
    createdAt: p.createdAt || new Date().toISOString(), updatedAt: p.createdAt || new Date().toISOString()
  }));

  data.administrationSchedules = data.administrationSchedules.map(s => withDefaults(s, {
    peptideId: null, name: "", activeFrom: null, activeUntil: null, weekdays: [0, 1, 2, 3, 4, 5, 6],
    plannedTime: null, timeCategory: null, mealRelationship: null, workoutRelationship: null,
    plannedAmount: null, plannedAmountUnit: "mcg", reminderEnabled: false, notes: "",
    createdAt: s.createdAt || new Date().toISOString(), updatedAt: s.createdAt || new Date().toISOString()
  }));

  data.administrationLogs = data.administrationLogs.map(l => withDefaults(l, {
    peptideId: null, scheduleId: null, date: null, exactTime: null, status: "taken",
    amount: null, amountUnit: "mcg", timeCategory: null,
    mealRelationship: null, mealName: "", minutesFromMeal: null,
    workoutRelationship: null, workoutId: null, minutesFromWorkout: null,
    bodyweight: null, notes: "",
    // Phase 4: equipment/vial detail — every field optional, user-entered only.
    vialId: null, equipmentProfileId: null, needleLength: "", needleGauge: "", administrationSite: "",
    createdAt: l.createdAt || new Date().toISOString(), updatedAt: l.createdAt || new Date().toISOString()
  }));

  // Product & Source Tracking (Phase 4, spec section 11) — the app never validates or
  // endorses a source, purely a traceability record.
  data.peptideSources = data.peptideSources.map(s => withDefaults(s, {
    peptideId: null, supplierName: "", manufacturer: "", productUrl: "", purchaseDate: null,
    orderReference: "", batchNumber: "", lotNumber: "", expiryDate: null, countryOfOrigin: "",
    storageLocation: "", storageTemperatureText: "", openedDate: null, discardedDate: null, notes: "",
    createdAt: s.createdAt || new Date().toISOString(), updatedAt: s.createdAt || new Date().toISOString()
  }));

  // Vial & Solution Record + User-Entered Concentration Record (Phase 4, spec sections
  // 12-13). The app never recommends a solution, volume, dose, or diluent — every value
  // above is a neutral record of what the user entered themselves. `reconstitutionVersions`
  // (Peptides Node master spec section 6) is the append-only audit trail for the app's own
  // arithmetic (concentration/volume/syringe-marking) run over those user-entered values —
  // see js/peptide-reconstitution.js. Never overwritten, only ever appended to.
  data.vialRecords = data.vialRecords.map(v => withDefaults(v, {
    peptideId: null, label: "", sequenceNumber: null, statedAmount: null, statedAmountUnit: "mcg",
    numberOfVials: null, status: "unopened", openedDate: null, discardedDate: null,
    solutionType: "", solutionBrand: "", solutionVolume: null, solutionVolumeUnit: "mL",
    preparationDate: null, preparedBy: "", preparationNotes: "", storageNotes: "",
    solutionExpiryOrDiscardDate: null,
    userEnteredConcentration: null, concentrationUnit: "", userEnteredAmountPerSyringeUnit: null,
    concentrationNotes: "", concentrationDateEntered: null, notes: "",
    reconstitutionVersions: [],
    createdAt: v.createdAt || new Date().toISOString(), updatedAt: v.createdAt || new Date().toISOString()
  }));

  // Reusable Equipment Profiles (Phase 4, spec section 14) — the app never recommends
  // needle length/gauge/site/technique, purely a record of what the user already uses.
  data.equipmentProfiles = data.equipmentProfiles.map(e => withDefaults(e, {
    name: "", syringeType: "", syringeCapacity: "", syringeUnitScale: "",
    needleLength: "", needleGauge: "", needleType: "", brand: "", source: "", notes: "",
    createdAt: e.createdAt || new Date().toISOString()
  }));

  // Sources & Reference Library (Phase 4, spec sections 33-34) — external reference
  // material only; never automatically populates a peptide's own protocol fields.
  data.referenceSources = data.referenceSources.map(r => withDefaults(r, {
    peptideId: null, sourceType: "other", creator: "", title: "", publicationDate: null,
    url: "", timestamp: "", dateAccessed: null, quotation: "", summary: "", notes: "",
    createdAt: r.createdAt || new Date().toISOString()
  }));

  // Change History (Phase 4, spec section 36) — append-only audit trail. Entries are
  // never edited or deleted by the app itself once written.
  data.changeHistory = data.changeHistory.map(h => withDefaults(h, {
    entityType: "", entityId: "", field: "", previousValue: null, newValue: null,
    reason: "", changedAt: h.changedAt || new Date().toISOString()
  }));

  // Bloodwork (Phase 2) — the user decides when/whether to test; the app never imposes
  // a testing interval (spec section 21).
  data.bloodworkReports = data.bloodworkReports.map(r => withDefaults(r, {
    testDate: null, title: "", laboratoryName: "", orderingClinician: "",
    fastingStatus: null, collectionTime: null, notes: "",
    linkedPeptideIds: [], linkedCyclePhase: null,
    fileAttachmentId: null, fileName: "", fileType: "", fileSize: null,
    createdAt: r.createdAt || new Date().toISOString(), updatedAt: r.createdAt || new Date().toISOString()
  }));

  data.bloodworkMarkers = data.bloodworkMarkers.map(m => withDefaults(m, {
    reportId: null, category: "", markerName: "", result: null, unit: "",
    referenceLow: null, referenceHigh: null, laboratoryFlag: "",
    userConfirmed: true, notes: "",
    createdAt: m.createdAt || new Date().toISOString()
  }));

  data.bloodworkReminders = data.bloodworkReminders.map(r => withDefaults(r, {
    reminderDate: null, recurrence: "none", recurrenceN: null, notes: "",
    peptideId: null, linkedCyclePhase: null,
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
    programDay: w.day || null, sessionName: w.day || null,
    // Timing/snapshot fields only exist on workouts saved after this feature shipped —
    // historical workouts stay null here and resolve their nutrition guidance dynamically
    // from the current programme-day config instead (see session-nutrition.js), never
    // retroactively backfilled with a guessed time.
    startedAt: null, completedAt: null, sessionNutritionSnapshot: null,
    // Session Review (spec section 21) — every field optional/null until the user (or a
    // later post-hoc completion from Workout History) actually fills it in. Never guessed
    // or backfilled from other data.
    sessionReview: withDefaults(w.sessionReview, DEFAULT_SESSION_REVIEW),
    // Snapshots captured only for workouts saved after the constraint-engine/task-list
    // system shipped (spec section 26) — older workouts stay null and are simply excluded
    // from historical-snapshot display, never backfilled with a guessed reconstruction.
    activeInterventionSnapshot: null, taskCompletionSnapshot: null, engineVersion: w.engineVersion || null,
    // Custom Session Builder (spec: contingency training feature) — additive fields only.
    // Older/normal workouts stay false/null, i.e. "an ordinary programmed session".
    isCustomSession: false, customSessionId: null, sourceSessions: [], constraintReason: null
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
  if (!data.todaysVariantSelections || typeof data.todaysVariantSelections !== "object") {
    data.todaysVariantSelections = { day: null, selections: {} };
    changed = true;
  }

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

  // Session nutrition: same additive-restore pattern as the training program above.
  // A day the user has already customised (or already has, canonical or otherwise) is
  // never touched; only entirely-missing days (older data saved before this feature, or
  // a newly-introduced programme day) get the canonical default.
  if (!data.sessionNutrition) { data.sessionNutrition = {}; changed = true; }
  Object.entries(DEFAULT_SESSION_NUTRITION).forEach(([day, config]) => {
    if (!(day in data.sessionNutrition)) {
      data.sessionNutrition[day] = structuredClone(config);
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

/**
 * Exports the full app state as one JSON file. Bundles every stored image (from
 * IndexedDB) into the same file as base64 under __images, so a single backup file
 * still captures everything — IndexedDB is only the day-to-day storage engine, not
 * a second place backups have to separately account for. If image bundling fails for
 * any reason, the export still proceeds with metadata only rather than failing outright.
 */
export async function exportData() {
  const data = getData();
  let images = {};
  try {
    images = await exportAllImagesAsBase64();
  } catch (err) {
    console.warn("[Project Reacher] Could not bundle images into this export.", err);
  }
  let bloodworkFiles = {};
  try {
    bloodworkFiles = await exportAllBloodworkFilesAsBase64();
  } catch (err) {
    console.warn("[Project Reacher] Could not bundle bloodwork files into this export.", err);
  }
  const payload = { ...data, __images: images, __bloodworkFiles: bloodworkFiles };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
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
  "reviews", "savedMeals", "tasks",
  "images", "imageCategories", "goals", "milestones", "constraintCases",
  "customSessions", "externalConstraintLogs",
  "peptideRecords", "administrationSchedules", "administrationLogs",
  "bloodworkReports", "bloodworkMarkers", "bloodworkReminders",
  "peptideSources", "vialRecords", "equipmentProfiles", "referenceSources", "changeHistory"
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

/**
 * Session nutrition merge priority (per spec): (1) the current device's user-customised
 * value for a day always wins and is never touched, (2) a day missing locally is filled
 * from the imported file if it has a valid config for that day, (3) anything still
 * missing after that is filled from the canonical day-specific defaults. Safe fallback
 * values are a runtime-only concern (see getSessionNutritionForDay) — never persisted.
 */
function mergeSessionNutrition(current, imported) {
  const merged = { ...(current || {}) };
  let daysAdded = 0, daysFromImport = 0, daysFromCanonical = 0;
  const allDays = new Set([...Object.keys(DEFAULT_SESSION_NUTRITION), ...Object.keys(imported || {}), ...Object.keys(current || {})]);
  allDays.forEach(day => {
    if (day in merged) return;
    if (imported && imported[day] && typeof imported[day] === "object") {
      merged[day] = imported[day]; daysAdded++; daysFromImport++; return;
    }
    if (DEFAULT_SESSION_NUTRITION[day]) {
      merged[day] = structuredClone(DEFAULT_SESSION_NUTRITION[day]); daysAdded++; daysFromCanonical++;
    }
  });
  return { merged, daysAdded, daysFromImport, daysFromCanonical };
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

function generateImportSummary({ collectionResults, programDaysAdded, exercisesAdded, sessionNutritionDaysAdded, prResult, day6Preserved, activeDraftAction, errors }) {
  return {
    collections: collectionResults,
    programDaysAdded, exercisesAdded, sessionNutritionDaysAdded,
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
  record("images", mergeByIdGeneric(current.images, imported.images, detectDuplicateById));
  record("imageCategories", mergeByIdGeneric(current.imageCategories, imported.imageCategories,
    (list, c) => detectDuplicateById(list, c) || list.find(x => (x.label || "").toLowerCase() === (c.label || "").toLowerCase())));
  record("goals", mergeByIdGeneric(current.goals, imported.goals, detectDuplicateById));
  record("milestones", mergeByIdGeneric(current.milestones, imported.milestones, detectDuplicateById));
  record("constraintCases", mergeByIdGeneric(current.constraintCases, imported.constraintCases, detectDuplicateById));
  record("customSessions", mergeByIdGeneric(current.customSessions, imported.customSessions, detectDuplicateById));
  record("externalConstraintLogs", mergeByIdGeneric(current.externalConstraintLogs, imported.externalConstraintLogs, detectDuplicateById));
  record("peptideRecords", mergeByIdGeneric(current.peptideRecords, imported.peptideRecords, detectDuplicateById));
  record("administrationSchedules", mergeByIdGeneric(current.administrationSchedules, imported.administrationSchedules, detectDuplicateById));
  record("administrationLogs", mergeByIdGeneric(current.administrationLogs, imported.administrationLogs, detectDuplicateById));
  record("bloodworkReports", mergeByIdGeneric(current.bloodworkReports, imported.bloodworkReports, detectDuplicateById));
  record("bloodworkMarkers", mergeByIdGeneric(current.bloodworkMarkers, imported.bloodworkMarkers, detectDuplicateById));
  record("bloodworkReminders", mergeByIdGeneric(current.bloodworkReminders, imported.bloodworkReminders, detectDuplicateById));
  record("peptideSources", mergeByIdGeneric(current.peptideSources, imported.peptideSources, detectDuplicateById));
  record("vialRecords", mergeByIdGeneric(current.vialRecords, imported.vialRecords, detectDuplicateById));
  record("equipmentProfiles", mergeByIdGeneric(current.equipmentProfiles, imported.equipmentProfiles, detectDuplicateById));
  record("referenceSources", mergeByIdGeneric(current.referenceSources, imported.referenceSources, detectDuplicateById));
  record("changeHistory", mergeByIdGeneric(current.changeHistory, imported.changeHistory, detectDuplicateById));
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

  const sessionNutritionResult = mergeSessionNutrition(current.sessionNutrition, imported.sessionNutrition);
  merged.sessionNutrition = sessionNutritionResult.merged;

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

  // Same rule as activeWorkoutDraft above — this is today's in-progress variant choice,
  // not historical data, so the current device's selection always wins over an import.
  merged.todaysVariantSelections = (current.todaysVariantSelections && current.todaysVariantSelections.day)
    ? current.todaysVariantSelections
    : (imported.todaysVariantSelections || { day: null, selections: {} });

  merged.schemaVersion = SCHEMA_VERSION;

  const summary = generateImportSummary({
    collectionResults, programDaysAdded: programResult.daysAdded, exercisesAdded: exerciseResult.added,
    sessionNutritionDaysAdded: sessionNutritionResult.daysAdded,
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
export async function importData(jsonText) {
  const imported = JSON.parse(jsonText);
  if (typeof imported !== "object" || imported === null) throw new Error("Invalid backup file.");

  const current = getData();
  createPreImportBackup(current);

  try {
    const { merged, summary } = importAndMergeData(imported, current);
    saveData(merged);
    const data = migrateData();
    if (imported.__images) {
      try { await importImagesFromBase64Map(imported.__images); }
      catch (err) { console.warn("[Project Reacher] Some images from this backup could not be restored.", err); }
    }
    if (imported.__bloodworkFiles) {
      try { await importBloodworkFilesFromBase64Map(imported.__bloodworkFiles); }
      catch (err) { console.warn("[Project Reacher] Some bloodwork files from this backup could not be restored.", err); }
    }
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
export async function fullRestoreFromBackup(jsonText) {
  const imported = JSON.parse(jsonText);
  if (typeof imported !== "object" || imported === null) throw new Error("Invalid backup file.");
  const current = getData();
  createPreImportBackup(current);
  const { __images: importedImages, __bloodworkFiles: importedBloodworkFiles, ...importedWithoutImages } = imported;
  try {
    saveData(importedWithoutImages);
    const data = migrateData();
    if (importedImages) {
      try { await importImagesFromBase64Map(importedImages); }
      catch (err) { console.warn("[Project Reacher] Some images from this backup could not be restored.", err); }
    }
    if (importedBloodworkFiles) {
      try { await importBloodworkFilesFromBase64Map(importedBloodworkFiles); }
      catch (err) { console.warn("[Project Reacher] Some bloodwork files from this backup could not be restored.", err); }
    }
    return data;
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
