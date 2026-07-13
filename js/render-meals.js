import { $, esc, fmt } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { estimateMealMacros } from "./food-estimator.js";
import { macroTargets, dailyMealTotals, remainingMacros, macroAdherence, monthlyMealSummary, loggingStreakDays, validateMealEntry, nutritionConfidenceStatus, preWorkoutReadinessToday, trainingNutritionCorrelation } from "./calculations.js";
import { lineChart, stackedBarRows } from "./charts.js";
import { hasApiKey, estimateMealMacrosViaClaude } from "./claude-client.js";
import { remainingDailyTargets, macroGapUrgency, rankSavedMealsForGap } from "./calculations.js";
import { findOrCreateSavedMeal, buildDailyLogEntryFromSavedMeal } from "./meal-cookbook.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));
const todayISO = () => new Date().toLocaleDateString("en-CA");

let selectedMonth = todayISO().slice(0, 7);
let activeFilter = "all";
let lastEstimate = null;

export async function estimateMeal() {
  const description = $("mealDescription").value;
  if (!description.trim()) { alert("Describe what you ate first."); return; }

  const btn = $("estimateMealBtn");
  const originalLabel = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = "Estimating..."; }

  try {
    if (hasApiKey()) {
      try {
        const data = getData();
        lastEstimate = await estimateMealMacrosViaClaude(description, data.aiSettings?.preferredModel || "claude-sonnet-5");
      } catch (err) {
        lastEstimate = estimateMealMacros(description);
        lastEstimate.assumptions = [
          `Claude estimate unavailable (${err.message}) — used the built-in local estimator instead.`,
          ...lastEstimate.assumptions
        ];
      }
    } else {
      lastEstimate = estimateMealMacros(description);
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }

  $("mealCalories").value = lastEstimate.calories;
  $("mealProtein").value = lastEstimate.protein;
  $("mealCarbs").value = lastEstimate.carbs;
  $("mealFat").value = lastEstimate.fat;
  $("mealFibre").value = lastEstimate.fibre;
  if ($("mealQuantity") && !$("mealQuantity").value) $("mealQuantity").value = "1";
  if ($("mealUnit") && !$("mealUnit").value) $("mealUnit").value = "serving";

  const pill = $("mealConfidencePill");
  pill.textContent = lastEstimate.confidenceScore;
  pill.className = `confidence-pill confidence-${lastEstimate.confidenceScore.toLowerCase()}`;

  $("mealAssumptions").innerHTML = [
    lastEstimate.foodsDetected.length ? `<strong>Detected:</strong> ${esc(lastEstimate.foodsDetected.join(", "))}` : "",
    ...lastEstimate.assumptions.map(a => esc(a)),
    lastEstimate.source === "claude" ? "<em>Estimated by Claude.</em>" : "<em>Estimated by the local food-keyword lookup.</em>"
  ].filter(Boolean).join("<br>");

  const clarifyEl = $("mealClarifyingQuestion");
  if (clarifyEl) {
    if (lastEstimate.clarifyingQuestion) {
      clarifyEl.hidden = false;
      clarifyEl.textContent = `To improve this estimate: ${lastEstimate.clarifyingQuestion}`;
    } else {
      clarifyEl.hidden = true;
    }
  }

  $("mealEstimateResult").hidden = false;
}

export function saveFoodTemplateFromCurrentMeal() {
  const name = ($("mealName").value || "").trim() || ($("mealDescription").value || "").trim().slice(0, 40);
  if (!name) { alert("Enter a meal name or description before saving a template."); return; }
  const calories = Number($("mealCalories").value || 0);
  const protein = Number($("mealProtein").value || 0);
  const carbs = Number($("mealCarbs").value || 0);
  const fat = Number($("mealFat").value || 0);
  const fibre = Number($("mealFibre").value || 0);
  if (!calories && !protein && !carbs && !fat) { alert("Estimate or enter macros before saving a template."); return; }

  const data = getData();
  data.foodTemplates.push({
    id: uid(),
    name,
    rawDescription: $("mealDescription").value || name,
    calories, protein, carbs, fat, fibre,
    quantity: $("mealQuantity")?.value || "1",
    unit: $("mealUnit")?.value || "serving",
    createdAt: new Date().toISOString()
  });
  saveData(data);
  refreshAll();
  alert(`Saved "${name}" as a reusable food template.`);
}

