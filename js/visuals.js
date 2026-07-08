// Generic motivational visual/caption system. Purely content-neutral: it stores
// whatever image URL the user supplies (their own photos, stock art, anything
// they've sourced or generated elsewhere) alongside a rotating caption. This
// module never generates images itself and has no opinion on what the image
// depicts — see js/render-visuals.js for the UI that reads/writes these records.

export const CAPTION_BANK = {
  mission: [
    "Today's mission: make last week look nervous.",
    "Same form. More output.",
    "Earn the next increment.",
    "Comfort is not a training variable.",
    "Your target physique is not built by optional reps."
  ],
  nutrition: [
    "Protein first. Existential crisis later.",
    "The calories are not going to eat themselves.",
    "Abs are visible. Do not ruin this bulk."
  ],
  weekly: [
    "Acceptable. Do it again next week.",
    "Strong week. Do not let it become a personality flaw.",
    "The logbook remembers everything."
  ],
  monthly: [
    "You wanted the physique. The logbook wants proof.",
    "Your future traps are watching."
  ],
  missed: [
    "The weights asked where you were.",
    "A bad day still counts if the reps are clean.",
    "Do not negotiate with the hack squat."
  ],
  technique: [
    "If the rep was ugly, it was not a PR.",
    "No heroic form breakdowns.",
    "The biceps requested slower eccentrics."
  ],
  achievement: [
    "Today's mission: make last week look nervous.",
    "Strong week. Do not let it become a personality flaw."
  ]
};

export const PLACEMENT_LABELS = {
  dashboard: "Today's Mission",
  train: "Workout Banner",
  meals: "Nutrition Discipline",
  "weekly-review": "Weekly Momentum",
  "monthly-review": "Monthly Progress",
  "low-motivation": "Missed Session"
};

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

/** Deterministic-per-day pick so the caption doesn't change on every re-render. */
export function getMotivationalCaption(context) {
  const list = CAPTION_BANK[context] || CAPTION_BANK.mission;
  return list[dayOfYear() % list.length];
}

/**
 * Engagement logic from the spec: picks which caption context applies given
 * simple signals about today's state. Falls back to the placement's own default.
 */
export function pickContextForPlacement(placement, signals = {}) {
  if (signals.workoutMissedToday) return "missed";
  if (signals.proteinBehind) return "nutrition";
  if (signals.formQualityLow) return "technique";
  if (signals.weeklyScoreHigh) return "achievement";
  if (placement === "meals") return "nutrition";
  if (placement === "weekly-review") return "weekly";
  if (placement === "monthly-review") return "monthly";
  if (placement === "low-motivation") return "missed";
  return "mission";
}

export function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getVisualForPlacement(data, placement) {
  return data.motivationalVisuals.find(v => v.placement === placement) || null;
}
