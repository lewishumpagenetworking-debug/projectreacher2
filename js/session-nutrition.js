// Canonical session-specific nutrition guidance: the ONE source of truth for pre/during/
// post-workout nutrient timing targets per training day. These are nutrient-TIMING
// recommendations only — they describe how much of the user's EXISTING daily
// calorie/macro target should ideally land around training, never additional intake on
// top of it (see scaleSessionNutritionToDaily() below, and section 8 of the spec this
// module implements). No meals, foods, recipes, supplements, or stimulants are ever
// referenced here — nutrient/macro/hydration/electrolyte values and plain-language
// explanations only.

// Reference bodyweight the current defaults were written for (see PROFILE-AWARE FUTURE
// SCALING in the spec) — used only to detect when a re-review prompt is warranted, never
// to silently rescale the numbers themselves.
export const SESSION_NUTRITION_REFERENCE_WEIGHT_KG = 73;
export const BODYWEIGHT_CHANGE_REVIEW_THRESHOLD_KG = 5;

export const DEFAULT_SESSION_NUTRITION = {
  "Day 1 - Upper Width": {
    preWorkout: {
      timingMinMinutes: 60, timingMaxMinutes: 120,
      proteinGrams: 30, carbohydrateGrams: 70, fatMaxGrams: 15, fibreMaxGrams: 10,
      waterMl: 600, sodiumMg: 500,
      explanation: "Build the session on available carbohydrate and amino acids. This is a balanced upper-body workload, so arrive hydrated and fuelled without making digestion the constraint."
    },
    duringWorkout: {
      waterGuidance: "Sip according to thirst.",
      carbohydrateGramsMin: null, carbohydrateGramsMax: null,
      sodiumMgMin: null, sodiumMgMax: null,
      condition: "Additional carbohydrate not routinely required. Electrolytes optional when sweating heavily."
    },
    postWorkout: {
      timingMaxMinutes: 120,
      proteinGrams: 35, carbohydrateGrams: 80, fatMaxGrams: 20,
      waterMl: 750, sodiumMg: 400,
      explanation: "Replace the fuel used across pressing and pulling, then give the upper chest, back, delts and arms what they need to begin recovery."
    }
  },
  "Day 2 - Lower Mass": {
    preWorkout: {
      timingMinMinutes: 90, timingMaxMinutes: 150,
      proteinGrams: 30, carbohydrateGrams: 90, fatMaxGrams: 12, fibreMaxGrams: 8,
      waterMl: 750, sodiumMg: 700,
      explanation: "This is the highest-output session of the programme. Carbohydrate and hydration are operational requirements, not optional extras. Do not let poor preparation reduce the work your legs can produce."
    },
    duringWorkout: {
      waterGuidance: "500-750 ml during the session.",
      carbohydrateGramsMin: 20, carbohydrateGramsMax: 30,
      sodiumMgMin: 300, sodiumMgMax: 500,
      condition: "Additional carbohydrate if the session exceeds 75 minutes or performance falls. Sodium if sweating heavily."
    },
    postWorkout: {
      timingMaxMinutes: 120,
      proteinGrams: 40, carbohydrateGrams: 110, fatMaxGrams: 20,
      waterMl: 1000, sodiumMg: 600,
      explanation: "Lower-body training creates the greatest recovery demand of the week. Replenish carbohydrate, fluids and sodium while supplying enough protein to begin rebuilding."
    }
  },
  "Day 3 - Push": {
    preWorkout: {
      timingMinMinutes: 60, timingMaxMinutes: 120,
      proteinGrams: 30, carbohydrateGrams: 70, fatMaxGrams: 15, fibreMaxGrams: 10,
      waterMl: 600, sodiumMg: 500,
      explanation: "Pressing performance depends on stable energy and hydration. Begin with enough carbohydrate to preserve output across every compound press and isolation set."
    },
    duringWorkout: {
      waterGuidance: "Sip according to thirst.",
      carbohydrateGramsMin: null, carbohydrateGramsMax: null,
      sodiumMgMin: null, sodiumMgMax: null,
      condition: "Additional carbohydrate not routinely required. Electrolytes optional when sweating heavily."
    },
    postWorkout: {
      timingMaxMinutes: 120,
      proteinGrams: 35, carbohydrateGrams: 85, fatMaxGrams: 20,
      waterMl: 750, sodiumMg: 400,
      explanation: "Restore the fuel used by the chest, shoulders and triceps, then begin recovery before fatigue carries into the next session."
    }
  },
  "Day 4 - Pull": {
    preWorkout: {
      timingMinMinutes: 60, timingMaxMinutes: 120,
      proteinGrams: 30, carbohydrateGrams: 65, fatMaxGrams: 15, fibreMaxGrams: 10,
      waterMl: 600, sodiumMg: 500,
      explanation: "Arrive with enough fuel to keep pulling strength, grip and back engagement stable from the first compound movement to the final curl."
    },
    duringWorkout: {
      waterGuidance: "Sip according to thirst.",
      carbohydrateGramsMin: null, carbohydrateGramsMax: null,
      sodiumMgMin: null, sodiumMgMax: null,
      condition: "Additional carbohydrate not routinely required. Electrolytes optional when sweating heavily."
    },
    postWorkout: {
      timingMaxMinutes: 120,
      proteinGrams: 35, carbohydrateGrams: 75, fatMaxGrams: 20,
      waterMl: 750, sodiumMg: 400,
      explanation: "Support recovery across the lats, mid-back, traps, rear delts and biceps while restoring the carbohydrate used during the session."
    }
  },
  "Day 5 - Specialisation": {
    preWorkout: {
      timingMinMinutes: 60, timingMaxMinutes: 120,
      proteinGrams: 30, carbohydrateGrams: 75, fatMaxGrams: 15, fibreMaxGrams: 10,
      waterMl: 650, sodiumMg: 500,
      explanation: "This session spreads effort across several priority areas. Fuel it as a complete training day, not as a collection of smaller exercises."
    },
    duringWorkout: {
      waterGuidance: "Sip according to thirst.",
      carbohydrateGramsMin: null, carbohydrateGramsMax: null,
      sodiumMgMin: null, sodiumMgMax: null,
      condition: "Additional carbohydrate not routinely required. Electrolytes optional when sweating heavily."
    },
    postWorkout: {
      timingMaxMinutes: 120,
      proteinGrams: 35, carbohydrateGrams: 85, fatMaxGrams: 20,
      waterMl: 800, sodiumMg: 450,
      explanation: "Multiple priority muscles were trained. Restore energy, begin tissue repair and protect readiness for the final specialisation session of the week."
    }
  },
  "Day 6 - Arm + Forearm + Delt Specialisation": {
    preWorkout: {
      timingMinMinutes: 75, timingMaxMinutes: 120,
      proteinGrams: 30, carbohydrateGrams: 85, fatMaxGrams: 12, fibreMaxGrams: 8,
      waterMl: 700, sodiumMg: 600,
      explanation: "This is a long, high-volume specialisation session. Local fatigue will build quickly. Start with enough carbohydrate, fluid and sodium to maintain output and contraction quality."
    },
    duringWorkout: {
      waterGuidance: "500-750 ml during the session.",
      carbohydrateGramsMin: 20, carbohydrateGramsMax: 25,
      sodiumMgMin: 300, sodiumMgMax: 400,
      condition: "Additional carbohydrate if the session exceeds 75 minutes. Sodium if sweating heavily."
    },
    postWorkout: {
      timingMaxMinutes: 120,
      proteinGrams: 40, carbohydrateGrams: 95, fatMaxGrams: 20,
      waterMl: 900, sodiumMg: 500,
      explanation: "High local volume requires deliberate recovery. Replenish training fuel and supply enough protein to support the arms, forearms and delts before the next training week."
    }
  }
};