function applyFoodTemplate(id) {
  const data = getData();
  const t = (data.foodTemplates || []).find(x => x.id === id);
  if (!t) return;

  $("mealName").value = t.name;
  $("mealDescription").value = t.rawDescription || t.name;
  $("mealCalories").value = t.calories;
  $("mealProtein").value = t.protein;
  $("mealCarbs").value = t.carbs;
  $("mealFat").value = t.fat;
  $("mealFibre").value = t.fibre;
  if ($("mealQuantity")) $("mealQuantity").value = t.quantity || "1";
  if ($("mealUnit")) $("mealUnit").value = t.unit || "serving";

  lastEstimate = {
    foodsDetected: [t.name], calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat, fibre: t.fibre,
    confidenceScore: "High", assumptions: [`Loaded from your saved template "${t.name}".`], clarifyingQuestion: null, source: "template"
  };

  const pill = $("mealConfidencePill");
  if (pill) { pill.textContent = "High"; pill.className = "confidence-pill confidence-high"; }
  const assumptionsEl = $("mealAssumptions");
  if (assumptionsEl) assumptionsEl.innerHTML = esc(lastEstimate.assumptions[0]);
  const clarifyEl = $("mealClarifyingQuestion");
  if (clarifyEl) clarifyEl.hidden = true;
  $("mealEstimateResult").hidden = false;
}

export function renderFoodTemplates(data) {
  const select = $("foodTemplateSelect");
  if (!select) return;
  const templates = data.foodTemplates || [];
  const current = select.value;
  select.innerHTML = `<option value="">-- Use a saved food template --</option>` +
    templates.map(t => `<option value="${t.id}">${esc(t.name)} (${t.calories}kcal, P${t.protein}/C${t.carbs}/F${t.fat})</option>`).join("");
  if (templates.some(t => t.id === current)) select.value = current;
}

export function saveMeal(asDraft = false) {
  const data = getData();
  const now = new Date();
  const mealName = $("mealName").value.trim();
  const quantity = $("mealQuantity")?.value === "" ? null : $("mealQuantity")?.value;
  const unit = $("mealUnit")?.value || null;
  const calories = $("mealCalories").value === "" ? null : Number($("mealCalories").value);
  const protein = $("mealProtein").value === "" ? null : Number($("mealProtein").value);
  const carbs = $("mealCarbs").value === "" ? null : Number($("mealCarbs").value);
  const fat = $("mealFat").value === "" ? null : Number($("mealFat").value);
  const fibre = Number($("mealFibre").value || 0);

  const validationEl = $("mealValidationMessage");
  if (!asDraft) {
    const validation = validateMealEntry({ mealName, quantity, unit, calories, protein, carbs, fat });
    if (!validation.reconciled) {
      if (validationEl) {
        validationEl.hidden = false;
        validationEl.className = "small status-under";
        validationEl.textContent = `${validation.message} Fix the entry, or choose "Save as Incomplete Draft" to log it now — drafts don't count toward today's totals until completed.`;
      } else {
        alert(validation.message);
      }
      return;
    }
  }
  if (validationEl) validationEl.hidden = true;

  const userCorrected = lastEstimate
    ? (calories !== lastEstimate.calories || protein !== lastEstimate.protein || carbs !== lastEstimate.carbs || fat !== lastEstimate.fat || fibre !== lastEstimate.fibre)
    : true; // no estimate was run at all -> fully manual entry

  const foodsDetected = lastEstimate?.foodsDetected || [];
  let savedMealId = null;
  // Every genuinely-saved (non-draft) meal auto-joins the Meal History cookbook —
  // an exact repeat (same name/ingredients/macros) reuses the existing catalog entry
  // rather than creating a duplicate, per the exact-duplicate-prevention requirement.
  if (!asDraft) {
    const { savedMeal } = findOrCreateSavedMeal(data, {
      name: mealName || "Meal", ingredients: foodsDetected,
      calories: calories ?? 0, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0, fibre
    }, now.toISOString());
    savedMealId = savedMeal.id;
  }

  data.mealLogs.push({
    id: uid(),
    date: todayISO(),
    time: $("mealTime").value || now.toTimeString().slice(0, 5),
    mealName: mealName || "Meal",
    rawDescription: $("mealDescription").value,
    foodsDetected,
    calories: calories ?? 0, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0, fibre,
    confidenceScore: lastEstimate?.confidenceScore || "Manual",
    assumptions: lastEstimate?.assumptions || [],
    userCorrected,
    correctionNotes: "",
    recoveryTag: $("mealRecoveryTag")?.value || null,
    quantity, unit,
    isDraft: asDraft,
    source: lastEstimate ? (lastEstimate.source || "estimator") : "manual",
    savedMealId, servingMultiplier: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  });
  saveData(data);

  ["mealDescription", "mealName", "mealTime", "mealQuantity", "mealCalories", "mealProtein", "mealCarbs", "mealFat", "mealFibre"].forEach(id => { if ($(id)) $(id).value = ""; });
  if ($("mealRecoveryTag")) $("mealRecoveryTag").value = "";
  if ($("mealUnit")) $("mealUnit").value = "";
  $("mealEstimateResult").hidden = true;
  lastEstimate = null;
  refreshAll();
  alert(asDraft ? "Meal saved as an incomplete draft — it won't count toward today's totals until completed and re-saved." : "Meal saved.");
}

