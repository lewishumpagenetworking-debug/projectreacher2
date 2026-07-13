// Meal History / cookbook: reusable saved meals, built automatically from what the user
// actually logs (every non-draft meal saved in Nutrition auto-upserts here via an exact
// content-hash match), plus manual edit/delete/favourite/archive. Kept as a separate,
// richer system from the existing js/food-estimator.js foodTemplates (a lighter "reuse
// this exact estimate" shortcut) — foodTemplates is untouched.
import { uid } from "./data.js";

function round1(n) { return Math.round(n * 10) / 10; }
function normalizeText(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }

/**
 * Stable content signature for exact-duplicate detection: normalised name + sorted
 * normalised ingredient list + rounded nutrition totals. Ignores capitalisation, extra
 * spaces and ingredient ordering, per the duplicate-prevention spec.
 */
export function computeMealContentHash({ name, ingredients, calories, protein, carbs, fat }) {
  const normName = normalizeText(name);
  const normIngredients = (ingredients || []).map(normalizeText).filter(Boolean).sort().join("|");
  const macroSig = `${round1(calories)}:${round1(protein)}:${round1(carbs)}:${round1(fat)}`;
  return `${normName}::${normIngredients}::${macroSig}`;
}

/**
 * Finds an existing saved meal with an identical content hash, or creates a new one.
 * Exact matches never create a duplicate catalog entry — they just get their use count
 * and last-used date bumped. A meal with different ingredients/quantities/nutrition
 * becomes its own new variation, as intended.
 */
export function findOrCreateSavedMeal(data, mealData, now = new Date().toISOString()) {
  const contentHash = computeMealContentHash(mealData);
  const existing = data.savedMeals.find(m => m.contentHash === contentHash && !m.archived);
  if (existing) {
    existing.timesLogged += 1;
    existing.lastUsedAt = now;
    return { savedMeal: existing, isNew: false };
  }
  const savedMeal = {
    id: uid(),
    name: mealData.name || "Meal",
    mealType: mealData.mealType || null,
    ingredients: mealData.ingredients || [],
    calories: mealData.calories || 0, protein: mealData.protein || 0, carbs: mealData.carbs || 0,
    fat: mealData.fat || 0, fibre: mealData.fibre || 0, micronutrients: {},
    notes: mealData.notes || "",
    contentHash,
    timesLogged: 1,
    firstCreatedAt: now, lastUsedAt: now,
    archived: false, favourite: false
  };
  data.savedMeals.push(savedMeal);
  return { savedMeal, isNew: true };
}

/** Creates a new daily-log entry referencing a saved meal, without duplicating the catalog record. Snapshot is scaled by servingMultiplier so later edits to the saved meal never retroactively change past logs. */
export function buildDailyLogEntryFromSavedMeal(savedMeal, servingMultiplier = 1) {
  const scale = Number(servingMultiplier) || 1;
  return {
    mealName: savedMeal.name,
    rawDescription: savedMeal.ingredients.join(", ") || savedMeal.name,
    foodsDetected: savedMeal.ingredients,
    calories: round1(savedMeal.calories * scale),
    protein: round1(savedMeal.protein * scale),
    carbs: round1(savedMeal.carbs * scale),
    fat: round1(savedMeal.fat * scale),
    fibre: round1((savedMeal.fibre || 0) * scale),
    savedMealId: savedMeal.id,
    servingMultiplier: scale,
    confidenceScore: "High",
    source: "cookbook"
  };
}
