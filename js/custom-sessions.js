// Custom Session Builder (contingency training feature): pure data/CRUD helpers for
// data.customSessions[] and data.externalConstraintLogs[]. A custom session is a
// *template* — an ordered list of exercise references in the exact same shape as a
// data.trainingProgram[day] entry ({id, name, repRange, note}) plus a couple of
// builder-only fields (localId for stable reorder/remove, sourceSession for "which
// programmed session did this come from, if any"). It never creates a new exercise
// record — every entry's `name` must match an existing data.exercises record, so all
// history/progression/volume tracking (which is name-keyed, see calculations.js) picks
// it up automatically once it's logged as a normal data.workouts entry.
import { getData, saveData, uid } from "./data.js";

export const CUSTOM_DAY_PREFIX = "custom:";

export function isCustomSessionDay(day) {
  return typeof day === "string" && day.startsWith(CUSTOM_DAY_PREFIX);
}

export function customSessionIdFromDay(day) {
  return isCustomSessionDay(day) ? day.slice(CUSTOM_DAY_PREFIX.length) : null;
}

export function customSessionDayKey(customSessionId) {
  return `${CUSTOM_DAY_PREFIX}${customSessionId}`;
}

/** The 12 body-area browsing categories from the spec — a coarser, user-facing grouping
 * than the 20-bucket MUSCLE_GROUPS volume-tracker taxonomy in program.js (that one stays
 * untouched; this is purely a browsing convenience layer on top of it). */
export const BODY_AREAS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms",
  "Quadriceps", "Hamstrings", "Glutes", "Calves", "Core", "Full Body"
];

const PRIMARY_MUSCLE_TO_BODY_AREA = {
  "chest": "Chest", "upper chest": "Chest",
  "lats": "Back", "back thickness": "Back",
  "shoulders": "Shoulders", "side delts": "Shoulders", "rear delts": "Shoulders", "traps": "Shoulders", "neck": "Shoulders",
  "biceps": "Biceps",
  "triceps": "Triceps", "triceps (long head)": "Triceps",
  "forearms": "Forearms", "forearm flexors": "Forearms", "forearm extensors": "Forearms",
  "quads": "Quadriceps",
  "hamstrings": "Hamstrings",
  "glutes": "Glutes",
  "calves": "Calves",
  "core": "Core"
};

/** Maps an exercise database record onto one of the 12 spec body-area buckets. */
export function bodyAreaForExercise(exerciseDef) {
  if (!exerciseDef) return "Full Body";
  if (exerciseDef.movementPattern === "carry") return "Full Body";
  return PRIMARY_MUSCLE_TO_BODY_AREA[exerciseDef.primaryMuscle] || "Full Body";
}

/** Active exercises in a given body area, for the "Browse by Body Area" picker. */
export function exercisesByBodyArea(data, bodyArea) {
  return (data.exercises || []).filter(e => e.active !== false && bodyAreaForExercise(e) === bodyArea);
}

/** A programmed session's exercise list, for the "Browse by Existing Session" picker — same list renderWorkoutForm uses for a real program day. */
export function exercisesForProgramDay(data, day) {
  return data.trainingProgram[day] || [];
}

function toSessionExerciseEntry(programEntry, sourceSession) {
  return {
    localId: uid(),
    id: programEntry.id || null,
    name: programEntry.name,
    repRange: programEntry.repRange || "",
    note: programEntry.note || "",
    sourceSession: sourceSession || null
  };
}

/** "Copy Existing Session": every exercise from `day`, in its original order, tagged with sourceSession. */
export function copySessionExercises(data, day) {
  return exercisesForProgramDay(data, day).map(x => toSessionExerciseEntry(x, day));
}

/** "Add Exercise" (either browsing route): a single exercise, optionally tagged with the session it was browsed from. */
export function buildExerciseEntry(exerciseDef, sourceSession = null) {
  return toSessionExerciseEntry({ id: exerciseDef.id, name: exerciseDef.name, repRange: exerciseDef.repRangeMin && exerciseDef.repRangeMax ? `${exerciseDef.repRangeMin}-${exerciseDef.repRangeMax}` : "", note: exerciseDef.notes || "" }, sourceSession);
}

function recomputeSourceSessions(exercises) {
  return [...new Set(exercises.map(e => e.sourceSession).filter(Boolean))];
}

export function getCustomSession(data, id) {
  return (data.customSessions || []).find(cs => cs.id === id) || null;
}

/** Creates a new custom session record. `exercises` should already be an array of entries from copySessionExercises/buildExerciseEntry. Returns the new record's id. */
export function createCustomSession(data, { name, exercises = [], scheduledDate = null, constraintReason = "", externalConstraintLogId = null }) {
  const now = new Date().toISOString();
  const record = {
    id: uid(),
    name: (name || "").trim() || "Custom Session",
    exercises,
    sourceSessions: recomputeSourceSessions(exercises),
    scheduledDate: scheduledDate || null,
    constraintReason: constraintReason || "",
    externalConstraintLogId: externalConstraintLogId || null,
    createdAt: now, updatedAt: now
  };
  data.customSessions.push(record);
  saveData(data);
  return record.id;
}

export function updateCustomSession(data, id, patch) {
  const record = getCustomSession(data, id);
  if (!record) return null;
  Object.assign(record, patch, { updatedAt: new Date().toISOString() });
  if (patch.exercises) record.sourceSessions = recomputeSourceSessions(record.exercises);
  saveData(data);
  return record;
}

export function deleteCustomSession(data, id) {
  data.customSessions = (data.customSessions || []).filter(cs => cs.id !== id);
  saveData(data);
}

export function reorderCustomSessionExercises(exercises, orderedLocalIds) {
  const byId = new Map(exercises.map(e => [e.localId, e]));
  return orderedLocalIds.map(id => byId.get(id)).filter(Boolean);
}

/** External Constraint Log: a reusable "reason this training day was disrupted" record, so
 * one reason (e.g. "gym was closed Saturday") can be linked from more than one custom
 * session (e.g. both the Saturday and Sunday halves of a split session). */
export function createExternalConstraintLog(data, { date, reason }) {
  const record = { id: uid(), date: date || new Date().toLocaleDateString("en-CA"), reason: (reason || "").trim(), createdAt: new Date().toISOString() };
  data.externalConstraintLogs.push(record);
  saveData(data);
  return record.id;
}

export function getExternalConstraintLog(data, id) {
  return (data.externalConstraintLogs || []).find(l => l.id === id) || null;
}