function currentWeight(data) {
  return data.bodyweightLogs.at(-1)?.morningBodyweight ?? data.profile.currentWeight ?? data.profile.startingWeight;
}

export function renderMealTracking(data) {
  renderTodayMeals(data);
  renderMonthSelect(data);
  renderMonthlyOverview(data);
  renderMealHistory(data);
  renderFoodTemplates(data);
  renderMealCookbook(data);
  renderMacroGapRecommendations(data);
}

function renderTodayMeals(data) {
  const today = todayISO();
  const totals = dailyMealTotals(data.mealLogs, today);
  const targets = macroTargets(currentWeight(data));
  const remaining = remainingMacros(totals, { calories: data.nutritionLogs.at(-1)?.calories || 2800, proteinMax: targets.proteinMax, proteinMin: targets.proteinMin, carbsMax: targets.carbsMax, fatMax: targets.fatMax, fibre: 14 * ((data.nutritionLogs.at(-1)?.calories || 2800) / 1000) });
  const adherence = macroAdherence(totals, { calories: data.nutritionLogs.at(-1)?.calories || 2800, proteinMin: targets.proteinMin, fibre: 14 * ((data.nutritionLogs.at(-1)?.calories || 2800) / 1000) });

  const badge = $("mealDailyBadge");
  if (badge) { badge.textContent = adherence.macroStatus; badge.className = `badge status-${adherence.macroStatus === "On target" ? "on-target" : "under"}`; }

  const confidence = nutritionConfidenceStatus(data.mealLogs, today);
  const confidenceBadge = $("mealConfidenceBadge");
  if (confidenceBadge) {
    confidenceBadge.textContent = `Data Confidence: ${confidence.status}`;
    confidenceBadge.title = confidence.reason;
    confidenceBadge.className = `badge ${confidence.status === "High" ? "status-on-target" : confidence.status === "Medium" ? "" : "status-under"}`;
  }
  const provisionalEl = $("mealConfidenceProvisionalNote");
  if (provisionalEl) {
    provisionalEl.textContent = confidence.provisionalMessage || "";
    provisionalEl.hidden = !confidence.provisionalMessage;
  }

  const totalsEl = $("mealDailyTotals");
  if (totalsEl) {
    totalsEl.innerHTML = `
      <div class="badge-row">
        <span class="badge">${totals.calories} kcal</span>
        <span class="badge">${totals.protein}g protein</span>
        <span class="badge">${totals.carbs}g carbs</span>
        <span class="badge">${totals.fat}g fat</span>
        <span class="badge">${totals.fibre}g fibre</span>
        <span class="badge">${totals.mealCount} meal${totals.mealCount === 1 ? "" : "s"}</span>
      </div>`;
  }
  const remainingEl = $("mealRemaining");
  if (remainingEl) {
    const streak = loggingStreakDays(data.mealLogs, "date");
    const proteinHit = targets.proteinMin && totals.protein >= targets.proteinMin;
    const rewardLine = totals.mealCount
      ? `<p class="small exercise-complete-note">${proteinHit ? "Protein target hit. " : ""}${streak >= 2 ? `Nutrition Discipline: ${streak}-day streak.` : ""}</p>`
      : "";
    remainingEl.innerHTML = `<p class="small">Remaining today: ${remaining.caloriesRemaining}kcal · ${remaining.proteinRemaining}g protein · ${remaining.carbsRemaining}g carbs · ${remaining.fatRemaining}g fat · ${remaining.fibreRemaining}g fibre</p>${rewardLine}`;
  }

  const logEl = $("todayMealLog");
  const todaysMeals = data.mealLogs.filter(m => m.date === today).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  if (logEl) {
    logEl.innerHTML = todaysMeals.map(m => mealHistoryItem(m)).join("") || "<p class='small'>No meals logged yet today.</p>";
  }

  const chartEl = $("mealDailyChart");
  if (chartEl) {
    const rows = todaysMeals.map(m => ({
      label: `${m.time ? m.time + " " : ""}${m.mealName}`,
      total: m.calories,
      segments: [
        { value: m.protein * 4, className: "macro-protein", title: `Protein ${m.protein}g` },
        { value: m.carbs * 4, className: "macro-carbs", title: `Carbs ${m.carbs}g` },
        { value: m.fat * 9, className: "macro-fat", title: `Fat ${m.fat}g` }
      ]
    }));
    chartEl.innerHTML = stackedBarRows(rows);
  }
}

