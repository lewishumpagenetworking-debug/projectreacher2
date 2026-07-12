// Local, offline, rule-based macro estimator. NOT an AI/LLM call — there's no
// server in this app to hold an API key securely, so this is a deterministic
// keyword-matched food database + quantity parser instead. It gives real,
// immediate, always-available value with the same UX contract the spec asks
// for (estimate, confidence, assumptions, never claimed as exact), and is a
// clean seam to swap in a real AI call later behind a server route if one
// gets added — nothing about the surrounding UI would need to change.

const FOOD_DB = [
  { key: "chicken_breast", keywords: ["chicken breast", "chicken breasts"], unit: "breast", perUnit: { calories: 200, protein: 38, carbs: 0, fat: 4, fibre: 0 } },
  { key: "chicken_wrap", keywords: ["chicken wrap"], unit: "wrap", perUnit: { calories: 450, protein: 30, carbs: 45, fat: 15, fibre: 3 } },
  { key: "rice_cakes", keywords: ["rice cakes", "rice cake"], unit: "each", perUnit: { calories: 35, protein: 0.7, carbs: 7.3, fat: 0.3, fibre: 0.4 } },
  { key: "rice", keywords: ["rice"], unit: "cup", perUnit: { calories: 205, protein: 4, carbs: 45, fat: 0.6, fibre: 0.7 } },
  { key: "olive_oil", keywords: ["olive oil"], unit: "tbsp", perUnit: { calories: 119, protein: 0, carbs: 0, fat: 14, fibre: 0 } },
  { key: "greek_yogurt", keywords: ["greek yogurt", "greek yoghurt"], unit: "serving", perUnit: { calories: 150, protein: 15, carbs: 8, fat: 4, fibre: 0 } },
  { key: "oats", keywords: ["oats", "porridge"], unit: "bowl", perUnit: { calories: 300, protein: 10, carbs: 54, fat: 6, fibre: 8 } },
  { key: "banana", keywords: ["banana", "bananas"], unit: "each", perUnit: { calories: 105, protein: 1.3, carbs: 27, fat: 0.3, fibre: 3.1 } },
  { key: "honey", keywords: ["honey"], unit: "tbsp", perUnit: { calories: 64, protein: 0, carbs: 17, fat: 0, fibre: 0 } },
  { key: "peanut_butter", keywords: ["peanut butter"], unit: "tbsp", perUnit: { calories: 95, protein: 4, carbs: 3, fat: 8, fibre: 1 } },
  { key: "whey", keywords: ["whey", "protein powder"], unit: "scoop", perUnit: { calories: 120, protein: 24, carbs: 3, fat: 1.5, fibre: 0 } },
  { key: "protein_shake", keywords: ["protein shake"], unit: "shake", perUnit: { calories: 130, protein: 25, carbs: 4, fat: 2, fibre: 0 } },
  { key: "whole_milk", keywords: ["whole milk", "milk"], unit: "cup", perUnit: { calories: 149, protein: 8, carbs: 12, fat: 8, fibre: 0 } },
  { key: "sweet_potato", keywords: ["sweet potatoes", "sweet potato"], unit: "serving", perUnit: { calories: 180, protein: 4, carbs: 41, fat: 0.2, fibre: 6.6 } },
  { key: "beef_mince", keywords: ["beef mince", "minced beef", "ground beef"], unit: "100g", perUnit: { calories: 230, protein: 26, carbs: 0, fat: 13, fibre: 0 } },
  { key: "potatoes", keywords: ["potatoes", "potato"], unit: "serving", perUnit: { calories: 170, protein: 4, carbs: 39, fat: 0.2, fibre: 4 } },
  { key: "eggs", keywords: ["eggs", "egg"], unit: "each", perUnit: { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fibre: 0 } },
  { key: "salmon", keywords: ["salmon"], unit: "fillet", perUnit: { calories: 280, protein: 39, carbs: 0, fat: 13, fibre: 0 } },
  { key: "avocado", keywords: ["avocado"], unit: "each", perUnit: { calories: 240, protein: 3, carbs: 13, fat: 22, fibre: 10 } },
  { key: "toast", keywords: ["toast", "bread"], unit: "slice", perUnit: { calories: 90, protein: 3.5, carbs: 15, fat: 1.5, fibre: 1.5 } },
  { key: "cheese", keywords: ["cheese"], unit: "serving", perUnit: { calories: 110, protein: 7, carbs: 1, fat: 9, fibre: 0 } },
  { key: "pasta", keywords: ["pasta"], unit: "serving", perUnit: { calories: 220, protein: 8, carbs: 43, fat: 1.3, fibre: 2.5 } },

  // Fruit
  { key: "apple", keywords: ["apple", "apples"], unit: "each", perUnit: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fibre: 4.4 } },
  { key: "orange", keywords: ["orange", "oranges"], unit: "each", perUnit: { calories: 62, protein: 1.2, carbs: 15.4, fat: 0.2, fibre: 3.1 } },
  { key: "strawberries", keywords: ["strawberries", "strawberry"], unit: "cup", perUnit: { calories: 49, protein: 1, carbs: 11.7, fat: 0.5, fibre: 3 } },
  { key: "blueberries", keywords: ["blueberries", "blueberry"], unit: "cup", perUnit: { calories: 84, protein: 1.1, carbs: 21.4, fat: 0.5, fibre: 3.6 } },
  { key: "grapes", keywords: ["grapes"], unit: "cup", perUnit: { calories: 104, protein: 1.1, carbs: 27.3, fat: 0.2, fibre: 1.4 } },
  { key: "pear", keywords: ["pear", "pears"], unit: "each", perUnit: { calories: 101, protein: 0.6, carbs: 27, fat: 0.2, fibre: 5.5 } },
  { key: "mango", keywords: ["mango", "mangoes"], unit: "each", perUnit: { calories: 202, protein: 2.8, carbs: 50, fat: 1.3, fibre: 5.4 } },
  { key: "pineapple", keywords: ["pineapple"], unit: "cup", perUnit: { calories: 82, protein: 0.9, carbs: 21.6, fat: 0.2, fibre: 2.3 } },
  { key: "watermelon", keywords: ["watermelon"], unit: "cup", perUnit: { calories: 46, protein: 0.9, carbs: 11.5, fat: 0.2, fibre: 0.6 } },
  { key: "kiwi", keywords: ["kiwi", "kiwis", "kiwi fruit"], unit: "each", perUnit: { calories: 42, protein: 0.8, carbs: 10.1, fat: 0.4, fibre: 2.1 } },
  { key: "raisins", keywords: ["raisins"], unit: "small box", perUnit: { calories: 42, protein: 0.4, carbs: 11, fat: 0, fibre: 0.5 } },

  // Vegetables and starches
  { key: "broccoli", keywords: ["broccoli"], unit: "cup", perUnit: { calories: 31, protein: 2.5, carbs: 6, fat: 0.3, fibre: 2.4 } },
  { key: "spinach", keywords: ["spinach"], unit: "cup", perUnit: { calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1, fibre: 0.7 } },
  { key: "brown_rice", keywords: ["brown rice"], unit: "cup", perUnit: { calories: 216, protein: 5, carbs: 45, fat: 1.8, fibre: 3.5 } },
  { key: "quinoa", keywords: ["quinoa"], unit: "cup", perUnit: { calories: 222, protein: 8, carbs: 39, fat: 3.6, fibre: 5.2 } },
  { key: "cereal", keywords: ["cereal"], unit: "bowl", perUnit: { calories: 210, protein: 5, carbs: 42, fat: 3, fibre: 3 } },
  { key: "granola", keywords: ["granola"], unit: "serving", perUnit: { calories: 250, protein: 6, carbs: 35, fat: 10, fibre: 4 } },

  // Protein sources
  { key: "turkey_breast", keywords: ["turkey breast", "turkey"], unit: "100g", perUnit: { calories: 135, protein: 30, carbs: 0, fat: 1, fibre: 0 } },
  { key: "tuna", keywords: ["tuna"], unit: "tin", perUnit: { calories: 130, protein: 29, carbs: 0, fat: 1, fibre: 0 } },
  { key: "tofu", keywords: ["tofu"], unit: "serving", perUnit: { calories: 180, protein: 20, carbs: 3, fat: 11, fibre: 2 } },
  { key: "bacon", keywords: ["bacon"], unit: "rasher", perUnit: { calories: 43, protein: 3, carbs: 0.1, fat: 3.3, fibre: 0 } },
  { key: "cottage_cheese", keywords: ["cottage cheese"], unit: "cup", perUnit: { calories: 220, protein: 25, carbs: 8, fat: 9.5, fibre: 0 } },

  // Nuts, dairy, extras
  { key: "almonds", keywords: ["almonds"], unit: "handful (28g)", perUnit: { calories: 164, protein: 6, carbs: 6, fat: 14, fibre: 3.5 } },
  { key: "cashews", keywords: ["cashews"], unit: "handful (28g)", perUnit: { calories: 157, protein: 5.2, carbs: 8.6, fat: 12.4, fibre: 0.9 } },
  { key: "hummus", keywords: ["hummus"], unit: "serving (2 tbsp)", perUnit: { calories: 70, protein: 2, carbs: 6, fat: 5, fibre: 2 } },
  { key: "plain_yogurt", keywords: ["plain yogurt", "plain yoghurt", "natural yogurt", "natural yoghurt"], unit: "serving", perUnit: { calories: 100, protein: 9, carbs: 7, fat: 4, fibre: 0 } },
  { key: "butter", keywords: ["butter"], unit: "tbsp", perUnit: { calories: 102, protein: 0.1, carbs: 0, fat: 11.5, fibre: 0 } }
];

