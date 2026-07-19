// Generic append-only change-history recorder (Peptide Recovery Tracking, spec section
// 36). A history entry is never edited or deleted once written — this is the audit trail
// itself, so it has to stay trustworthy even if the record it describes changes again later.
import { uid } from "./data.js";

/** Records one field-level change. Silently no-ops if the value didn't actually change (no history for a no-op save). */
export function recordChange(data, { entityType, entityId, field, previousValue, newValue, reason = "" }) {
  if (previousValue === newValue) return null;
  const entry = {
    id: uid(), entityType, entityId, field,
    previousValue: previousValue ?? null, newValue: newValue ?? null,
    reason, changedAt: new Date().toISOString()
  };
  data.changeHistory.push(entry);
  return entry;
}

/** Compares an old and new object shallowly and records one entry per changed field — the common case for "save this form" handlers. */
export function recordFieldChanges(data, entityType, entityId, before, after, reason = "") {
  Object.keys(after).forEach(field => {
    if (before[field] !== after[field]) {
      recordChange(data, { entityType, entityId, field, previousValue: before[field], newValue: after[field], reason });
    }
  });
}

export function getHistoryFor(data, entityType, entityId) {
  return (data.changeHistory || [])
    .filter(h => h.entityType === entityType && h.entityId === entityId)
    .slice()
    .sort((a, b) => (b.changedAt || "").localeCompare(a.changedAt || ""));
}
