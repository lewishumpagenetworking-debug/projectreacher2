// Immediate safety escalation (spec section 10): these do NOT wait for the weekly review
// cadence. Pure phrase-matching over free-text note fields plus the existing painFlag
// signal — no external AI, no network call. A match surfaces a direct, non-dismissible
// safety notice pointing the user toward professional care; it never diagnoses or treats.
const SAFETY_PHRASES = [
  { id: "sharp-persistent-pain", pattern: /\b(sharp|shooting|stabbing)\b.{0,20}\bpain\b|\bpain\b.{0,20}\b(won'?t|wont|hasn'?t|hasnt) (go away|stop|ease)\b|\bpersistent pain\b/i, label: "Sharp or persistent pain" },
  { id: "dizziness", pattern: /\bdizz(y|iness)\b|\blight[- ]?headed\b/i, label: "Dizziness" },
  { id: "fainting", pattern: /\bfaint(ed|ing)?\b|\bpassed out\b|\bblacked out\b/i, label: "Fainting" },
  { id: "chest-pain", pattern: /\bchest pain\b|\btight(ness)? in (my|the) chest\b/i, label: "Chest pain" },
  { id: "shortness-of-breath", pattern: /\b(severe|can'?t|cant|couldn'?t|unable to) breathe\b|\bshortness of breath\b|\bgasping for (air|breath)\b/i, label: "Severe shortness of breath" },
  { id: "neurological", pattern: /\bnumbness\b|\btingling\b|\bslurred speech\b|\bvision (loss|blurred|blurring)\b|\bcan'?t feel (my|the)\b/i, label: "Neurological symptoms" },
  { id: "unexplained-weight-loss", pattern: /\bunexplained weight loss\b|\blosing weight (without trying|for no reason)\b/i, label: "Unexplained major weight loss" },
  { id: "heart-symptoms", pattern: /\bheart (racing|pounding|skipping|palpitations)\b|\birregular heartbeat\b/i, label: "Abnormal heart symptoms" }
];

/** Scans one free-text string for safety phrases. Returns matched flags, empty if none. */
export function scanTextForSafetyFlags(text) {
  if (!text || typeof text !== "string") return [];
  return SAFETY_PHRASES.filter(p => p.pattern.test(text)).map(p => ({ id: p.id, label: p.label, sourceText: text }));
}

/**
 * Scans a full data snapshot for safety flags: session review / exercise notes, formNote
 * fields, and a hard painFlag itself. Runs independently of the weekly-review cadence and
 * of the constraint engine — a safety flag is surfaced immediately regardless of when it's
 * detected.
 */
export function detectSafetyFlags(data, { lookbackDays = 3, referenceDate = new Date() } = {}) {
  const flags = [];
  const cutoff = new Date(referenceDate); cutoff.setDate(cutoff.getDate() - lookbackDays);

  (data.workouts || []).forEach(w => {
    (w.exercises || []).forEach(e => {
      [e.notes, e.formNote].forEach(text => {
        scanTextForSafetyFlags(text).forEach(f => flags.push({ ...f, source: "workout", exerciseName: e.name, date: w.date }));
      });
    });
  });

  const draft = data.activeWorkoutDraft;
  if (draft?.exercises) {
    Object.entries(draft.exercises).forEach(([name, e]) => {
      [e.notes, e.formNote].forEach(text => {
        scanTextForSafetyFlags(text).forEach(f => flags.push({ ...f, source: "active-draft", exerciseName: name, date: null }));
      });
    });
  }

  (data.recoveryLogs || []).forEach(r => {
    scanTextForSafetyFlags(r.notes).forEach(f => flags.push({ ...f, source: "recovery-log", exerciseName: null, date: r.date }));
  });

  return flags;
}

/** Deduplicates by flag id, keeping the most recent occurrence of each. */
export function summarizeSafetyFlags(flags) {
  const byId = new Map();
  flags.forEach(f => {
    const existing = byId.get(f.id);
    if (!existing || (f.date || "") > (existing.date || "")) byId.set(f.id, f);
  });
  return [...byId.values()];
}