/** A safe, conservative fallback used only when a day has no canonical or user default at all (e.g. a brand-new custom programme day). */
export const SAFE_FALLBACK_SESSION_NUTRITION = {
  preWorkout: {
    timingMinMinutes: 60, timingMaxMinutes: 120,
    proteinGrams: 25, carbohydrateGrams: 60, fatMaxGrams: 15, fibreMaxGrams: 10,
    waterMl: 500, sodiumMg: 400,
    explanation: "Arrive fuelled and hydrated. Adjust this session's targets in the Programme Editor once you know its actual demand."
  },
  duringWorkout: {
    waterGuidance: "Sip according to thirst.",
    carbohydrateGramsMin: null, carbohydrateGramsMax: null,
    sodiumMgMin: null, sodiumMgMax: null,
    condition: "Additional carbohydrate not routinely required. Electrolytes optional when sweating heavily."
  },
  postWorkout: {
    timingMaxMinutes: 120,
    proteinGrams: 30, carbohydrateGrams: 65, fatMaxGrams: 20,
    waterMl: 650, sodiumMg: 350,
    explanation: "Replace training fuel and begin recovery. Adjust this session's targets in the Programme Editor once you know its actual demand."
  }
};

/**
 * Resolves the session nutrition config for a programme day, following the merge
 * priority from the spec: (1) existing user-customised value in data.sessionNutrition,
 * (2) canonical day-specific default, (3) safe fallback. Never mutates its inputs.
 */