// Compact expandable meal card: collapsed shows only name/calories/protein (spec 7.1),
// full breakdown appears on expand — replaces the old always-expanded long row.
function mealHistoryItem(m) {
  return `<details class="history-item meal-card">
    <summary>
      <strong>${m.time ? esc(m.time) + " · " : ""}${esc(m.mealName)}</strong>
      <span class="small">${m.calories} kcal · ${m.protein}g protein</span>
      ${m.isDraft ? `<span class="badge status-under">Draft</span>` : ""}
    </summary>
    <div class="section-title">
      <span class="confidence-pill confidence-${(m.confidenceScore || "manual").toLowerCase()}">${esc(m.confidenceScore)}${m.userCorrected ? " · edited" : ""}</span>
    </div>
    <p class="small">${esc(m.rawDescription)}</p>
    <div class="badge-row">
      <span class="badge">${m.calories}kcal</span>
      <span class="badge">P${m.protein}</span>
      <span class="badge">C${m.carbs}</span>
      <span class="badge">F${m.fat}</span>
      <span class="badge">Fibre${m.fibre}</span>
      ${m.recoveryTag ? `<span class="badge status-on-target">${esc(m.recoveryTag.replace(/-/g, " "))}</span>` : ""}
      ${m.isDraft ? `<span class="badge status-under">Draft — not counted in totals</span>` : ""}
    </div>
    <div class="actions">
      <button class="secondary" data-duplicate-meal="${m.id}">Add Again Today</button>
      <button class="danger" data-delete="mealLogs" data-id="${m.id}">Delete</button>
    </div>
  </details>`;
}

function renderMonthSelect(data) {
  const select = $("mealMonthSelect");
  if (!select) return;
  const months = [...new Set(data.mealLogs.map(m => m.date.slice(0, 7)))];
  if (!months.includes(selectedMonth)) months.push(selectedMonth);
  months.sort().reverse();
  select.innerHTML = months.map(m => `<option value="${m}" ${m === selectedMonth ? "selected" : ""}>${m}</option>`).join("");
  select.onchange = () => { selectedMonth = select.value; renderMonthlyOverview(getData()); };
}

function renderMonthlyOverview(data) {
  const summary = monthlyMealSummary(data.mealLogs, selectedMonth);
  const cardsEl = $("monthlySummaryCards");
  if (cardsEl) {
    cardsEl.innerHTML = `
      <div class="badge-row">
        <span class="badge">Avg ${fmt(summary.averageCalories, 0)}kcal/day</span>
        <span class="badge">Avg ${fmt(summary.averageProtein, 0)}g protein/day</span>
        <span class="badge">Avg ${fmt(summary.averageCarbs, 0)}g carbs/day</span>
        <span class="badge">Avg ${fmt(summary.averageFat, 0)}g fat/day</span>
        <span class="badge">Avg ${fmt(summary.averageFibre, 0)}g fibre/day</span>
        <span class="badge">${summary.daysLogged} day(s) logged</span>
        <span class="badge">${summary.aiEstimatedMeals} estimated / ${summary.manuallyConfirmedMeals} confirmed</span>
        <span class="badge">${fmt(summary.consistencyScore, 0)}% of days logged</span>
      </div>
      ${summary.highestCalorieDay ? `<p class="small">Highest calorie day: ${esc(summary.highestCalorieDay.date)} (${summary.highestCalorieDay.calories}kcal) · Lowest: ${summary.lowestCalorieDay ? esc(summary.lowestCalorieDay.date) + " (" + summary.lowestCalorieDay.calories + "kcal)" : "--"} · Best protein day: ${esc(summary.bestProteinDay.date)} (${summary.bestProteinDay.protein}g)</p>` : "<p class='small'>No meals logged this month yet.</p>"}`;
  }
  const chartEl = $("monthlyCalorieChart");
  if (chartEl) {
    const points = summary.byDay.map(d => ({ label: d.date.slice(8), value: d.calories }));
    chartEl.innerHTML = lineChart(points, { labelEvery: Math.ceil(points.length / 10) || 1, formatValue: v => `${Math.round(v)}kcal` });
  }
}

function renderMealHistory(data) {
  const el = $("mealHistory");
  if (!el) return;
  const search = ($("mealSearch")?.value || "").toLowerCase();
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  let meals = [...data.mealLogs].sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  if (activeFilter === "week") meals = meals.filter(m => new Date(m.date) >= weekAgo);
  if (activeFilter === "highProtein") meals = meals.filter(m => m.protein >= 30);
  if (activeFilter === "lowConfidence") meals = meals.filter(m => m.confidenceScore === "Low");
  if (activeFilter === "corrected") meals = meals.filter(m => m.userCorrected);
  if (search) meals = meals.filter(m => (m.mealName + " " + m.rawDescription).toLowerCase().includes(search));

  el.innerHTML = meals.slice(0, 40).map(m => `<p class="small" style="margin:10px 0 0">${esc(m.date)}</p>${mealHistoryItem(m)}`).join("") || "<p class='small'>No meals match this filter.</p>";
}

