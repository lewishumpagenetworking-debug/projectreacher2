// Split Versioning (Hypertrophy Intelligence Engine spec): named, swappable copies of the
// whole trainingProgram day-map. `data.trainingProgram` is always the "resolved active
// view" every existing consumer already reads (render-train.js, weeklyComplianceRate,
// hypertrophy-warnings.js, programme-evolution.js, etc.) — switching splits only replaces
// that view's contents. It never touches data.workouts/data.prs/data.exercises, all of
// which are keyed by exercise name/id rather than by day, so history/PRs/predicted loads/
// notes/progression graphs are completely unaffected by which split is currently active.
import { saveData, uid } from "./data.js";

export function allSplits(data) {
  return data.trainingSplits || [];
}

export function activeSplit(data) {
  return allSplits(data).find(s => s.id === data.activeSplitId) || allSplits(data)[0] || null;
}

/**
 * Writes the current `data.trainingProgram` back into the active split's stored `days`, so
 * edits made via the Program Editor aren't lost the next time the user switches away from
 * this split and back. Called once, after Program Editor edits are applied.
 */
export function syncActiveSplitDays(data) {
  const split = activeSplit(data);
  if (!split) return;
  split.days = structuredClone(data.trainingProgram);
  saveData(data);
}

/** New named split, defaulting to a copy of the currently active one so nothing starts blank. */
export function createSplit(data, name, { copyFromActive = true } = {}) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const source = copyFromActive ? (activeSplit(data)?.days || data.trainingProgram) : {};
  const split = { id: uid(), name: trimmed, days: structuredClone(source) };
  data.trainingSplits = [...allSplits(data), split];
  saveData(data);
  return split.id;
}

export function renameSplit(data, splitId, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return false;
  const split = allSplits(data).find(s => s.id === splitId);
  if (!split) return false;
  split.name = trimmed;
  saveData(data);
  return true;
}

/**
 * Switching splits only ever swaps which day-map `data.trainingProgram` currently resolves
 * to — the switch itself first syncs any in-progress edits on the OLD active split back into
 * its own stored `days` (so nothing is lost), then copies the NEW split's `days` into
 * `data.trainingProgram`. Nothing here touches workouts, PRs, or the exercise database.
 */
export function switchActiveSplit(data, splitId) {
  const target = allSplits(data).find(s => s.id === splitId);
  if (!target) return false;
  syncActiveSplitDays(data);
  data.activeSplitId = splitId;
  data.trainingProgram = structuredClone(target.days);
  // Split Selector UI (Aesthetic Protocol v2 Deterministic Training Rulebook directive,
  // Section 18) shows "last activated date" per split — stamped here, the one place a split
  // actually becomes active, so it never needs updating anywhere else.
  target.lastActivatedDate = new Date().toISOString();
  saveData(data);
  return true;
}

/**
 * Cannot delete the currently active split (switch away first) or the last remaining split
 * (there must always be at least one) — both are refused with a reason rather than silently
 * no-op'd, so the UI can explain why.
 */
export function deleteSplit(data, splitId) {
  const splits = allSplits(data);
  if (splits.length <= 1) return { ok: false, reason: "at-least-one-required" };
  if (data.activeSplitId === splitId) return { ok: false, reason: "cannot-delete-active" };
  const split = splits.find(s => s.id === splitId);
  if (!split) return { ok: false, reason: "not-found" };
  data.trainingSplits = splits.filter(s => s.id !== splitId);
  saveData(data);
  return { ok: true };
}