const QUANTITY_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, couple: 2, few: 3, half: 0.5 };
const SIZE_MULTIPLIERS = { large: 1.3, big: 1.3, small: 0.7, huge: 1.5 };

function findQuantity(precedingText) {
  const words = precedingText.trim().split(/\s+/).slice(-4);
  let qty = null;
  let sizeMult = 1;
  words.forEach(w => {
    const clean = w.replace(/[^a-z0-9.]/gi, "").toLowerCase();
    if (/^\d+(\.\d+)?$/.test(clean)) qty = Number(clean);
    else if (QUANTITY_WORDS[clean] != null) qty = QUANTITY_WORDS[clean];
    else if (SIZE_MULTIPLIERS[clean]) sizeMult = SIZE_MULTIPLIERS[clean];
  });
  return { qty, sizeMult };
}

function round1(n) { return Math.round(n * 10) / 10; }

/**
 * Deterministic macro estimate from a free-text meal description.
 * Returns { foodsDetected, calories, protein, carbs, fat, fibre, confidenceScore, assumptions }.
 */
export function estimateMealMacros(description) {
  const text = (description || "").toLowerCase();
  if (!text.trim()) {
    return { foodsDetected: [], calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, confidenceScore: "Low", assumptions: ["No description provided."] };
  }

  const entries = FOOD_DB.flatMap(food => food.keywords.map(keyword => ({ food, keyword })))
    .sort((a, b) => b.keyword.length - a.keyword.length);

  const consumed = new Array(text.length).fill(false);
  const detected = [];
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };

  entries.forEach(({ food, keyword }) => {
    let searchFrom = 0;
    for (;;) {
      const idx = text.indexOf(keyword, searchFrom);
      if (idx === -1) break;
      searchFrom = idx + keyword.length;
      if (consumed.slice(idx, idx + keyword.length).some(Boolean)) continue;
      for (let i = idx; i < idx + keyword.length; i++) consumed[i] = true;

      const { qty, sizeMult } = findQuantity(text.slice(Math.max(0, idx - 20), idx));
      const multiplier = (qty ?? 1) * sizeMult;

      totals.calories += food.perUnit.calories * multiplier;
      totals.protein += food.perUnit.protein * multiplier;
      totals.carbs += food.perUnit.carbs * multiplier;
      totals.fat += food.perUnit.fat * multiplier;
      totals.fibre += food.perUnit.fibre * multiplier;

      detected.push({ name: keyword, quantity: multiplier, unit: food.unit, assumedQuantity: qty == null });
    }
  });

  const matchedChars = consumed.filter(Boolean).length;
  const meaningfulChars = text.replace(/[^a-z]/g, "").length || 1;
  const matchRatio = matchedChars / meaningfulChars;

  const assumptions = detected
    .filter(d => d.assumedQuantity)
    .map(d => `Assumed 1 standard serving of ${d.name} (no quantity stated).`);

  let confidenceScore;
  let finalTotals = totals;
  if (detected.length === 0) {
    confidenceScore = "Low";
    assumptions.push("Could not identify any known foods in this description — using a conservative flat estimate. Please check and edit the macros manually.");
    finalTotals = { calories: 450, protein: 30, carbs: 40, fat: 15, fibre: 5 };
  } else if (matchRatio >= 0.6 && detected.every(d => !d.assumedQuantity)) {
    confidenceScore = "High";
  } else if (matchRatio >= 0.35) {
    confidenceScore = "Medium";
  } else {
    confidenceScore = "Low";
    assumptions.push("Only part of this description matched known foods — treat this estimate as rough and double-check the numbers.");
  }

  return {
    foodsDetected: detected.map(d => `${d.assumedQuantity ? "" : round1(d.quantity) + " "}${d.name}`.trim()),
    calories: round1(finalTotals.calories),
    protein: round1(finalTotals.protein),
    carbs: round1(finalTotals.carbs),
    fat: round1(finalTotals.fat),
    fibre: round1(finalTotals.fibre),
    confidenceScore,
    assumptions
  };
}