// ==================== MEAL HISTORY / COOKBOOK ====================

let cookbookSearch = "";
let cookbookFilter = "all"; // all | favourites | archived

function savedMealCardHtml(m) {
  return `<details class="history-item meal-card" data-saved-meal="${m.id}">
    <summary>
      <strong>${m.favourite ? "★ " : ""}${esc(m.name)}</strong>
      <span class="small">${m.calories} kcal · ${m.protein}g protein</span>
      ${m.archived ? `<span class="badge">Archived</span>` : ""}
    </summary>
    <p class="small">${m.ingredients.length ? esc(m.ingredients.join(", ")) : "No ingredients recorded."}</p>
    <div class="badge-row">
      <span class="badge">${m.calories}kcal</span>
      <span class="badge">P${m.protein}</span>
      <span class="badge">C${m.carbs}</span>
      <span class="badge">F${m.fat}</span>
      <span class="badge">Fibre${m.fibre ?? 0}</span>
      ${m.mealType ? `<span class="badge">${esc(m.mealType)}</span>` : ""}
      <span class="badge">Logged ${m.timesLogged}x</span>
      <span class="badge">Last used ${esc((m.lastUsedAt || "").slice(0, 10) || "--")}</span>
    </div>
    ${m.notes ? `<p class="small">${esc(m.notes)}</p>` : ""}
    <div class="form-grid">
      <label>Servings <input type="number" class="cookbook-serving-multiplier" data-saved-meal-id="${m.id}" value="1" min="0.25" step="0.25"></label>
    </div>
    <div class="actions">
      <button class="secondary" data-cookbook-add="${m.id}">Add to Today</button>
      <button class="secondary" data-cookbook-favourite="${m.id}">${m.favourite ? "Unfavourite" : "Favourite"}</button>
      <button class="secondary" data-cookbook-archive="${m.id}">${m.archived ? "Unarchive" : "Archive"}</button>
      <button class="secondary" data-cookbook-duplicate="${m.id}">Duplicate as New</button>
      <button class="danger" data-delete="savedMeals" data-id="${m.id}">Delete</button>
    </div>
  </details>`;
}

export function renderMealCookbook(data) {
  const el = $("mealCookbookList");
  if (!el) return;
  let meals = [...data.savedMeals];
  if (cookbookFilter === "favourites") meals = meals.filter(m => m.favourite && !m.archived);
  else if (cookbookFilter === "archived") meals = meals.filter(m => m.archived);
  else meals = meals.filter(m => !m.archived);

  if (cookbookSearch) {
    const s = cookbookSearch.toLowerCase();
    meals = meals.filter(m => m.name.toLowerCase().includes(s) || m.ingredients.some(i => i.toLowerCase().includes(s)));
  }
  meals.sort((a, b) => (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0) || new Date(b.lastUsedAt) - new Date(a.lastUsedAt));

  el.innerHTML = meals.length ? meals.map(savedMealCardHtml).join("")
    : "<p class='small'>No saved meals yet. Meals you create or log will appear here for quick reuse.</p>";
}

function addSavedMealToToday(savedMealId, servingMultiplier = 1) {
  const data = getData();
  const savedMeal = data.savedMeals.find(m => m.id === savedMealId);
  if (!savedMeal) return;
  const now = new Date();
  const entry = buildDailyLogEntryFromSavedMeal(savedMeal, servingMultiplier);
  savedMeal.timesLogged += 1;
  savedMeal.lastUsedAt = now.toISOString();
  data.mealLogs.push({
    id: uid(), date: todayISO(), time: now.toTimeString().slice(0, 5),
    isDraft: false, assumptions: [], userCorrected: false, correctionNotes: "",
    recoveryTag: null, quantity: servingMultiplier, unit: "serving", createdAt: now.toISOString(), updatedAt: now.toISOString(),
    ...entry
  });
  saveData(data);
  refreshAll();
}

// ==================== MACRO-GAP RECOMMENDATIONS ====================

let gapSortBy = "best-fit";
let gapPanelManuallyOpened = false;

function recommendationCardHtml(r) {
  return `<div class="history-item">
    <div class="section-title"><strong>${esc(r.meal.name)}</strong><span class="badge">${r.fitScore}% fit</span></div>
    <div class="badge-row">
      <span class="badge">${r.meal.calories}kcal</span>
      <span class="badge">P${r.meal.protein}</span>
      <span class="badge">C${r.meal.carbs}</span>
      <span class="badge">F${r.meal.fat}</span>
    </div>
    <p class="small">After adding: ${r.afterCalories}kcal remaining · Protein ${r.afterProtein <= 0 ? "target achieved" : r.afterProtein + "g remaining"}${r.exceedsCarbs ? ` · Carbohydrates exceeded by ${Math.abs(r.afterCarbs)}g` : ""}${r.exceedsFat ? ` · Fat exceeded by ${Math.abs(r.afterFat)}g` : ""}</p>
    <button type="button" class="secondary" data-gap-add="${r.meal.id}">Add to Today</button>
  </div>`;
}

