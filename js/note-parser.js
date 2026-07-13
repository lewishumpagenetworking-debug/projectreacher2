// Local note/phrase parser (spec section 22): a lightweight phrase dictionary that maps
// session free-text notes to structured signal categories, with synonym support, negation
// handling and confidence weighting. No external AI, no network call — pure pattern
// matching over the text the user already typed.
const NEGATION_WORDS = /\b(not|no|n['o]t|never|isn'?t|wasn'?t|didn'?t|doesn'?t|without|hardly)\b/i;

export const NOTE_SIGNAL_CATEGORIES = {
  GRIP_LIMITATION: "grip-limitation",
  TARGET_MUSCLE_EXECUTION: "target-muscle-execution",
  TECHNIQUE_OR_SELECTION_ISSUE: "technique-or-selection-issue",
  READINESS_OR_NUTRITION_ISSUE: "readiness-or-nutrition-issue",
  SLEEP_DISRUPTION: "sleep-disruption",
  EQUIPMENT_INCONSISTENCY: "equipment-inconsistency",
  INADEQUATE_REST: "inadequate-rest",
  PRE_WORKOUT_DIGESTION_ISSUE: "pre-workout-digestion-issue",
  PAIN_FLAG: "pain-flag",
  EFFORT_BELOW_TARGET: "effort-below-target",
  TECHNICAL_DEGRADATION: "technical-degradation",
  NUTRITION_DATA_INCOMPLETENESS: "nutrition-data-incompleteness"
};

// Each pattern carries checkNegation: false when the trigger phrase's own wording already
// IS the negation (e.g. "could not feel", "no energy", "didn't sleep") — running the
// negation-word scan across a match that legitimately contains "not"/"no"/"didn't" as part
// of its own meaning would incorrectly self-suppress. checkNegation: true (the default) is
// for positive-form phrases where an external negation nearby should flip the meaning
// (e.g. "grip was NOT an issue").
function P(pattern, checkNegation = true) { return { pattern, checkNegation }; }

const PHRASE_RULES = [
  { category: NOTE_SIGNAL_CATEGORIES.GRIP_LIMITATION, confidence: "high",
    patterns: [
      P(/\bgrip\b[\s\S]{0,20}\b(gave out|failed?|fail(ed|ing)?|slip(ped|s)?|went|issue|problem|limit(ed|ing)?)\b/i),
      P(/\b(hands?|forearms?)\b[\s\S]{0,15}\b(gave out|failed?)\b/i)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.TARGET_MUSCLE_EXECUTION, confidence: "medium",
    patterns: [
      P(/\bcould(n'?t| not) feel\b/i, false), P(/\bdidn'?t feel (it|the \w+)/i, false),
      P(/\bnot feeling (it|the target)/i, false), P(/\bwasn'?t feeling (it|the \w+)/i, false)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.TECHNIQUE_OR_SELECTION_ISSUE, confidence: "medium",
    patterns: [
      P(/\b(lower back|low back|shoulders?|traps?|hips?)\b[\s\S]{0,15}\btook over\b/i),
      P(/\bcompensat(ing|ed|ion)\b/i)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.READINESS_OR_NUTRITION_ISSUE, confidence: "medium",
    patterns: [
      P(/\bno energy\b/i, false), P(/\bfelt (flat|drained|depleted|empty)\b/i),
      P(/\blow energy\b/i), P(/\bzero energy\b/i, false)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.SLEEP_DISRUPTION, confidence: "medium",
    patterns: [
      P(/\bbarely slept\b/i, false), P(/\bdidn'?t sleep\b/i, false),
      P(/\bbad(ly)? slept\b/i), P(/\bpoor sleep\b/i), P(/\bhardly slept\b/i, false)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.EQUIPMENT_INCONSISTENCY, confidence: "medium",
    patterns: [
      P(/\bmachine was different\b/i), P(/\bdifferent (machine|equipment|bar|bench|cable)\b/i),
      P(/\bequipment\b[\s\S]{0,15}\b(broken|unavailable|different|changed)\b/i)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.INADEQUATE_REST, confidence: "medium",
    patterns: [
      P(/\brushed (the )?rests?\b/i), P(/\bdidn'?t rest (enough|long enough)\b/i, false),
      P(/\bshort(ened)? rest\b/i), P(/\brest(ed)? too (short|little)\b/i)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.PRE_WORKOUT_DIGESTION_ISSUE, confidence: "medium",
    patterns: [
      P(/\bfelt sick from (food|eating)\b/i), P(/\bstomach (issues?|upset|cramps?)\b/i),
      P(/\bnauseous\b/i), P(/\bbloated\b/i)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.PAIN_FLAG, confidence: "high",
    patterns: [
      P(/\bpain in\b/i), P(/\b\w+ (hurts?|hurt)\b/i),
      P(/\bsore in a bad way\b/i), P(/\bsharp (pain|twinge)\b/i)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.EFFORT_BELOW_TARGET, confidence: "low",
    patterns: [
      P(/\bcould have done more\b/i), P(/\bleft (a lot |too much )?in the tank\b/i),
      P(/\bdidn'?t push\b/i, false), P(/\bcould'?ve pushed harder\b/i)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.TECHNICAL_DEGRADATION, confidence: "high",
    patterns: [
      P(/\bform broke down\b/i), P(/\btechnique\b[\s\S]{0,15}\b(broke down|fell apart|degraded)\b/i),
      P(/\blost form\b/i)
    ] },
  { category: NOTE_SIGNAL_CATEGORIES.NUTRITION_DATA_INCOMPLETENESS, confidence: "medium",
    patterns: [
      P(/\bforgot to log meals?\b/i), P(/\bdidn'?t log (my )?(meals?|food)\b/i, false),
      P(/\bmissed logging\b/i)
    ] }
];

/**
 * Parses one free-text string into signal matches. Each match carries its category,
 * confidence, the matched text, and whether a negation word appeared close enough to the
 * match to suppress it (negated matches are excluded from the returned array by default —
 * pass includeNegated: true to see them for debugging/audit).
 */
export function parseNoteText(text, { includeNegated = false } = {}) {
  if (!text || typeof text !== "string") return [];
  const results = [];
  PHRASE_RULES.forEach(rule => {
    rule.patterns.forEach(({ pattern, checkNegation }) => {
      const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
      let m;
      while ((m = re.exec(text)) !== null) {
        let negated = false;
        if (checkNegation) {
          const spanStart = Math.max(0, m.index - 15);
          const context = text.slice(spanStart, m.index + m[0].length);
          negated = NEGATION_WORDS.test(context);
        }
        results.push({
          category: rule.category, confidence: negated ? "negated" : rule.confidence,
          matchedText: m[0], negated, sourceText: text
        });
        if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width infinite loop
      }
    });
  });
  return includeNegated ? results : results.filter(r => !r.negated);
}

/** Parses every workout's per-exercise notes/formNote fields into a flat signal list. */
export function parseWorkoutNotes(workouts) {
  const signals = [];
  (workouts || []).forEach(w => (w.exercises || []).forEach(e => {
    [e.notes, e.formNote].forEach(text => {
      parseNoteText(text).forEach(s => signals.push({ ...s, workoutDate: w.date, exerciseName: e.name }));
    });
  }));
  return signals;
}

/** Groups parsed signals by category with a simple count, for quick evidence lookups. */
export function summarizeNoteSignals(signals) {
  const byCategory = {};
  signals.forEach(s => {
    (byCategory[s.category] ||= []).push(s);
  });
  return byCategory;
}