export function getSessionNutritionForDay(data, day) {
  const userConfig = data?.sessionNutrition?.[day];
  if (userConfig) return userConfig;
  const canonical = DEFAULT_SESSION_NUTRITION[day];
  if (canonical) return canonical;
  return SAFE_FALLBACK_SESSION_NUTRITION;
}

function roundTo5(n) {
  return Math.round(n / 5) * 5;
}

/**
 * Section 8 daily-target safeguard: session nutrition must never read as additional
 * intake on top of the day's plan. If pre+post carbohydrate would exceed the daily
 * carbohydrate target, scale the DISPLAYED pre/post carb values down (proportionally,
 * preserving their relative split) so the combined total is at most 70% of the daily
 * target. Same idea for protein at 50%. Water/sodium and the underlying canonical
 * config are never touched — only what's rendered is scaled, and only when needed.
 * Returns { preWorkout, postWorkout, scaled: { protein: bool, carbohydrate: bool } }.
 */
export function scaleSessionNutritionToDaily(sessionNutrition, dailyTargets) {
  const pre = { ...sessionNutrition.preWorkout };
  const post = { ...sessionNutrition.postWorkout };
  const scaled = { protein: false, carbohydrate: false };

  const dailyCarb = dailyTargets?.carbsMax ?? dailyTargets?.carbs ?? null;
  const combinedCarb = pre.carbohydrateGrams + post.carbohydrateGrams;
  if (dailyCarb && combinedCarb > dailyCarb) {
    const cap = dailyCarb * 0.7;
    if (combinedCarb > cap) {
      const factor = cap / combinedCarb;
      pre.carbohydrateGrams = roundTo5(pre.carbohydrateGrams * factor);
      post.carbohydrateGrams = roundTo5(post.carbohydrateGrams * factor);
      scaled.carbohydrate = true;
    }
  }

  const dailyProtein = dailyTargets?.proteinMax ?? dailyTargets?.protein ?? null;
  const combinedProtein = pre.proteinGrams + post.proteinGrams;
  if (dailyProtein && combinedProtein > dailyProtein) {
    const cap = dailyProtein * 0.5;
    if (combinedProtein > cap) {
      const factor = cap / combinedProtein;
      pre.proteinGrams = roundTo5(pre.proteinGrams * factor);
      post.proteinGrams = roundTo5(post.proteinGrams * factor);
      scaled.protein = true;
    }
  }

  return { preWorkout: pre, postWorkout: post, duringWorkout: sessionNutrition.duringWorkout, scaled };
}

/** Rejects negative values; null/undefined (unset) is allowed for the optional during-workout range fields. */
export function isValidSessionNutritionNumber(value) {
  if (value === null || value === undefined || value === "") return true;
  const n = Number(value);
  return !Number.isNaN(n) && n >= 0;
}

/** True once bodyweight has drifted far enough from the reference weight to warrant a re-review prompt (never an automatic change). */
export function isBodyweightChangeMaterial(currentWeightKg, referenceWeightKg = SESSION_NUTRITION_REFERENCE_WEIGHT_KG) {
  if (currentWeightKg == null || referenceWeightKg == null) return false;
  return Math.abs(currentWeightKg - referenceWeightKg) >= BODYWEIGHT_CHANGE_REVIEW_THRESHOLD_KG;
}

/**
 * Resolves the nutrition guidance to display for a SAVED workout, per section 7:
 * a completed workout's own snapshot always wins (so a later programme edit can never
 * retroactively change what was recommended that day); otherwise it's resolved live from
 * the current programme-day config and must be labelled "Current session guidance".
 */
export function resolveWorkoutSessionNutrition(workout, data) {
  if (workout?.sessionNutritionSnapshot) {
    return { sessionNutrition: workout.sessionNutritionSnapshot, isSnapshot: true };
  }
  const day = workout?.programDay || workout?.day;
  return { sessionNutrition: getSessionNutritionForDay(data, day), isSnapshot: false };
}