export function renderMacroGapRecommendations(data, { forceOpen = false } = {}) {
  const panel = $("macroGapPanel");
  if (!panel) return;
  const remaining = remainingDailyTargets(data);
  const urgency = macroGapUrgency(remaining);
  const shouldShow = forceOpen || gapPanelManuallyOpened || urgency === "prominent" || urgency === "urgent";
  panel.hidden = !shouldShow;

  const remainingEl = $("macroGapRemaining");
  if (remainingEl) {
    remainingEl.innerHTML = `<div class="badge-row">
      <span class="badge">Calories: ${remaining.calories}kcal</span>
      <span class="badge">Protein: ${remaining.protein}g</span>
      <span class="badge">Carbs: ${remaining.carbs}g</span>
      <span class="badge">Fat: ${remaining.fat}g</span>
    </div>`;
  }
  if (urgency === "urgent") {
    panel.querySelector(".status-banner")?.remove();
    panel.insertAdjacentHTML("afterbegin", `<div class="status-banner status-warning"><span class="status-icon">⚠</span><span>It's getting late and a meaningful macro gap remains today.</span></div>`);
  }

  const listEl = $("macroGapResults");
  if (!listEl) return;
  const ranked = rankSavedMealsForGap(data.savedMeals, remaining, gapSortBy).slice(0, 10);
  listEl.innerHTML = ranked.length ? ranked.map(recommendationCardHtml).join("")
    : "<p class='small'>No saved meals match your remaining targets. Add more meals to your Meal History to improve recommendations.</p>";
}

export function openMacroGapPanel() {
  gapPanelManuallyOpened = true;
  renderMacroGapRecommendations(getData(), { forceOpen: true });
}

export function syncMealsToDailyNutrition() {
  const data = getData();
  const today = todayISO();
  const totals = dailyMealTotals(data.mealLogs, today);
  if (totals.mealCount === 0) { alert("No meals logged today to sync."); return; }
  if (!confirm(`Replace today's nutrition log with today's meal totals (${totals.calories}kcal, ${totals.protein}g protein)? Your existing nutrition entries for other days are never touched.`)) return;

  const now = new Date();
  const existing = data.nutritionLogs.find(n => n.date === today);
  if (existing) {
    Object.assign(existing, { calories: totals.calories, protein: totals.protein, carbs: totals.carbs, fat: totals.fat, fibre: totals.fibre, updatedAt: now.toISOString(), notes: (existing.notes ? existing.notes + " " : "") + "(synced from meal log)" });
  } else {
    data.nutritionLogs.push({
      id: uid(), date: today, calories: totals.calories, protein: totals.protein, carbs: totals.carbs, fat: totals.fat, fibre: totals.fibre,
      waterLitres: null, sodiumMg: null, electrolytes: "", notes: "Synced from meal log", createdAt: now.toISOString(), updatedAt: now.toISOString()
    });
  }
  saveData(data);
  refreshAll();
  alert("Today's nutrition total updated from meal log.");
}

// ==================== PRE / POST WORKOUT NUTRITION ====================

export function logPreWorkoutReadinessChoice(readinessChoice) {
  const data = getData();
  const today = todayISO();
  const now = new Date();
  const existing = data.preWorkoutLogs.find(p => p.date === today);
  if (existing) {
    existing.readinessChoice = readinessChoice;
    existing.updatedAt = now.toISOString();
  } else {
    data.preWorkoutLogs.push({
      id: uid(), date: today, time: now.toTimeString().slice(0, 5),
      readinessChoice, mealCompleted: readinessChoice === "fuel-complete",
      carbsG: null, proteinG: null, minutesBeforeTraining: null, notes: "",
      createdAt: now.toISOString(), updatedAt: now.toISOString()
    });
  }
  saveData(data);
  refreshAll();
}

export function savePreWorkoutLog() {
  const data = getData();
  const now = new Date();
  const today = todayISO();
  const carbsG = $("preWorkoutCarbs")?.value === "" ? null : Number($("preWorkoutCarbs")?.value);
  const proteinG = $("preWorkoutProtein")?.value === "" ? null : Number($("preWorkoutProtein")?.value);
  const minutesBeforeTraining = $("preWorkoutMinutesBefore")?.value === "" ? null : Number($("preWorkoutMinutesBefore")?.value);
  const notes = $("preWorkoutNotes")?.value || "";

  const existing = data.preWorkoutLogs.find(p => p.date === today);
  if (existing) {
    Object.assign(existing, { carbsG, proteinG, minutesBeforeTraining, notes, mealCompleted: true, updatedAt: now.toISOString() });
  } else {
    data.preWorkoutLogs.push({
      id: uid(), date: today, time: now.toTimeString().slice(0, 5),
      readinessChoice: "fuel-complete", mealCompleted: true,
      carbsG, proteinG, minutesBeforeTraining, notes,
      createdAt: now.toISOString(), updatedAt: now.toISOString()
    });
  }
  saveData(data);
  ["preWorkoutCarbs", "preWorkoutProtein", "preWorkoutMinutesBefore", "preWorkoutNotes"].forEach(id => { if ($(id)) $(id).value = ""; });
  refreshAll();
  alert("Pre-workout fuel logged.");
}

export function savePostWorkoutLog() {
  const data = getData();
  const now = new Date();
  const proteinG = $("postWorkoutProtein")?.value === "" ? null : Number($("postWorkoutProtein")?.value);
  const carbsG = $("postWorkoutCarbs")?.value === "" ? null : Number($("postWorkoutCarbs")?.value);
  const appetite = $("postWorkoutAppetite")?.value === "" ? null : Number($("postWorkoutAppetite")?.value);
  const digestion = $("postWorkoutDigestion")?.value === "" ? null : Number($("postWorkoutDigestion")?.value);
  const notes = $("postWorkoutNotes")?.value || "";

  data.postWorkoutLogs.push({
    id: uid(), date: todayISO(), time: now.toTimeString().slice(0, 5),
    proteinG, carbsG, appetite, digestion, notes,
    createdAt: now.toISOString(), updatedAt: now.toISOString()
  });
  saveData(data);
  ["postWorkoutProtein", "postWorkoutCarbs", "postWorkoutAppetite", "postWorkoutDigestion", "postWorkoutNotes"].forEach(id => { if ($(id)) $(id).value = ""; });
  refreshAll();
  alert("Post-workout recovery meal logged.");
}

export const READINESS_CHOICE_LABELS = {
  "fuel-complete": "Fuel Complete",
  "training-fasted": "Training Fasted Intentionally",
  "food-unavailable": "Food Unavailable",
  "digestive-tolerance": "Skipping — Digestive Tolerance",
  "continue-incomplete": "Continue Without Complete Data"
};

export function renderPreWorkoutReadinessGate(data) {
  const gate = $("preWorkoutReadinessGate");
  if (!gate) return;
  const today = preWorkoutReadinessToday(data.preWorkoutLogs);
  gate.hidden = !!today;
}

export function renderPrePostWorkoutHistory(data) {
  const preEl = $("preWorkoutHistory");
  if (preEl) {
    preEl.innerHTML = data.preWorkoutLogs.slice().reverse().slice(0, 10).map(p => `
      <div class="history-item">
        <strong>${esc(p.date)}</strong>${p.time ? " · " + esc(p.time) : ""} · ${esc(READINESS_CHOICE_LABELS[p.readinessChoice] || p.readinessChoice || "logged")}
        ${p.carbsG != null || p.proteinG != null ? `<br>${p.carbsG ?? "-"}g carbs · ${p.proteinG ?? "-"}g protein${p.minutesBeforeTraining != null ? ` · ${p.minutesBeforeTraining} min before` : ""}` : ""}
        ${p.notes ? `<br>${esc(p.notes)}` : ""}
        <div class="actions"><button class="danger" data-delete="preWorkoutLogs" data-id="${p.id}">Delete</button></div>
      </div>`).join("") || "<p class='small'>No pre-workout logs yet.</p>";
  }
  const postEl = $("postWorkoutHistory");
  if (postEl) {
    postEl.innerHTML = data.postWorkoutLogs.slice().reverse().slice(0, 10).map(p => `
      <div class="history-item">
        <strong>${esc(p.date)}</strong>${p.time ? " · " + esc(p.time) : ""} · ${p.proteinG ?? "-"}g protein · ${p.carbsG ?? "-"}g carbs
        ${p.appetite != null ? ` · Appetite ${p.appetite}/5` : ""}${p.digestion != null ? ` · Digestion ${p.digestion}/5` : ""}
        ${p.notes ? `<br>${esc(p.notes)}` : ""}
        <div class="actions"><button class="danger" data-delete="postWorkoutLogs" data-id="${p.id}">Delete</button></div>
      </div>`).join("") || "<p class='small'>No post-workout logs yet.</p>";
  }
}

export function renderTrainingNutritionCorrelation(data) {
  const el = $("trainingNutritionCorrelation");
  if (!el) return;
  const result = trainingNutritionCorrelation(data);
  if (!result.hasData) {
    el.innerHTML = `<p class="small">${esc(result.note || "Log pre-workout readiness on a few more sessions to unlock training-nutrition pattern analysis.")}</p>`;
    return;
  }
  el.innerHTML = `
    <div class="badge-row">
      <span class="badge">Fuelled avg volume: ${result.averageVolumeFuelled}kg</span>
      <span class="badge">Under-fuelled avg volume: ${result.averageVolumeUnderfuelled}kg</span>
      <span class="badge">${result.sessionsAnalysed} sessions analysed</span>
    </div>
    <p class="small">${esc(result.pattern)}</p>`;
}

export function setupMealEventDelegation() {
  document.addEventListener("click", (e) => {
    const dup = e.target.closest("[data-duplicate-meal]");
    if (dup) {
      const data = getData();
      const source = data.mealLogs.find(m => m.id === dup.dataset.duplicateMeal);
      if (!source) return;
      const now = new Date();
      data.mealLogs.push({ ...source, id: uid(), date: todayISO(), time: now.toTimeString().slice(0, 5), createdAt: now.toISOString(), updatedAt: now.toISOString() });
      saveData(data);
      refreshAll();
      return;
    }
    const filterBtn = e.target.closest("#mealFilterRow button");
    if (filterBtn) {
      activeFilter = filterBtn.dataset.filter;
      document.querySelectorAll("#mealFilterRow button").forEach(b => b.classList.toggle("active", b === filterBtn));
      renderMealHistory(getData());
      return;
    }
    const gotoTab = e.target.closest("[data-goto-tab]");
    if (gotoTab) {
      document.querySelector(`.nav-btn[data-tab="${gotoTab.dataset.gotoTab}"]`)?.click();
      const anchorId = gotoTab.dataset.gotoAnchor;
      if (anchorId) {
        setTimeout(() => {
          const target = document.getElementById(anchorId);
          if (!target) return;
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.focus?.({ preventScroll: true });
        }, 60);
      }
      return;
    }

    // ---- Meal History / cookbook actions ----
    const addBtn = e.target.closest("[data-cookbook-add]");
    if (addBtn) {
      const multiplierInput = addBtn.closest("details")?.querySelector(".cookbook-serving-multiplier");
      addSavedMealToToday(addBtn.dataset.cookbookAdd, Number(multiplierInput?.value) || 1);
      return;
    }
    const favBtn = e.target.closest("[data-cookbook-favourite]");
    if (favBtn) {
      const data = getData();
      const m = data.savedMeals.find(x => x.id === favBtn.dataset.cookbookFavourite);
      if (m) { m.favourite = !m.favourite; saveData(data); refreshAll(); }
      return;
    }
    const archiveBtn = e.target.closest("[data-cookbook-archive]");
    if (archiveBtn) {
      const data = getData();
      const m = data.savedMeals.find(x => x.id === archiveBtn.dataset.cookbookArchive);
      if (m) { m.archived = !m.archived; saveData(data); refreshAll(); }
      return;
    }
    const dupBtn = e.target.closest("[data-cookbook-duplicate]");
    if (dupBtn) {
      const data = getData();
      const m = data.savedMeals.find(x => x.id === dupBtn.dataset.cookbookDuplicate);
      if (m) {
        const now = new Date().toISOString();
        data.savedMeals.push({ ...m, id: uid(), name: `${m.name} (copy)`, contentHash: `${m.contentHash}::copy-${uid()}`, timesLogged: 0, firstCreatedAt: now, lastUsedAt: now, favourite: false });
        saveData(data); refreshAll();
      }
      return;
    }
    const cookbookFilterBtn = e.target.closest("#cookbookFilterRow button");
    if (cookbookFilterBtn) {
      cookbookFilter = cookbookFilterBtn.dataset.filter;
      document.querySelectorAll("#cookbookFilterRow button").forEach(b => b.classList.toggle("active", b === cookbookFilterBtn));
      renderMealCookbook(getData());
      return;
    }

    // ---- Macro-gap recommendations ----
    if (e.target.closest("#findMealBtn")) { openMacroGapPanel(); return; }
    const gapAddBtn = e.target.closest("[data-gap-add]");
    if (gapAddBtn) {
      if (confirm("Add this meal to today's log?")) addSavedMealToToday(gapAddBtn.dataset.gapAdd, 1);
      return;
    }
  });

  $("mealSearch")?.addEventListener("input", () => renderMealHistory(getData()));
  $("cookbookSearch")?.addEventListener("input", (e) => { cookbookSearch = e.target.value; renderMealCookbook(getData()); });
  $("macroGapSort")?.addEventListener("change", (e) => { gapSortBy = e.target.value; renderMacroGapRecommendations(getData(), { forceOpen: true }); });
  $("foodTemplateSelect")?.addEventListener("change", (e) => {
    if (e.target.value) applyFoodTemplate(e.target.value);
  });
}
